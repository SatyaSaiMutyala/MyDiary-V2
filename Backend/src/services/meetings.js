import mongoose from 'mongoose';
import { ActionItem, serializeAction } from '../models/ActionItem.js';
import { Decision } from '../models/Decision.js';
import { Meeting, PRESENCE, serializeMeeting } from '../models/Meeting.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { listResponse, pickFields } from '../utils/paginate.js';
import { createAction } from './actionItems.js';
import { createDecision } from './decisions.js';
import { notify } from './notifications.js';
import { nameClause, plusDays, sameName, short } from './people.js';
import { html } from '../utils/html.js';

/** @param {string} id */
export async function findMeetingOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That meeting does not exist.');
  const m = await Meeting.findById(id);
  if (!m) throw notFound('That meeting does not exist.');
  return m;
}

/** `attendee=` filter: the name is in `attendees` (with or without a "(role)" suffix). @param {string} name */
export const attendeeClause = (name) => nameClause('attendees', name);

/** `mine=true`: meetings I chair or attend. @param {string} name */
export const mineClause = (name) => ({ $or: [nameClause('chair', name), nameClause('attendees', name)] });

/**
 * presence / preRead derived from the attendee list, keeping what is already known for people who stay.
 * @param {string[]} attendees
 * @param {{ presence?: Record<string, string>, preRead?: { name: string, opened: boolean }[] }} [existing]
 */
export function peopleDefaults(attendees, existing = {}) {
  const presence = {};
  for (const a of attendees) presence[a] = existing.presence?.[a] ?? 'tbd';
  const opened = new Map((existing.preRead ?? []).map((p) => [p.name, !!p.opened]));
  const preRead = attendees.map((a) => ({ name: a, opened: opened.get(a) ?? false }));
  return { presence, preRead };
}

/** Pads / trims agendaTimes to the agenda length with the web's default '10m'. @param {string[]} agenda @param {string[] | undefined} times */
export const alignAgendaTimes = (agenda, times) => agenda.map((_, i) => times?.[i] || '10m');

/**
 * Normalises an incoming external list; entries whose name is already on the meeting keep their RSVP unless the
 * request sets one.
 * @param {any[]} incoming @param {any[]} [existing]
 */
function mergeExternal(incoming, existing = []) {
  return incoming.map((e) => {
    const prev = existing.find((x) => sameName(x.name, e.name));
    const rsvp = e.rsvp ?? prev?.rsvp ?? 'pending';
    return {
      name: e.name,
      email: e.email ?? prev?.email ?? '',
      rsvp,
      respondedAt: e.respondedAt !== undefined ? e.respondedAt : rsvp === prev?.rsvp ? (prev?.respondedAt ?? null) : null,
      respondedNote: e.respondedNote ?? (rsvp === prev?.rsvp ? (prev?.respondedNote ?? '') : ''),
    };
  });
}

/**
 * Creates a meeting with the web's saveNewMeeting() defaults.
 * @param {Record<string, any>} input validated body
 * @param {any} me
 */
export async function createMeeting(input, me) {
  const attendees = input.attendees?.length ? input.attendees : [me.name];
  const agenda = input.agenda?.length ? input.agenda : ['Discussion'];
  return Meeting.create({
    type: input.type,
    title: input.title,
    date: input.date,
    time: input.time,
    dur: input.dur ?? '1h',
    status: input.status ?? 'upcoming',
    chair: input.chair ?? me.name,
    loc: input.loc ?? 'TBD',
    mode: input.mode ?? '📍 In-person',
    attendees,
    external: mergeExternal(input.external ?? []),
    agenda,
    agendaTimes: alignAgendaTimes(agenda, input.agendaTimes),
    subBadge: input.subBadge ?? '',
    cancelReason: input.status === 'cancelled' ? (input.cancelReason ?? '') : '',
    parkingLot: input.parkingLot ?? [],
    contributions: input.contributions ?? [],
    carriedOver: input.carriedOver ?? [],
    polls: input.polls ?? [],
    contextCard: input.contextCard ?? null,
    clientCode: input.clientCode ?? '',
    clientName: input.clientName ?? '',
    minutes: {},
    ...peopleDefaults(attendees),
    createdBy: { id: me._id, name: me.name },
  });
}

export const MEETING_CHANGE_FIELDS = ['title', 'type', 'date', 'time', 'dur', 'chair', 'loc', 'mode', 'attendees', 'external', 'agenda', 'agendaTimes', 'subBadge', 'clientCode', 'clientName'];
/** @param {any} m */
export const meetingSnapshot = (m) => ({
  title: m.title,
  type: m.type,
  date: m.date,
  time: m.time,
  dur: m.dur,
  chair: m.chair,
  loc: m.loc,
  mode: m.mode,
  attendees: [...m.attendees],
  external: m.external.map((e) => e.name),
  agenda: [...m.agenda],
  agendaTimes: [...m.agendaTimes],
  subBadge: m.subBadge,
  clientCode: m.clientCode,
  clientName: m.clientName,
});

