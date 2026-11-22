import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { MEETING_STATUSES, MEETING_TYPES, PRESENCE, RSVPS, serializeMeeting } from '../models/Meeting.js';
import { ActionItem, serializeAction } from '../models/ActionItem.js';
import { serializeDecision } from '../models/Decision.js';
import { describeChanges } from '../services/audit.js';
import * as meetings from '../services/meetings.js';
import { notify } from '../services/notifications.js';
import { TIME_RE, cleanName, isValidDateStr, short } from '../services/people.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { andClause, buildListQuery, extractFlags } from '../utils/listQuery.js';
import { html } from '../utils/html.js';

// ---------- shared zod pieces ----------
export const dateField = z.string({ error: 'Enter a date.' }).refine(isValidDateStr, 'Date must be a real date written as YYYY-MM-DD.');
export const timeField = z.string({ error: 'Enter a time.' }).regex(TIME_RE, 'Time must be HH:MM (24-hour).');
/** @param {string} label @param {number} max */
export const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max}).`);
/** @param {string} label @param {number} [max] @param {number} [each] */
const strList = (label, max = 50, each = 200) => z.array(text(label, each), { error: `${label}s must be a list.` }).max(max, `Too many ${label.toLowerCase()}s (max ${max}).`);
const emailOrBlank = z
  .string({ error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .max(200, 'Email is too long.')
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email.');
const looseObject = z.record(z.string(), z.unknown());
const rsvpField = z.enum(RSVPS, { error: `RSVP must be one of: ${RSVPS.join(', ')}.` });

const externalSchema = z
  .object({
    name: text('Name', 200).min(1, 'Enter the external attendee name.'),
    email: emailOrBlank.optional(),
    rsvp: rsvpField.optional(),
    respondedAt: z.string().max(40).nullable().optional(),
    respondedNote: text('Note', 1000).optional(),
  })
  .strict();

const meetingShape = {
  title: text('Title', 200).min(1, 'Enter a title.'),
  type: z.enum(MEETING_TYPES, { error: `Type must be one of: ${MEETING_TYPES.join(', ')}.` }),
  date: dateField,
  time: timeField,
  dur: text('Duration', 20).optional(),
  chair: text('Chair', 120).optional(),
  loc: text('Location', 200).optional(),
  mode: text('Mode', 40).optional(),
  attendees: strList('Attendee').optional(),
  external: z.array(externalSchema, { error: 'external must be a list of { name, email }.' }).max(50).optional(),
  agenda: strList('Agenda item', 100, 500).optional(),
  agendaTimes: strList('Agenda time', 100, 20).optional(),
  subBadge: text('Sub-badge', 60).optional(),
  clientCode: text('Client code', 40).optional(),
  clientName: text('Client name', 200).optional(),
  parkingLot: strList('Parking lot item', 100, 500).optional(),
  preRead: z.array(z.object({ name: text('Name', 200).min(1), opened: z.boolean() }).strict()).max(50).optional(),
  contributions: z.array(looseObject).max(100).optional(),
  carriedOver: z.array(looseObject).max(100).optional(),
  polls: z.array(looseObject).max(100).optional(),
  contextCard: looseObject.nullable().optional(),
};
const statusField = z.enum(MEETING_STATUSES, { error: `Status must be one of: ${MEETING_STATUSES.join(', ')}.` });

export const createSchema = z.object({ ...meetingShape, status: statusField.optional(), cancelReason: text('Cancel reason', 500).optional() }).strict();
export const patchSchema = z
  .object({ ...meetingShape, title: meetingShape.title.optional(), type: meetingShape.type.optional(), date: dateField.optional(), time: timeField.optional() })
  .strict();
export const statusSchema = z.object({ status: statusField, cancelReason: text('Cancel reason', 500).optional() }).strict();
export const minutesSchema = z
  .object({
    minutes: z.record(
      z.string().regex(/^(ag\d+|general)$/, 'Minutes keys must be ag0, ag1, … or general.'),
      z.object({ disc: text('Discussion', 20_000).optional(), dec: text('Decision', 20_000).optional() }).strict(),
      { error: 'minutes must be an object keyed by agenda item (ag0, ag1, …, general).' },
    ),
  })
  .strict();
export const presenceSchema = z.object({ name: text('Name', 200).min(1, 'Enter the attendee name.'), status: z.enum(PRESENCE, { error: `Presence must be one of: ${PRESENCE.join(', ')}.` }) }).strict();
export const presenceCycleSchema = z.object({ name: text('Name', 200).min(1, 'Enter the attendee name.') }).strict();
export const parkingSchema = z.object({ text: text('Parking lot item', 500).min(1, 'Enter the parking lot item.') }).strict();
export const externalPatchSchema = z
  .object({ email: emailOrBlank.optional(), rsvp: rsvpField.optional(), respondedNote: text('Note', 1000).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one of email, rsvp, respondedNote.');
export const rsvpSchema = z
  .object({ index: z.number({ error: 'index must be a whole number.' }).int().min(0, 'index must be 0 or more.'), rsvp: rsvpField, note: text('Note', 1000).optional() })
  .strict();
export const transcriptSchema = z
  .object({
    lines: z
      .array(
        z.object({ speaker: text('Speaker', 120).optional(), chip: text('Chip', 20).optional(), time: text('Time', 20).optional(), text: text('Text', 5000).min(1, 'Each line needs text.') }).strict(),
        { error: 'lines must be a list of { speaker, chip, time, text }.' },
      )
      .min(1, 'Send at least one line.')
      .max(500, 'Too many lines in one request (max 500).'),
  })
  .strict();
export const aiSummarySchema = z
  .object({
    aiSummary: z
      .object({
        overview: text('Overview', 10_000).optional(),
        decisions: z.array(z.object({ text: text('Decision', 2000).min(1), owner: text('Owner', 120).optional(), deadline: text('Deadline', 40).optional() }).strict()).max(100).default([]),
        actions: z
          .array(
            z
              .object({
                desc: text('Action', 1000).min(1),
                owner: text('Owner', 120).optional(),
                deadline: text('Deadline', 40).optional(),
                priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
              })
              .strict(),
          )
          .max(100)
          .default([]),
        risks: z.array(text('Risk', 2000)).max(100).default([]),
      })
      .strict(),
  })
  .strict();

/** List contract for GET /api/meetings. @type {import('../utils/listQuery.js').ListSpec} */
export const MEETINGS_LIST = {
  searchFields: ['title', 'chair', 'loc', 'attendees', 'external.name', 'agenda', 'clientName', 'subBadge'],
  filterFields: {
    type: 'enum',
    status: 'enum',
    chair: 'string',
    mode: 'string',
    clientCode: 'string',
    organiser: 'id',
    attendee: (values) => (values.length === 1 ? meetings.attendeeClause(values[0]) : { $or: values.map(meetings.attendeeClause) }),
  },
  filterPaths: { organiser: 'createdBy.id' },
  enums: { type: MEETING_TYPES, status: MEETING_STATUSES },
  dateFields: ['date', 'createdAt'],
  defaultDateField: 'date',
  stringDateFields: ['date'],
  sortFields: ['date', 'time', 'title', 'status', 'type', 'chair', 'createdAt', 'updatedAt'],
  defaultSort: 'date,time',
  fields: [
    'type', 'title', 'date', 'time', 'dur', 'status', 'chair', 'loc', 'mode', 'attendees', 'external', 'agenda', 'agendaTimes', 'minutes', 'subBadge', 'cancelReason',
    'presence', 'parkingLot', 'preRead', 'contributions', 'carriedOver', 'polls', 'contextCard', 'transcript', 'aiSummary', 'minutesFinalised', 'minutesCirculatedAt',
    'clientCode', 'clientName', 'fromRequest', 'createdBy', 'createdAt', 'updatedAt', 'actions', 'openActions', 'totalActions',
  ],
};

/** @param {string} v */
function indexParam(v) {
  if (!/^\d+$/.test(v)) throw badRequest('index must be a whole number.');
  return Number.parseInt(v, 10);
}

/** @param {import('express').Request} req @param {any} m @param {Record<string, unknown>} [extra] */
async function respond(req, res, m, extra = {}) {
  res.json({ meeting: await meetings.withActions(m), ...extra });
}

/** GET /api/meetings @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'] });
  const lq = buildListQuery(query, MEETINGS_LIST);
  if (flags.mine === 'true') andClause(lq, meetings.mineClause(me.name), 'mine', true);
  res.json(await meetings.listMeetings(lq));
};

/** POST /api/meetings @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const m = await meetings.createMeeting(req.body, me);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Scheduled ${m.type} meeting on ${m.date} ${m.time} · ${m.attendees.length} attendee${m.attendees.length === 1 ? '' : 's'}` };
  res.status(201);
  await respond(req, res, m);
};

