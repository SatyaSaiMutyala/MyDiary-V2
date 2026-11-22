import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { MILESTONE_STATUSES, PRIORITIES, PROJECT_CATEGORIES, PROJECT_HEALTH, PROJECT_PHASES, PROJECT_STATUSES, Project, RISK_STATUSES, TASK_STATUSES, serializeProject } from '../models/Project.js';
import { ProjectTemplate, serializeProjectTemplate } from '../models/ProjectTemplate.js';
import { describeChanges } from '../services/audit.js';
import { notify } from '../services/notifications.js';
import { isValidDateStr, sameName, short } from '../services/people.js';
import * as projects from '../services/projects.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { html } from '../utils/html.js';
import { andClause, buildListQuery, extractFlags } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { text } from './meetings.js';

// ---------- shared zod pieces ----------

/** A date written as YYYY-MM-DD, or blank (milestones and tasks may have no date yet). @param {string} label */
const dateOrBlank = (label) =>
  text(label, 40).refine((v) => v === '' || isValidDateStr(v), `${label} must be a real date written as YYYY-MM-DD, or left blank.`);

const idRef = z.string({ error: 'Ids must be text.' }).trim().max(80).optional();
const linkField = z
  .union([z.string().trim().max(80), z.null()], { error: 'milestoneId must be the id of a milestone of this project, or null.' })
  .optional();

const enumField = (/** @type {readonly string[]} */ values, /** @type {string} */ label) =>
  z.enum(/** @type {[string, ...string[]]} */ ([...values]), { error: `${label} must be one of: ${values.join(', ')}.` });

const statusField = enumField(PROJECT_STATUSES, 'Status');
const categoryField = enumField(PROJECT_CATEGORIES, 'Category');
const priorityField = enumField(PRIORITIES, 'Priority');
const milestoneStatusField = enumField(MILESTONE_STATUSES, 'Milestone status');
const taskStatusField = enumField(TASK_STATUSES, 'Task status');
const riskStatusField = enumField(RISK_STATUSES, 'Risk status');

const criterion = z.object({ text: text('Acceptance criterion', 500).min(1, 'Enter the acceptance criterion.'), done: z.boolean().optional() }).strict();

const milestoneFields = {
  name: text('Milestone name', 200).min(1, 'Enter the milestone name.'),
  dueDate: dateOrBlank('Due date').optional(),
  status: milestoneStatusField.optional(),
  owner: text('Owner', 120).optional(),
  description: text('Description', 2000).optional(),
  acceptanceCriteria: z.array(criterion, { error: 'Acceptance criteria must be a list.' }).max(40, 'A milestone can hold at most 40 acceptance criteria.').optional(),
};
const taskFields = {
  title: text('Task title', 300).min(1, 'Enter the task title.'),
  assignee: text('Assignee', 120).optional(),
  status: taskStatusField.optional(),
  dueDate: dateOrBlank('Due date').optional(),
  priority: priorityField.optional(),
  milestoneId: linkField,
};
const kpiFields = {
  name: text('KPI name', 200).min(1, 'Enter the KPI name.'),
  current: z.number({ error: 'The current value must be a number.' }).optional(),
  target: z.number({ error: 'The target must be a number.' }).optional(),
  // Not trimmed: ' days left' and ' · ₹28L' read as written, right after the number.
  unit: z.string({ error: 'Unit must be text.' }).max(60, 'Unit is too long (max 60).').optional(),
};
const riskFields = {
  title: text('Risk title', 300).min(1, 'Enter the risk title.'),
  severity: priorityField.optional(),
  mitigation: text('Mitigation plan', 2000).optional(),
  owner: text('Risk owner', 120).optional(),
  status: riskStatusField.optional(),
  milestoneId: linkField,
};
const memberFields = { name: text('Name', 200).min(1, 'Enter the team member’s name.'), role: text('Role', 120).optional() };
const externalFields = {
  name: text('Name', 200).min(1, 'Enter the collaborator’s name.'),
  email: text('Email', 200)
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address, or leave it blank.')
    .optional(),
  role: text('Role / organisation', 120).optional(),
};

