import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { DiscussionLog, FOLLOWUP_STATUSES, LOG_CHANNELS, LOG_PRIVACIES, PERSON_TYPES, serializeFollowUp, serializeLog } from '../models/DiscussionLog.js';
import { describeChanges } from '../services/audit.js';
import * as logs from '../services/discussionLogs.js';
import { TIME_RE, cleanName, short, todayStr } from '../services/people.js';
import { badRequest } from '../utils/errors.js';
import { andClause, buildListQuery, escapeRegex, extractFlags } from '../utils/listQuery.js';
import { listResponse, runList } from '../utils/paginate.js';
import { dateField, text } from './meetings.js';

// ---------- zod pieces ----------
const channelField = z.enum(LOG_CHANNELS, { error: `Channel must be one of: ${LOG_CHANNELS.join(', ')}.` });
const privacyField = z.enum(LOG_PRIVACIES, { error: `Privacy must be one of: ${LOG_PRIVACIES.join(', ')}.` });
const personTypeField = z.enum(PERSON_TYPES, { error: 'A person must be internal or external.' });
/** The modal saves a half-filled draft, so the optional date / time fields may be left empty. */
const timeOrBlank = z
  .string({ error: 'Time must be text.' })
  .trim()
  .refine((v) => v === '' || TIME_RE.test(v), 'Time must be HH:MM (24-hour), or left empty.');
