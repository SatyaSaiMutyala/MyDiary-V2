import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildInitialMeetings, MEETING_REQUESTS } from '../data/meetings';
import { DECISIONS } from '../data/decisions';
import { NOTIFICATIONS } from '../data/notifications';
import { TEMPLATES } from '../data/templates';
import { INTEGRATIONS } from '../data/integrations';
import { STANDALONE_TASKS } from '../data/todo';
import { DIARY_ENTRIES } from '../data/diary';
import { DISCUSSION_LOGS } from '../data/logs';
import { VISIT_OBSERVATIONS } from '../data/visits';
import { buildInitialDepartments } from '../data/departments';
import { PROJECTS, PROJ_TEMPLATES } from '../data/projects';
import { TODAY } from '../utils/dates';
import { buildInitialUsers, viewerRole } from '../data/users';
import { blockIfSpectating, spectate, spectatedUser } from '../features/spectate';
import { useAuth } from '../auth/AuthContext';
import { diffCollections } from './audit';

const clone = (v) => JSON.parse(JSON.stringify(v));

// Seed today's activity with a few pre-ticked items (mirrors seedActivity() in the prototype)
function seedActivityLog() {
  const today = new Date(TODAY).toISOString().slice(0,10);
  const yesterday = new Date(TODAY.getTime() - 86400000).toISOString().slice(0,10);
  return {
    'Mohammed Fayazuddin': { [yesterday]: { opening: { t1: 'done', t2: 'done', t3: 'done' }, closing: { c1: 'done' }, weekly: {}, monthly: {}, review: {} } },
    'Pallavi Elisetti': { [today]: { opening: { t1: 'done' }, closing: {}, weekly: {}, monthly: {}, review: {} } },
  };
}

const viewerOf = (u) => (u ? { name: u.name, role: viewerRole(u) } : { name: 'Venkata Cherukuri', role: 'CMD · Admin' });
/** After a refresh the admin is still watching whoever they were watching — the API agrees, so the UI must too. */
const watchedOf = (u) => {
  const who = spectatedUser();
  return who ? { name: who.name, role: who.role || who.title || '', user: who } : viewerOf(u);
};

function initialState(authUser) {
  return {
    // The signed-in person (from the API); "View as" swaps this for a roster person (demo).
    viewer: watchedOf(authUser),
    // Meetings module 2 reads the API; these stay only for the screens that are still on demo data
    // (My Diary's calendar, the ⌘K palette fallback and the dashboard counters).
    meetings: buildInitialMeetings(),
    meetingRequests: clone(MEETING_REQUESTS),
    decisions: clone(DECISIONS),
    notifications: clone(NOTIFICATIONS),
    templates: clone(TEMPLATES),
    integrations: clone(INTEGRATIONS),
    standaloneTasks: clone(STANDALONE_TASKS),
    diaryEntries: clone(DIARY_ENTRIES),
    discussionLogs: clone(DISCUSSION_LOGS),
    visits: clone(VISIT_OBSERVATIONS),
    departments: buildInitialDepartments(),
    projects: clone(PROJECTS),
    projTemplates: clone(PROJ_TEMPLATES),
    activityLog: seedActivityLog(),
    users: buildInitialUsers(),
    // Audit trail of every action (Settings → Activity Log). Newest first, capped at 500.
    auditLog: [],
    // Live-transcription recording state (meeting detail · Live tab)
    recording: { active: false, meetingId: null, elapsed: 0, feedIdx: 0 },
  };
}

const AppStoreContext = createContext(null);

/**
 * Single in-memory store for the whole prototype (the HTML used global arrays).
 *
 *  const { state, set, mutate, update, notify, setViewer } = useAppStore();
 *
 *  state.meetings                       → read any collection
 *  set('meetings', list)                → replace a collection (value or updater fn)
 *  mutate('meetings', ms => { ... })    → deep-clones ONE collection, lets you mutate it
 *                                          imperatively (like the prototype code), stores it
 *  update(d => { d.meetings...; d.decisions... })
 *                                       → deep-clones the WHOLE state for multi-collection edits
 *  notify({ type, text, icon })         → unshift a notification ("Just now", unread)
 *  setViewer(name, role)                → "View as" demo switcher
 */
