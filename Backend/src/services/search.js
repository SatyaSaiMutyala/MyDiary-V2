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
import { Department } from '../models/Department.js';
import { DiaryEntry } from '../models/DiaryEntry.js';
import { DiscussionLog } from '../models/DiscussionLog.js';
import { Reminder } from '../models/Reminder.js';
import { Integration } from '../models/Integration.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingRequest } from '../models/MeetingRequest.js';
import { Project } from '../models/Project.js';
import { Template } from '../models/Template.js';
import { User } from '../models/User.js';
import { Visit } from '../models/Visit.js';
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
  key: 'diary',
  label: 'My Diary',
  canUse: (u) => hasModule(u, 'diary'),
  async search(q, limit, user) {
    const docs = await DiaryEntry.find({ $and: [{ owner: user.name }, searchFilter(q, ['title', 'notes', 'loc', 'attendees', 'external.name'])] })
      .sort({ date: -1, _id: -1 })
      .limit(limit);
    return docs.map((e) => ({
      id: e._id.toString(),
      title: e.title,
      subtitle: [e.date, e.allDay ? 'All day' : e.time, e.cat, e.loc].filter(Boolean).join(' \u00b7 '),
      route: `/diary?date=${e.date}&entry=${e._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'visits',
  label: 'Visit Observations',
  canUse: (u) => hasModule(u, 'visits'),
  async search(q, limit) {
    const docs = await Visit.find(
      searchFilter(q, ['title', 'org.name', 'org.branch', 'org.city', 'host.name', 'team', 'purpose', 'tags', 'executiveSummary', 'observations.observation']),
    )
      .sort({ date: -1, _id: -1 })
      .limit(limit);
    return docs.map((v) => ({
      id: v._id.toString(),
      title: v.title,
      subtitle: [v.org?.name, v.org?.branch, v.date, v.status].filter(Boolean).join(' \u00b7 '),
      route: `/visits?visit=${v._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'departments',
  label: 'Department Master',
  canUse: (u) => hasModule(u, 'departments'),
  async search(q, limit) {
    const docs = await Department.find(
      searchFilter(q, ['name', 'code', 'description', 'positions.name', 'openingTasks.text', 'closingTasks.text', 'weeklyTasks.text', 'monthlyTasks.text']),
    )
      .sort({ order: 1, _id: 1 })
      .limit(limit);
    return docs.map((d) => ({
      id: d._id.toString(),
      title: d.name,
      subtitle: [d.code, d.description, `${d.positions?.length ?? 0} positions`].filter(Boolean).join(' \u00b7 '),
      route: `/departments/${d._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'templates',
  label: 'Templates',
  canUse: (u) => hasModule(u, 'templates'),
  async search(q, limit) {
    const docs = await Template.find(searchFilter(q, ['name', 'desc', 'agenda.text'])).sort({ createdAt: 1, _id: 1 }).limit(limit);
    return docs.map((t) => ({
      id: t._id.toString(),
      title: t.name,
      subtitle: [TYPE_LABEL[t.type] ?? t.type, `${t.agendaCount} agenda items`, t.desc].filter(Boolean).join(' \u00b7 '),
      route: `/templates?template=${t._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'integrations',
  label: 'Integrations',
  canUse: (u) => hasModule(u, 'integrations'),
  async search(q, limit) {
    const docs = await Integration.find(searchFilter(q, ['name', 'desc', 'category'])).sort({ order: 1, _id: 1 }).limit(limit);
    return docs.map((i) => ({
      id: i._id.toString(),
      title: i.name,
      subtitle: [i.category, i.status, i.desc].filter(Boolean).join(' \u00b7 '),
      route: `/integrations?integration=${i._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'projects',
  label: 'Projects',
  canUse: (u) => hasModule(u, 'projects'),
  async search(q, limit) {
    const docs = await Project.find(
      searchFilter(q, ['name', 'code', 'description', 'owner', 'team.name', 'external.name', 'milestones.name', 'tasks.title', 'risks.title']),
    )
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit);
    return docs.map((p) => ({
      id: p._id.toString(),
      title: p.name,
      subtitle: [p.code, p.status, p.owner, `${p.progress ?? 0}%`].filter(Boolean).join(' \u00b7 '),
      route: `/projects/${p._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'logs',
  label: 'Discussion Logs',
  canUse: (u) => hasModule(u, 'logs'),
  async search(q, limit, user) {
    // A log is private unless shared, so never surface someone else's private conversation.
    const visible = { $or: [{ owner: user.name }, { privacy: 'shared' }] };
    const docs = await DiscussionLog.find({ $and: [visible, searchFilter(q, ['topic', 'summary', 'decisions', 'tags', 'with.name', 'followUps.text'])] })
      .sort({ date: -1, time: -1, _id: -1 })
      .limit(limit);
    return docs.map((l) => ({
      id: l._id.toString(),
      title: l.topic,
      subtitle: [(l.with ?? []).map((w) => w.name).join(', '), l.channel, l.date].filter(Boolean).join(' \u00b7 '),
      route: `/logs?log=${l._id.toString()}`,
    }));
  },
});

registerSearch({
  key: 'reminders',
  label: 'Reminders',
  canUse: (u) => hasModule(u, 'reminders'),
  async search(q, limit, user) {
    // Only what this person set or will receive — an admin sees the lot, as the list endpoint does.
    const mine =
      user.role === 'admin' ? {} : { $or: [{ creator: user.name }, { recipients: user.name }] };
    const filter = searchFilter(q, ['title', 'note', 'recipients', 'creator']);
    const docs = await Reminder.find(Object.keys(mine).length ? { $and: [mine, filter] } : filter)
      .sort({ remindAt: -1, _id: -1 })
      .limit(limit);
    return docs.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      subtitle: [`${r.date} \u00b7 ${r.time}`, (r.recipients ?? []).join(', '), r.status]
        .filter(Boolean)
        .join(' \u00b7 '),
      route: `/reminders?reminder=${r._id.toString()}`,
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