const dateOrBlank = z.union([z.literal(''), dateField], { error: 'A deadline must be a real date written as YYYY-MM-DD, or left empty.' });
const emailOrBlank = z
  .string({ error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .max(200, 'Email is too long.')
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email.');

const personSchema = z
  .object({
    name: text('Name', 200).min(1, 'A person you spoke with needs a name.'),
    type: personTypeField.optional(),
    email: emailOrBlank.optional(),
  })
  .strict();

export const followUpSchema = z
  .object({
    text: text('Follow-up', 1000).optional(),
    owner: text('Owner', 200).optional(),
    ownerType: personTypeField.optional(),
    deadline: dateOrBlank.optional(),
    done: z.boolean({ error: 'done must be true or false.' }).optional(),
  })
  .strict();
export const followUpPatchSchema = followUpSchema.refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');
export const followUpDoneSchema = z.object({ done: z.boolean({ error: 'done must be true or false.' }) }).strict();

const logShape = {
  date: dateField,
  time: timeOrBlank.optional(),
  duration: text('Duration', 60).optional(),
  channel: channelField.optional(),
  with: z
    .array(personSchema, { error: 'Who you spoke with must be a list of people.' })
    .min(1, 'Please add at least one person you spoke with.')
    .max(50, 'Too many people in one log (max 50).'),
  topic: text('Topic', 300).min(1, 'Please enter a topic (short title for the log).'),
  summary: text('Summary', 20_000).min(1, 'Please capture what was discussed.'),
  decisions: text('Decisions', 20_000).optional(),
  tags: z.array(text('Tag', 40).min(1, 'A tag cannot be empty.'), { error: 'Tags must be a list of words.' }).max(30, 'Too many tags (max 30).').optional(),
  followUps: z.array(followUpSchema, { error: 'Follow-ups must be a list.' }).max(100, 'Too many follow-ups (max 100).').optional(),
  privacy: privacyField.optional(),
};

export const createSchema = z.object(logShape).strict();
export const patchSchema = z
  .object({
    ...logShape,
    date: dateField.optional(),
    with: logShape.with.optional(),
    topic: logShape.topic.optional(),
    summary: logShape.summary.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

// ---------- list contract ----------

/** `person=` is the person a log was with, matched whole (with or without a "(role)" suffix), several allowed. */
function personClause(values) {
  return { $or: values.map((v) => ({ 'with.name': new RegExp(`^${escapeRegex(cleanName(v))}(\\s*\\(.*\\))?$`, 'i') })) };
}

/** `topic=` is a contains match, so `topic=fernandez` finds "Fernandez contract follow-up". */
function topicClause(values) {
  return { $or: values.map((v) => ({ topic: new RegExp(escapeRegex(v), 'i') })) };
}

/**
 * `followUpStatus=` is the state of the follow-ups a log carries: `open` (something still to do — an overdue
 * one counts as open, the way the web app counts it), `overdue` (past its deadline), `done` (at least one
 * ticked) or `none` (no follow-ups at all).
 */
function followUpStatusClause(values) {
  const allowed = [...FOLLOWUP_STATUSES, 'none'];
  const bad = values.filter((v) => !allowed.includes(v));
  if (bad.length) throw badRequest(`followUpStatus must be one of: ${allowed.join(', ')}.`, [{ field: 'followUpStatus', message: `Unknown value "${bad[0]}".` }]);
  const today = todayStr();
  const clause = (v) => {
    if (v === 'done') return { followUps: { $elemMatch: { done: true } } };
    if (v === 'overdue') return { followUps: { $elemMatch: { done: { $ne: true }, deadline: { $gt: '', $lt: today } } } };
    if (v === 'none') return { followUps: { $size: 0 } };
    return { followUps: { $elemMatch: { done: { $ne: true } } } };
  };
  return values.length === 1 ? clause(values[0]) : { $or: values.map(clause) };
}

/** `hasFollowUps=true|false` — does the log carry any follow-up at all. */
function hasFollowUpsClause(values) {
  const v = values[0];
  if (values.length !== 1 || !['true', 'false'].includes(v)) throw badRequest('hasFollowUps must be true or false.', [{ field: 'hasFollowUps', message: 'Use true or false.' }]);
  return v === 'true' ? { 'followUps.0': { $exists: true } } : { followUps: { $size: 0 } };
}

/** List contract for GET /api/logs. @type {import('../utils/listQuery.js').ListSpec} */
export const LOGS_LIST = {
  searchFields: ['topic', 'summary', 'decisions', 'tags', 'with.name', 'with.email', 'owner', 'followUps.text', 'followUps.owner'],
  filterFields: {
    channel: 'enum',
    person: personClause,
    personType: 'enum',
    tag: 'string',
    topic: topicClause,
    owner: 'string',
    privacy: 'enum',
    followUpStatus: followUpStatusClause,
    hasFollowUps: hasFollowUpsClause,
  },
  enums: { channel: LOG_CHANNELS, personType: PERSON_TYPES, privacy: LOG_PRIVACIES },
  filterPaths: { tag: 'tags', personType: 'with.type' },
  dateFields: ['date', 'createdAt', 'updatedAt'],
  defaultDateField: 'date',
  stringDateFields: ['date'],
  sortFields: ['date', 'time', 'topic', 'channel', 'owner', 'privacy', 'createdAt', 'updatedAt'],
  defaultSort: '-date,-time',
  fields: [
    'owner', 'ownerId', 'date', 'time', 'duration', 'channel', 'with', 'topic', 'summary', 'decisions', 'tags',
    'followUps', 'openFollowUps', 'overdueFollowUps', 'totalFollowUps', 'privacy', 'history', 'createdBy',
    'createdAt', 'updatedAt',
  ],
};

/** The same spec with a grid-sized page, for the groupings (one row per person / per follow-up). */
const GROUPED_LIST = { ...LOGS_LIST, defaultLimit: 200 };

/**
 * Parses the query for any logs read: the shared list contract, plus `mine=true`, always narrowed to what
 * this person may see (their own logs and anything shared — `applied.filters.visibleTo` says whose read it was).
 * @param {import('express').Request} req
 * @param {{ spec?: import('../utils/listQuery.js').ListSpec, flags?: Record<string, readonly string[]> }} [opts]
 */
function readQuery(req, opts = {}) {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'], ...(opts.flags ?? {}) });
  const lq = buildListQuery(query, opts.spec ?? LOGS_LIST);
  andClause(lq, logs.visibleTo(me), 'visibleTo', me.name);
  if (flags.mine === 'true') andClause(lq, logs.ownerClause(me.name), 'mine', true);
  return { me, lq, flags };
}

/** "Fernandez contract follow-up" for the Activity Log. @param {any} l */
const label = (l) => short(l.topic || '(untitled log)', 80);
/** "Arjun, Dr. Abishekh" @param {any} l */
const withWho = (l) => (l.with ?? []).map((p) => p.name).join(', ') || 'nobody named';

// ---------- logs ----------

/** GET /api/logs @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const { lq } = readQuery(req);
  res.json(await runList(DiscussionLog, lq, serializeLog));
};

/**
 * GET /api/logs/people — one row per person the logs were with (the "By Person" grid), newest conversation
 * first. Takes every list filter; `sort=` and `fields=` do not apply to a grouped row.
 * @type {import('express').RequestHandler}
 */
export const people = async (req, res) => {
  const { lq } = readQuery(req, { spec: GROUPED_LIST });
  const { items, total } = await logs.peopleSummary(lq.filter, { skip: lq.skip, limit: lq.limit });
  res.json(listResponse(items, total, lq));
};

/** GET /api/logs/tags — the tags in use, most used first (the "All tags" filter). @type {import('express').RequestHandler} */
export const tags = async (req, res) => {
  const { lq } = readQuery(req, { spec: GROUPED_LIST });
  const items = await logs.tagSummary(lq.filter);
  res.json({ items, total: items.length });
};

/**
 * GET /api/logs/followups — every follow-up as its own row with the log it came from, plus the
 * open / overdue / done counts the view's three cards show. `status=open|overdue|done` narrows it.
 * @type {import('express').RequestHandler}
 */
export const followUps = async (req, res) => {
  const { lq, flags } = readQuery(req, { spec: GROUPED_LIST, flags: { status: FOLLOWUP_STATUSES } });
  const [{ items, total }, counts] = await Promise.all([
    logs.followUpFeed(lq.filter, { status: flags.status, skip: lq.skip, limit: lq.limit }),
    logs.followUpCounts(lq.filter),
  ]);
  if (flags.status) lq.applied.filters.status = flags.status;
  res.json({ ...listResponse(items, total, lq), counts });
};

/** POST /api/logs @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const l = await logs.createLog(req.body, me);
  res.locals.audit = {
    entity: label(l),
    entityId: l._id.toString(),
    details: `Logged a ${l.channel} conversation with ${withWho(l)} on ${l.date}${l.time ? ` at ${l.time}` : ''}${l.followUps.length ? ` · ${l.followUps.length} follow-up${l.followUps.length === 1 ? '' : 's'}` : ''}`,
  };
  res.status(201).json({ log: serializeLog(l) });
};

/** GET /api/logs/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  const me = currentUser(req);
  res.json({ log: serializeLog(await logs.findLogOr404(req.params.id, me)) });
};

/** PATCH /api/logs/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const l = logs.assertOwner(await logs.findLogOr404(req.params.id, me), me);
  const before = await logs.patchLog(l, req.body, me);
  const details = describeChanges(before, logs.logSnapshot(l), logs.LOG_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: label(l), entityId: l._id.toString(), details } : false;
  res.json({ log: serializeLog(l) });
};

/** DELETE /api/logs/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const l = logs.assertOwner(await logs.findLogOr404(req.params.id, me), me);
  await l.deleteOne();
  res.locals.audit = { entity: label(l), entityId: l._id.toString(), details: `Deleted the ${l.channel} log with ${withWho(l)} from ${l.date}` };
  res.json({ ok: true });
};

// ---------- follow-ups of one log ----------

/** The log a follow-up belongs to, which must be the signed-in person's own. @param {import('express').Request} req */
async function ownLog(req) {
  const me = currentUser(req);
  return { me, l: logs.assertOwner(await logs.findLogOr404(req.params.id, me), me) };
}

/** POST /api/logs/:id/followups @type {import('express').RequestHandler} */
export const addFollowUp = async (req, res) => {
  const { me, l } = await ownLog(req);
  const f = await logs.addFollowUp(l, req.body, me);
  res.locals.audit = {
    action: 'update',
    entity: label(l),
    entityId: l._id.toString(),
    details: `Follow-up added: "${short(f.text || '(blank)', 60)}"${f.owner ? ` · owner: ${f.owner}` : ''}${f.deadline ? ` · due ${f.deadline}` : ''}`,
  };
  res.status(201).json({ log: serializeLog(l), followUp: serializeFollowUp(f) });
};

/** PATCH /api/logs/:id/followups/:fuId @type {import('express').RequestHandler} */
export const patchFollowUp = async (req, res) => {
  const { me, l } = await ownLog(req);
  const f = await logs.patchFollowUp(l, req.params.fuId, req.body, me);
  res.locals.audit = {
    entity: label(l),
    entityId: l._id.toString(),
    details: `Follow-up edited: "${short(f.text || '(blank)', 60)}"${f.owner ? ` · owner: ${f.owner}` : ''}${f.deadline ? ` · due ${f.deadline}` : ''} · ${f.done ? 'done' : 'open'}`,
  };
  res.json({ log: serializeLog(l), followUp: serializeFollowUp(f) });
};

/** POST /api/logs/:id/followups/:fuId/status { done } — the checkbox. @type {import('express').RequestHandler} */
export const setFollowUpStatus = async (req, res) => {
  const { me, l } = await ownLog(req);
  const f = await logs.setFollowUpDone(l, req.params.fuId, req.body.done, me);
  res.locals.audit = { entity: label(l), entityId: l._id.toString(), details: `Follow-up ${f.done ? 'completed' : 'reopened'}: "${short(f.text || '(blank)', 60)}"` };
  res.json({ log: serializeLog(l), followUp: serializeFollowUp(f) });
};

/** POST /api/logs/:id/followups/:fuId/toggle — flips it (the web's toggleLogFU). @type {import('express').RequestHandler} */
export const toggleFollowUp = async (req, res) => {
  const { me, l } = await ownLog(req);
  const f = await logs.toggleFollowUp(l, req.params.fuId, me);
  res.locals.audit = { entity: label(l), entityId: l._id.toString(), details: `Follow-up ${f.done ? 'completed' : 'reopened'}: "${short(f.text || '(blank)', 60)}"` };
  res.json({ log: serializeLog(l), followUp: serializeFollowUp(f) });
};

/** DELETE /api/logs/:id/followups/:fuId @type {import('express').RequestHandler} */
export const removeFollowUp = async (req, res) => {
  const { me, l } = await ownLog(req);
  const gone = await logs.removeFollowUp(l, req.params.fuId, me);
  res.locals.audit = { action: 'update', entity: label(l), entityId: l._id.toString(), details: `Follow-up removed: "${short(gone.text || '(blank)', 60)}"` };
  res.json({ log: serializeLog(l) });
};