/** GET /api/meetings/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  await respond(req, res, await meetings.findMeetingOr404(req.params.id));
};

/** PATCH /api/meetings/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const before = await meetings.patchMeeting(m, req.body);
  const details = describeChanges(before, meetings.meetingSnapshot(m), meetings.MEETING_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: m.title, entityId: m._id.toString(), details } : false;
  await respond(req, res, m);
};

/** DELETE /api/meetings/:id — admin or creator. @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const m = await meetings.findMeetingOr404(req.params.id);
  if (me.role !== 'admin' && !(m.createdBy?.id && m.createdBy.id.equals(me._id))) throw forbidden('Only an admin or the person who created this meeting can delete it.');
  await meetings.deleteMeetingCascade(m);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Deleted ${m.status} meeting of ${m.date} (with its action items and decisions)` };
  res.json({ ok: true });
};

/** POST /api/meetings/:id/status { status, cancelReason? } @type {import('express').RequestHandler} */
export const setStatus = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const from = await meetings.setStatus(m, req.body.status, req.body.cancelReason);
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `status: ${from} → ${m.status}${m.cancelReason ? ` · reason: ${m.cancelReason}` : ''}` };
  await respond(req, res, m);
};

/** POST /api/meetings/:id/duplicate @type {import('express').RequestHandler} */
export const duplicate = async (req, res) => {
  const me = currentUser(req);
  const src = await meetings.findMeetingOr404(req.params.id);
  const m = await meetings.duplicateMeeting(src, me);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Duplicated from "${src.title}" (${src.date}) → ${m.date}` };
  res.status(201);
  await respond(req, res, m);
};

// ---------- minutes ----------

/** PUT /api/meetings/:id/minutes { minutes } — replaces the whole map. @type {import('express').RequestHandler} */
export const putMinutes = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  if (m.minutesFinalised) throw conflict('Minutes are finalised. Re-open them before editing.');
  m.minutes = req.body.minutes;
  m.markModified('minutes');
  await m.save();
  const keys = Object.keys(m.minutes);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Minutes updated (${keys.length} section${keys.length === 1 ? '' : 's'}: ${keys.join(', ') || '—'})` };
  await respond(req, res, m);
};