/**
 * Applies a partial update. Attendee changes re-derive presence / preRead (keeping known values), agenda changes
 * re-align agendaTimes, a title change is pushed to the meeting's action items and decisions.
 * @param {any} m @param {Record<string, any>} patch
 */
export async function patchMeeting(m, patch) {
  const before = meetingSnapshot(m);
  for (const f of ['title', 'type', 'date', 'time', 'dur', 'chair', 'loc', 'mode', 'subBadge', 'clientCode', 'clientName', 'parkingLot', 'contributions', 'carriedOver', 'polls', 'contextCard']) {
    if (patch[f] !== undefined) {
      m[f] = patch[f];
      if (['contributions', 'carriedOver', 'polls', 'contextCard'].includes(f)) m.markModified(f);
    }
  }
  if (patch.attendees !== undefined) {
    const attendees = patch.attendees.length ? patch.attendees : m.attendees;
    const { presence, preRead } = peopleDefaults(attendees, { presence: m.presence, preRead: m.preRead });
    m.attendees = attendees;
    m.presence = presence;
    m.markModified('presence');
    m.preRead = preRead;
  }
  if (patch.preRead !== undefined) m.preRead = patch.preRead;
  if (patch.external !== undefined) m.external = mergeExternal(patch.external, m.external);
  if (patch.agenda !== undefined || patch.agendaTimes !== undefined) {
    const agenda = patch.agenda ?? m.agenda;
    m.agendaTimes = alignAgendaTimes(agenda, patch.agendaTimes ?? m.agendaTimes);
    m.agenda = agenda;
  }
  await m.save();
  if (before.title !== m.title) {
    await Promise.all([
      ActionItem.updateMany({ meetingId: m._id }, { $set: { meetingTitle: m.title } }),
      Decision.updateMany({ meetingId: m._id }, { $set: { meetingTitle: m.title } }),
    ]);
  }
  return before;
}

/** Action items of several meetings, grouped by meeting id. @param {any[]} meetingIds */
export async function actionsByMeeting(meetingIds) {
  const docs = await ActionItem.find({ meetingId: { $in: meetingIds } }).sort({ createdAt: 1, _id: 1 });
  /** @type {Map<string, any[]>} */
  const map = new Map();
  for (const a of docs) {
    const k = a.meetingId.toString();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(serializeAction(a));
  }
  return map;
}

/** The meeting with its action items embedded. @param {any} m */
export async function withActions(m) {
  const map = await actionsByMeeting([m._id]);
  return serializeMeeting(m, map.get(m._id.toString()) ?? []);
}

/** GET /api/meetings: runs the list query and embeds each meeting's actions. @param {import('../utils/listQuery.js').ListQuery} lq */
export async function listMeetings(lq) {
  const [docs, total] = await Promise.all([Meeting.find(lq.filter).sort(lq.sort).skip(lq.skip).limit(lq.limit), Meeting.countDocuments(lq.filter)]);
  const map = await actionsByMeeting(docs.map((d) => d._id));
  const items = docs.map((d) => pickFields(serializeMeeting(d, map.get(d._id.toString()) ?? []), lq.fields));
  return listResponse(items, total, lq);
}

/**
 * upcoming ↔ completed / cancelled, and restore. Cancelling stores the reason; restoring clears it.
 * @param {any} m @param {'upcoming' | 'completed' | 'cancelled'} status @param {string} [cancelReason]
 */
export async function setStatus(m, status, cancelReason) {
  if (m.status === status) throw conflict(`This meeting is already ${status}.`);
  const from = m.status;
  m.status = status;
  m.cancelReason = status === 'cancelled' ? (cancelReason ?? '') : '';
  await m.save();
  return from;
}

/**
 * The web's duplicateMeeting(): a new upcoming copy "(Copy)" one week from today, with minutes, actions,
 * transcript, AI summary and cancel reason cleared.
 * @param {any} m @param {any} me
 */
export function duplicateMeeting(m, me) {
  const src = m.toObject();
  delete src._id;
  delete src.createdAt;
  delete src.updatedAt;
  return Meeting.create({
    ...src,
    title: `${m.title} (Copy)`,
    status: 'upcoming',
    date: plusDays(7),
    minutes: {},
    cancelReason: '',
    transcript: [],
    aiSummary: null,
    minutesFinalised: false,
    minutesCirculatedAt: null,
    fromRequest: null,
    external: m.external.map((e) => ({ name: e.name, email: e.email, rsvp: 'pending', respondedAt: null, respondedNote: '' })),
    ...peopleDefaults([...m.attendees]),
    createdBy: { id: me._id, name: me.name },
  });
}

/** Deletes a meeting with its action items and decisions. @param {any} m */
export async function deleteMeetingCascade(m) {
  await Promise.all([ActionItem.deleteMany({ meetingId: m._id }), Decision.deleteMany({ meetingId: m._id })]);
  await m.deleteOne();
}

