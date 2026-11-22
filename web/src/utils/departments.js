import { DAYS_OF_WEEK } from '../data/departments';
import { TODAY, todayStr } from './dates';

// Filter a task list to those applicable to the given position (or 'all in dept' tasks).
export function tasksForPosition(allTasks, positionId, role) {
  if (!allTasks) return [];
  if (!positionId && (role === 'head' || role === 'cmd')) return allTasks.slice();
  return allTasks.filter(t => {
    const ids = Array.isArray(t.positionIds) ? t.positionIds : (t.positionId != null && t.positionId !== '' ? [t.positionId] : []);
    return ids.length === 0 || ids.includes(positionId);
  });
}

// "Mon" / "Mon, Fri" / "Mon–Fri" / "Daily"
export function describeWeekly(daysOfWeek) {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return '—';
  if (daysOfWeek.length === 7) return 'Daily';
  const order = [1,2,3,4,5,6,0];
  const sorted = daysOfWeek.slice().sort((a,b) => order.indexOf(a) - order.indexOf(b));
  if (sorted.length === 5 && sorted.every((v, i) => v === i + 1)) return 'Mon–Fri';
  return sorted.map(n => DAYS_OF_WEEK[n]).join(', ');
}

export function describeMonthly(dayOfMonth) {
  if (dayOfMonth === 'last') return 'Last day';
  const n = +dayOfMonth || 1;
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return n + suffix;
}

// Today's calendar facts used by My Activity / Dashboard / Department rollups
export function todayFacts() {
  const today = new Date(TODAY);
  const t = new Date(today); t.setDate(t.getDate() + 1);
  return { today, todayStr: todayStr(), dow: today.getDay(), dom: today.getDate(), isLastDay: t.getDate() === 1 };
}

// Tasks due today for a person in a department, by lane
export function dueTodayLists(dept, positionId, role, { dow, dom, isLastDay }) {
  return {
    opening: tasksForPosition(dept.openingTasks || [], positionId, role),
    closing: tasksForPosition(dept.closingTasks || [], positionId, role),
    weekly: tasksForPosition((dept.weeklyTasks || []).filter(t => (t.daysOfWeek || []).includes(dow)), positionId, role),
    monthly: tasksForPosition((dept.monthlyTasks || []).filter(t => (t.dayOfMonth === 'last' && isLastDay) || (+t.dayOfMonth === dom)), positionId, role),
  };
}

// Activity-log accessors (ACTIVITY_LOG[person][date][kind][taskId] = 'done')
export function getTaskStatus(log, person, dateStr, kind, taskId) {
  return (((log[person] || {})[dateStr] || {})[kind] || {})[taskId] || null;
}
