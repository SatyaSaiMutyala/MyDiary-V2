/**
 * Global search registry behind GET /api/search. Each module registers a provider once; the web app's command
 * palette then hits a single endpoint. Add a module:
 *
 *   registerSearch({ key: 'meetings', label: 'Meetings', canUse: (u) => hasModule(u, 'meetings'),
 *     search: async (q, limit, user) => [{ id, title, subtitle, route }] });
 */
import { ActionItem } from '../models/ActionItem.js';
import { AuditLog } from '../models/AuditLog.js';
import { Decision } from '../models/Decision.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingRequest } from '../models/MeetingRequest.js';
import { User } from '../models/User.js';
import { searchFilter } from '../utils/listQuery.js';
import { hasModule } from './modules.js';

/**
 * @typedef {{ id: string, title: string, subtitle: string, route: string }} SearchHit
 * @typedef {object} SearchProvider
 * @property {string} key
 * @property {string} label
 * @property {(user: any) => boolean} [canUse]  default: every signed-in user
 * @property {(q: string, limit: number, user: any) => Promise<SearchHit[]>} search
 */

/** @type {SearchProvider[]} */
const providers = [];

/** @param {SearchProvider} p */
export function registerSearch(p) {
  if (providers.some((x) => x.key === p.key)) throw new Error(`search provider "${p.key}" is already registered`);
  providers.push(p);
}

/** Providers the user may use, in registration order. @param {any} user */
export const searchProvidersFor = (user) => providers.filter((p) => !p.canUse || p.canUse(user));

/**
 * Runs every provider the user may use. Groups with no hits are dropped, so the palette only shows
 * sections that actually have something in them.
 * @param {string} q @param {number} limit per group @param {any} user
 */
export async function globalSearch(q, limit, user) {
  const groups = await Promise.all(
    searchProvidersFor(user).map(async (p) => ({ key: p.key, label: p.label, items: await p.search(q, limit, user) })),
  );
  return { q, groups: groups.filter((g) => g.items.length > 0) };
}

const isAdmin = (u) => u.role === 'admin';
const TYPE_LABEL = { internal: 'Internal', customer: 'Customer', supplier: 'Supplier', consultants: 'Consultants', board: 'Board', other: 'Other' };

registerSearch({
  key: 'meetings',
  label: 'Meetings',
  canUse: (u) => hasModule(u, 'meetings'),
  async search(q, limit) {
    const docs = await Meeting.find(searchFilter(q, ['title', 'chair', 'loc', 'attendees', 'external.name', 'agenda', 'clientName', 'subBadge'])).sort({ date: -1, time: -1, _id: -1 }).limit(limit);
    return docs.map((m) => ({
      id: m._id.toString(),
      title: m.title,
      subtitle: [TYPE_LABEL[m.type] ?? m.type, `${m.date} ${m.time}`, m.status, m.chair].filter(Boolean).join(' · '),
      route: `/meetings/${m._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'actions',
  label: 'Action Items',
  canUse: (u) => hasModule(u, 'meetings') || hasModule(u, 'todo'),
  async search(q, limit) {
    const docs = await ActionItem.find(searchFilter(q, ['desc', 'owner', 'meetingTitle'])).sort({ deadline: 1, _id: 1 }).limit(limit);
    return docs.map((a) => ({
      id: a._id.toString(),
      title: a.desc || '(untitled action)',
      subtitle: [a.owner, a.status, `due ${a.deadline}`, a.meetingTitle].filter(Boolean).join(' · '),
      route: `/meetings/${a.meetingId.toString()}?tab=actions&action=${a._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'requests',
  label: 'Meeting Requests',
  canUse: (u) => hasModule(u, 'meetings'),
  async search(q, limit) {
    const docs = await MeetingRequest.find(searchFilter(q, ['topic', 'notes', 'from', 'to', 'routedTo'])).sort({ createdAt: -1, _id: -1 }).limit(limit);
    return docs.map((r) => ({
      id: r._id.toString(),
      title: r.topic,
      subtitle: [`${r.from} → ${r.routedTo || r.to}`, `${r.proposedDate} ${r.proposedTime}`, r.status].filter(Boolean).join(' · '),
      route: `/meetings?tab=requests&request=${r._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'decisions',
  label: 'Decisions',
  canUse: (u) => hasModule(u, 'decisions') || hasModule(u, 'meetings'),
  async search(q, limit) {
    const docs = await Decision.find(searchFilter(q, ['text', 'decidedBy', 'department', 'meetingTitle', 'tags'])).sort({ createdAt: -1, _id: -1 }).limit(limit);
    return docs.map((d) => ({
      id: d._id.toString(),
      title: d.text.length > 90 ? d.text.slice(0, 87) + '…' : d.text,
      subtitle: [d.department, d.decidedBy, d.meetingTitle].filter(Boolean).join(' · '),
      route: `/decisions?decision=${d._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'users',
  label: 'Users',
  canUse: isAdmin,
  async search(q, limit) {
    const docs = await User.find(searchFilter(q, ['name', 'email', 'title', 'department'])).sort({ name: 1, _id: 1 }).limit(limit);
    return docs.map((u) => ({
      id: u._id.toString(),
      title: u.name,
      subtitle: [u.title, u.department, u.email].filter(Boolean).join(' · '),
      route: `/settings?tab=users&user=${u._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'audit',
  label: 'Activity Log',
  canUse: isAdmin,
  async search(q, limit) {
    const docs = await AuditLog.find(searchFilter(q, ['entity', 'details', 'module'])).sort({ at: -1, _id: -1 }).limit(limit);
    return docs.map((e) => ({
      id: e._id.toString(),
      title: e.entity || e.module,
      subtitle: [e.module, e.action, e.user?.name, e.details].filter(Boolean).join(' · '),
      route: `/settings?tab=activity&search=${encodeURIComponent(q)}`,
    }));
  },
});