/** The stored attendee string for a name (exact first, then ignoring the "(role)" suffix), or 400. @param {any} m @param {string} name */
export function attendeeKey(m, name) {
  const key = m.attendees.find((a) => a === name) ?? m.attendees.find((a) => sameName(a, name));
  if (!key) throw badRequest(`${name} is not an attendee of this meeting.`, [{ field: 'name', message: 'Not an attendee.' }]);
  return key;
}

/** @param {any} m @param {string} name @param {string} status */
export async function setPresence(m, name, status) {
  const key = attendeeKey(m, name);
  const from = m.presence?.[key] ?? 'tbd';
  m.presence = { ...(m.presence ?? {}), [key]: status };
  m.markModified('presence');
  await m.save();
  return { name: key, from, to: status };
}

/** tbd → present → late → absent → tbd. @param {any} m @param {string} name */
export function cyclePresence(m, name) {
  const key = attendeeKey(m, name);
  const cur = m.presence?.[key] ?? 'tbd';
  return setPresence(m, key, PRESENCE[(PRESENCE.indexOf(cur) + 1) % PRESENCE.length]);
}

/** @param {any} m @param {number} index */
export function externalAt(m, index) {
  const e = m.external[index];
  if (!e) throw notFound('That external attendee does not exist.');
  return e;
}

/**
 * Updates one external attendee. A changed RSVP stamps respondedAt ('YYYY-MM-DDTHH:MM' like the web) and tells
 * the chair.
 * @param {any} m @param {number} index @param {{ email?: string, rsvp?: string, respondedNote?: string }} patch
 */
export async function patchExternal(m, index, patch) {
  const e = externalAt(m, index);
  const before = { email: e.email, rsvp: e.rsvp, respondedNote: e.respondedNote };
  if (patch.email !== undefined) e.email = patch.email;
  if (patch.respondedNote !== undefined) e.respondedNote = patch.respondedNote;
  const rsvpChanged = patch.rsvp !== undefined && patch.rsvp !== e.rsvp;
  if (rsvpChanged) {
    e.rsvp = patch.rsvp;
    e.respondedAt = new Date().toISOString().slice(0, 16);
  }
  await m.save();
  if (rsvpChanged && m.chair) {
    const respLabel = e.rsvp === 'accepted' ? 'accepted' : e.rsvp === 'declined' ? 'declined' : e.rsvp === 'tentative' ? 'tentatively accepted' : 'reset their response to';
    const icon = e.rsvp === 'accepted' ? '✓' : e.rsvp === 'declined' ? '✗' : '?';
    const note = e.respondedNote;
    await notify({
      userName: m.chair,
      type: 'meeting',
      icon,
      text: html`<strong>${e.name}</strong> has <strong>${respLabel}</strong> your invitation to <em>${m.title}</em>${note ? ` — "${short(note, 80)}"` : '.'}`,
    });
  }
  return { before, rsvpChanged, external: e };
}

/** Who the minutes go to (the web's DetailCirculateModal numbers). @param {any} m */
export function circulationSummary(m) {
  const withEmail = m.external.filter((e) => e.email).map((e) => e.name);
  const withoutEmail = m.external.filter((e) => !e.email).map((e) => e.name);
  return { total: m.attendees.length + withEmail.length, internal: m.attendees.length, externalWithEmail: withEmail, externalWithoutEmail: withoutEmail };
}

/** Marks the minutes circulated and notifies every internal attendee. @param {any} m */
export async function circulateMinutes(m) {
  const summary = circulationSummary(m);
  m.minutesCirculatedAt = new Date();
  await m.save();
  await notify({
    userNames: m.attendees,
    type: 'minutes',
    icon: '📧',
    text: html`<strong>Minutes circulated:</strong> "${m.title}" sent to ${summary.total} recipient${summary.total === 1 ? '' : 's'} via email + MyDiary.`,
  });
  return summary;
}

/** @param {any} m */
export function requireAiSummary(m) {
  if (!m.aiSummary) throw badRequest('Generate (or save) an AI summary first.');
  return m.aiSummary;
}

/** The web's applyAIActions(): one action item per aiSummary.actions entry, deadline "+N days" from today. @param {any} m @param {any} me */
export async function applyAiActions(m, me) {
  const ai = requireAiSummary(m);
  const created = [];
  for (const sa of ai.actions ?? []) {
    const match = /\+(\d+)/.exec(String(sa.deadline ?? ''));
    const days = match ? Number.parseInt(match[1], 10) : 7;
    created.push(await createAction(m, { desc: sa.desc, owner: sa.owner ?? '', ownerType: 'internal', deadline: plusDays(days), priority: sa.priority ?? 'medium', status: 'open' }, me, 'created from the AI summary'));
  }
  return created;
}

/** The web's logAllAIDecisions(): every aiSummary.decisions entry into the registry. @param {any} m @param {any} me */
export async function logAiDecisions(m, me) {
  const ai = requireAiSummary(m);
  const created = [];
  for (const d of ai.decisions ?? []) {
    created.push(await createDecision(m, { agendaIdx: 0, text: d.text, tags: ['approved'], department: 'From AI', decidedBy: m.chair }, me));
  }
  return created;
}
