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

/** openProjectModal() blank draft (prototype 15921–15935) */
export function blankDraft(viewerName, projectCount) {
  return {
    id: 'proj' + Date.now(),
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
    activity: [], createdAt: new Date().toISOString().slice(0, 10),
  };
}

/** useProjectTemplate() draft builder (prototype 15842–15902) — dates from TODAY offsets, milestone idx → id */
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
    id: 'proj' + stamp,
    code: 'TL-' + new Date().getFullYear() + '-' + String(projectCount + 1).padStart(2, '0'),
    name: t.id === 'tpl-blank' ? '' : t.name,
    description: t.id === 'tpl-blank' ? '' : t.description,
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
    activity: [{ user: viewerName, action: `created the project from template "${t.name}"`, at: 'Just now' }],
    createdAt: new Date().toISOString().slice(0, 10),
    templateId: t.id,
  };
}

export { addDaysISO };
