import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { Decision, serializeDecision } from '../models/Decision.js';
import * as decisions from '../services/decisions.js';
import { findMeetingOr404 } from '../services/meetings.js';
import { short } from '../services/people.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { text } from './meetings.js';

export const createSchema = z
  .object({
    agendaIdx: z.number({ error: 'agendaIdx must be a whole number.' }).int().min(0, 'agendaIdx must be 0 or more.').optional(),
    text: text('Decision', 2000).min(1, 'Enter the decision text.'),
    department: text('Department', 80).optional(),
    tags: z.array(text('Tag', 40).min(1), { error: 'tags must be a list of words.' }).max(20).optional(),
    decidedBy: text('Decided by', 200).optional(),
  })
  .strict();

/** List contract for GET /api/decisions. `tag=` matches any element of `tags`. @type {import('../utils/listQuery.js').ListSpec} */
export const DECISIONS_LIST = {
  searchFields: ['text', 'decidedBy', 'department', 'meetingTitle'],
  filterFields: { meetingId: 'id', department: 'string', tag: 'string', decidedBy: 'string' },
  filterPaths: { tag: 'tags' },
  dateFields: ['createdAt'],
  defaultDateField: 'createdAt',
  sortFields: ['createdAt', 'department', 'decidedBy', 'agendaIdx', 'meetingTitle'],
  defaultSort: '-createdAt',
  fields: ['meetingId', 'meetingTitle', 'agendaIdx', 'text', 'decidedBy', 'tags', 'department', 'createdBy', 'createdAt', 'updatedAt'],
};

/** GET /api/decisions @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await runList(Decision, buildListQuery(req.query, DECISIONS_LIST), serializeDecision));
};

/** POST /api/meetings/:id/decisions @type {import('express').RequestHandler} */
export const createForMeeting = async (req, res) => {
  const me = currentUser(req);
  const m = await findMeetingOr404(req.params.id);
  const d = await decisions.createDecision(m, req.body, me);
  res.locals.audit = { entity: short(d.text, 80), entityId: d._id.toString(), details: `Decision logged from "${m.title}" (agenda ${d.agendaIdx + 1}) · ${d.department} · decided by ${d.decidedBy}` };
  res.status(201).json({ decision: serializeDecision(d) });
};

/** GET /api/decisions/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ decision: serializeDecision(await decisions.findDecisionOr404(req.params.id)) });
};

/** DELETE /api/decisions/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const d = await decisions.findDecisionOr404(req.params.id);
  await d.deleteOne();
  res.locals.audit = { entity: short(d.text, 80), entityId: d._id.toString(), details: `Deleted decision from "${d.meetingTitle}" (${d.department})` };
  res.json({ ok: true });
};
