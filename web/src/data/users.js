// Users & permissions (Settings → Users). Seeded from the TDPL roster; the CMD is the admin.
import { EMPLOYEES } from './employees';
import { tdplEmail } from '../utils/people';

/** Every module a user can be granted. `key` is what the rail / routes check. */
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', group: 'Home' },
  { key: 'meetings', label: 'My Meetings', group: 'Meetings' },
  { key: 'decisions', label: 'Decisions Registry', group: 'Meetings' },
  { key: 'templates', label: 'Templates', group: 'Meetings' },
  { key: 'activity', label: 'My Activity', group: 'Personal' },
  { key: 'labReadiness', label: 'Lab Readiness', group: 'Personal' },
  { key: 'diary', label: 'My Diary', group: 'Personal' },
  { key: 'logs', label: 'My Discussion Logs', group: 'Personal' },
  { key: 'todo', label: 'My To-Do', group: 'Personal' },
  { key: 'visits', label: 'My Visit Observations', group: 'Personal' },
  { key: 'projects', label: 'My Projects', group: 'Project Management' },
  { key: 'departments', label: 'Department Master', group: 'Administration' },
  { key: 'settings', label: 'Settings', group: 'Settings' },
  { key: 'integrations', label: 'Integrations', group: 'Settings' },
];
export const ALL_MODULE_KEYS = MODULES.map(m => m.key);
export const STAFF_MODULES = ALL_MODULE_KEYS.filter(k => !['departments', 'settings', 'integrations'].includes(k));
export const MANAGER_MODULES = ALL_MODULE_KEYS.filter(k => !['settings', 'integrations'].includes(k));

export const ROLES = [
  { key: 'admin', label: 'Admin', desc: 'Everything, including Settings and user permissions' },
  { key: 'manager', label: 'Manager', desc: 'All work modules plus Department Master' },
  { key: 'employee', label: 'Employee', desc: 'Personal work modules only' },
];
export const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));
/** Modules only admins may hold (the API drops them silently for other roles). */
export const ADMIN_ONLY_MODULES = ['settings', 'integrations'];
const MANAGER_AND_UP_MODULES = ['departments'];
/** Default module set for a role, computed from the server registry list (mirrors Backend services/modules.js). */
export function defaultModulesFor(role, registry = MODULES) {
  const keys = registry.map(m => m.key);
  if (role === 'admin') return keys;
  if (role === 'manager') return keys.filter(k => !ADMIN_ONLY_MODULES.includes(k));
  return keys.filter(k => !ADMIN_ONLY_MODULES.includes(k) && !MANAGER_AND_UP_MODULES.includes(k));
}
/** "CMD · Admin" — the role line under a signed-in person's name (title + role). */
export const viewerRole = (u) => [u?.title, ROLE_LABEL[u?.role] || u?.role].filter(Boolean).join(' · ');

const MANAGER_ROLES = /CMD|CFO|COO|CGO|Head|Director|Manager|MR|Lab Head|Secretary|HOD/i;

export const slugId = (name) => 'u-' + name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function buildInitialUsers() {
  const list = [];
  EMPLOYEES.forEach(g => g.people.forEach(p => {
    const admin = p.name === 'Venkata Cherukuri' || p.name === 'Pallavi Elisetti';
    const role = admin ? 'admin' : MANAGER_ROLES.test(p.role) ? 'manager' : 'employee';
    list.push({
      id: slugId(p.name), name: p.name, title: p.role, department: g.group, email: tdplEmail(p.name),
      role, status: 'active',
      modules: role === 'admin' ? [...ALL_MODULE_KEYS] : role === 'manager' ? [...MANAGER_MODULES] : [...STAFF_MODULES],
      createdAt: '2026-10-01',
    });
  }));
  return list;
}

/** Can this user open the module? Admins always can; unknown users (not in the list) can. */
export function hasModule(user, key) {
  if (!user) return true;
  if (user.status === 'inactive') return false;
  if (user.role === 'admin') return true;
  return (user.modules || []).includes(key);
}

/** Route → module key (for the route guard and the rail). */
export const ROUTE_MODULE = {
  '/': 'dashboard', '/meetings': 'meetings', '/decisions': 'decisions', '/templates': 'templates', '/my-activity': 'activity',
  '/diary': 'diary', '/logs': 'logs', '/todo': 'todo', '/visits': 'visits', '/projects': 'projects', '/departments': 'departments',
  '/integrations': 'integrations', '/settings': 'settings',
};
