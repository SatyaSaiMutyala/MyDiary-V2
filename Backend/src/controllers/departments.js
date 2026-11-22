import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { CADENCE_TABS, Department, INDICATORS, TASK_KINDS, serializeDepartment } from '../models/Department.js';
import { TICK_KINDS } from '../models/ActivityTick.js';
import { describeChanges } from '../services/audit.js';
import * as departments from '../services/departments.js';
import { hasModule } from '../services/modules.js';
import { DATE_RE, TIME_RE, cleanName, short, todayStr } from '../services/people.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { buildListQuery } from '../utils/listQuery.js';

// ---------------------------------------------------------------- shared zod pieces

/** @param {string} label @param {number} max */
const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max} characters).`);
const timeOrBlank = z
  .string({ error: 'Time must be text.' })
  .trim()
  .refine((v) => v === '' || TIME_RE.test(v), 'Time must be written as HH:MM on the 24-hour clock, for example 09:30.');
const dayOfWeek = z.number({ error: 'A day of the week must be a number.' }).int('A day of the week must be a whole number.').min(0, 'Days of the week run from 0 (Sunday) to 6 (Saturday).').max(6, 'Days of the week run from 0 (Sunday) to 6 (Saturday).');
const daysOfWeek = z.array(dayOfWeek, { error: 'Days of the week must be a list of numbers from 0 (Sunday) to 6 (Saturday).' }).max(7, 'A task cannot have more than seven days.');
const dayOfMonth = z.union(
  [z.number().int('The date of the month must be a whole number.').min(1, 'The date of the month must be between 1 and 31.').max(31, 'The date of the month must be between 1 and 31.'), z.literal('last'), z.literal('')],
  { error: 'The date of the month must be a number from 1 to 31, or "last" for the last day of every month.' },
);
const objectId = z.string({ error: 'An id must be text.' }).regex(/^[0-9a-f]{24}$/i, 'That id is not valid. Refresh the page and try again.');
const positionIds = z.array(objectId, { error: 'Positions must be a list of ids.' }).max(50, 'Too many positions on one task (max 50).');
const dateString = z.string({ error: 'Enter a date.' }).regex(DATE_RE, 'The date must be written as YYYY-MM-DD, for example 2026-11-21.');
const indicator = z.union([z.enum(INDICATORS), z.null()], { error: `A status flag must be one of: ${INDICATORS.join(', ')} — or empty for none.` });

const positionInput = z
  .object({ name: text('Position name', 120).min(1, 'Enter a name for the position.'), description: text('Position description', 500).optional() })
  .strict();

/** A task inside a create request: `positions` are indexes into the new department's position list. */
const newTaskInput = z
  .object({
    order: z.number().int().min(1).max(999).optional(),
    text: text('Task description', 500).min(1, 'Enter what the task is.'),
    defaultTime: timeOrBlank.optional(),
    positions: z.array(z.number().int().min(0).max(49), { error: 'Task positions must be a list of position numbers.' }).max(50).optional(),
    daysOfWeek: daysOfWeek.optional(),
    dayOfMonth: dayOfMonth.optional(),
  })
  .strict();

const cadenceInput = z
  .object({
    weekly: z.object({ daysOfWeek: daysOfWeek.optional(), time: timeOrBlank.optional(), duration: z.number().int().min(5, 'A review must last at least 5 minutes.').max(600, 'A review cannot last longer than 10 hours.').optional() }).strict().optional(),
    monthly: z.object({ dayOfMonth: dayOfMonth.optional(), time: timeOrBlank.optional(), duration: z.number().int().min(5, 'A review must last at least 5 minutes.').max(600, 'A review cannot last longer than 10 hours.').optional() }).strict().optional(),
    owner: text('Owner', 200).optional(),
    primarySystems: z.array(text('System', 120), { error: 'Primary systems must be a list of names.' }).max(20, 'Too many systems (max 20).').optional(),
  })
  .strict();

const agendaPointInput = z.object({ text: text('Agenda point', 1000).min(1, 'Enter the agenda point.'), indicator: indicator.optional() }).strict();
const agendaSectionInput = z.object({ heading: text('Section heading', 200).min(1, 'Enter a heading for the section.'), points: z.array(agendaPointInput).max(100, 'Too many points in one section (max 100).').optional() }).strict();

const assignmentInput = z
  .object({
    name: text('Person', 200).min(1, 'Enter the person’s name.'),
    positionId: z.union([objectId, z.null()]).optional(),
    role: z.enum(['member', 'head', 'cmd', 'cgo'], { error: 'A role must be one of: member, head, cmd, cgo.' }).optional(),
  })
  .strict();

// ---------------------------------------------------------------- body schemas

export const createSchema = z
  .object({
    code: text('Code', 40).regex(/^[A-Za-z0-9-]+$/, 'A code can only use letters, numbers and dashes, for example TDPL-HR-001.').optional(),
    name: text('Department name', 200).min(1, 'Enter the department name.'),
    icon: text('Icon', 8).optional(),
    description: text('Description', 1000).optional(),
    order: z.number().int().min(1).max(999).optional(),
    positions: z.array(positionInput).max(50, 'Too many positions (max 50).').optional(),
    openingTasks: z.array(newTaskInput).max(100, 'Too many opening tasks (max 100).').optional(),
    closingTasks: z.array(newTaskInput).max(100, 'Too many closing tasks (max 100).').optional(),
    weeklyTasks: z.array(newTaskInput).max(100, 'Too many weekly tasks (max 100).').optional(),
    monthlyTasks: z.array(newTaskInput).max(100, 'Too many monthly tasks (max 100).').optional(),
    reviewCadence: cadenceInput.extend({
      weeklyAgenda: z.array(agendaSectionInput).max(50).optional(),
      monthlyAgenda: z.array(agendaSectionInput).max(50).optional(),
    }).optional(),
    assignments: z.array(assignmentInput.omit({ positionId: true }).extend({ position: z.number().int().min(0).max(49).optional() })).max(200).optional(),
  })
  .strict();

export const patchSchema = z
  .object({
    code: createSchema.shape.code,
    name: text('Department name', 200).min(1, 'Enter the department name.').optional(),
    icon: text('Icon', 8).optional(),
    description: text('Description', 1000).optional(),
    order: z.number().int().min(1).max(999).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one of name, icon, description, code or order.');

export const positionSchema = positionInput;
export const positionPatchSchema = z
  .object({ name: positionInput.shape.name.optional(), description: text('Position description', 500).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send a name or a description to change.');

export const taskSchema = z
  .object({
    order: z.number().int().min(1).max(999).optional(),
    text: text('Task description', 500).min(1, 'Enter what the task is.'),
    defaultTime: timeOrBlank.optional(),
    positionIds: positionIds.optional(),
    daysOfWeek: daysOfWeek.optional(),
    dayOfMonth: dayOfMonth.optional(),
  })
  .strict();
export const taskPatchSchema = z
  .object({
    order: z.number().int().min(1).max(999).optional(),
    text: text('Task description', 500).min(1, 'A task cannot have an empty description.').optional(),
    defaultTime: timeOrBlank.optional(),
    positionIds: positionIds.optional(),
    daysOfWeek: daysOfWeek.optional(),
    dayOfMonth: dayOfMonth.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

export const cadenceSchema = cadenceInput.refine((v) => Object.keys(v).length > 0, 'Send at least one of weekly, monthly, owner or primarySystems.');
export const sectionSchema = agendaSectionInput.omit({ points: true });
export const sectionPatchSchema = z
  .object({ heading: agendaSectionInput.shape.heading.optional(), order: z.number().int().min(1).max(999).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send a heading or an order to change.');
export const pointSchema = agendaPointInput;
export const pointPatchSchema = z
  .object({ text: text('Agenda point', 1000).optional(), indicator: indicator.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send the text or the status flag to change.');

export const assignmentsSchema = z.object({ assignments: z.array(assignmentInput, { error: 'assignments must be a list of people.' }).max(200, 'Too many people (max 200).') }).strict();

export const tickSchema = z
  .object({
    departmentId: objectId,
    kind: z.enum(TICK_KINDS, { error: `The lane must be one of: ${TICK_KINDS.join(', ')}.` }),
    taskId: z.string({ error: 'A task id must be text.' }).trim().min(1, 'Which task? Send its id.').max(60),
    done: z.boolean({ error: 'done must be true or false.' }),
    date: dateString.optional(),
    /** Ticking for somebody else needs the Department Master module (the web app's "View as" demo switch). */
    person: text('Person', 200).min(1, 'Enter the person’s name.').optional(),
  })
  .strict();

// ---------------------------------------------------------------- the list contract

/** @type {import('../utils/listQuery.js').ListSpec} */
export const DEPARTMENTS_LIST = {
  searchFields: [
    'name', 'code', 'description', 'positions.name', 'positions.description',
    'openingTasks.text', 'closingTasks.text', 'weeklyTasks.text', 'monthlyTasks.text',
    'reviewCadence.owner', 'reviewCadence.primarySystems', 'assignments.name',
  ],
  filterFields: {
    code: 'string',
    name: 'string',
    icon: 'string',
    position: (values) => (values.length === 1 ? departments.positionNameClause(values[0]) : { $or: values.map(departments.positionNameClause) }),
    person: (values) => (values.length === 1 ? departments.personClause(values[0]) : { $or: values.map(departments.personClause) }),
    owner: (values) => (values.length === 1 ? departments.ownerClause(values[0]) : { $or: values.map(departments.ownerClause) }),
    system: (values) => (values.length === 1 ? departments.systemClause(values[0]) : { $or: values.map(departments.systemClause) }),
    reviewDay: (values) => (values.length === 1 ? departments.reviewDayClause(values[0]) : { $or: values.map(departments.reviewDayClause) }),
  },
  dateFields: ['createdAt', 'updatedAt'],
  defaultDateField: 'createdAt',
  numberFields: ['order'],
  sortFields: ['order', 'name', 'code', 'createdAt', 'updatedAt'],
  defaultSort: 'order',
  fields: [
    'code', 'name', 'icon', 'description', 'order', 'positions', 'openingTasks', 'closingTasks', 'weeklyTasks',
    'monthlyTasks', 'reviewCadence', 'assignments', 'createdBy', 'createdAt', 'updatedAt',
  ],
};

// ---------------------------------------------------------------- helpers

/** @param {import('express').Response} res @param {any} d @param {Record<string, unknown>} [extra] */
const respond = (res, d, extra = {}) => res.json({ department: serializeDepartment(d), ...extra });

/** @param {string} v @param {readonly string[]} allowed @param {string} label */
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw badRequest(`${label} must be one of: ${allowed.join(', ')}.`, [{ field: label, message: `Unknown value "${v}".` }]);
  return v;
}

/** The task lane from the URL (`/tasks/opening`). @param {import('express').Request} req */
const kindParam = (req) => oneOf(req.params.kind, TASK_KINDS, 'kind');
/** The agenda from the URL (`/cadence/weekly/sections`). @param {import('express').Request} req */
const tabParam = (req) => oneOf(req.params.tab, CADENCE_TABS, 'tab');

/** True when this person may see other people's shift ticks (department / organisation rollups). @param {any} user */
const canSeeRollups = (user) => hasModule(user, 'dashboard') || hasModule(user, 'departments');

const ACTIVITY_PARAMS = ['date', 'scope', 'person', 'departmentId'];

/**
 * Parses the query of GET /api/departments/activity by hand, so unknown params and bad values get the same
 * clear messages as the list contract.
 * @param {Record<string, unknown>} query
 */
function activityQuery(query) {
  const unknown = Object.keys(query).filter((k) => !ACTIVITY_PARAMS.includes(k));
  if (unknown.length) throw badRequest(`Unknown query parameter${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Allowed: ${ACTIVITY_PARAMS.join(', ')}.`, [{ field: unknown[0], message: 'Unknown query parameter.' }]);
  const one = (k) => {
    const v = query[k];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === 'string' && s.trim() !== '' ? s.trim() : undefined;
  };
  const date = one('date') ?? todayStr();
  if (!DATE_RE.test(date)) throw badRequest('The date must be written as YYYY-MM-DD, for example 2026-11-21.', [{ field: 'date', message: `"${date}" is not a date.` }]);
  const scope = oneOf(one('scope') ?? 'me', ['me', 'person', 'department', 'org'], 'scope');
  const persons = (one('person') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const departmentIds = (one('departmentId') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of departmentIds) {
    if (!/^[0-9a-f]{24}$/i.test(id)) throw badRequest('departmentId must be a valid department id.', [{ field: 'departmentId', message: `"${id}" is not an id.` }]);
  }
  return { date, scope, persons, departmentIds };
}

// ---------------------------------------------------------------- department CRUD

/** GET /api/departments @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await departments.listDepartments(buildListQuery(req.query, DEPARTMENTS_LIST)));
};

/** POST /api/departments @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const d = await departments.createDepartment(req.body, me);
  res.locals.audit = {
    entity: d.name,
    entityId: d._id.toString(),
    details: `Created department ${d.code} · ${d.positions.length} position${d.positions.length === 1 ? '' : 's'} · ${d.openingTasks.length + d.closingTasks.length} daily task${d.openingTasks.length + d.closingTasks.length === 1 ? '' : 's'}`,
  };
  res.status(201);
  respond(res, d);
};

/** GET /api/departments/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  respond(res, await departments.findDepartmentOr404(req.params.id));
};

/** PATCH /api/departments/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const before = await departments.patchDepartment(d, req.body);
  const details = describeChanges(before, departments.departmentSnapshot(d), departments.DEPARTMENT_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: d.name, entityId: d._id.toString(), details } : false;
  respond(res, d);
};

/** DELETE /api/departments/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const counts = { positions: d.positions.length, tasks: d.openingTasks.length + d.closingTasks.length + d.weeklyTasks.length + d.monthlyTasks.length };
  const { ticks } = await departments.deleteDepartmentCascade(d);
  res.locals.audit = { entity: d.name, entityId: d._id.toString(), details: `Deleted department ${d.code} with ${counts.positions} position${counts.positions === 1 ? '' : 's'}, ${counts.tasks} task${counts.tasks === 1 ? '' : 's'} and ${ticks} activity tick${ticks === 1 ? '' : 's'}` };
  res.json({ ok: true });
};

// ---------------------------------------------------------------- positions

/** POST /api/departments/:id/positions @type {import('express').RequestHandler} */
export const addPosition = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const p = await departments.addPosition(d, req.body);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `Position + "${p.name}"` };
  res.status(201);
  respond(res, d, { position: { id: p._id.toString(), name: p.name, description: p.description ?? '' } });
};

/** PATCH /api/departments/:id/positions/:positionId @type {import('express').RequestHandler} */
export const updatePosition = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const { position, before } = await departments.patchPosition(d, req.params.positionId, req.body);
  const details = describeChanges(before, { name: position.name, description: position.description }, ['name', 'description']);
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `Position · ${details}` } : false;
  respond(res, d);
};

/** DELETE /api/departments/:id/positions/:positionId @type {import('express').RequestHandler} */
export const removePosition = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const r = await departments.removePosition(d, req.params.positionId);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `Position − "${r.name}"${r.untagged ? ` · ${r.untagged} task${r.untagged === 1 ? '' : 's'} reverted to all-department` : ''}` };
  respond(res, d);
};

// ---------------------------------------------------------------- tasks

/** POST /api/departments/:id/tasks/:kind @type {import('express').RequestHandler} */
export const addTask = async (req, res) => {
  const kind = kindParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const t = await departments.addTask(d, kind, req.body);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${kind} task + "${short(t.text, 60)}"${t.defaultTime ? ` at ${t.defaultTime}` : ''}` };
  res.status(201);
  respond(res, d, { taskId: t._id.toString() });
};

