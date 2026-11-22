// Shift-checklist helpers shared by My Activity and the Dashboard (prototype: renderMyActivity,
// renderDashboard, renderOrgOversightBlock, renderDeptOversightBlock, renderCMDOversightBlock).
import { EMPLOYEE_ASSIGNMENTS } from '../../data/departments';
import { dueTodayLists, getTaskStatus } from '../../utils/departments';

export const PHASE_KEYS = ['opening', 'closing', 'weekly', 'monthly', 'review'];
export const LANE_KINDS = ['opening', 'closing', 'weekly', 'monthly'];

// Prototype's getEmployeeAssignment (not exported from data/departments.js)
export function getEmployeeAssignment(name) {
  return EMPLOYEE_ASSIGNMENTS[name] || { departmentId: null, positionId: null };
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
  const peopleByDept = {};
  Object.entries(EMPLOYEE_ASSIGNMENTS).forEach(([name, a]) => {
    if (!a.departmentId || (skipCMDOffice && a.departmentId === 'd18')) return;
    if (!peopleByDept[a.departmentId]) peopleByDept[a.departmentId] = [];
    peopleByDept[a.departmentId].push({ name, positionId: a.positionId, role: a.role });
  });
  return departments.filter(d => !skipCMDOffice || d.id !== 'd18').map(d => {
    const people = peopleByDept[d.id] || [];
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
  const people = [];
  Object.entries(EMPLOYEE_ASSIGNMENTS).forEach(([name, a]) => {
    if (a.departmentId === dept.id) people.push({ name, positionId: a.positionId, role: a.role });
  });
  return people.map(p => {
    const s = shiftStats(log, p.name, dept, p.positionId, p.role, facts);
    const pos = (dept.positions || []).find(x => x.id === p.positionId);
    return { name: p.name, posName: pos ? pos.name : 'All positions', total: s.total, done: s.done, pct: s.pct };
  });
}

export const sortByLowest = rows => rows.slice().sort((a, b) => (a.pct - b.pct) || (b.total - a.total));
export const barClassFor = pct => (pct >= 70 ? '' : pct >= 40 ? 'amber' : 'red');
