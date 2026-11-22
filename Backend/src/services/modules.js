/**
 * Module access. Mirrors web/src/data/users.js: each person is ticked into the modules they can open; the role
 * decides the default set. Admins always have every module. Unticked modules are hidden by the web app and
 * refused here (requireModule).
 */

/** @typedef {{ key: string, label: string, group: string }} ModuleDef */

/** @type {ModuleDef[]} */
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', group: 'Home' },
  { key: 'meetings', label: 'My Meetings', group: 'Meetings' },
  { key: 'decisions', label: 'Decisions Registry', group: 'Meetings' },
  { key: 'templates', label: 'Templates', group: 'Meetings' },
  { key: 'activity', label: 'My Activity', group: 'Personal' },
  { key: 'diary', label: 'My Diary', group: 'Personal' },
  { key: 'logs', label: 'My Discussion Logs', group: 'Personal' },
  { key: 'todo', label: 'My To-Do', group: 'Personal' },
  { key: 'visits', label: 'My Visit Observations', group: 'Personal' },
  { key: 'projects', label: 'My Projects', group: 'Project Management' },
  { key: 'departments', label: 'Department Master', group: 'Administration' },
  { key: 'settings', label: 'Settings', group: 'Settings' },
  { key: 'integrations', label: 'Integrations', group: 'Settings' },
];
export const MODULE_KEYS = MODULES.map((m) => m.key);

/** @typedef {'admin' | 'manager' | 'employee'} Role */
export const ROLES = /** @type {const} */ (['admin', 'manager', 'employee']);

const ADMIN_ONLY = ['settings', 'integrations'];
const MANAGER_AND_UP = ['departments'];

/** Modules a new person of this role starts with. @param {string} role */
export function defaultModules(role) {
  if (role === 'admin') return [...MODULE_KEYS];
  if (role === 'manager') return MODULE_KEYS.filter((k) => !ADMIN_ONLY.includes(k));
  return MODULE_KEYS.filter((k) => !ADMIN_ONLY.includes(k) && !MANAGER_AND_UP.includes(k));
}

/** Modules a role can be given at all (admins: all; everyone else: all but the admin-only ones). @param {string} role */
export function eligibleModules(role) {
  if (role === 'admin') return [...MODULE_KEYS];
  return MODULE_KEYS.filter((k) => !ADMIN_ONLY.includes(k));
}

/**
 * What the person can use: admins everything; others their ticks (missing = role defaults), limited to what the
 * role can be given.
 * @param {{ role: string, modules?: string[] | null }} u
 */
export function effectiveModules(u) {
  if (u.role === 'admin') return [...MODULE_KEYS];
  const eligible = eligibleModules(u.role);
  const ticked = Array.isArray(u.modules) && u.modules.length > 0 ? u.modules : defaultModules(u.role);
  return eligible.filter((k) => ticked.includes(k));
}

/** @param {{ role: string, status?: string, modules?: string[] | null }} u @param {string} key */
export const hasModule = (u, key) => (u.status ?? 'active') === 'active' && effectiveModules(u).includes(key);

/** Unknown module keys in `keys`, for a clear validation message. @param {string[]} keys */
export const unknownModules = (keys) => keys.filter((k) => !MODULE_KEYS.includes(k));

/** Keeps only known modules the role can be given, in registry order. @param {string[]} keys @param {string} role */
export const cleanModules = (keys, role) => eligibleModules(role).filter((k) => keys.includes(k));

export const NO_MODULE_MESSAGE = 'You do not have access to this module. Ask an admin to enable it for you.';
