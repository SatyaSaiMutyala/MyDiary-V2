import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { MAX_PHOTOS, OVERALL_ASSESSMENTS, RATING_KEYS, VISIT_STATUSES, VISIT_TYPE_KEYS, Visit, serializeVisit } from '../models/Visit.js';
import { describeChanges } from '../services/audit.js';
import { nameClause, short } from '../services/people.js';
import * as visits from '../services/visits.js';
import { badRequest } from '../utils/errors.js';
import { andClause, buildListQuery, escapeRegex, extractFlags } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { dateField, text } from './meetings.js';

// ---------- zod pieces ----------
const statusField = z.enum(VISIT_STATUSES, { error: `Status must be one of: ${VISIT_STATUSES.join(', ')}.` });
const typeField = z.enum(VISIT_TYPE_KEYS, { error: `Visit type must be one of: ${VISIT_TYPE_KEYS.join(', ')}.` });
const assessmentField = z.enum([...OVERALL_ASSESSMENTS, ''], { error: `Overall assessment must be one of: ${OVERALL_ASSESSMENTS.join(', ')}.` });
/** Times and the optional dates are blank-able, because a draft is saved half-filled. */
const timeOrBlank = z
  .string({ error: 'Time must be text.' })
  .trim()
  .refine((v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'Time must be HH:MM (24-hour), or left empty.');
const dateOrBlank = z.union([z.literal(''), dateField], { error: 'Date must be a real date written as YYYY-MM-DD, or left empty.' });
const starField = z.coerce.number({ error: 'A rating must be a number from 0 to 5.' }).int('A rating must be a whole number from 0 to 5.').min(0, 'A rating must be from 0 to 5.').max(5, 'A rating must be from 0 to 5.');

const orgSchema = z
  .object({
    name: text('Organisation name', 200).optional(),
    branch: text('Branch', 200).optional(),
    address: text('Address', 500).optional(),
    city: text('City', 120).optional(),
    state: text('State', 120).optional(),
    gps: text('GPS link', 500).optional(),
  })
  .strict();

const hostSchema = z
  .object({
    name: text('Host name', 200).optional(),
    designation: text('Host designation', 200).optional(),
    phone: text('Host phone', 40).optional(),
    email: text('Host email', 200).optional(),
  })
  .strict();

const ratingsSchema = z.object(Object.fromEntries(RATING_KEYS.map((k) => [k, starField.optional()]))).strict();

export const observationSchema = z
  .object({
    category: text('Category', 80).optional(),
    observation: text('Observation', 4000).optional(),
    evidence: text('Evidence', 500).optional(),
  })
  .strict();
export const observationPatchSchema = observationSchema.refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

export const visitActionSchema = z
  .object({
    text: text('Action', 1000).optional(),
    owner: text('Owner', 200).optional(),
    deadline: dateOrBlank.optional(),
  })
  .strict();
export const visitActionPatchSchema = visitActionSchema.refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

const visitShape = {
  title: text('Visit title', 200).min(1, 'Please enter a visit title.'),
  type: typeField.optional(),
  status: statusField.optional(),
  owner: text('Owner', 200).optional(),
  date: dateField,
  timeIn: timeOrBlank.optional(),
  timeOut: timeOrBlank.optional(),
  org: orgSchema.optional(),
  host: hostSchema.optional(),
  team: z.array(text('Team member', 200).min(1, 'A team member name cannot be empty.'), { error: 'The visit team must be a list of names.' }).max(50, 'Too many team members (max 50).').optional(),
  externalParticipants: text('External participants', 1000).optional(),
  purpose: text('Purpose', 5000).optional(),
  scope: text('Scope', 5000).optional(),
  references: text('References', 2000).optional(),
  tags: z.array(text('Tag', 40).min(1, 'A tag cannot be empty.'), { error: 'Tags must be a list of words.' }).max(30, 'Too many tags (max 30).').optional(),
  ratings: ratingsSchema.optional(),
  overallAssessment: assessmentField.optional(),
  executiveSummary: text('Executive summary', 20_000).optional(),
  observations: z.array(observationSchema, { error: 'Observations must be a list.' }).max(200, 'Too many observations (max 200).').optional(),
  photos: z.coerce.number({ error: 'Photos must be a number.' }).int('Photos must be a whole number.').min(0, 'Photos cannot be negative.').max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos can be attached.`).optional(),
  actionItems: z.array(visitActionSchema, { error: 'Action items must be a list.' }).max(100, 'Too many action items (max 100).').optional(),
  nextVisitDate: dateOrBlank.optional(),
  followUpRequired: z.boolean({ error: 'followUpRequired must be true or false.' }).optional(),
  additionalRemarks: text('Additional remarks', 20_000).optional(),
};

export const createSchema = z.object(visitShape).strict();
export const patchSchema = z
  .object({ ...visitShape, title: visitShape.title.optional(), date: dateField.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');
export const statusSchema = z.object({ status: statusField }).strict();

// ---------- list contract ----------
/** `site=` is a contains match on the organisation or the branch visited, so `site=roche` finds the long name. */
function siteClause(values) {
  return { $or: values.flatMap((v) => [{ 'org.name': new RegExp(escapeRegex(v), 'i') }, { 'org.branch': new RegExp(escapeRegex(v), 'i') }]) };
}

/**
 * `severity=` is how serious the visit's finding was: the overall assessment, named the way people ask for
 * it ("show me the severe ones"). Same five values as `overallAssessment=`.
 */
function severityClause(values) {
  const bad = values.filter((v) => !OVERALL_ASSESSMENTS.includes(v));
  if (bad.length) throw badRequest(`severity must be one of: ${OVERALL_ASSESSMENTS.join(', ')}.`, [{ field: 'severity', message: `Unknown value "${bad[0]}".` }]);
  return { overallAssessment: values.length === 1 ? values[0] : { $in: values } };
}

/** List contract for GET /api/visits. @type {import('../utils/listQuery.js').ListSpec} */
export const VISITS_LIST = {
  searchFields: [
    'title', 'org.name', 'org.branch', 'org.city', 'org.state', 'host.name', 'team', 'externalParticipants',
    'purpose', 'scope', 'references', 'tags', 'executiveSummary', 'observations.observation', 'observations.category',
    'actionItems.text', 'actionItems.owner', 'additionalRemarks', 'owner',
  ],
  filterFields: {
    status: 'enum',
    type: 'enum',
    owner: 'string',
    site: siteClause,
    city: 'string',
    overallAssessment: 'enum',
    severity: severityClause,
    followUpRequired: 'boolean',
    tag: 'string',
    category: 'string',
  },
  enums: { status: VISIT_STATUSES, type: VISIT_TYPE_KEYS, overallAssessment: [...OVERALL_ASSESSMENTS, ''] },
  filterPaths: { city: 'org.city', tag: 'tags', category: 'observations.category' },
  dateFields: ['date', 'nextVisitDate', 'submittedAt', 'createdAt', 'updatedAt'],
  defaultDateField: 'date',
  stringDateFields: ['date', 'nextVisitDate'],
  numberFields: ['photos'],
  sortFields: ['date', 'title', 'type', 'status', 'owner', 'overallAssessment', 'org.name', 'nextVisitDate', 'submittedAt', 'createdAt', 'updatedAt'],
  defaultSort: '-date',
  fields: [
    'owner', 'ownerId', 'title', 'type', 'status', 'date', 'timeIn', 'timeOut', 'org', 'host', 'team', 'externalParticipants',
    'purpose', 'scope', 'references', 'tags', 'ratings', 'avgRating', 'overallAssessment', 'executiveSummary', 'observations',
    'photos', 'actionItems', 'nextVisitDate', 'followUpRequired', 'additionalRemarks', 'submittedAt', 'history', 'createdBy',
    'createdAt', 'updatedAt',
  ],
};

/** @param {string} v */
function indexParam(v) {
  if (!/^\d+$/.test(v)) throw badRequest('index must be a whole number.');
  return Number.parseInt(v, 10);
}

/** "Q3 Supplier Audit — Roche" for the Activity Log. @param {any} v */
const label = (v) => short(v.title || '(untitled visit)', 80);
/** "Roche Diagnostics · Mumbai Hub" @param {any} v */
const where = (v) => [v.org?.name, v.org?.branch].filter(Boolean).join(' · ') || 'an unnamed site';

/** GET /api/visits @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'] });
  const lq = buildListQuery(query, VISITS_LIST);
  if (flags.mine === 'true') andClause(lq, nameClause('owner', me.name), 'mine', true);
  res.json(await runList(Visit, lq, serializeVisit));
};

/** POST /api/visits @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.createVisit(req.body, me);
  res.locals.audit = { entity: label(v), entityId: v._id.toString(), details: `${v.status === 'submitted' ? 'Submitted' : 'Drafted'} ${v.type} visit to ${where(v)} on ${v.date}` };
  res.status(201).json({ visit: serializeVisit(v) });
};

/** GET /api/visits/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ visit: serializeVisit(await visits.findVisitOr404(req.params.id)) });
};

/** PATCH /api/visits/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.findVisitOr404(req.params.id);
  const before = await visits.patchVisit(v, req.body, me);
  const details = describeChanges(before, visits.visitSnapshot(v), visits.VISIT_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: label(v), entityId: v._id.toString(), details } : false;
  res.json({ visit: serializeVisit(v) });
};

/** DELETE /api/visits/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const v = await visits.findVisitOr404(req.params.id);
  await v.deleteOne();
  res.locals.audit = { entity: label(v), entityId: v._id.toString(), details: `Deleted the ${v.status} visit report for ${where(v)} (${v.date})` };
  res.json({ ok: true });
};

/** POST /api/visits/:id/status { status } @type {import('express').RequestHandler} */
export const setStatus = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.applyStatus(await visits.findVisitOr404(req.params.id), req.body.status, me);
  res.locals.audit = { action: 'update', entity: label(v), entityId: v._id.toString(), details: v.status === 'submitted' ? `Report submitted · ${v.actionItems.length} follow-up action${v.actionItems.length === 1 ? '' : 's'} sent to their owners` : 'Report reopened as a draft' };
  res.json({ visit: serializeVisit(v) });
};

// ---------- observations ----------
/** POST /api/visits/:id/observations @type {import('express').RequestHandler} */
export const addObservation = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.addObservation(await visits.findVisitOr404(req.params.id), req.body, me);
  const o = v.observations[v.observations.length - 1];
  res.locals.audit = { action: 'update', entity: label(v), entityId: v._id.toString(), details: `Observation added [${o.category}]: "${short(o.observation || '(blank)', 70)}"` };
  res.status(201).json({ visit: serializeVisit(v) });
};

/** PATCH /api/visits/:id/observations/:index @type {import('express').RequestHandler} */
export const patchObservation = async (req, res) => {
  const me = currentUser(req);
  const idx = indexParam(req.params.index);
  const v = await visits.patchObservation(await visits.findVisitOr404(req.params.id), idx, req.body, me);
  const o = v.observations[idx];
  res.locals.audit = { entity: label(v), entityId: v._id.toString(), details: `Observation ${idx + 1} edited [${o.category}]: "${short(o.observation || '(blank)', 70)}"` };
  res.json({ visit: serializeVisit(v) });
};

/** DELETE /api/visits/:id/observations/:index @type {import('express').RequestHandler} */
export const removeObservation = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.findVisitOr404(req.params.id);
  const gone = await visits.removeObservation(v, indexParam(req.params.index), me);
  res.locals.audit = { action: 'update', entity: label(v), entityId: v._id.toString(), details: `Observation removed [${gone.category}]: "${short(gone.observation || '(blank)', 70)}"` };
  res.json({ visit: serializeVisit(v) });
};

// ---------- follow-up actions ----------
/** POST /api/visits/:id/action-items @type {import('express').RequestHandler} */
export const addAction = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.addAction(await visits.findVisitOr404(req.params.id), req.body, me);
  const a = v.actionItems[v.actionItems.length - 1];
  res.locals.audit = { action: 'update', entity: label(v), entityId: v._id.toString(), details: `Follow-up action added: "${short(a.text || '(blank)', 60)}"${a.owner ? ` · owner: ${a.owner}` : ''}${a.deadline ? ` · due ${a.deadline}` : ''}` };
  res.status(201).json({ visit: serializeVisit(v) });
};

/** PATCH /api/visits/:id/action-items/:index @type {import('express').RequestHandler} */
export const patchAction = async (req, res) => {
  const me = currentUser(req);
  const idx = indexParam(req.params.index);
  const v = await visits.patchAction(await visits.findVisitOr404(req.params.id), idx, req.body, me);
  const a = v.actionItems[idx];
  res.locals.audit = { entity: label(v), entityId: v._id.toString(), details: `Follow-up action ${idx + 1} edited: "${short(a.text || '(blank)', 60)}"${a.owner ? ` · owner: ${a.owner}` : ''}${a.deadline ? ` · due ${a.deadline}` : ''}` };
  res.json({ visit: serializeVisit(v) });
};

/** DELETE /api/visits/:id/action-items/:index @type {import('express').RequestHandler} */
export const removeAction = async (req, res) => {
  const me = currentUser(req);
  const v = await visits.findVisitOr404(req.params.id);
  const gone = await visits.removeAction(v, indexParam(req.params.index), me);
  res.locals.audit = { action: 'update', entity: label(v), entityId: v._id.toString(), details: `Follow-up action removed: "${short(gone.text || '(blank)', 60)}"` };
  res.json({ visit: serializeVisit(v) });
};
