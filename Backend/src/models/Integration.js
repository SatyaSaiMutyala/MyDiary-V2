import { Schema, model } from 'mongoose';

/**
 * One row of the Integrations register (web/src/data/integrations.js shape + category/order).
 *
 * This is a REGISTER, not a connector: `status`, `lastSync` and `settings` are stored state that says which
 * third-party tool an admin has switched on, who switched it and when. The API never talks to Google, Slack,
 * Teams, Zoom or anything else, and deliberately has nowhere to keep a third-party token or secret.
 */

export const INTEGRATION_STATUSES = /** @type {const} */ (['connected', 'pending', 'disconnected']);
export const INTEGRATION_CATEGORIES = /** @type {const} */ (['calendar', 'video', 'chat', 'crm', 'finance', 'tasks', 'ai', 'storage']);
export const SYNC_FREQUENCIES = /** @type {const} */ (['realtime', '15min', 'hourly', 'daily', 'manual']);

/** The mono line under the card's buttons for each state. @param {string} status */
export const syncLabel = (status) => (status === 'connected' ? 'Just now' : status === 'pending' ? 'Setup in progress' : 'Not connected');

const integrationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    /** Emoji shown in the card's tile. */
    ico: { type: String, default: '🔗', trim: true },
    desc: { type: String, default: '', trim: true },
    category: { type: String, enum: INTEGRATION_CATEGORIES, default: 'tasks', index: true },
    status: { type: String, enum: INTEGRATION_STATUSES, default: 'disconnected', index: true },
    /** Free text shown on the card ("Just now", "API healthy"). Stored text — not a live sync clock. */
    lastSync: { type: String, default: 'Not connected', trim: true },
    /** Display order, so the page keeps the prototype's order. */
    order: { type: Number, default: 0 },
    /** What an admin chose for this tool. Stored preferences only; nothing acts on them yet. */
    settings: {
      scope: { type: String, default: '', trim: true },
      syncFrequency: { type: String, enum: SYNC_FREQUENCIES, default: 'hourly' },
      notes: { type: String, default: '', trim: true },
    },
    /** When it was last switched on (null while it has never been connected). */
    connectedAt: { type: Date, default: null },
    /** Who last changed this row and when — the Activity Log keeps the full trail. */
    changedAt: { type: Date, default: null },
    changedBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
integrationSchema.index({ order: 1 });
integrationSchema.index({ category: 1, order: 1 });

export const Integration = model('Integration', integrationSchema);

/** @param {any} i an Integration document */
export function serializeIntegration(i) {
  return {
    id: i._id.toString(),
    name: i.name,
    ico: i.ico ?? '🔗',
    desc: i.desc ?? '',
    category: i.category ?? 'tasks',
    status: i.status ?? 'disconnected',
    connected: (i.status ?? 'disconnected') === 'connected',
    lastSync: i.lastSync ?? '',
    order: i.order ?? 0,
    settings: {
      scope: i.settings?.scope ?? '',
      syncFrequency: i.settings?.syncFrequency ?? 'hourly',
      notes: i.settings?.notes ?? '',
    },
    connectedAt: i.connectedAt ? i.connectedAt.toISOString() : null,
    changedAt: i.changedAt ? i.changedAt.toISOString() : null,
    changedBy: { id: i.changedBy?.id ? i.changedBy.id.toString() : null, name: i.changedBy?.name ?? '' },
    createdAt: (i.createdAt ?? new Date()).toISOString(),
    updatedAt: (i.updatedAt ?? i.createdAt ?? new Date()).toISOString(),
  };
}