const listOf = (/** @type {z.ZodType} */ item, /** @type {string} */ label, /** @type {number} */ max) =>
  z.array(item, { error: `${label} must be a list.` }).max(max, `Too many ${label.toLowerCase()} (max ${max}).`);

const milestoneItem = z.object({ id: idRef, ...milestoneFields }).strict();
const taskItem = z.object({ id: idRef, ...taskFields }).strict();
const kpiItem = z.object({ id: idRef, ...kpiFields }).strict();
const riskItem = z.object({ id: idRef, ...riskFields }).strict();
const memberItem = z.object({ id: idRef, ...memberFields }).strict();
const externalItem = z.object({ id: idRef, ...externalFields }).strict();

const projectShape = {
  code: text('Project code', 40).optional(),
  name: text('Project name', 200).min(1, 'Enter a project name.'),
  description: text('Description', 5000).optional(),
  category: categoryField.optional(),
  priority: priorityField.optional(),
  status: statusField.optional(),
  owner: text('Owner', 120).optional(),
  startDate: dateOrBlank('Start date').optional(),
  endDate: dateOrBlank('End date').optional(),
  progress: z.number({ error: 'Progress must be a number.' }).int('Progress must be a whole number.').min(0, 'Progress cannot be below 0%.').max(100, 'Progress cannot be above 100%.').optional(),
  team: listOf(memberItem, 'Team members', 60).optional(),
  external: listOf(externalItem, 'External collaborators', 60).optional(),
  milestones: listOf(milestoneItem, 'Milestones', 100).optional(),
  tasks: listOf(taskItem, 'Tasks', 300).optional(),
  kpis: listOf(kpiItem, 'KPIs', 60).optional(),
  risks: listOf(riskItem, 'Risks', 100).optional(),
};

export const createSchema = z
  .object({ ...projectShape, templateId: text('Template', 80).optional() })
  .strict()
  .refine((v) => !(v.startDate && v.endDate) || v.startDate <= v.endDate, { error: 'The end date must be on or after the start date.', path: ['endDate'] });

