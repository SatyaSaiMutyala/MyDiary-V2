import mongoose from 'mongoose';
import { config } from '../config.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingRequest } from '../models/MeetingRequest.js';
import { conflict, forbidden, notFound } from '../utils/errors.js';
import { peopleDefaults } from './meetings.js';
import { notify } from './notifications.js';
import { durLabel, nameClause, sameName, short } from './people.js';
import { html } from '../utils/html.js';

/** @param {string} id */
export async function findRequestOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That meeting request does not exist.');
  const r = await MeetingRequest.findById(id);
  if (!r) throw notFound('That meeting request does not exist.');
  return r;
}

/** Who sees the request in their inbox: the EA it was routed to, else the addressee. @param {any} r */
export const recipientOf = (r) => r.routedTo || r.to;

/** `box=inbox`: routed to me, or addressed to me and not routed. @param {string} name */
export const inboxClause = (name) => ({ $or: [nameClause('routedTo', name), { $and: [{ routedTo: { $in: [null, ''] } }, nameClause('to', name)] }] });
/** `box=sent` @param {string} name */
export const sentClause = (name) => nameClause('from', name);

/**
 * The CMD routing rule (web RequestMeetingModal): a request to the CMD (`ADMIN_NAME`) from anyone but the CMD or
 * the EA goes to the EA (`EA_NAME`) on the CMD's behalf.
 * @param {string} to @param {any} me
 */
export function routeFor(to, me) {
  const cmd = config.admin.name;
  const ea = config.eaName;
  if (sameName(to, cmd) && !sameName(me.name, cmd) && !sameName(me.name, ea)) return { routedTo: ea, onBehalfOf: to };
  return { routedTo: null, onBehalfOf: null };
}

/**
 * @param {{ to: string, proposedDate: string, proposedTime: string, durationMin?: number, topic: string, notes?: string }} input
 * @param {any} me
 */
export async function createRequest(input, me) {
  const { routedTo, onBehalfOf } = routeFor(input.to, me);
  const r = await MeetingRequest.create({
    from: me.name,
    to: input.to,
    onBehalfOf,
    routedTo,
    proposedDate: input.proposedDate,
    proposedTime: input.proposedTime,
    durationMin: input.durationMin ?? 30,
    topic: input.topic,
    notes: input.notes ?? '',
    status: 'pending',
    requesterId: me._id,
    history: [{ at: new Date(), by: me.name, action: 'created', proposedDate: input.proposedDate, proposedTime: input.proposedTime }],
  });
  await notify({
    userName: recipientOf(r),
    type: 'meeting',
    icon: '📨',
    text: html`<strong>${recipientOf(r)}</strong>: new meeting request from ${me.name} — "${short(r.topic, 60)}" for ${r.proposedDate} ${r.proposedTime}${routedTo ? ` (on behalf of ${onBehalfOf})` : ''}`,
  });
  return r;
}

/** Only the recipient (or an admin) may accept / decline / counter, and only while pending. @param {any} r @param {any} me */
export function assertCanRespond(r, me) {
  if (r.status !== 'pending') throw conflict(`This request was already ${r.status}.`);
  if (me.role !== 'admin' && !sameName(recipientOf(r), me.name)) throw forbidden('Only the person this request was sent to can respond to it.');
}

/**
 * The web's acceptMeetingRequest(): creates the meeting (internal, chaired by the requester, both parties attending)
 * and links it; notifies the requester.
 * @param {any} r @param {any} me @param {string} [note]
 */
export async function acceptRequest(r, me, note = '') {
  assertCanRespond(r, me);
  const attendees = [r.from, r.onBehalfOf || r.to];
  const meeting = await Meeting.create({
    type: 'internal',
    title: r.topic,
    date: r.proposedDate,
    time: r.proposedTime,
    dur: durLabel(r.durationMin ?? 30),
    status: 'upcoming',
    chair: r.from,
    loc: 'TBD · to be confirmed',
    mode: '📍 In-person',
    attendees,
    external: [],
    agenda: [],
    agendaTimes: [],
    agendaNotes: [],
    minutes: {},
    parkingLot: [],
    ...peopleDefaults(attendees),
    fromRequest: r._id,
    createdBy: { id: me._id, name: me.name },
  });
  r.status = 'accepted';
  r.respondedAt = new Date();
  r.responseNote = note;
  r.meetingId = meeting._id;
  r.history.push({ at: r.respondedAt, by: me.name, action: 'accepted', note });
  await r.save();
  await notify({
    userName: r.from,
    type: 'meeting',
    icon: '✓',
    text: html`<strong>${r.from}</strong>: your request "${short(r.topic, 50)}" was accepted${r.onBehalfOf ? ` by ${r.routedTo} (on behalf of ${r.onBehalfOf})` : ''}. Meeting scheduled.${note ? ` Note: "${note}"` : ''}`,
  });
  return meeting;
}

/** @param {any} r @param {any} me @param {string} note */
export async function declineRequest(r, me, note) {
  assertCanRespond(r, me);
  r.status = 'declined';
  r.respondedAt = new Date();
  r.responseNote = note;
  r.history.push({ at: r.respondedAt, by: me.name, action: 'declined', note });
  await r.save();
  await notify({ userName: r.from, type: 'meeting', icon: '✗', text: html`<strong>${r.from}</strong>: your request "${short(r.topic, 50)}" was declined.${note ? ` Reason: "${note}"` : ''}` });
  return r;
}

/**
 * The web's proposeAlternative(): new slot, parties swapped so the original requester now has to accept, status
 * back to pending (the "countered" step is kept in `history`).
 * @param {any} r @param {any} me @param {{ proposedDate: string, proposedTime: string, note?: string }} input
 */
export async function counterRequest(r, me, input) {
  assertCanRespond(r, me);
  const origFrom = r.from;
  const note = input.note ?? '';
  r.respondedAt = new Date();
  r.history.push({ at: r.respondedAt, by: me.name, action: 'countered', note, proposedDate: input.proposedDate, proposedTime: input.proposedTime });
  r.proposedDate = input.proposedDate;
  r.proposedTime = input.proposedTime;
  r.responseNote = note;
  r.from = me.name;
  r.to = origFrom;
  r.onBehalfOf = null;
  r.routedTo = null;
  r.status = 'pending';
  await r.save();
  await notify({
    userName: origFrom,
    type: 'meeting',
    icon: '↺',
    text: html`<strong>${origFrom}</strong>: ${me.name} proposed an alternative time for "${short(r.topic, 50)}" — now ${r.proposedDate} ${r.proposedTime}.${note ? ` "${note}"` : ''}`,
  });
  return { request: r, origFrom };
}
