/**
 * My Projects — the shapes and the small sums the screens need.
 *
 * The rules here are ported from the website (web/src/modules/projects/utils.js) so a milestone that
 * reads "overdue" on the desk reads overdue on the phone, and the percentages match to the digit.
 */
import { colors } from '../theme';
import { realToday } from '../utils/dates';

export const categories = [
  { id: 'operations', label: 'Operations' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'quality', label: 'Quality / NABL' },
  { id: 'technology', label: 'Technology' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'hr', label: 'HR / People' },
  { id: 'finance', label: 'Finance' },
  { id: 'strategic', label: 'Strategic' },
  { id: 'compliance', label: 'Compliance' },
];

export const statuses = [
  { id: 'planning', label: 'Planning' },
  { id: 'active', label: 'Active' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'on-hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const priorities = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

export const milestoneStatuses = [
  { id: 'todo', label: 'To do' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export const taskStatuses = [
  { id: 'todo', label: 'To do' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export const riskStatuses = [
  { id: 'open', label: 'Open' },
  { id: 'mitigated', label: 'Mitigated' },
];

const labelFrom = (list, id) => list.find(x => x.id === id)?.label ?? id ?? '';

export const categoryLabel = id => labelFrom(categories, id);
export const statusLabel = id => labelFrom(statuses, id);
export const priorityLabel = id => labelFrom(priorities, id);
export const milestoneStatusLabel = id => labelFrom(milestoneStatuses, id);
export const taskStatusLabel = id => labelFrom(taskStatuses, id);

/** Pill tones, matching the website's status colours as closely as the app's palette allows. */
export const statusTone = {
  planning: 'info',
  active: 'teal',
  'at-risk': 'watch',
  'on-hold': 'low',
  completed: 'good',
  cancelled: 'critical',
};

export const priorityTone = {
  low: 'teal',
  medium: 'yellow',
  high: 'watch',
  critical: 'critical',
};

/** A date that has already passed. Blank dates are never overdue. */
export const isOverdue = date => Boolean(date) && date < realToday();

/**
 * How far along the project is.
 *
 * Milestones decide it when there are any — the stored `progress` is only a fallback, exactly as the
 * website works it out.
 */
export function projectProgress(p) {
  const ms = p?.milestones ?? [];
  if (ms.length) {
    return Math.round((ms.filter(m => m.status === 'done').length / ms.length) * 100);
  }
  return p?.progress ?? 0;
}

export const overdueMilestones = p =>
  (p?.milestones ?? []).filter(m => m.status !== 'done' && isOverdue(m.dueDate));

export const isMine = (p, name) =>
  Boolean(name) &&
  (p?.owner === name || (p?.team ?? []).some(t => t.name === name));

/** Milestones earliest first — blank due dates sort last, not first. */
export const sortedMilestones = p =>
  (p?.milestones ?? [])
    .slice()
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

/** How many of a milestone's linked tasks are done. */
export function milestoneTaskProgress(p, milestoneId) {
  const linked = (p?.tasks ?? []).filter(t => t.milestoneId === milestoneId);
  const done = linked.filter(t => t.status === 'done').length;
  return {
    done,
    total: linked.length,
    pct: linked.length ? Math.round((done / linked.length) * 100) : 0,
  };
}

export const milestoneRiskCount = (p, milestoneId) =>
  (p?.risks ?? []).filter(
    r => r.milestoneId === milestoneId && r.status !== 'mitigated',
  ).length;

export function acceptanceProgress(m) {
  const list = m?.acceptanceCriteria ?? [];
  const done = list.filter(c => c.done).length;
  return {
    done,
    total: list.length,
    pct: list.length ? Math.round((done / list.length) * 100) : 0,
  };
}

/** A KPI against its target, capped at 100% for the bar. */
export function kpiProgress(k) {
  const pct = k?.target > 0 ? Math.round((k.current / k.target) * 100) : 0;
  return { pct, bar: Math.min(100, Math.max(0, pct)) };
}

/** Whole days from today to the end date: positive is time left, negative is overdue. */
export function daysLeft(endDate) {
  if (!endDate) {
    return null;
  }
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date(`${realToday()}T00:00:00`);
  return Math.round((end - today) / 86400000);
}

export function daysLeftLabel(endDate) {
  const d = daysLeft(endDate);
  if (d === null) {
    return '—';
  }
  if (d > 0) {
    return `${d} day${d === 1 ? '' : 's'} left`;
  }
  return d === 0 ? 'Due today' : `${Math.abs(d)} days overdue`;
}

/** A green/amber/red bar, on the same thresholds the website uses. */
export const barColor = pct =>
  pct >= 70 ? colors.teal : pct >= 40 ? colors.amber : colors.red;

/** The blank project a new one starts from. */
export const blankProject = (owner, count = 0) => {
  const today = realToday();
  const end = new Date(new Date(`${today}T00:00:00`).getTime() + 60 * 86400000);
  return {
    code: `TL-${new Date().getFullYear()}-${String(count + 1).padStart(2, '0')}`,
    name: '',
    description: '',
    category: 'operations',
    priority: 'medium',
    status: 'planning',
    owner: owner ?? '',
    startDate: today,
    endDate: end.toISOString().slice(0, 10),
  };
};
