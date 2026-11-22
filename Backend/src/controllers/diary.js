import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { ADDED_BY, DIARY_CATS, DIARY_REMINDERS, DIARY_RSVPS, serializeDiaryEntry } from '../models/DiaryEntry.js';
import { describeChanges } from '../services/audit.js';
import * as diary from '../services/diary.js';
import { TIME_RE, isValidDateStr, nameClause, short } from '../services/people.js';
import { andClause, buildListQuery, extractFlags } from '../utils/listQuery.js';

// ---------- zod pieces (every message is shown to the person word for word) ----------
/** @param {string} label @param {number} max */
const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max} characters).`);
/** @param {string} label @param {number} [max] @param {number} [each] */
const strList = (label, max = 50, each = 200) => z.array(text(label, each), { error: `${label}s must be a list.` }).max(max, `Too many ${label.toLowerCase()}s (max ${max}).`);

const dateField = (label) =>
  z
    .string({ error: `Enter the ${label.toLowerCase()}.` })
    .trim()
    .refine(isValidDateStr, `${label} must be a real date written as YYYY-MM-DD, for example 2026-11-25.`);
const timeField = (label) =>
  z
    .string({ error: `Enter the ${label.toLowerCase()}.` })
    .trim()
    .regex(TIME_RE, `${label} must be a time on the 24-hour clock written as HH:MM, for example 09:00 or 14:30.`);

const emailOrBlank = z
  .string({ error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .max(200, 'Email is too long.')
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address, or leave it blank.');

const externalSchema = z
  .object({
    name: text('Name', 200).min(1, 'Enter a name for the external invitee.'),
    email: emailOrBlank.optional(),
    rsvp: z.enum(DIARY_RSVPS, { error: `RSVP must be one of: ${DIARY_RSVPS.join(', ')}.` }).optional(),
    respondedAt: z.string().max(40).nullable().optional(),
    respondedNote: text('Note', 1000).optional(),
  })
  .strict();

const entryShape = {
  title: text('Title', 200).min(1, 'Enter a title for the entry.'),
  cat: z.enum(DIARY_CATS, { error: `Category must be one of: ${DIARY_CATS.join(', ')}.` }),
  date: dateField('Date'),
  endDate: dateField('End date').nullable().optional(),
  startTime: timeField('Start time').nullable().optional(),
  endTime: timeField('End time').nullable().optional(),
  allDay: z.boolean({ error: 'allDay must be true or false.' }).optional(),
  loc: text('Location', 200).optional(),
  notes: text('Notes', 10_000).optional(),
  reminder: z.enum(DIARY_REMINDERS, { error: `Reminder must be one of: ${DIARY_REMINDERS.join(', ')}.` }).optional(),
  attendees: strList('Invitee').optional(),
  external: z.array(externalSchema, { error: 'external must be a list of { name, email }.' }).max(50, 'Too many external invitees (max 50).').optional(),
  /** Whose diary — defaults to mine; filling in someone else's needs edit access to it. */
  owner: text('Diary owner', 120).min(1, 'Enter whose diary this is.').optional(),
};

export const createSchema = z.object(entryShape).strict();
export const patchSchema = z
  .object({ ...entryShape, title: entryShape.title.optional(), cat: entryShape.cat.optional(), date: entryShape.date.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

/** List contract for GET /api/diary (Backend/README.md "API conventions"). @type {import('../utils/listQuery.js').ListSpec} */
export const DIARY_LIST = {
  searchFields: ['title', 'notes', 'loc', 'attendees', 'external.name', 'owner'],
  filterFields: {
    cat: 'enum',
    addedBy: 'enum',
    reminder: 'string',
    allDay: 'boolean',
    // People are name strings, with or without a "(role)" suffix — match them the way meetings do.
    owner: (values) => (values.length === 1 ? nameClause('owner', values[0]) : { $or: values.map((v) => nameClause('owner', v)) }),
    attendee: (values) => (values.length === 1 ? nameClause('attendees', values[0]) : { $or: values.map((v) => nameClause('attendees', v)) }),
  },
  enums: { cat: DIARY_CATS, addedBy: ADDED_BY },
  // from / to default to `days`, so a multi-day entry is returned by every window it overlaps —
  // the calendar always asks for exactly one month, week or day, inclusive of both edges.
  dateFields: ['days', 'date', 'createdAt'],
  defaultDateField: 'days',
  stringDateFields: ['days', 'date'],
  sortFields: ['date', 'startTime', 'title', 'cat', 'owner', 'createdAt', 'updatedAt'],
  defaultSort: 'date,startTime',
  fields: [
    'owner', 'ownerId', 'title', 'cat', 'date', 'endDate', 'startTime', 'endTime', 'allDay', 'loc', 'notes', 'reminder',
    'attendees', 'external', 'addedBy', 'createdBy', 'createdAt', 'updatedAt',
  ],
};

/** @param {unknown} v a raw `owner=` query value */
const ownerNames = (v) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * GET /api/diary — my own diary by default.
 *
 * `owner=<name>` reads that person's diary (needs access to it), `mine=false` widens the list to
 * every diary I may read (mine + the ones delegated to me; an admin sees all).
 * @type {import('express').RequestHandler}
 */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'] });
  const lq = buildListQuery(query, DIARY_LIST);
  const owners = ownerNames(query.owner);
  if (owners.length) {
    for (const o of owners) diary.requireDiaryAccess(me, o, 'view');
  } else if (flags.mine === 'false') {
    const clause = diary.visibleClause(me);
    if (Object.keys(clause).length) andClause(lq, clause, 'mine', false);
    else lq.applied.filters.mine = false;
  } else {
    andClause(lq, diary.ownClause(me), 'mine', true);
  }
  res.json(await diary.listEntries(lq));
};

/** POST /api/diary @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const e = await diary.createEntry(req.body, me);
  await diary.notifyEntryCreated(e, me);
  const people = e.attendees.length + e.external.length;
  res.locals.audit = {
    entity: e.title,
    entityId: e._id.toString(),
    details: `Added a ${e.cat} entry to ${e.owner}'s diary on ${e.date}${e.allDay ? ' (all day)' : ` at ${e.startTime}`}${people ? ` · ${people} invitee${people === 1 ? '' : 's'}` : ''}`,
  };
  res.status(201).json({ entry: serializeDiaryEntry(e) });
};

/** GET /api/diary/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  const me = currentUser(req);
  const e = await diary.findEntryOr404(req.params.id);
  diary.requireDiaryAccess(me, e.owner, 'view');
  res.json({ entry: serializeDiaryEntry(e) });
};

/** PATCH /api/diary/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const e = await diary.findEntryOr404(req.params.id);
  diary.requireDiaryAccess(me, e.owner, 'edit');
  const before = await diary.patchEntry(e, req.body, me);
  const details = describeChanges(before, diary.entrySnapshot(e), diary.DIARY_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: e.title, entityId: e._id.toString(), details: `${details} · on ${e.owner}'s diary` } : false;
  res.json({ entry: serializeDiaryEntry(e) });
};

/** DELETE /api/diary/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const e = await diary.findEntryOr404(req.params.id);
  diary.requireDiaryAccess(me, e.owner, 'edit');
  await e.deleteOne();
  res.locals.audit = {
    entity: e.title,
    entityId: e._id.toString(),
    details: `Removed the ${e.cat} entry of ${e.date} from ${e.owner}'s diary${e.loc ? ` (${short(e.loc, 40)})` : ''}`,
  };
  res.json({ ok: true });
};