export const patchSchema = z
  .object({ ...projectShape, name: projectShape.name.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.')
  .refine((v) => !(v.startDate && v.endDate) || v.startDate <= v.endDate, { error: 'The end date must be on or after the start date.', path: ['endDate'] });

export const milestoneSchema = z.object(milestoneFields).strict();
export const milestonePatchSchema = z.object(milestoneFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const criterionSchema = z.object({ text: criterion.shape.text }).strict();
export const criterionPatchSchema = z
  .object({ text: criterion.shape.text.optional(), done: z.boolean({ error: 'done must be true or false.' }).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send done, text, or both.');
export const taskSchema = z.object(taskFields).strict();
export const taskPatchSchema = z.object(taskFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const kpiSchema = z.object(kpiFields).strict();
export const kpiPatchSchema = z.object(kpiFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const riskSchema = z.object(riskFields).strict();
export const riskPatchSchema = z.object(riskFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const memberSchema = z.object(memberFields).strict();
export const memberPatchSchema = z.object(memberFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const externalSchema = z.object(externalFields).strict();
export const externalPatchSchema = z.object(externalFields).partial().strict().refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');
export const commentSchema = z.object({ text: text('Comment', 2000).min(1, 'Write something before posting the comment.') }).strict();
export const templateUseSchema = z
  .object({
    name: text('Project name', 200).optional(),
    code: text('Project code', 40).optional(),
    owner: text('Owner', 120).optional(),
    startDate: dateOrBlank('Start date').optional(),
    priority: priorityField.optional(),
    status: statusField.optional(),
  })
  .strict();

// ---------- list contracts ----------

const SERIALIZED_FIELDS = [
  'code', 'name', 'description', 'category', 'priority', 'status', 'owner', 'startDate', 'endDate', 'progress', 'health', 'phase',
  'team', 'external', 'milestones', 'tasks', 'kpis', 'risks', 'activity', 'template', 'createdBy', 'createdAt', 'updatedAt',
  'milestoneCount', 'doneMilestones', 'taskCount', 'openRisks',
];

/** List contract for GET /api/projects. @type {import('../utils/listQuery.js').ListSpec} */
export const PROJECTS_LIST = {
  searchFields: ['name', 'code', 'description', 'owner', 'team.name', 'external.name', 'milestones.name', 'tasks.title', 'risks.title'],
  filterFields: {
    status: 'enum',
    category: 'enum',
    priority: 'enum',
    health: 'enum',
    phase: 'enum',
    code: 'string',
    template: 'id',
    owner: (values) => (values.length === 1 ? projects.ownerClause(values[0]) : { $or: values.map(projects.ownerClause) }),
    member: (values) => (values.length === 1 ? projects.memberClause(values[0]) : { $or: values.map(projects.memberClause) }),
  },
  enums: { status: PROJECT_STATUSES, category: PROJECT_CATEGORIES, priority: PRIORITIES, health: PROJECT_HEALTH, phase: PROJECT_PHASES },
  dateFields: ['startDate', 'endDate', 'createdAt', 'updatedAt'],
  defaultDateField: 'startDate',
  stringDateFields: ['startDate', 'endDate'],
  numberFields: ['progress'],
  sortFields: ['name', 'code', 'status', 'priority', 'category', 'owner', 'progress', 'health', 'phase', 'startDate', 'endDate', 'createdAt', 'updatedAt'],
  defaultSort: '-createdAt',
  fields: SERIALIZED_FIELDS,
};

/** List contract for GET /api/projects/templates. @type {import('../utils/listQuery.js').ListSpec} */
export const TEMPLATES_LIST = {
  searchFields: ['name', 'description', 'key', 'teamRoles', 'milestones.name', 'tasks.name'],
  filterFields: { category: 'enum', key: 'string' },
  enums: { category: PROJECT_CATEGORIES },
  dateFields: ['createdAt', 'updatedAt'],
  defaultDateField: 'createdAt',
  numberFields: ['usedCount', 'suggestedDurationDays'],
  sortFields: ['order', 'name', 'category', 'usedCount', 'suggestedDurationDays', 'createdAt', 'updatedAt'],
  defaultSort: 'order',
  fields: ['key', 'emoji', 'category', 'name', 'description', 'suggestedDurationDays', 'usedCount', 'teamRoles', 'milestones', 'tasks', 'kpis', 'risks', 'order', 'createdAt', 'updatedAt'],
};

// ---------- helpers ----------

/** @param {string} v */
function indexParam(v) {
  if (!/^\d+$/.test(v)) throw badRequest('The index must be a whole number.');
  return Number.parseInt(v, 10);
}

/**
 * Answers with the project and its activity feed. The line this request is about to have written to the
 * Activity Log (middleware/audit.js, from `res.locals.audit`) is put at the top, so the feed in the reply
 * already shows the change the caller just made.
 * @param {import('express').Request} req @param {import('express').Response} res @param {any} p @param {Record<string, unknown>} [extra]
 */
async function respond(req, res, p, extra = {}) {
  const activity = await projects.projectActivity(p._id);
  const pending = res.locals.audit;
  if (pending && typeof pending === 'object' && pending.details) {
    const now = new Date();
    activity.unshift({ user: currentUser(req).name, action: pending.details, at: projects.formatActivityAt(now), atIso: now.toISOString() });
  }
  res.json({ project: serializeProject(p, activity), ...extra });
}

/** Records what happened on this project for the Activity Log and the project's activity feed. */
const audit = (res, p, details) => {
  res.locals.audit = { entity: p.name, entityId: p._id.toString(), details };
};

/** Same, but for a change that is an update rather than the request method's own verb. */
const auditUpdate = (res, p, details) => {
  res.locals.audit = { action: 'update', entity: p.name, entityId: p._id.toString(), details };
};

/** @param {any} p @param {any} milestoneId */
const milestoneName = (p, milestoneId) => (milestoneId ? (p.milestones.id(milestoneId)?.name ?? '') : '');

/** The project's internal people (owner + team), for notifications. @param {any} p */
const projectPeople = (p) => [p.owner, ...(p.team ?? []).map((/** @type {any} */ t) => t.name)];

// ---------- the project ----------

/** GET /api/projects @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'], overdue: ['true', 'false'] });
  const lq = buildListQuery(query, PROJECTS_LIST);
  if (flags.mine === 'true') andClause(lq, projects.mineClause(me.name), 'mine', true);
  if (flags.overdue === 'true') andClause(lq, projects.overdueClause(), 'overdue', true);
  res.json(await projects.listProjects(lq));
};

/** POST /api/projects @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const { templateId, ...body } = req.body;
  const template = templateId ? await projects.findTemplateOr404(templateId) : null;
  const p = await projects.createProject(body, me, template);
  if (template) await projects.bumpTemplateUse(template._id);
  audit(res, p, `created the project${template ? ` from template "${template.name}"` : ''}`);
  const others = projectPeople(p).filter((n) => n && !sameName(n, me.name));
  if (others.length) {
    await notify({
      userNames: others,
      type: 'meeting',
      icon: '📁',
      text: html`<strong>New project:</strong> "${p.name}" (${p.code}) — ${me.name} put you on the team.`,
    });
  }
  res.status(201);
  await respond(req, res, p, { notified: others.length });
};

/** GET /api/projects/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  res.json({ project: await projects.withActivity(p) });
};

/** PATCH /api/projects/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const before = await projects.patchProject(p, req.body);
  const changes = describeChanges(before, projects.projectSnapshot(p), projects.PROJECT_CHANGE_FIELDS);
  if (changes) audit(res, p, `updated the project — ${changes}`);
  else res.locals.audit = false;
  await respond(req, res, p);
};

/** DELETE /api/projects/:id — admin, the owner or the person who created it. @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  const isOwner = sameName(p.owner, me.name) || (p.createdBy?.id && p.createdBy.id.equals(me._id));
  if (me.role !== 'admin' && !isOwner) throw forbidden('Only an admin, the project owner or the person who created this project can delete it.');
  await p.deleteOne();
  audit(res, p, `deleted the project "${short(p.name, 80)}" (${p.code})`);
  res.json({ ok: true });
};

/** POST /api/projects/:id/duplicate @type {import('express').RequestHandler} */
export const duplicate = async (req, res) => {
  const me = currentUser(req);
  const src = await projects.findProjectOr404(req.params.id);
  const p = await projects.duplicateProject(src, me);
  audit(res, p, `duplicated from ${src.code}`);
  res.status(201);
  await respond(req, res, p);
};

/** POST /api/projects/:id/comments { text } — a note on the project's activity feed. @type {import('express').RequestHandler} */
export const addComment = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  auditUpdate(res, p, `commented: "${req.body.text}"`);
  await respond(req, res, p);
};

// ---------- milestones ----------

/** POST /api/projects/:id/milestones @type {import('express').RequestHandler} */
export const addMilestone = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  const body = req.body;
  p.milestones.push({
    name: body.name,
    dueDate: body.dueDate ?? '',
    status: body.status ?? 'todo',
    owner: body.owner ?? me.name,
    description: body.description ?? '',
    acceptanceCriteria: (body.acceptanceCriteria ?? []).map((/** @type {any} */ c) => ({ text: c.text, done: !!c.done })),
  });
  await p.save();
  const m = p.milestones[p.milestones.length - 1];
  auditUpdate(res, p, `added milestone "${m.name}"`);
  if (m.owner && !sameName(m.owner, me.name)) {
    await notify({ userName: m.owner, type: 'action', icon: '🏁', text: html`<strong>${me.name}</strong> made you the owner of the milestone "${m.name}" in <em>${p.name}</em>${m.dueDate ? ` — due ${m.dueDate}` : ''}.` });
  }
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/milestones/:milestoneId @type {import('express').RequestHandler} */
export const updateMilestone = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const m = projects.milestoneOr404(p, req.params.milestoneId);
  const before = { name: m.name, dueDate: m.dueDate, status: m.status, owner: m.owner, description: m.description };
  for (const f of ['name', 'dueDate', 'status', 'owner', 'description']) if (req.body[f] !== undefined) m[f] = req.body[f];
  if (req.body.acceptanceCriteria !== undefined) m.acceptanceCriteria = req.body.acceptanceCriteria.map((/** @type {any} */ c) => ({ text: c.text, done: !!c.done }));
  await p.save();
  const statusOnly = req.body.status !== undefined && Object.keys(req.body).length === 1;
  const changes = describeChanges(before, { name: m.name, dueDate: m.dueDate, status: m.status, owner: m.owner, description: m.description }, ['name', 'dueDate', 'status', 'owner', 'description']);
  const verb = m.status === 'done' ? 'completed' : before.status === 'done' ? 'reopened' : 'set';
  auditUpdate(
    res,
    p,
    statusOnly
      ? verb === 'set'
        ? `set milestone "${m.name}" → ${m.status}`
        : `${verb} milestone "${m.name}"`
      : changes
        ? `updated milestone "${m.name}" — ${changes}`
        : `saved milestone "${m.name}"`,
  );
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/milestones/:milestoneId @type {import('express').RequestHandler} */
export const removeMilestone = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const m = projects.milestoneOr404(p, req.params.milestoneId);
  const name = m.name;
  // Tasks and risks that pointed at it become project-level work rather than disappearing with it.
  let relinked = 0;
  for (const t of p.tasks) if (t.milestoneId && t.milestoneId.equals(m._id)) { t.milestoneId = null; relinked += 1; }
  for (const r of p.risks) if (r.milestoneId && r.milestoneId.equals(m._id)) { r.milestoneId = null; relinked += 1; }
  m.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed milestone "${name}"${relinked ? ` (${relinked} linked item${relinked === 1 ? '' : 's'} became project-wide)` : ''}`);
  await respond(req, res, p);
};

/** POST /api/projects/:id/milestones/:milestoneId/criteria { text } @type {import('express').RequestHandler} */
export const addCriterion = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const m = projects.milestoneOr404(p, req.params.milestoneId);
  m.acceptanceCriteria.push({ text: req.body.text, done: false });
  await p.save();
  auditUpdate(res, p, `added acceptance criterion "${short(req.body.text, 60)}" to "${m.name}"`);
  res.status(201);
  await respond(req, res, p);
};

/**
 * PATCH /api/projects/:id/milestones/:milestoneId/criteria/:index { done?, text? } — ticking the last open
 * criterion closes the milestone, like the web's toggleAcceptanceCriterion.
 * @type {import('express').RequestHandler}
 */
export const updateCriterion = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const m = projects.milestoneOr404(p, req.params.milestoneId);
  const c = projects.criterionOr404(m, indexParam(req.params.index));
  if (req.body.text !== undefined) c.text = req.body.text;
  if (req.body.done !== undefined) c.done = req.body.done;
  const all = m.acceptanceCriteria.length > 0 && m.acceptanceCriteria.every((/** @type {any} */ x) => x.done);
  const autoClosed = all && m.status !== 'done';
  if (autoClosed) m.status = 'done';
  await p.save();
  const tick = req.body.done === undefined ? 'edited' : c.done ? 'ticked' : 'unticked';
  auditUpdate(res, p, `${tick} acceptance criterion "${short(c.text, 60)}" on "${m.name}"${autoClosed ? ' · auto-closed the milestone (all acceptance criteria met)' : ''}`);
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/milestones/:milestoneId/criteria/:index @type {import('express').RequestHandler} */
export const removeCriterion = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const m = projects.milestoneOr404(p, req.params.milestoneId);
  const idx = indexParam(req.params.index);
  const c = projects.criterionOr404(m, idx);
  const removed = c.text;
  m.acceptanceCriteria.splice(idx, 1);
  await p.save();
  auditUpdate(res, p, `removed acceptance criterion "${short(removed, 60)}" from "${m.name}"`);
  await respond(req, res, p);
};

// ---------- tasks ----------

/** POST /api/projects/:id/tasks @type {import('express').RequestHandler} */
export const addTask = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  const milestoneId = req.body.milestoneId ? projects.milestoneOr404(p, req.body.milestoneId)._id : null;
  p.tasks.push({
    title: req.body.title,
    assignee: req.body.assignee ?? me.name,
    status: req.body.status ?? 'todo',
    dueDate: req.body.dueDate ?? '',
    priority: req.body.priority ?? 'medium',
    milestoneId,
  });
  await p.save();
  const t = p.tasks[p.tasks.length - 1];
  auditUpdate(res, p, `added task "${t.title}"${milestoneId ? ` → milestone "${milestoneName(p, milestoneId)}"` : ''}`);
  if (t.assignee && !sameName(t.assignee, me.name)) {
    await notify({ userName: t.assignee, type: 'action', icon: '✓', text: html`<strong>${me.name}</strong> assigned you the task "${t.title}" in <em>${p.name}</em>${t.dueDate ? ` — due ${t.dueDate}` : ''}.` });
  }
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/tasks/:taskId @type {import('express').RequestHandler} */
export const updateTask = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  const t = projects.taskOr404(p, req.params.taskId);
  const before = { title: t.title, assignee: t.assignee, status: t.status, dueDate: t.dueDate, priority: t.priority, milestone: milestoneName(p, t.milestoneId) };
  for (const f of ['title', 'assignee', 'status', 'dueDate', 'priority']) if (req.body[f] !== undefined) t[f] = req.body[f];
  if (req.body.milestoneId !== undefined) t.milestoneId = req.body.milestoneId ? projects.milestoneOr404(p, req.body.milestoneId)._id : null;
  await p.save();
  const statusOnly = req.body.status !== undefined && Object.keys(req.body).length === 1;
  const changes = describeChanges(before, { title: t.title, assignee: t.assignee, status: t.status, dueDate: t.dueDate, priority: t.priority, milestone: milestoneName(p, t.milestoneId) }, ['title', 'assignee', 'status', 'dueDate', 'priority', 'milestone']);
  auditUpdate(res, p, statusOnly ? `moved task "${t.title}" → ${t.status}` : changes ? `updated task "${t.title}" — ${changes}` : `saved task "${t.title}"`);
  if (req.body.assignee !== undefined && !sameName(before.assignee, t.assignee) && t.assignee && !sameName(t.assignee, me.name)) {
    await notify({ userName: t.assignee, type: 'action', icon: '✓', text: html`<strong>${me.name}</strong> moved the task "${t.title}" in <em>${p.name}</em> to you.` });
  }
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/tasks/:taskId @type {import('express').RequestHandler} */
export const removeTask = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const t = projects.taskOr404(p, req.params.taskId);
  const title = t.title;
  t.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed task "${title}"`);
  await respond(req, res, p);
};

// ---------- risks ----------

/** POST /api/projects/:id/risks @type {import('express').RequestHandler} */
export const addRisk = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  const milestoneId = req.body.milestoneId ? projects.milestoneOr404(p, req.body.milestoneId)._id : null;
  p.risks.push({
    title: req.body.title,
    severity: req.body.severity ?? 'medium',
    mitigation: req.body.mitigation ?? '',
    owner: req.body.owner ?? me.name,
    status: req.body.status ?? 'open',
    milestoneId,
  });
  await p.save();
  const r = p.risks[p.risks.length - 1];
  auditUpdate(res, p, `added risk "${r.title}"${milestoneId ? ` → milestone "${milestoneName(p, milestoneId)}"` : ''}`);
  if (r.owner && !sameName(r.owner, me.name)) {
    await notify({ userName: r.owner, type: 'action', icon: '⚠', text: html`<strong>${me.name}</strong> made you the owner of the ${r.severity} risk "${r.title}" in <em>${p.name}</em>.` });
  }
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/risks/:riskId @type {import('express').RequestHandler} */
export const updateRisk = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const r = projects.riskOr404(p, req.params.riskId);
  const before = { title: r.title, severity: r.severity, mitigation: r.mitigation, owner: r.owner, status: r.status, milestone: milestoneName(p, r.milestoneId) };
  for (const f of ['title', 'severity', 'mitigation', 'owner', 'status']) if (req.body[f] !== undefined) r[f] = req.body[f];
  const relinked = req.body.milestoneId !== undefined;
  if (relinked) r.milestoneId = req.body.milestoneId ? projects.milestoneOr404(p, req.body.milestoneId)._id : null;
  await p.save();
  const keys = Object.keys(req.body);
  const after = { title: r.title, severity: r.severity, mitigation: r.mitigation, owner: r.owner, status: r.status, milestone: milestoneName(p, r.milestoneId) };
  let details;
  if (keys.length === 1 && keys[0] === 'status' && before.status !== r.status) details = `${r.status === 'mitigated' ? 'mitigated' : 're-opened'} risk "${r.title}"`;
  else if (keys.length === 1 && relinked) details = r.milestoneId ? `linked risk "${r.title}" → milestone "${after.milestone}"` : `made risk "${r.title}" project-wide`;
  else {
    const changes = describeChanges(before, after, ['title', 'severity', 'mitigation', 'owner', 'status', 'milestone']);
    details = changes ? `updated risk "${r.title}" — ${changes}` : `saved risk "${r.title}"`;
  }
  auditUpdate(res, p, details);
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/risks/:riskId @type {import('express').RequestHandler} */
export const removeRisk = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const r = projects.riskOr404(p, req.params.riskId);
  const title = r.title;
  r.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed risk "${title}"`);
  await respond(req, res, p);
};

// ---------- KPIs ----------

/** POST /api/projects/:id/kpis @type {import('express').RequestHandler} */
export const addKpi = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  p.kpis.push({ name: req.body.name, current: req.body.current ?? 0, target: req.body.target ?? 100, unit: req.body.unit ?? '' });
  await p.save();
  const k = p.kpis[p.kpis.length - 1];
  auditUpdate(res, p, `added KPI "${k.name}" (target ${k.target}${k.unit})`);
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/kpis/:kpiId @type {import('express').RequestHandler} */
export const updateKpi = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const k = projects.kpiOr404(p, req.params.kpiId);
  const before = { name: k.name, current: k.current, target: k.target, unit: k.unit };
  for (const f of ['name', 'current', 'target', 'unit']) if (req.body[f] !== undefined) k[f] = req.body[f];
  await p.save();
  const changes = describeChanges(before, { name: k.name, current: k.current, target: k.target, unit: k.unit }, ['name', 'current', 'target', 'unit']);
  auditUpdate(res, p, changes ? `updated KPI "${k.name}" — ${changes}` : `saved KPI "${k.name}"`);
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/kpis/:kpiId @type {import('express').RequestHandler} */
export const removeKpi = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const k = projects.kpiOr404(p, req.params.kpiId);
  const name = k.name;
  k.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed KPI "${name}"`);
  await respond(req, res, p);
};

// ---------- the team ----------

/** POST /api/projects/:id/team @type {import('express').RequestHandler} */
export const addMember = async (req, res) => {
  const me = currentUser(req);
  const p = await projects.findProjectOr404(req.params.id);
  if (p.team.some((/** @type {any} */ t) => sameName(t.name, req.body.name))) throw badRequest(`${req.body.name} is already on this project's team.`, [{ field: 'name', message: 'Already on the team.' }]);
  p.team.push({ name: req.body.name, role: req.body.role ?? '' });
  await p.save();
  const t = p.team[p.team.length - 1];
  auditUpdate(res, p, `added ${t.name} to the team${t.role ? ` as ${t.role}` : ''}`);
  if (!sameName(t.name, me.name)) {
    await notify({ userName: t.name, type: 'meeting', icon: '👥', text: html`<strong>${me.name}</strong> added you to the project <em>${p.name}</em> (${p.code})${t.role ? ` as ${t.role}` : ''}.` });
  }
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/team/:memberId @type {import('express').RequestHandler} */
export const updateMember = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const t = projects.teamMemberOr404(p, req.params.memberId);
  const before = { name: t.name, role: t.role };
  if (req.body.name !== undefined) t.name = req.body.name;
  if (req.body.role !== undefined) t.role = req.body.role;
  await p.save();
  const changes = describeChanges(before, { name: t.name, role: t.role }, ['name', 'role']);
  auditUpdate(res, p, changes ? `updated team member ${before.name} — ${changes}` : `saved team member ${t.name}`);
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/team/:memberId @type {import('express').RequestHandler} */
export const removeMember = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const t = projects.teamMemberOr404(p, req.params.memberId);
  const name = t.name;
  t.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed ${name} from the team`);
  await respond(req, res, p);
};

/** POST /api/projects/:id/external @type {import('express').RequestHandler} */
export const addExternal = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  p.external.push({ name: req.body.name, email: req.body.email ?? '', role: req.body.role ?? '' });
  await p.save();
  const e = p.external[p.external.length - 1];
  auditUpdate(res, p, `added external collaborator ${e.name}${e.role ? ` (${e.role})` : ''}`);
  res.status(201);
  await respond(req, res, p);
};

/** PATCH /api/projects/:id/external/:memberId @type {import('express').RequestHandler} */
export const updateExternal = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const e = projects.externalOr404(p, req.params.memberId);
  const before = { name: e.name, email: e.email, role: e.role };
  for (const f of ['name', 'email', 'role']) if (req.body[f] !== undefined) e[f] = req.body[f];
  await p.save();
  const changes = describeChanges(before, { name: e.name, email: e.email, role: e.role }, ['name', 'email', 'role']);
  auditUpdate(res, p, changes ? `updated external collaborator ${before.name} — ${changes}` : `saved external collaborator ${e.name}`);
  await respond(req, res, p);
};

/** DELETE /api/projects/:id/external/:memberId @type {import('express').RequestHandler} */
export const removeExternal = async (req, res) => {
  const p = await projects.findProjectOr404(req.params.id);
  const e = projects.externalOr404(p, req.params.memberId);
  const name = e.name;
  e.deleteOne();
  await p.save();
  auditUpdate(res, p, `removed external collaborator ${name}`);
  await respond(req, res, p);
};

// ---------- the template library ----------

/** GET /api/projects/templates @type {import('express').RequestHandler} */
export const listTemplates = async (req, res) => {
  res.json(await runList(ProjectTemplate, buildListQuery(req.query, TEMPLATES_LIST), serializeProjectTemplate));
};

/** GET /api/projects/templates/:id — by id or by key ('tpl-nabl'). @type {import('express').RequestHandler} */
export const getTemplate = async (req, res) => {
  res.json({ template: serializeProjectTemplate(await projects.findTemplateOr404(req.params.id)) });
};

/**
 * POST /api/projects/templates/:id/use — starts a project from the kit: day offsets become dates, the
 * template's milestone positions become real links, and its used count goes up.
 * @type {import('express').RequestHandler}
 */
export const useTemplate = async (req, res) => {
  const me = currentUser(req);
  const t = await projects.findTemplateOr404(req.params.id);
  const p = await projects.projectFromTemplate(t, req.body, me);
  audit(res, p, `created the project from template "${t.name}"`);
  res.status(201);
  await respond(req, res, p, { template: serializeProjectTemplate(await ProjectTemplate.findById(t._id)) });
};

