/**
 * The module keys the server grants, with the labels the website prints.
 *
 * Mirrors MyDiary-V2/Backend/src/services/modules.js. The phone only reads this — who gets what is
 * set in Settings on the website — but a person should be able to see what they have been given.
 */
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', group: 'Home' },
  { key: 'meetings', label: 'My Meetings', group: 'Meetings' },
  { key: 'decisions', label: 'Decisions Registry', group: 'Meetings' },
  { key: 'templates', label: 'Templates', group: 'Meetings' },
  { key: 'activity', label: 'My Activity', group: 'Personal' },
  { key: 'diary', label: 'My Diary', group: 'Personal' },
  { key: 'logs', label: 'My Discussion Logs', group: 'Personal' },
  { key: 'reminders', label: 'Reminders', group: 'Personal' },
  { key: 'todo', label: 'My To-Do', group: 'Personal' },
  { key: 'visits', label: 'My Visit Observations', group: 'Personal' },
  { key: 'projects', label: 'My Projects', group: 'Project Management' },
  { key: 'departments', label: 'Department Master', group: 'Administration' },
  { key: 'settings', label: 'Settings', group: 'Settings' },
  { key: 'integrations', label: 'Integrations', group: 'Settings' },
];

export const moduleLabel = key =>
  MODULES.find(m => m.key === key)?.label ?? key;

export const roleLabel = role =>
  ({ admin: 'Administrator', manager: 'Manager', employee: 'Employee' })[role] ??
  role;