/** POST /api/meetings/:id/minutes/finalise @type {import('express').RequestHandler} */
export const finaliseMinutes = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  if (m.minutesFinalised) throw conflict('Minutes are already finalised.');
  m.minutesFinalised = true;
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: 'Minutes finalised (draft locked)' };
  await respond(req, res, m, { recipients: meetings.circulationSummary(m) });
};

/** POST /api/meetings/:id/minutes/reopen @type {import('express').RequestHandler} */
export const reopenMinutes = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  if (!m.minutesFinalised) throw conflict('Minutes are not finalised.');
  m.minutesFinalised = false;
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: 'Minutes re-opened for editing' };
  await respond(req, res, m);
};

/** POST /api/meetings/:id/minutes/circulate → recipient summary. @type {import('express').RequestHandler} */
export const circulateMinutes = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const recipients = await meetings.circulateMinutes(m);
  res.locals.audit = {
    action: 'update',
    entity: m.title,
    entityId: m._id.toString(),
    details: `Minutes circulated to ${recipients.total} recipient${recipients.total === 1 ? '' : 's'} (${recipients.internal} internal, ${recipients.externalWithEmail.length} external${recipients.externalWithoutEmail.length ? `; ${recipients.externalWithoutEmail.length} skipped — no email` : ''})`,
  };
  await respond(req, res, m, { recipients });
};

