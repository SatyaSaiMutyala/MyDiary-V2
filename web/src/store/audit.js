// Automatic audit trail: every store write is diffed collection-by-collection and turned into
// "create / update / delete" entries, so Settings → Activity Log shows each action without the
// modules having to log anything themselves.

const MODULE_LABEL = {
  meetings: 'Meetings', meetingRequests: 'Meeting requests', actionExtras: 'Action items', decisions: 'Decisions Registry',
  templates: 'Templates', integrations: 'Integrations', standaloneTasks: 'My To-Do', diaryEntries: 'My Diary',
  discussionLogs: 'Discussion Logs', visits: 'Visit Observations', departments: 'Department Master', projects: 'Projects',
  projTemplates: 'Project templates', activityLog: 'My Activity', users: 'Settings · Users',
};
const SKIP = new Set(['notifications', 'auditLog', 'viewer', 'recording']);

const label = (item) => item && (item.title || item.name || item.topic || item.desc || item.text || item.code || item.id) || '';
const trim = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + '…' : s; };

function changedFields(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return [...keys].filter(k => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]));
}

/** Entries for one changed collection. */
function diffKey(key, before, after) {
  const module = MODULE_LABEL[key] || key;
  if (before === after || JSON.stringify(before) === JSON.stringify(after)) return [];
  const out = [];
  if (Array.isArray(before) && Array.isArray(after) && (before[0]?.id || after[0]?.id)) {
    const bm = new Map(before.map(x => [x.id, x])); const am = new Map(after.map(x => [x.id, x]));
    after.forEach(x => { if (!bm.has(x.id)) out.push({ action: 'create', module, entity: trim(label(x)), entityId: x.id, details: 'Created' }); });
    before.forEach(x => { if (!am.has(x.id)) out.push({ action: 'delete', module, entity: trim(label(x)), entityId: x.id, details: 'Deleted' }); });
    after.forEach(x => {
      const prev = bm.get(x.id);
      if (!prev) return;
      const fields = changedFields(prev, x);
      if (!fields.length) return;
      const detail = fields.slice(0, 4).map(f => {
        const nv = x[f];
        if (nv === null || typeof nv !== 'object') return `${f}: ${trim(String(prev[f] ?? '—'))} → ${trim(String(nv ?? '—'))}`;
        if (Array.isArray(nv)) { const d = nv.length - (Array.isArray(prev[f]) ? prev[f].length : 0); return `${f} ${d > 0 ? `+${d}` : d < 0 ? `${d}` : 'edited'}`; }
        return `${f} edited`;
      }).join(' · ');
      out.push({ action: 'update', module, entity: trim(label(x)), entityId: x.id, details: detail + (fields.length > 4 ? ` · +${fields.length - 4} more` : '') });
    });
    return out;
  }
  // keyed objects (actionExtras by action id, activityLog by person)
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const fields = changedFields(before, after);
    fields.forEach(f => out.push({ action: before[f] === undefined ? 'create' : after[f] === undefined ? 'delete' : 'update', module, entity: trim(String(f)), details: key === 'activityLog' ? 'Shift checklist ticked / unticked' : 'Edited' }));
    return out;
  }
  return [{ action: 'update', module, entity: key, details: 'Changed' }];
}

/** Diff two state objects (or partial {key: value} pairs) and return audit entries. */
export function diffCollections(before, after) {
  const entries = [];
  Object.keys(after).forEach(key => {
    if (SKIP.has(key)) return;
    if (before[key] === after[key]) return;
    entries.push(...diffKey(key, before[key], after[key]));
  });
  return entries;
}

export const ACTION_LABEL = { create: 'Created', update: 'Updated', delete: 'Deleted', notify: 'Notified', auth: 'Session', export: 'Exported' };
