import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { ACTION_PRIORITIES, ACTION_STATUSES, ActionItem, OWNER_TYPES, serializeAction } from '../models/ActionItem.js';
import * as actions from '../services/actionItems.js';
import { describeChanges } from '../services/audit.js';
import { findMeetingOr404 } from '../services/meetings.js';
import { nameClause, plusDays, short, todayStr } from '../services/people.js';
import { badRequest } from '../utils/errors.js';
import { andClause, buildListQuery, extractFlags } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { dateField, text } from './meetings.js';

const statusField = z.enum(ACTION_STATUSES, { error: `Status must be one of: ${ACTION_STATUSES.join(', ')}.` });
const priorityField = z.enum(ACTION_PRIORITIES, { error: `Priority must be one of: ${ACTION_PRIORITIES.join(', ')}.` });
const ownerTypeField = z.enum(OWNER_TYPES, { error: 'ownerType must be internal or external.' });

export const actionSchema = z
  .object({
    desc: text('Description', 1000).optional(),
    owner: text('Owner', 120).optional(),
    ownerType: ownerTypeField.optional(),
    deadline: dateField.optional(),
    priority: priorityField.optional(),
    status: statusField.optional(),
  })
  .strict();
export const actionPatchSchema = actionSchema.refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

/**
 * A task allocated straight from My To-Do. The description is the only thing asked for: leaving
 * the owner out gives it to yourself, and leaving the deadline out makes it a week from today.
 */
export const standaloneSchema = z
  .object({
    desc: text('Description', 1000).min(1, 'Enter what has to be done.'),
    owner: text('Owner', 120).optional(),
    ownerType: ownerTypeField.optional(),
    deadline: dateField.optional(),
    priority: priorityField.optional(),
  })
  .strict();
export const subtaskSchema = z.object({ text: text('Sub-task', 300).min(1, 'Enter the sub-task text.') }).strict();
export const subtaskPatchSchema = z.object({ done: z.boolean({ error: 'done must be true or false.' }) }).strict();
export const commentSchema = z.object({ text: text('Comment', 2000).min(1, 'Enter a comment.') }).strict();
export const dependencySchema = z.object({ dependsOn: z.string({ error: 'dependsOn must be an action item id.' }).regex(/^[0-9a-f]{24}$/i, 'dependsOn must be an action item id.') }).strict();

/** `overdue=true|false` */
function overdueClause(values) {
  const v = values[0];
  if (values.length !== 1 || !['true', 'false'].includes(v)) throw badRequest('overdue must be true or false.', [{ field: 'overdue', message: 'Use true or false.' }]);
  const today = todayStr();
  return v === 'true' ? { deadline: { $lt: today }, status: { $ne: 'done' } } : { $or: [{ deadline: { $gte: today } }, { status: 'done' }] };
}

/** List contract for GET /api/action-items. @type {import('../utils/listQuery.js').ListSpec} */
export const ACTIONS_LIST = {
  searchFields: ['desc', 'owner', 'meetingTitle'],
  filterFields: { status: 'enum', priority: 'enum', owner: 'string', ownerType: 'enum', meetingId: 'id', overdue: overdueClause },
  enums: { status: ACTION_STATUSES, priority: ACTION_PRIORITIES, ownerType: OWNER_TYPES },
  dateFields: ['deadline', 'createdAt'],
  defaultDateField: 'deadline',
  stringDateFields: ['deadline'],
  sortFields: ['deadline', 'priority', 'status', 'owner', 'meetingTitle', 'createdAt', 'updatedAt'],
  defaultSort: 'deadline',
  fields: ['meetingId', 'meetingTitle', 'desc', 'owner', 'ownerShort', 'ownerType', 'deadline', 'priority', 'status', 'isOverdue', 'subtasks', 'dependencies', 'comments', 'history', 'createdBy', 'createdAt', 'updatedAt'],
};

/** @param {string} v */
function indexParam(v) {
  if (!/^\d+$/.test(v)) throw badRequest('index must be a whole number.');
  return Number.parseInt(v, 10);
}

/** GET /api/action-items @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { mine: ['true', 'false'] });
  const lq = buildListQuery(query, ACTIONS_LIST);
  if (flags.mine === 'true') andClause(lq, nameClause('owner', me.name), 'mine', true);
  res.json(await runList(ActionItem, lq, serializeAction));
};

/** POST /api/meetings/:id/action-items @type {import('express').RequestHandler} */
/** POST /api/action-items — allocate a task with no meeting behind it. @type {import('express').RequestHandler} */
export const createStandalone = async (req, res) => {
  const me = currentUser(req);
  const a = await actions.createStandalone(req.body, me);
  const mine = a.owner === me.name;
  res.locals.audit = { entity: a.desc || '(untitled task)', entityId: a._id.toString(), details: `Task allocated to ${mine ? 'themselves' : a.owner} · due ${a.deadline}` };
  res.status(201).json({ action: serializeAction(a) });
};