// ---------- presence / parking lot ----------

/** PATCH /api/meetings/:id/presence { name, status } @type {import('express').RequestHandler} */
export const patchPresence = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const r = await meetings.setPresence(m, req.body.name, req.body.status);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Presence · ${r.name}: ${r.from} → ${r.to}` };
  await respond(req, res, m, { presence: r });
};

/** POST /api/meetings/:id/presence/cycle { name } @type {import('express').RequestHandler} */
export const cyclePresence = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const r = await meetings.cyclePresence(m, req.body.name);
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Presence · ${r.name}: ${r.from} → ${r.to}` };
  await respond(req, res, m, { presence: r });
};

/** POST /api/meetings/:id/parking { text } @type {import('express').RequestHandler} */
export const addParking = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  m.parkingLot.push(req.body.text);
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Parking lot + "${short(req.body.text, 60)}"` };
  await respond(req, res, m);
};

/** DELETE /api/meetings/:id/parking/:index @type {import('express').RequestHandler} */
export const removeParking = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const idx = indexParam(req.params.index);
  if (idx >= m.parkingLot.length) throw notFound('That parking lot item does not exist.');
  const [removed] = m.parkingLot.splice(idx, 1);
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Parking lot − "${short(removed, 60)}"` };
  await respond(req, res, m);
};

// ---------- external attendees / RSVP ----------

/** @param {import('express').Request} req @param {import('express').Response} res @param {any} m @param {number} idx @param {{ email?: string, rsvp?: string, respondedNote?: string }} patch */
async function applyExternal(req, res, m, idx, patch) {
  const r = await meetings.patchExternal(m, idx, patch);
  const parts = [];
  if (patch.email !== undefined && patch.email !== r.before.email) parts.push(`email: ${r.before.email || '—'} → ${patch.email || '—'}`);
  if (r.rsvpChanged) parts.push(`rsvp: ${r.before.rsvp} → ${r.external.rsvp}`);
  if (patch.respondedNote !== undefined && patch.respondedNote !== r.before.respondedNote) parts.push(`note: "${short(patch.respondedNote, 60)}"`);
  res.locals.audit = parts.length ? { action: 'update', entity: m.title, entityId: m._id.toString(), details: `External · ${r.external.name} · ${parts.join(' · ')}` } : false;
  await respond(req, res, m, { external: { index: idx, name: r.external.name, email: r.external.email, rsvp: r.external.rsvp, respondedAt: r.external.respondedAt, respondedNote: r.external.respondedNote } });
}

/** PATCH /api/meetings/:id/external/:index { email?, rsvp?, respondedNote? } @type {import('express').RequestHandler} */
export const patchExternal = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  await applyExternal(req, res, m, indexParam(req.params.index), req.body);
};

/** POST /api/meetings/:id/rsvp { index, rsvp, note? } — the invitee's answer. @type {import('express').RequestHandler} */
export const rsvp = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  await applyExternal(req, res, m, req.body.index, { rsvp: req.body.rsvp, respondedNote: req.body.note ?? '' });
};

// ---------- transcript / AI summary ----------

