import { AuditLog } from '../models/AuditLog.js';

/** Route prefix (first segment after /api) → Activity Log module label. */
export const MODULE_LABELS = {
  auth: 'Session',
  users: 'Settings · Users',
  audit: 'Settings · Activity Log',
  meetings: 'Meetings',
  'action-items': 'Meetings · Action Items',
  'meeting-requests': 'Meetings · Requests',
  notifications: 'Notifications',
  decisions: 'Decisions Registry',
  templates: 'Templates',
  activity: 'My Activity',
  diary: 'My Diary',
  logs: 'Discussion Logs',
  todo: 'My To-Do',
  visits: 'Visit Observations',
  projects: 'Projects',
  departments: 'Department Master',
  integrations: 'Integrations',
  settings: 'Settings',
};

/** "/api/users/abc/reset-password" → "Settings · Users". @param {string} path */
export function moduleFromPath(path) {
  const seg = path.replace(/^\/api\/?/, '').split('/')[0] ?? '';
  return MODULE_LABELS[seg] ?? (seg ? seg[0].toUpperCase() + seg.slice(1) : 'App');
}

/**
 * @typedef {object} AuditEntry
 * @property {{ _id?: any, id?: string, name: string } | null} [user]
 * @property {import('../models/AuditLog.js').AuditAction} action
 * @property {string} module
 * @property {string} [entity]
 * @property {string} [entityId]
 * @property {string} [details]
 * @property {string} [ip]
 */

/**
 * Writes one Activity Log line. Never throws: a failed audit write must not fail the request.
 * @param {AuditEntry} entry
 */
export async function log(entry) {
  try {
    const u = entry.user;
    return await AuditLog.create({
      at: new Date(),
      user: { id: u ? (u._id ?? u.id ?? null) : null, name: u?.name ?? '' },
      action: entry.action,
      module: entry.module,
      entity: entry.entity ?? '',
      entityId: entry.entityId ?? '',
      details: entry.details ?? '',
      ip: entry.ip ?? '',
    });
  } catch (err) {
    console.error('[audit] failed to write entry', err);
    return null;
  }
}

/**
 * Human "field: old → new" summary of what a PATCH changed (first 4 fields).
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @param {string[]} fields
 */
export function describeChanges(before, after, fields) {
  const show = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    const s = Array.isArray(v) ? v.join(', ') : String(v);
    return s.length > 60 ? s.slice(0, 57) + '…' : s;
  };
  const changed = fields.filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]));
  const parts = changed.slice(0, 4).map((f) => `${f}: ${show(before[f])} → ${show(after[f])}`);
  if (changed.length > 4) parts.push(`+${changed.length - 4} more`);
  return parts.join(' · ');
}
