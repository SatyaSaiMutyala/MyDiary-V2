/**
 * Shift-checklist rules, ported from the website (web/src/utils/departments.js) so both apps decide
 * "what do I owe today" the same way.
 *
 * A department holds four lanes of tasks — opening, closing, weekly, monthly. Which of them fall due
 * today depends on the day of the week / the day of the month, and which of *those* are yours
 * depends on your position in the department.
 */
import { realToday } from './dates';

export const LANE_KINDS = ['opening', 'closing', 'weekly', 'monthly'];

/**
 * The tasks of one lane that belong to a person.
 *
 * A task with no positions listed belongs to everyone in the department; a head or the CMD sees the
 * whole lane.
 */
export function tasksForPosition(allTasks, positionId, role) {
  if (!allTasks) {
    return [];
  }
  if (!positionId && (role === 'head' || role === 'cmd')) {
    return allTasks.slice();
  }
  return allTasks.filter(t => {
    const ids = Array.isArray(t.positionIds)
      ? t.positionIds
      : t.positionId != null && t.positionId !== ''
      ? [t.positionId]
      : [];
    return ids.length === 0 || ids.includes(positionId);
  });
}

/** Today's calendar facts the lanes are filtered against. */
export function todayFacts(iso = realToday()) {
  const today = new Date(`${iso}T00:00:00`);
  const next = new Date(today);
  next.setDate(next.getDate() + 1);
  return {
    todayStr: iso,
    dow: today.getDay(),
    dom: today.getDate(),
    isLastDay: next.getDate() === 1,
  };
}

/** Everything due today for one person, lane by lane. */
export function dueTodayLists(dept, positionId, role, { dow, dom, isLastDay }) {
  if (!dept) {
    return { opening: [], closing: [], weekly: [], monthly: [] };
  }
  return {
    opening: tasksForPosition(dept.openingTasks ?? [], positionId, role),
    closing: tasksForPosition(dept.closingTasks ?? [], positionId, role),
    weekly: tasksForPosition(
      (dept.weeklyTasks ?? []).filter(t => (t.daysOfWeek ?? []).includes(dow)),
      positionId,
      role,
    ),
    monthly: tasksForPosition(
      (dept.monthlyTasks ?? []).filter(
        t => (t.dayOfMonth === 'last' && isLastDay) || Number(t.dayOfMonth) === dom,
      ),
      positionId,
      role,
    ),
  };
}

/** The log is nested person → date → lane → taskId. Missing means not ticked. */
export function getTaskStatus(log, person, dateStr, kind, taskId) {
  return log?.[person]?.[dateStr]?.[kind]?.[taskId] ?? null;
}

/** What a person owes today and how much of it is done. */
export function shiftStats(log, person, dept, positionId, role, facts) {
  const lists = dueTodayLists(dept, positionId, role, facts);
  let total = 0;
  let done = 0;
  LANE_KINDS.forEach(kind => {
    total += lists[kind].length;
    done += lists[kind].filter(
      t => getTaskStatus(log, person, facts.todayStr, kind, t.id) === 'done',
    ).length;
  });
  return { lists, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

const NO_ASSIGNMENT = { departmentId: null, positionId: null, role: 'member' };

/** One person's row out of GET /api/departments/assignments. */
export const assignmentFor = (assignments, name) =>
  assignments?.[name] ?? NO_ASSIGNMENT;
