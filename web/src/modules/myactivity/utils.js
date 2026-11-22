// Shift-checklist helpers shared by My Activity and the Dashboard (prototype: renderMyActivity,
// renderDashboard, renderOrgOversightBlock, renderDeptOversightBlock, renderCMDOversightBlock).
// Departments and the people in them now come from the API, so every helper takes the data it needs.
import { dueTodayLists, getTaskStatus } from '../../utils/departments';

export const PHASE_KEYS = ['opening', 'closing', 'weekly', 'monthly', 'review'];
export const LANE_KINDS = ['opening', 'closing', 'weekly', 'monthly'];

const NO_ASSIGNMENT = { departmentId: null, positionId: null, role: 'member' };

/** One person's row of GET /api/departments/assignments (prototype's getEmployeeAssignment). */
export function assignmentFor(assignments, name) {
  return (assignments && assignments[name]) || NO_ASSIGNMENT;
}

/** The people of one department, straight off the department record. */
export const peopleOf = (dept) => (dept?.assignments || []).map(a => ({ name: a.name, positionId: a.positionId, role: a.role }));

/** The CMD's own office is left out of the organisation rollup (the prototype skipped department d18). */
export const isCMDOffice = (dept) => (dept?.assignments || []).some(a => a.role === 'cmd');

/**
 * Query args for GET /api/departments/activity: my own ticks when the viewer IS the signed-in person,
 * that person's ticks while "View as" is on, and the whole organisation / one department for rollups.
 */
export function activityArgs({ date, person, isSelf, scope = 'me', departmentId }) {
  if (scope === 'org') return { date, scope: 'org' };
  if (scope === 'department') return { date, scope: 'department', departmentId };
  return isSelf ? { date, scope: 'me' } : { date, scope: 'person', person };
}

// Lists due today for a person + done/total/pct across the four lanes
export function shiftStats(log, person, dept, positionId, role, facts) {
  const lists = dueTodayLists(dept, positionId, role, facts);
  let total = 0, done = 0;
  LANE_KINDS.forEach(k => {
    total += lists[k].length;
    done += lists[k].filter(t => getTaskStatus(log, person, facts.todayStr, k, t.id) === 'done').length;
  });
  return { lists, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Per-department rollup rows: { dept, people, total, done, pct }
export function deptRollupRows(departments, log, facts, { skipCMDOffice = true } = {}) {
  return (departments || []).filter(d => !skipCMDOffice || !isCMDOffice(d)).map(d => {
    const people = peopleOf(d);
    let total = 0, done = 0;
    people.forEach(p => {
      const s = shiftStats(log, p.name, d, p.positionId, p.role, facts);
      total += s.total; done += s.done;
    });
    return { dept: d, people: people.length, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });
}

// People of one department with their own completion
export function deptPeopleRows(dept, log, facts) {
  return peopleOf(dept).map(p => {
    const s = shiftStats(log, p.name, dept, p.positionId, p.role, facts);
    const pos = (dept.positions || []).find(x => x.id === p.positionId);
    return { name: p.name, posName: pos ? pos.name : 'All positions', total: s.total, done: s.done, pct: s.pct };
  });
}

export const sortByLowest = rows => rows.slice().sort((a, b) => (a.pct - b.pct) || (b.total - a.total));
export const barClassFor = pct => (pct >= 70 ? '' : pct >= 40 ? 'amber' : 'red');
