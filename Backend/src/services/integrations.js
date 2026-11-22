import mongoose from 'mongoose';
import { config } from '../config.js';
import { DEFAULT_INTEGRATIONS } from '../data/integrations.js';
import { Integration, syncLabel } from '../models/Integration.js';
import { conflict, notFound } from '../utils/errors.js';

/**
 * The Integrations register: which third-party tools are switched on. Switching one on only writes this
 * record (status + who + when) — there is no outbound call, OAuth flow, webhook or stored secret anywhere
 * in this module.
 */

/** @param {string} id */
export async function findIntegrationOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That integration does not exist.');
  const i = await Integration.findById(id);
  if (!i) throw notFound('That integration does not exist.');
  return i;
}

/**
 * Writing the starting set is only automatic on a database that is safe to write to: the embedded dev
 * database (MONGODB_URI empty) or a test database. Against a real connection string it waits for an
 * explicit `SEED_INTEGRATIONS=true`, so booting the API against production never seeds by itself.
 */
const seedingAllowed = () => config.isTest || !config.mongodbUri || process.env.SEED_INTEGRATIONS === 'true';

/**
 * Creates the 15 starting rows when the collection is empty — like ensureDefaultAdmin() on boot.
 * Idempotent: it does nothing once anything is in there, and the inserts are upserts by name so two
 * callers racing cannot double up.
 * @returns {Promise<number>} how many rows were written
 */
export async function ensureDefaultIntegrations() {
  if (!seedingAllowed()) return 0;
  await Integration.createIndexes();
  if ((await Integration.estimatedDocumentCount()) > 0) return 0;
  const ops = DEFAULT_INTEGRATIONS.map((d, idx) => ({
    updateOne: {
      filter: { name: d.name },
      update: { $setOnInsert: { ...d, order: idx + 1, settings: { scope: '', syncFrequency: 'hourly', notes: '' }, connectedAt: d.status === 'connected' ? new Date() : null, changedAt: null, changedBy: { id: null, name: '' } } },
      upsert: true,
    },
  }));
  const r = await Integration.bulkWrite(ops, { ordered: false });
  const written = r.upsertedCount ?? 0;
  if (written) console.log(`[boot] seeded ${written} integrations`);
  return written;
}

/** True once we know the register has rows, so the per-request guard stops hitting the DB. */
let seeded = false;

/** Guard for the routes: makes sure the starting set exists before any integrations request is served. */
export async function ensureIntegrationsSeeded() {
  if (seeded) return;
  await ensureDefaultIntegrations();
  seeded = true;
}

/**
 * Switches a tool on / off / back to mid-setup. Stored state only — nobody is redirected anywhere and no
 * third-party call is made.
 * @param {any} doc
 * @param {'connected' | 'pending' | 'disconnected'} status
 * @param {{ _id: any, name: string }} me
 * @param {{ note?: string }} [opts]
 */
export async function setStatus(doc, status, me, opts = {}) {
  if (doc.status === status) {
    throw conflict(status === 'connected' ? `${doc.name} is already switched on.` : status === 'disconnected' ? `${doc.name} is already switched off.` : `${doc.name} is already mid-setup.`);
  }
  const was = doc.status;
  doc.status = status;
  doc.lastSync = syncLabel(status);
  if (status === 'connected') doc.connectedAt = new Date();
  if (opts.note) doc.settings.notes = opts.note;
  doc.changedAt = new Date();
  doc.changedBy = { id: me._id, name: me.name };
  await doc.save();
  return { doc, was };
}

/**
 * Stores an admin's preferences for one tool (scope, how often it should sync, notes).
 * @param {any} doc
 * @param {{ scope?: string, syncFrequency?: string, notes?: string }} patch
 * @param {{ _id: any, name: string }} me
 */
export async function updateSettings(doc, patch, me) {
  /** @type {string[]} */
  const changed = [];
  for (const key of /** @type {const} */ (['scope', 'syncFrequency', 'notes'])) {
    if (patch[key] === undefined) continue;
    if (doc.settings[key] === patch[key]) continue;
    changed.push(`${key}: ${doc.settings[key] || '—'} → ${patch[key] || '—'}`);
    doc.settings[key] = patch[key];
  }
  if (changed.length) {
    doc.changedAt = new Date();
    doc.changedBy = { id: me._id, name: me.name };
    await doc.save();
  }
  return { doc, changed };
}

/**
 * Edits the register row itself (name, icon, description, category, order, status).
 * @param {any} doc
 * @param {Record<string, any>} patch
 * @param {{ _id: any, name: string }} me
 */
export async function updateIntegration(doc, patch, me) {
  /** @type {string[]} */
  const changed = [];
  for (const key of /** @type {const} */ (['name', 'ico', 'desc', 'category', 'order', 'status', 'lastSync'])) {
    if (patch[key] === undefined || doc[key] === patch[key]) continue;
    changed.push(`${key}: ${doc[key] === '' || doc[key] === undefined ? '—' : doc[key]} → ${patch[key]}`);
    doc[key] = patch[key];
    if (key === 'status') {
      if (patch.lastSync === undefined) doc.lastSync = syncLabel(patch.status);
      if (patch.status === 'connected') doc.connectedAt = new Date();
    }
  }
  if (patch.settings) {
    const r = await updateSettings(doc, patch.settings, me);
    changed.push(...r.changed);
  }
  if (changed.length) {
    doc.changedAt = new Date();
    doc.changedBy = { id: me._id, name: me.name };
    await doc.save();
  }
  return { doc, changed };
}

/**
 * Adds a tool to the register.
 * @param {Record<string, any>} input
 * @param {{ _id: any, name: string }} me
 */
export async function createIntegration(input, me) {
  if (await Integration.findOne({ name: input.name })) throw conflict(`${input.name} is already in the register.`);
  const status = input.status ?? 'disconnected';
  const last = await Integration.findOne({}).sort({ order: -1 }).select('order');
  return Integration.create({
    name: input.name,
    ico: input.ico || '🔗',
    desc: input.desc ?? '',
    category: input.category ?? 'tasks',
    status,
    lastSync: input.lastSync || syncLabel(status),
    order: input.order ?? (last?.order ?? 0) + 1,
    settings: { scope: input.settings?.scope ?? '', syncFrequency: input.settings?.syncFrequency ?? 'hourly', notes: input.settings?.notes ?? '' },
    connectedAt: status === 'connected' ? new Date() : null,
    changedAt: new Date(),
    changedBy: { id: me._id, name: me.name },
  });
}
