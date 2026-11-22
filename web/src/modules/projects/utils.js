// Projects module helpers — verbatim logic from the prototype (lines 14604–14617, 15377–15390, 15417–15432)
import { tokens } from '../../theme/tokens';
import { TODAY, parseDate, isOverdue, MONTHS, addDaysISO } from '../../utils/dates';
import { PROJ_CATEGORIES } from '../../data/projects';

export function projectAvgProgress(p) {
  if (p.milestones && p.milestones.length) {
    const done = p.milestones.filter(m => m.status === 'done').length;
    return Math.round((done / p.milestones.length) * 100);
  }
  return p.progress || 0;
}
export function overdueMilestones(p) {
  return (p.milestones || []).filter(m => m.status !== 'done' && isOverdue(m.dueDate));
}
export function totalMilestones(p) { return (p.milestones || []).length; }

export function isMine(p, viewerName) {
  return p.owner === viewerName || (p.team || []).some(t => t.name === viewerName);
}

// Milestone progress derived from its linked tasks: returns {done, total, pct}
export function milestoneTaskProgress(project, milestoneId) {
  const linked = (project.tasks || []).filter(t => t.milestoneId === milestoneId);
  const done = linked.filter(t => t.status === 'done').length;
  const total = linked.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
export function milestoneRiskCount(project, milestoneId) {
  return (project.risks || []).filter(r => r.milestoneId === milestoneId && r.status !== 'mitigated').length;
}
export function milestoneAcceptanceProgress(m) {
  const list = m.acceptanceCriteria || [];
  const done = list.filter(c => c.done).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

export function daysBetween(d1, d2) {
  return Math.round((parseDate(d2) - parseDate(d1)) / 86400000);
}

export function sortedMilestones(p) {
  return (p.milestones || []).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** "15 Oct → 15 Dec 2026" */
export function fmtRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export const catOf = (p) => PROJ_CATEGORIES[p.category] || PROJ_CATEGORIES.operations;

// .proj-card[data-status] top border colours / .proj-detail-head gradients
export const STATUS_BORDER = {
  active: tokens.teal, planning: tokens.blue, 'at-risk': tokens.orange, 'on-hold': tokens.slateSoft, completed: tokens.tealDark, cancelled: tokens.red,
};
export const STATUS_GRADIENT = {
  active: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`,
  planning: `linear-gradient(135deg, #1E3A8A, ${tokens.blue})`,
  'at-risk': `linear-gradient(135deg, #9A3412, ${tokens.orange})`,
  'on-hold': `linear-gradient(135deg, #374151, ${tokens.slate})`,
  completed: `linear-gradient(135deg, ${tokens.tealDark}, #2A5A47)`,
  cancelled: `linear-gradient(135deg, #7F1D1D, ${tokens.red})`,
};
// .proj-status-pill.<status>
export const STATUS_PILL = {
  planning: { bg: tokens.blueSoft, color: tokens.blue },
  active: { bg: tokens.tealSoft, color: tokens.tealDark },
  'at-risk': { bg: tokens.orangeSoft, color: tokens.orange },
  'on-hold': { bg: 'rgba(107,107,107,0.12)', color: tokens.slate },
  completed: { bg: tokens.tealSofter, color: tokens.tealDark },
  cancelled: { bg: tokens.redSoft, color: tokens.red },
};
// .proj-priority-pill.<priority>  (also kanban-card / risk severity accent colours)
export const PRIORITY_PILL = {
  low: { bg: tokens.tealSoft, color: tokens.tealDark },
  medium: { bg: tokens.yellowSoft, color: tokens.amber },
  high: { bg: tokens.orangeSoft, color: tokens.orange },
  critical: { bg: tokens.redSoft, color: tokens.red },
};
export const PRIORITY_ACCENT = { critical: tokens.red, high: tokens.orange, medium: tokens.yellow, low: tokens.teal };
export const SEVERITY_ACCENT = { critical: tokens.red, high: tokens.orange, medium: tokens.yellow, low: tokens.teal };
export const SEVERITY_TEXT = { critical: tokens.red, high: tokens.orange, medium: tokens.amber, low: tokens.tealDark };

export const GANTT_ZOOM_CFG = {
  day: { pxPerDay: 36, showEvery: 1, label: 'Day' },
  week: { pxPerDay: 14, showEvery: 1, label: 'Week' },
  month: { pxPerDay: 6, showEvery: 3, label: 'Month' },
};

export const WIZ_STEPS = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Team' },
  { n: 3, label: 'Milestones' },
  { n: 4, label: 'Tasks · KPIs · Risks' },
];

const rid = () => Date.now() + Math.random().toString(36).slice(2, 6);
export const newId = (prefix) => prefix + rid();

/** openProjectModal() blank draft (prototype 15921–15935). `id: null` = not saved to the API yet. */
export function blankDraft(viewerName, projectCount) {
  return {
    id: null,
    draftId: 'draft' + rid(),
    code: 'TL-' + new Date().getFullYear() + '-' + String(projectCount + 1).padStart(2, '0'),
    name: '', description: '',
    category: 'operations', priority: 'medium', status: 'planning',
    owner: viewerName,
    startDate: new Date(TODAY).toISOString().slice(0, 10),
    endDate: new Date(TODAY.getTime() + 60 * 86400000).toISOString().slice(0, 10),
    progress: 0,
    team: [{ name: viewerName, role: 'Project Lead' }],
    external: [],
    milestones: [], tasks: [], kpis: [], risks: [],
  };
}

/**
 * useProjectTemplate() draft builder (prototype 15842–15902) — dates from TODAY offsets, milestone index → a
 * draft id the API resolves to the real milestone when the wizard saves.
 */
export function draftFromTemplate(t, viewerName, projectCount) {
  const today = new Date(TODAY);
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + t.suggestedDurationDays * 86400000).toISOString().slice(0, 10);
  const mkDate = (off) => new Date(today.getTime() + off * 86400000).toISOString().slice(0, 10);
  const stamp = Date.now();

  const milestones = (t.milestones || []).map((m, i) => ({
    id: 'mi' + stamp + '-' + i,
    name: m.name,
    dueDate: mkDate(m.dayOffset),
    status: 'todo',
    owner: viewerName,
    description: '',
    acceptanceCriteria: (m.acceptanceCriteria || []).map(txt => ({ text: txt, done: false })),
  }));
  const resolveMilestone = (idx) => (idx != null && milestones[idx]) ? milestones[idx].id : null;

  return {
    id: null,
    draftId: 'draft' + stamp,
    templateId: t.id,
    code: 'TL-' + new Date().getFullYear() + '-' + String(projectCount + 1).padStart(2, '0'),
    name: t.key === 'tpl-blank' ? '' : t.name,
    description: t.key === 'tpl-blank' ? '' : t.description,
    category: t.category,
    priority: 'medium',
    status: 'planning',
    owner: viewerName,
    startDate, endDate, progress: 0,
    team: [
      { name: viewerName, role: 'Project Lead' },
      ...(t.teamRoles || []).filter(r => r !== 'Project Lead').map(role => ({ name: '(TBD)', role })),
    ],
    external: [],
    milestones,
    tasks: (t.tasks || []).map((tk, i) => ({
      id: 'tk' + stamp + '-' + i,
      title: tk.name,
      assignee: '(unassigned)',
      dueDate: mkDate(tk.dayOffset),
      status: 'todo',
      priority: 'medium',
      milestoneId: resolveMilestone(tk.milestoneIdx),
    })),
    kpis: (t.kpis || []).map((k, i) => ({
      id: 'kp' + stamp + '-' + i,
      name: k.name, current: 0, target: 100, unit: ' · ' + k.target,
    })),
    risks: (t.risks || []).map((r, i) => ({
      id: 'rk' + stamp + '-' + i,
      title: r.name, severity: r.impact, mitigation: r.mitigation, owner: viewerName, status: 'open',
      milestoneId: resolveMilestone(r.milestoneIdx),
    })),
  };
}

export { addDaysISO };

/** '2026-11-20T00:00:00.000Z' → '2026-11-20' (the API sends ISO stamps, the footer prints the day). */
export const dayOf = (iso) => (iso || '').slice(0, 10);

/**
 * The POST / PATCH body for a wizard draft. Blank rows are dropped, existing records keep their `id` so a
 * task's or risk's milestone link survives an edit, and a link to a milestone the edit removed is cleared.
 */
export function draftToBody(d) {
  const txt = (s) => (s || '').trim();
  const kept = (list, field) => (list || []).filter(x => txt(x[field]));
  const withId = (x) => (x.id ? { id: x.id } : {});
  const milestones = kept(d.milestones, 'name').map(m => ({
    ...withId(m),
    name: txt(m.name),
    dueDate: m.dueDate || '',
    status: m.status || 'todo',
    owner: txt(m.owner),
    description: txt(m.description),
    acceptanceCriteria: (m.acceptanceCriteria || []).map(c => ({ text: c.text, done: !!c.done })),
  }));
  const live = new Set(milestones.map(m => m.id).filter(Boolean));
  const link = (id) => (id && live.has(id) ? id : null);
  return {
    code: txt(d.code),
    name: txt(d.name),
    description: txt(d.description),
    category: d.category,
    priority: d.priority,
    status: d.status,
    owner: txt(d.owner),
    startDate: d.startDate || '',
    endDate: d.endDate || '',
    progress: Math.max(0, Math.min(100, Math.round(Number(d.progress) || 0))),
    team: kept(d.team, 'name').map(t => ({ ...withId(t), name: txt(t.name), role: txt(t.role) })),
    external: kept(d.external, 'name').map(e => ({ ...withId(e), name: txt(e.name), email: txt(e.email), role: txt(e.role) })),
    milestones,
    tasks: kept(d.tasks, 'title').map(t => ({
      ...withId(t), title: txt(t.title), assignee: txt(t.assignee), status: t.status || 'todo',
      dueDate: t.dueDate || '', priority: t.priority || 'medium', milestoneId: link(t.milestoneId),
    })),
    kpis: kept(d.kpis, 'name').map(k => ({ ...withId(k), name: txt(k.name), current: Number(k.current) || 0, target: Number(k.target) || 0, unit: k.unit || '' })),
    risks: kept(d.risks, 'title').map(r => ({
      ...withId(r), title: txt(r.title), severity: r.severity || 'medium', mitigation: txt(r.mitigation),
      owner: txt(r.owner), status: r.status || 'open', milestoneId: link(r.milestoneId),
    })),
  };
}
