import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { MEETING_TYPES } from '../models/Meeting.js';
import { Template, serializeTemplate } from '../models/Template.js';
import { short } from '../services/people.js';
import * as templates from '../services/templates.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { text } from './meetings.js';

const TYPE_LIST = MEETING_TYPES.join(', ');

const agendaItem = z
  .object({
    text: z.string({ error: 'Every agenda item needs some text.' }).trim().min(1, 'Every agenda item needs some text.').max(200, 'An agenda item is too long (max 200 characters).'),
    time: text('Agenda item duration', 20).optional(),
  })
  .strict();

const fields = {
  name: z.string({ error: 'Enter a name for this template.' }).trim().min(1, 'Enter a name for this template.').max(120, 'The template name is too long (max 120 characters).'),
  type: z.enum(/** @type {[string, ...string[]]} */ ([...MEETING_TYPES]), { error: `Choose the meeting type this template is for: ${TYPE_LIST}.` }),
  ico: text('Icon', 8).optional(),
  desc: text('Description', 500).optional(),
  agenda: z.array(agendaItem, { error: 'The agenda must be a list of items.' }).max(40, 'A template can hold at most 40 agenda items.').optional(),
  usedCount: z.number({ error: 'Used count must be a whole number.' }).int('Used count must be a whole number.').min(0, 'Used count cannot be negative.').optional(),
};

export const createSchema = z.object(fields).strict();

export const updateSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change — send at least one field.');

/** List contract for GET /api/templates. @type {import('../utils/listQuery.js').ListSpec} */
export const TEMPLATES_LIST = {
  searchFields: ['name', 'desc', 'agenda.text', 'createdBy.name'],
  filterFields: { type: 'enum', createdBy: 'string' },
  enums: { type: [...MEETING_TYPES] },
  filterPaths: { createdBy: 'createdBy.name' },
  dateFields: ['createdAt', 'updatedAt'],
  defaultDateField: 'createdAt',
  numberFields: ['usedCount', 'agendaCount'],
  sortFields: ['name', 'type', 'usedCount', 'agendaCount', 'createdAt', 'updatedAt'],
  // Oldest first: the library then reads in the order it was seeded, with new templates at the end.
  defaultSort: 'createdAt',
  fields: ['name', 'type', 'ico', 'desc', 'agenda', 'agendaCount', 'usedCount', 'createdBy', 'createdAt', 'updatedAt'],
};

/** GET /api/templates @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await runList(Template, buildListQuery(req.query, TEMPLATES_LIST), serializeTemplate));
};

/** POST /api/templates @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const t = await templates.createTemplate(req.body, me);
  res.locals.audit = { entity: t.name, entityId: t._id.toString(), details: `Created ${t.type} template "${t.name}" with ${t.agendaCount} agenda item${t.agendaCount === 1 ? '' : 's'}` };
  res.status(201).json({ template: serializeTemplate(t) });
};

/** GET /api/templates/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ template: serializeTemplate(await templates.findTemplateOr404(req.params.id)) });
};

/** PATCH /api/templates/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const t = await templates.findTemplateOr404(req.params.id);
  const changed = await templates.updateTemplate(t, req.body);
  res.locals.audit = { entity: t.name, entityId: t._id.toString(), details: changed.length ? `Changed ${changed.join(', ')} of template "${t.name}"` : `No change to template "${t.name}"` };
  res.json({ template: serializeTemplate(t) });
};

/** DELETE /api/templates/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const t = await templates.findTemplateOr404(req.params.id);
  await t.deleteOne();
  res.locals.audit = { entity: t.name, entityId: t._id.toString(), details: `Deleted ${t.type} template "${short(t.name, 80)}"` };
  res.json({ ok: true });
};

/** POST /api/templates/:id/duplicate @type {import('express').RequestHandler} */
export const duplicate = async (req, res) => {
  const me = currentUser(req);
  const source = await templates.findTemplateOr404(req.params.id);
  const copy = await templates.duplicateTemplate(source, me);
  res.locals.audit = { entity: copy.name, entityId: copy._id.toString(), details: `Copied template "${source.name}" as "${copy.name}"` };
  res.status(201).json({ template: serializeTemplate(copy) });
};