/** POST /api/meetings/:id/transcript/append { lines } @type {import('express').RequestHandler} */
export const appendTranscript = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  for (const l of req.body.lines) m.transcript.push({ speaker: l.speaker ?? '', chip: l.chip ?? '', time: l.time ?? '', text: l.text });
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Transcript + ${req.body.lines.length} line${req.body.lines.length === 1 ? '' : 's'} (${m.transcript.length} total)` };
  await respond(req, res, m);
};

/** DELETE /api/meetings/:id/transcript @type {import('express').RequestHandler} */
export const clearTranscript = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  const n = m.transcript.length;
  m.transcript = [];
  await m.save();
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Transcript cleared (${n} line${n === 1 ? '' : 's'} removed)` };
  await respond(req, res, m);
};

/** PUT /api/meetings/:id/ai-summary { aiSummary } @type {import('express').RequestHandler} */
export const putAiSummary = async (req, res) => {
  const m = await meetings.findMeetingOr404(req.params.id);
  m.aiSummary = req.body.aiSummary;
  m.markModified('aiSummary');
  await m.save();
  const ai = m.aiSummary;
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `AI summary saved (${ai.decisions.length} decisions, ${ai.actions.length} actions, ${ai.risks.length} risks)` };
  await respond(req, res, m);
};

/** POST /api/meetings/:id/ai-summary/apply-actions @type {import('express').RequestHandler} */
export const applyAiActions = async (req, res) => {
  const me = currentUser(req);
  const m = await meetings.findMeetingOr404(req.params.id);
  const created = await meetings.applyAiActions(m, me);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `${created.length} AI-extracted action item${created.length === 1 ? '' : 's'} added` };
  res.status(201);
  await respond(req, res, m, { created: created.map(serializeAction) });
};

/** POST /api/meetings/:id/ai-summary/log-decisions @type {import('express').RequestHandler} */
export const logAiDecisions = async (req, res) => {
  const me = currentUser(req);
  const m = await meetings.findMeetingOr404(req.params.id);
  const created = await meetings.logAiDecisions(m, me);
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `${created.length} AI-detected decision${created.length === 1 ? '' : 's'} logged to the registry` };
  res.status(201).json({ created: created.map(serializeDecision), meeting: serializeMeeting(m, (await meetings.actionsByMeeting([m._id])).get(m._id.toString()) ?? []) });
};

/** POST /api/meetings/:id/remind-owners — notify stub: in-app nudges only. @type {import('express').RequestHandler} */
export const remindOwners = async (req, res) => {
  const me = currentUser(req);
  const m = await meetings.findMeetingOr404(req.params.id);
  const open = await ActionItem.find({ meetingId: m._id, status: { $ne: 'done' }, owner: { $nin: ['', null] } }).sort({ deadline: 1 });
  if (!open.length) throw badRequest('No open actions with assigned owners to remind.');
  /** @type {Map<string, any[]>} */
  const byOwner = new Map();
  for (const a of open) {
    const k = cleanName(a.owner);
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k).push(a);
  }
  for (const [owner, items] of byOwner) {
    await notify({
      userName: owner,
      type: 'action',
      icon: '🔔',
      text: html`<strong>Reminder from ${me.name}:</strong> ${items.length} open action${items.length === 1 ? '' : 's'} from "${m.title}" — next due <strong>${items[0].deadline}</strong>: "${short(items[0].desc, 60)}".`,
    });
  }
  await notify({ userName: me.name, type: 'action', icon: '🔔', text: html`<strong>Reminders sent:</strong> ${byOwner.size} owner(s) nudged on open actions from "${m.title}".` });
  res.locals.audit = { action: 'update', entity: m.title, entityId: m._id.toString(), details: `Reminded ${byOwner.size} owner${byOwner.size === 1 ? '' : 's'} about ${open.length} open action${open.length === 1 ? '' : 's'}` };
  res.json({ ok: true, count: byOwner.size, owners: [...byOwner.keys()], openActions: open.length });
};