/** PATCH /api/departments/:id/tasks/:kind/:taskId @type {import('express').RequestHandler} */
export const updateTask = async (req, res) => {
  const kind = kindParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const { task, before } = await departments.patchTask(d, kind, req.params.taskId, req.body);
  const after = { text: task.text, defaultTime: task.defaultTime, order: task.order, positionIds: (task.positionIds ?? []).map(String), daysOfWeek: [...(task.daysOfWeek ?? [])], dayOfMonth: task.dayOfMonth };
  const details = describeChanges(before, after, ['text', 'defaultTime', 'order', 'positionIds', 'daysOfWeek', 'dayOfMonth']);
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${kind} task · ${details}` } : false;
  respond(res, d);
};

/** DELETE /api/departments/:id/tasks/:kind/:taskId @type {import('express').RequestHandler} */
export const removeTask = async (req, res) => {
  const kind = kindParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const r = await departments.removeTask(d, kind, req.params.taskId);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${kind} task − "${short(r.text, 60)}"` };
  respond(res, d);
};

// ---------------------------------------------------------------- review cadence

/** PUT /api/departments/:id/cadence @type {import('express').RequestHandler} */
export const putCadence = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const before = JSON.parse(JSON.stringify({ weekly: d.reviewCadence.weekly, monthly: d.reviewCadence.monthly, owner: d.reviewCadence.owner, primarySystems: d.reviewCadence.primarySystems }));
  const rc = await departments.putCadence(d, req.body);
  const after = JSON.parse(JSON.stringify({ weekly: rc.weekly, monthly: rc.monthly, owner: rc.owner, primarySystems: rc.primarySystems }));
  const details = describeChanges(
    { weekly: `${(before.weekly.daysOfWeek ?? []).join(',')} ${before.weekly.time} ${before.weekly.duration}m`, monthly: `${before.monthly.dayOfMonth} ${before.monthly.time} ${before.monthly.duration}m`, owner: before.owner, primarySystems: before.primarySystems },
    { weekly: `${(after.weekly.daysOfWeek ?? []).join(',')} ${after.weekly.time} ${after.weekly.duration}m`, monthly: `${after.monthly.dayOfMonth} ${after.monthly.time} ${after.monthly.duration}m`, owner: after.owner, primarySystems: after.primarySystems },
    ['weekly', 'monthly', 'owner', 'primarySystems'],
  );
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `Review cadence · ${details}` } : false;
  respond(res, d);
};