export const createForMeeting = async (req, res) => {
  const me = currentUser(req);
  const m = await findMeetingOr404(req.params.id);
  const a = await actions.createAction(m, req.body, me);
  res.locals.audit = { entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Action item added to "${m.title}"${a.owner ? ` · owner: ${a.owner}` : ''} · due ${a.deadline}` };
  res.status(201).json({ action: serializeAction(a) });
};

/** POST /api/meetings/:id/action-items/extract — commitments found in the minutes' Decisions text. @type {import('express').RequestHandler} */
export const extractFromMinutes = async (req, res) => {
  const me = currentUser(req);
  const m = await findMeetingOr404(req.params.id);
  const candidates = actions.extractCandidates(m.minutes);
  if (!candidates.length) {
    res.locals.audit = false;
    return res.json({ created: [], count: 0, message: actions.NO_CANDIDATES_MESSAGE });
  }
  const created = [];
  for (const c of candidates) created.push(await actions.createAction(m, { desc: c, deadline: plusDays(7) }, me, 'extracted from the minutes'));
  res.locals.audit = { entity: m.title, entityId: m._id.toString(), details: `Extracted ${created.length} action item${created.length === 1 ? '' : 's'} from the minutes` };
  res.status(201).json({ created: created.map(serializeAction), count: created.length });
};

/** GET /api/action-items/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ action: serializeAction(await actions.findActionOr404(req.params.id)) });
};

/** PATCH /api/action-items/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const a = await actions.findActionOr404(req.params.id);
  const before = await actions.patchAction(a, req.body, me);
  const details = describeChanges(before, actions.actionSnapshot(a), actions.ACTION_CHANGE_FIELDS);
  res.locals.audit = details ? { entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `${details} · in "${a.meetingTitle}"` } : false;
  res.json({ action: serializeAction(a) });
};

/** DELETE /api/action-items/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const a = await actions.findActionOr404(req.params.id);
  await a.deleteOne();
  await ActionItem.updateMany({ 'dependencies.id': a._id.toString() }, { $pull: { dependencies: { id: a._id.toString() } } });
  res.locals.audit = { entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Deleted ${a.status} action item from "${a.meetingTitle}"${a.owner ? ` (owner: ${a.owner})` : ''}` };
  res.json({ ok: true });
};

/** POST /api/action-items/:id/subtasks { text } @type {import('express').RequestHandler} */
export const addSubtask = async (req, res) => {
  const me = currentUser(req);
  const a = await actions.addSubtask(await actions.findActionOr404(req.params.id), req.body.text, me);
  res.locals.audit = { action: 'update', entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Sub-task added: "${short(req.body.text, 60)}"` };
  res.status(201).json({ action: serializeAction(a) });
};

/** PATCH /api/action-items/:id/subtasks/:index { done } @type {import('express').RequestHandler} */
export const setSubtask = async (req, res) => {
  const me = currentUser(req);
  const idx = indexParam(req.params.index);
  const a = await actions.setSubtask(await actions.findActionOr404(req.params.id), idx, req.body.done, me);
  res.locals.audit = { entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Sub-task ${req.body.done ? 'completed' : 'reopened'}: "${short(a.subtasks[idx].text, 60)}"` };
  res.json({ action: serializeAction(a) });
};

/** POST /api/action-items/:id/comments { text } @type {import('express').RequestHandler} */
export const addComment = async (req, res) => {
  const me = currentUser(req);
  const a = await actions.addComment(await actions.findActionOr404(req.params.id), req.body.text, me);
  res.locals.audit = { action: 'update', entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Comment: "${short(req.body.text, 80)}"` };
  res.status(201).json({ action: serializeAction(a) });
};

/** POST /api/action-items/:id/dependencies { dependsOn } @type {import('express').RequestHandler} */
export const addDependency = async (req, res) => {
  const me = currentUser(req);
  const a = await actions.addDependency(await actions.findActionOr404(req.params.id), req.body.dependsOn, me);
  const dep = a.dependencies[a.dependencies.length - 1];
  res.locals.audit = { action: 'update', entity: a.desc || '(untitled action)', entityId: a._id.toString(), details: `Now depends on "${short(dep.desc || dep.id, 60)}"` };
  res.status(201).json({ action: serializeAction(a) });
};
