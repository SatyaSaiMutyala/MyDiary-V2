import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { INTEGRATION_CATEGORIES, INTEGRATION_STATUSES, Integration, SYNC_FREQUENCIES, serializeIntegration } from '../models/Integration.js';
import * as integrations from '../services/integrations.js';
import { badRequest } from '../utils/errors.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';

/** @param {string} label @param {number} max */
const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max}).`);

const statusField = z.enum(INTEGRATION_STATUSES, { error: `Status must be one of: ${INTEGRATION_STATUSES.join(', ')}.` });
const categoryField = z.enum(INTEGRATION_CATEGORIES, { error: `Category must be one of: ${INTEGRATION_CATEGORIES.join(', ')}.` });
const frequencyField = z.enum(SYNC_FREQUENCIES, { error: `Sync frequency must be one of: ${SYNC_FREQUENCIES.join(', ')}.` });

const settingsSchema = z
  .object({
    scope: text('Scope', 300).optional(),
    syncFrequency: frequencyField.optional(),
    notes: text('Notes', 1000).optional(),
  })
  .strict();

/** POST /:id/connect · /:id/disconnect · /:id/pending — an optional one-line reason, kept with the record. */
export const toggleSchema = z.object({ note: text('Note', 1000).optional() }).strict();

export const settingsBodySchema = settingsSchema;

export const createSchema = z
  .object({
    name: text('Name', 120).min(1, 'Enter the name of the tool.'),
    ico: text('Icon', 8).optional(),
    desc: text('Description', 500).optional(),
    category: categoryField.optional(),
    status: statusField.optional(),
    lastSync: text('Last sync', 80).optional(),
    order: z.number({ error: 'Order must be a whole number.' }).int('Order must be a whole number.').min(0, 'Order must be 0 or more.').optional(),
    settings: settingsSchema.optional(),
  })
  .strict();

export const updateSchema = createSchema.partial().strict().refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

/**
 * List contract for GET /api/integrations. `connected=true|false` is the plain-language version of
 * `status=connected`. @type {import('../utils/listQuery.js').ListSpec}
 */
export const INTEGRATIONS_LIST = {
  searchFields: ['name', 'desc', 'category', 'settings.notes', 'settings.scope'],
  filterFields: {
    category: 'enum',
    status: 'enum',
    syncFrequency: 'enum',
    changedBy: 'string',
    connected: (values) => {
      const v = values.length === 1 ? values[0] : '';
      if (v !== 'true' && v !== 'false') throw badRequest('connected must be true or false.', [{ field: 'connected', message: `Unknown value "${values.join(',')}".` }]);
      return v === 'true' ? { status: 'connected' } : { status: { $ne: 'connected' } };
    },
  },
  enums: { category: INTEGRATION_CATEGORIES, status: INTEGRATION_STATUSES, syncFrequency: SYNC_FREQUENCIES },
  filterPaths: { syncFrequency: 'settings.syncFrequency', changedBy: 'changedBy.name' },
  dateFields: ['createdAt', 'updatedAt', 'connectedAt', 'changedAt'],
  defaultDateField: 'createdAt',
  numberFields: ['order'],
  sortFields: ['order', 'name', 'status', 'category', 'connectedAt', 'changedAt', 'createdAt', 'updatedAt'],
  defaultSort: 'order',
  fields: ['name', 'ico', 'desc', 'category', 'status', 'connected', 'lastSync', 'order', 'settings', 'connectedAt', 'changedAt', 'changedBy', 'createdAt', 'updatedAt'],
};

/** GET /api/integrations @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await runList(Integration, buildListQuery(req.query, INTEGRATIONS_LIST), serializeIntegration));
};

/** GET /api/integrations/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ integration: serializeIntegration(await integrations.findIntegrationOr404(req.params.id)) });
};

/** POST /api/integrations @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const i = await integrations.createIntegration(req.body, me);
  res.locals.audit = { entity: i.name, entityId: i._id.toString(), details: `Added ${i.name} to the register (${i.category}, ${i.status})` };
  res.status(201).json({ integration: serializeIntegration(i) });
};

/** PATCH /api/integrations/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const doc = await integrations.findIntegrationOr404(req.params.id);
  const { doc: saved, changed } = await integrations.updateIntegration(doc, req.body, me);
  res.locals.audit = { entity: saved.name, entityId: saved._id.toString(), details: changed.length ? changed.join(' · ') : 'No change' };
  res.json({ integration: serializeIntegration(saved) });
};

/** PATCH /api/integrations/:id/settings @type {import('express').RequestHandler} */
export const saveSettings = async (req, res) => {
  const me = currentUser(req);
  const doc = await integrations.findIntegrationOr404(req.params.id);
  const { doc: saved, changed } = await integrations.updateSettings(doc, req.body, me);
  res.locals.audit = { entity: saved.name, entityId: saved._id.toString(), details: changed.length ? `Settings · ${changed.join(' · ')}` : 'Settings unchanged' };
  res.json({ integration: serializeIntegration(saved) });
};

/**
 * POST /api/integrations/:id/connect · /disconnect · /pending — records that an admin switched this tool
 * on or off. It stores state; it does not authenticate with the third-party tool.
 * @param {'connected' | 'pending' | 'disconnected'} status
 * @returns {import('express').RequestHandler}
 */
export const setStatus = (status) => async (req, res) => {
  const me = currentUser(req);
  const doc = await integrations.findIntegrationOr404(req.params.id);
  const { doc: saved, was } = await integrations.setStatus(doc, status, me, req.body ?? {});
  const verb = status === 'connected' ? 'Switched on' : status === 'disconnected' ? 'Switched off' : 'Marked mid-setup';
  res.locals.audit = {
    entity: saved.name,
    entityId: saved._id.toString(),
    details: `${verb} ${saved.name} (${was} → ${status})${req.body?.note ? ` · ${req.body.note}` : ''}`,
  };
  res.json({ integration: serializeIntegration(saved) });
};

/** DELETE /api/integrations/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const doc = await integrations.findIntegrationOr404(req.params.id);
  await doc.deleteOne();
  res.locals.audit = { entity: doc.name, entityId: doc._id.toString(), details: `Removed ${doc.name} from the register (was ${doc.status})` };
  res.json({ ok: true });
};