/** POST /api/departments/:id/cadence/:tab/sections @type {import('express').RequestHandler} */
export const addSection = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const s = await departments.addSection(d, tab, req.body);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda + section "${short(s.heading, 60)}"` };
  res.status(201);
  respond(res, d, { sectionId: s._id.toString() });
};

/** PATCH /api/departments/:id/cadence/:tab/sections/:sectionId @type {import('express').RequestHandler} */
export const updateSection = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const { section, before } = await departments.patchSection(d, tab, req.params.sectionId, req.body);
  const details = describeChanges(before, { heading: section.heading, order: section.order }, ['heading', 'order']);
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda section · ${details}` } : false;
  respond(res, d);
};

/** DELETE /api/departments/:id/cadence/:tab/sections/:sectionId @type {import('express').RequestHandler} */
export const removeSection = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const r = await departments.removeSection(d, tab, req.params.sectionId);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda − section "${short(r.heading, 60)}" (${r.points} point${r.points === 1 ? '' : 's'})` };
  respond(res, d);
};

/** POST /api/departments/:id/cadence/:tab/sections/:sectionId/points @type {import('express').RequestHandler} */
export const addPoint = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const { section, point } = await departments.addPoint(d, tab, req.params.sectionId, req.body);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda · "${short(section.heading, 40)}" + point "${short(point.text, 60)}"` };
  res.status(201);
  respond(res, d, { pointId: point._id.toString() });
};