export function AppStoreProvider({ children }) {
  const { user: authUser } = useAuth();
  const [state, setState] = useState(() => initialState(authUser));

  // Follow the signed-in person: after login (or a profile edit) the viewer becomes the API user, unless a
  // "View as" switch is active for somebody else.
  const prevUserRef = useRef(authUser);
  useEffect(() => {
    const prev = prevUserRef.current; prevUserRef.current = authUser;
    if (!authUser) return;
    setState(s => {
      // While spectating, the viewer is deliberately not the signed-in person — leave it alone.
      if (spectatedUser()) return s;
      const viewingSelf = !prev || s.viewer.name === prev.name || s.viewer.name === authUser.name;
      const next = viewerOf(authUser);
      if (!viewingSelf || (s.viewer.name === next.name && s.viewer.role === next.role)) return s;
      return { ...s, viewer: next };
    });
  }, [authUser]);

  /** Append audit entries (newest first). */
  const withAudit = (s, entries) => entries.length ? { ...s, auditLog: [...entries, ...s.auditLog].slice(0, 500) } : s;
  const entry = (s, e) => ({ id: 'al' + Date.now() + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), user: s.viewer.name, ...e });

  // Watching someone else is read-only everywhere, not only on the server: the screens still holding
  // sample data in memory would otherwise let an admin "complete" another person's task.
  const set = useCallback((key, value) => {
    if (blockIfSpectating()) return;
    setState(s => {
      const next = typeof value === 'function' ? value(s[key]) : value;
      const n = { ...s, [key]: next };
      return withAudit(n, diffCollections({ [key]: s[key] }, { [key]: next }).map(e => entry(s, e)));
    });
  }, []);

  const mutate = useCallback((key, fn) => {
    if (blockIfSpectating()) return;
    setState(s => {
      const copy = clone(s[key]); const r = fn(copy); const next = r === undefined ? copy : r;
      const n = { ...s, [key]: next };
      return withAudit(n, diffCollections({ [key]: s[key] }, { [key]: next }).map(e => entry(s, e)));
    });
  }, []);

  const update = useCallback((fn) => {
    if (blockIfSpectating()) return;
    setState(s => {
      const d = clone(s); const r = fn(d); const next = r === undefined ? d : r;
      return withAudit(next, diffCollections(s, next).map(e => entry(s, e)));
    });
  }, []);

  const notify = useCallback(({ type = 'action', text, icon = '🔔', time = 'Just now' }) => {
    if (blockIfSpectating()) return;
    setState(s => withAudit({ ...s, notifications: [{ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 5), type, unread: true, text, time, icon }, ...s.notifications] },
      [entry(s, { action: 'notify', module: 'Notifications', entity: 'Notification', details: String(text).replace(/<[^>]+>/g, '') })]));
  }, []);

  // Looking at someone else's work is an admin thing. The switcher is hidden for everyone else, and this
  // refuses the change too, so the only reachable viewer for a non-admin is themselves.
  const setViewer = useCallback((name, role, record) => {
    if (authUser && authUser.role !== 'admin' && name !== authUser.name) return;
    // Spectator mode: tell the API layer too, so every screen reloads with that person's own data.
    const self = !authUser || name === authUser.name;
    spectate(self ? null : { name, role, ...(record || {}) });
    setState(s => withAudit({ ...s, viewer: { name, role, user: self ? null : record ?? null } },
      [entry(s, { action: 'auth', module: 'Session', entity: 'View as', details: `Switched view to ${name} (${role})` })]));
  }, [authUser]);

  /** Explicit audit entry: audit('auth', { module: 'Session', entity: 'Sign in', details: '…' }) */
  const audit = useCallback((action, { module = 'App', entity = '', details = '' } = {}) => {
    setState(s => withAudit(s, [entry(s, { action, module, entity, details })]));
  }, []);

  const clearAudit = useCallback(() => setState(s => ({ ...s, auditLog: [] })), []);

  const value = useMemo(() => ({ state, set, mutate, update, notify, setViewer, audit, clearAudit }), [state, set, mutate, update, notify, setViewer, audit, clearAudit]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}
