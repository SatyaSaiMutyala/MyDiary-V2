import mongoose from 'mongoose';
import { config } from '../config.js';
import { SEED_USED_COUNT, TEMPLATE_SEED } from '../data/templates.js';
import { Template } from '../models/Template.js';
import { notFound } from '../utils/errors.js';
import { seedingAllowed as seedGuard } from './seedGuard.js';

/** @param {string} id */
export async function findTemplateOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That template does not exist.');
  const t = await Template.findById(id);
  if (!t) throw notFound('That template does not exist.');
  return t;
}

/**
 * Puts the 12 library templates in place the first time the collection is empty — the same shape as
 * `ensureDefaultAdmin()` in services/users.js, and idempotent: with anything already stored it does nothing.
 * Called by the templates router before every request, so a fresh database is never an empty library.
 * @returns {Promise<number>} how many templates were inserted (0 when the library already existed)
 */
/**
 * Writing the starting set is only automatic on a database that is safe to write to: the embedded dev
 * database (MONGODB_URI empty) or a test database. Against a real connection string it waits for an
 * explicit `SEED_TEMPLATES=true`, so opening this page against production never seeds by itself.
 */
// One rule for the whole app — see services/seedGuard.js.
const seedingAllowed = seedGuard;

export async function ensureTemplateSeed() {
  if (!seedingAllowed()) return 0;
  await Template.createIndexes();
  if ((await Template.countDocuments()) > 0) return 0;
  // insertMany keeps the prototype's order, which `defaultSort: 'createdAt'` then reproduces on the page.
  const docs = await Template.insertMany(
    TEMPLATE_SEED.map((t) => ({ ...t, agendaCount: t.agenda.length, usedCount: SEED_USED_COUNT[t.name] ?? 0, createdBy: { id: null, name: '' } })),
  );
  console.log(`[boot] seeded ${docs.length} agenda templates`);
  return docs.length;
}

/**
 * @param {{ name: string, type: string, ico?: string, desc?: string, agenda?: { text: string, time?: string }[], usedCount?: number }} input
 * @param {any} me the signed-in user
 */
export function createTemplate(input, me) {
  const agenda = (input.agenda ?? []).map((a) => ({ text: a.text, time: a.time || '10m' }));
  return Template.create({
    name: input.name,
    type: input.type,
    ico: input.ico || '📋',
    desc: input.desc ?? '',
    agenda,
    usedCount: input.usedCount ?? 0,
    createdBy: { id: me._id, name: me.name },
  });
}

/**
 * Applies the fields that were sent and saves. Returns the fields that actually changed, for the Activity Log.
 * @param {any} t a Template document
 * @param {Record<string, any>} patch
 * @returns {Promise<string[]>}
 */
export async function updateTemplate(t, patch) {
  /** @type {string[]} */
  const changed = [];
  for (const key of ['name', 'type', 'ico', 'desc', 'usedCount']) {
    if (patch[key] === undefined || patch[key] === t[key]) continue;
    t[key] = patch[key];
    changed.push(key);
  }
  if (patch.agenda !== undefined) {
    const next = patch.agenda.map((/** @type {any} */ a) => ({ text: a.text, time: a.time || '10m' }));
    const before = (t.agenda ?? []).map((/** @type {any} */ a) => `${a.text}|${a.time}`).join('§');
    if (next.map((/** @type {any} */ a) => `${a.text}|${a.time}`).join('§') !== before) {
      t.agenda = next;
      changed.push('agenda');
    }
  }
  if (changed.length) await t.save();
  return changed;
}

/**
 * "Copy this template" — a fresh template with the same agenda, named "<name> (copy)" and never used yet.
 * @param {any} t a Template document
 * @param {any} me the signed-in user
 */
export function duplicateTemplate(t, me) {
  return Template.create({
    name: `${t.name} (copy)`.slice(0, 120),
    type: t.type,
    ico: t.ico,
    desc: t.desc,
    agenda: (t.agenda ?? []).map((/** @type {any} */ a) => ({ text: a.text, time: a.time })),
    usedCount: 0,
    createdBy: { id: me._id, name: me.name },
  });
}