/** PATCH /api/departments/:id/cadence/:tab/sections/:sectionId/points/:pointId @type {import('express').RequestHandler} */
export const updatePoint = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const { section, point, before } = await departments.patchPoint(d, tab, req.params.sectionId, req.params.pointId, req.body);
  const details = describeChanges(before, { text: point.text, indicator: point.indicator ?? null }, ['text', 'indicator']);
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda · "${short(section.heading, 40)}" · ${details}` } : false;
  respond(res, d);
};

/** DELETE /api/departments/:id/cadence/:tab/sections/:sectionId/points/:pointId @type {import('express').RequestHandler} */
export const removePoint = async (req, res) => {
  const tab = tabParam(req);
  const d = await departments.findDepartmentOr404(req.params.id);
  const r = await departments.removePoint(d, tab, req.params.sectionId, req.params.pointId);
  res.locals.audit = { action: 'update', entity: d.name, entityId: d._id.toString(), details: `${tab} agenda · "${short(r.section.heading, 40)}" − point "${short(r.text, 60)}"` };
  respond(res, d);
};

// ---------------------------------------------------------------- people

/** GET /api/departments/assignments — the org-wide person → department / position map. @type {import('express').RequestHandler} */
export const listAssignments = async (req, res) => {
  const unknown = Object.keys(req.query);
  if (unknown.length) throw badRequest(`Unknown query parameter${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. This endpoint takes no parameters.`, [{ field: unknown[0], message: 'Unknown query parameter.' }]);
  const assignments = await departments.assignmentMap();
  res.json({ assignments, total: Object.keys(assignments).length });
};

/** PUT /api/departments/:id/assignments { assignments } @type {import('express').RequestHandler} */
export const putAssignments = async (req, res) => {
  const d = await departments.findDepartmentOr404(req.params.id);
  const before = d.assignments.map((a) => a.name);
  const next = await departments.putAssignments(d, req.body.assignments);
  const details = describeChanges({ people: before }, { people: next.map((a) => a.name) }, ['people']);
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `People · ${details}` } : false;
  respond(res, d);
};

// ---------------------------------------------------------------- activity (My Activity / Dashboard)

/**
 * GET /api/departments/activity?date=&scope=me|person|department|org[&person=&departmentId=]
 * Returns the shift log in the shape the web app reads: { [person]: { [date]: { opening: { [taskId]: 'done' }, … } } }.
 * @type {import('express').RequestHandler}
 */
export const getActivity = async (req, res) => {
  const me = currentUser(req);
  const q = activityQuery(req.query);

  /** @type {string[] | null} */
  let persons = [me.name];
  if (q.scope === 'org') persons = null;
  else if (q.scope === 'person') {
    if (!q.persons.length) throw badRequest('Which person? Send person=<name>.', [{ field: 'person', message: 'person is required when scope=person.' }]);
    persons = q.persons;
  } else if (q.scope === 'department') {
    if (!q.departmentIds.length) throw badRequest('Which department? Send departmentId=<id>.', [{ field: 'departmentId', message: 'departmentId is required when scope=department.' }]);
    const docs = await Department.find({ _id: { $in: q.departmentIds } }, { assignments: 1 });
    persons = docs.flatMap((d) => (d.assignments ?? []).map((a) => a.name));
  }

  const minesOnly = persons !== null && persons.length === 1 && cleanName(persons[0]).toLowerCase() === cleanName(me.name).toLowerCase();
  if (!minesOnly && !canSeeRollups(me)) {
    throw forbidden('You can only see your own shift checklist. Ask an admin to enable the Dashboard or Department Master module to see other people.');
  }

  const log = await departments.readActivityLog({ date: q.date, persons, departmentIds: q.scope === 'department' ? q.departmentIds : null });
  // The person always has a bucket, so an untouched day reads as "nothing ticked" rather than "unknown".
  if (persons) for (const p of persons) log[p] ??= { [q.date]: { opening: {}, closing: {}, weekly: {}, monthly: {}, review: {} } };
  res.json({ date: q.date, scope: q.scope, person: minesOnly ? me.name : undefined, log });
};

/**
 * PUT /api/departments/activity { departmentId, kind, taskId, done, date?, person? } — my own tick, or
 * somebody else's when the person configures Department Master.
 * @type {import('express').RequestHandler}
 */
export const putActivityTick = async (req, res) => {
  const me = currentUser(req);
  const body = req.body;
  const date = body.date ?? todayStr();
  const person = body.person ?? me.name;
  const forSomebodyElse = cleanName(person).toLowerCase() !== cleanName(me.name).toLowerCase();
  if (forSomebodyElse && !hasModule(me, 'departments')) {
    throw forbidden('You can only tick off your own tasks. Ask an admin to enable Department Master if you need to do it for somebody else.');
  }
  const r = await departments.setTick({ person, date, departmentId: body.departmentId, kind: body.kind, taskId: body.taskId, done: body.done, by: me });
  res.locals.audit = {
    action: 'update',
    entity: r.department.name,
    entityId: r.department._id.toString(),
    details: `${date} · ${body.kind} · ${body.done ? 'ticked' : 'un-ticked'} "${short(r.text, 60)}"${forSomebodyElse ? ` for ${person}` : ''}`,
  };
  const log = await departments.readActivityLog({ date, persons: [person] });
  log[person] ??= { [date]: { opening: {}, closing: {}, weekly: {}, monthly: {}, review: {} } };
  res.json({ ok: true, date, person, log });
};
