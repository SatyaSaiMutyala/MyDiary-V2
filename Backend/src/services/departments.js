/**
 * Department Master business logic: the department itself, its positions, its four task lanes, its review
 * cadence, the people assigned to it — and the daily shift ticks My Activity and the Dashboard read
 * (models/ActivityTick.js).
 */
import mongoose from 'mongoose';
import { ActivityEntry, toLoggedLanes } from '../models/ActivityEntry.js';
import { ActivityTick, toActivityLog } from '../models/ActivityTick.js';
import { CADENCE_AGENDA_FIELD, Department, TASK_LIST_FIELD, serializeDepartment } from '../models/Department.js';
import { buildInitialDepartments, EMPLOYEE_ASSIGNMENTS } from '../data/departments.js';
import { LAB_ACTIVITIES, LAB_READINESS_DEPARTMENT_CODE, LAB_UNITS } from '../data/labReadiness.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { runList } from '../utils/paginate.js';
import { escapeRegex } from '../utils/listQuery.js';
import { cleanName, nameClause } from './people.js';
import { User } from '../models/User.js';

// ---------------------------------------------------------------- lookups

/** @param {string} id */
export async function findDepartmentOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That department does not exist.');
  const d = await Department.findById(id);
  if (!d) throw notFound('That department does not exist.');
  return d;
}

/** @param {any} d @param {string} posId */
export function positionOr404(d, posId) {
  const p = mongoose.isValidObjectId(posId) ? d.positions.id(posId) : null;
  if (!p) throw notFound('That position is not in this department.');
  return p;
}

/** @param {any} d @param {string} kind @param {string} taskId */
export function taskOr404(d, kind, taskId) {
  const list = d[TASK_LIST_FIELD[kind]];
  const t = mongoose.isValidObjectId(taskId) ? list.id(taskId) : null;
  if (!t) throw notFound(`That ${kind} task is not in this department.`);
  return t;
}

/** @param {any} d @param {string} tab @param {string} sectionId */
export function sectionOr404(d, tab, sectionId) {
  const list = d.reviewCadence[CADENCE_AGENDA_FIELD[tab]];
  const s = mongoose.isValidObjectId(sectionId) ? list.id(sectionId) : null;
  if (!s) throw notFound(`That ${tab} agenda section does not exist.`);
  return s;
}

/** @param {any} section @param {string} pointId */
export function pointOr404(section, pointId) {
  const p = mongoose.isValidObjectId(pointId) ? section.points.id(pointId) : null;
  if (!p) throw notFound('That agenda point does not exist.');
  return p;
}

/** Highest `order` in a list + 1, so a new row lands at the bottom. @param {{ order?: number }[]} list */
const nextOrder = (list) => list.reduce((m, x) => Math.max(m, x.order ?? 0), 0) + 1;

/**
 * Checks that every id is one of this department's positions.
 * @param {any} d @param {string[] | undefined} ids
 */
function checkPositions(d, ids) {
  if (!ids) return undefined;
  for (const id of ids) {
    if (!d.positions.id(id)) throw badRequest('One of the positions you picked is not in this department. Refresh the page and try again.', [{ field: 'positionIds', message: `Unknown position "${id}".` }]);
  }
  return ids;
}

// ---------------------------------------------------------------- list

/** @param {import('../utils/listQuery.js').ListQuery} lq */
export const listDepartments = (lq) => runList(Department, lq, serializeDepartment);

/** `person=` filter: somebody assigned to the department, with or without a "(role)" suffix. @param {string} name */
export const personClause = (name) => nameClause('assignments.name', name);

/** `owner=` filter: the review-cadence owner contains this text (the field holds "Lab Head · Dr. Anusha Singh"). @param {string} v */
export const ownerClause = (v) => ({ 'reviewCadence.owner': new RegExp(escapeRegex(v), 'i') });

/** `position=` filter: the department has a position with this name. @param {string} v */
export const positionNameClause = (v) => ({ 'positions.name': new RegExp(`^${escapeRegex(v)}$`, 'i') });

/** `system=` filter: one of the review cadence's primary systems. @param {string} v */
export const systemClause = (v) => ({ 'reviewCadence.primarySystems': new RegExp(escapeRegex(v), 'i') });

/** `reviewDay=` filter: the weekly review happens on this day of the week (0 = Sun). @param {string} v */
export function reviewDayClause(v) {
  const n = Number.parseInt(v, 10);
  if (!/^[0-6]$/.test(v)) throw badRequest('reviewDay must be a day of the week from 0 (Sunday) to 6 (Saturday).', [{ field: 'reviewDay', message: `"${v}" is not a day number.` }]);
  return { 'reviewCadence.weekly.daysOfWeek': n };
}

// ---------------------------------------------------------------- department CRUD

/** 'TDPL-NEW-001' with the first number no department uses yet. */
export async function nextCode() {
  const taken = new Set((await Department.find({}, { code: 1 })).map((d) => d.code));
  for (let n = 1; n < 1000; n += 1) {
    const code = `TDPL-NEW-${String(n).padStart(3, '0')}`;
    if (!taken.has(code)) return code;
  }
  return `TDPL-NEW-${Date.now()}`;
}

/**
 * Builds the sub-documents of a new department. Tasks reference positions by their index in `positions`
 * (`positions: [0, 2]`), which is what the web's department templates carry.
 * @param {Record<string, any>} input
 */
function buildNew(input) {
  const positions = (input.positions ?? []).map((p) => ({ _id: new mongoose.Types.ObjectId(), name: p.name, description: p.description ?? '' }));
  /** @param {number[] | undefined} idx */
  const resolve = (idx) => {
    if (!idx?.length) return [];
    const out = [];
    for (const i of idx) {
      const p = positions[i];
      if (!p) throw badRequest(`Task position ${i + 1} does not exist — this department only has ${positions.length} position${positions.length === 1 ? '' : 's'}.`, [{ field: 'positions', message: `No position at index ${i}.` }]);
      out.push(p._id);
    }
    return [...new Set(out.map(String))].map((s) => new mongoose.Types.ObjectId(s));
  };
  /** @param {string} kind */
  const tasks = (kind) =>
    (input[TASK_LIST_FIELD[kind]] ?? []).map((t, i) => ({
      order: t.order ?? i + 1,
      text: t.text,
      defaultTime: t.defaultTime ?? '',
      positionIds: resolve(t.positions),
      ...(kind === 'weekly' ? { daysOfWeek: t.daysOfWeek?.length ? [...new Set(t.daysOfWeek)] : [1] } : {}),
      ...(kind === 'monthly' ? { dayOfMonth: t.dayOfMonth ?? 1 } : {}),
    }));
  const assignments = (input.assignments ?? []).map((a) => ({
    name: a.name,
    positionId: a.position !== undefined && positions[a.position] ? positions[a.position]._id : null,
    role: a.role ?? 'member',
  }));
  return { positions, assignments, openingTasks: tasks('opening'), closingTasks: tasks('closing'), weeklyTasks: tasks('weekly'), monthlyTasks: tasks('monthly') };
}

/** @param {Record<string, any>} input validated body @param {any} me */
export async function createDepartment(input, me) {
  const code = input.code ?? (await nextCode());
  if (await Department.exists({ code })) throw conflict(`A department with the code ${code} already exists. Pick another code.`);
  const built = buildNew(input);
  const order = input.order ?? (await Department.countDocuments()) + 1;
  return Department.create({
    code,
    name: input.name,
    icon: input.icon ?? '🏢',
    description: input.description ?? '',
    order,
    ...built,
    reviewCadence: input.reviewCadence ?? {},
    createdBy: { id: me._id, name: me.name },
  });
}

export const DEPARTMENT_CHANGE_FIELDS = ['code', 'name', 'icon', 'description', 'order'];
/** @param {any} d */
export const departmentSnapshot = (d) => ({ code: d.code, name: d.name, icon: d.icon, description: d.description, order: d.order });

/** @param {any} d @param {Record<string, any>} patch */
export async function patchDepartment(d, patch) {
  const before = departmentSnapshot(d);
  if (patch.code !== undefined && patch.code !== d.code && (await Department.exists({ code: patch.code }))) {
    throw conflict(`A department with the code ${patch.code} already exists. Pick another code.`);
  }
  for (const f of DEPARTMENT_CHANGE_FIELDS) if (patch[f] !== undefined) d[f] = patch[f];
  await d.save();
  return before;
}

/**
 * Deletes the department and every shift tick recorded against it.
 *
 * Logged activities (ActivityEntry) are a person's own record of work they did, not a tick against a
 * task that no longer exists, so they are kept — only their link to the department is loosened.
 * @param {any} d
 */
export async function deleteDepartmentCascade(d) {
  const ticks = await ActivityTick.deleteMany({ department: d._id });
  const logged = await ActivityEntry.updateMany({ department: d._id }, { $set: { department: null } });
  await d.deleteOne();
  return { ticks: ticks.deletedCount ?? 0, logged: logged.modifiedCount ?? 0 };
}

// ---------------------------------------------------------------- positions

/** @param {any} d @param {{ name: string, description?: string }} body */
export async function addPosition(d, body) {
  d.positions.push({ name: body.name, description: body.description ?? '' });
  await d.save();
  return d.positions[d.positions.length - 1];
}

/** @param {any} d @param {string} posId @param {Record<string, any>} patch */
export async function patchPosition(d, posId, patch) {
  const p = positionOr404(d, posId);
  const before = { name: p.name, description: p.description };
  if (patch.name !== undefined) p.name = patch.name;
  if (patch.description !== undefined) p.description = patch.description;
  await d.save();
  return { position: p, before };
}

/** Removes a position; tasks tagged to it revert to "All in department". @param {any} d @param {string} posId */
export async function removePosition(d, posId) {
  const p = positionOr404(d, posId);
  const name = p.name;
  d.positions.pull(posId);
  let untagged = 0;
  for (const field of Object.values(TASK_LIST_FIELD)) {
    for (const t of d[field]) {
      if ((t.positionIds ?? []).some((x) => x.toString() === posId)) {
        t.positionIds = t.positionIds.filter((x) => x.toString() !== posId);
        untagged += 1;
      }
    }
  }
  for (const a of d.assignments) if (a.positionId?.toString() === posId) a.positionId = null;
  await d.save();
  return { name, untagged };
}

// ---------------------------------------------------------------- tasks

/** @param {any} d @param {string} kind @param {Record<string, any>} body */
export async function addTask(d, kind, body) {
  const list = d[TASK_LIST_FIELD[kind]];
  checkPositions(d, body.positionIds);
  list.push({
    order: body.order ?? nextOrder(list),
    text: body.text,
    defaultTime: body.defaultTime ?? '',
    positionIds: body.positionIds ?? [],
    ...(kind === 'weekly' ? { daysOfWeek: body.daysOfWeek?.length ? [...new Set(body.daysOfWeek)] : [1] } : {}),
    ...(kind === 'monthly' ? { dayOfMonth: body.dayOfMonth ?? 1 } : {}),
  });
  await d.save();
  return list[list.length - 1];
}

/** @param {any} d @param {string} kind @param {string} taskId @param {Record<string, any>} patch */
export async function patchTask(d, kind, taskId, patch) {
  const t = taskOr404(d, kind, taskId);
  const before = { text: t.text, defaultTime: t.defaultTime, order: t.order, positionIds: (t.positionIds ?? []).map(String), daysOfWeek: [...(t.daysOfWeek ?? [])], dayOfMonth: t.dayOfMonth };
  checkPositions(d, patch.positionIds);
  for (const f of ['order', 'text', 'defaultTime', 'positionIds']) if (patch[f] !== undefined) t[f] = patch[f];
  if (patch.daysOfWeek !== undefined) {
    if (kind !== 'weekly') throw badRequest('Only weekly tasks have days of the week.');
    // The web app never leaves a weekly task without a day — clearing the last chip falls back to Monday.
    t.daysOfWeek = patch.daysOfWeek.length ? [...new Set(patch.daysOfWeek)] : [1];
  }
  if (patch.dayOfMonth !== undefined) {
    if (kind !== 'monthly') throw badRequest('Only monthly tasks have a date of the month.');
    t.dayOfMonth = patch.dayOfMonth;
  }
  await d.save();
  return { task: t, before };
}

/** @param {any} d @param {string} kind @param {string} taskId */
export async function removeTask(d, kind, taskId) {
  const t = taskOr404(d, kind, taskId);
  const text = t.text;
  d[TASK_LIST_FIELD[kind]].pull(taskId);
  await ActivityTick.deleteMany({ department: d._id, kind, taskId });
  await d.save();
  return { text };
}

// ---------------------------------------------------------------- review cadence

/** Replaces the cadence settings (not the agendas). @param {any} d @param {Record<string, any>} body */
export async function putCadence(d, body) {
  const rc = d.reviewCadence;
  if (body.weekly !== undefined) {
    rc.weekly.daysOfWeek = [...new Set(body.weekly.daysOfWeek ?? rc.weekly.daysOfWeek)];
    if (body.weekly.time !== undefined) rc.weekly.time = body.weekly.time;
    if (body.weekly.duration !== undefined) rc.weekly.duration = body.weekly.duration;
  }
  if (body.monthly !== undefined) {
    if (body.monthly.dayOfMonth !== undefined) rc.monthly.dayOfMonth = body.monthly.dayOfMonth;
    if (body.monthly.time !== undefined) rc.monthly.time = body.monthly.time;
    if (body.monthly.duration !== undefined) rc.monthly.duration = body.monthly.duration;
  }
  if (body.owner !== undefined) rc.owner = body.owner;
  if (body.primarySystems !== undefined) rc.primarySystems = body.primarySystems;
  d.markModified('reviewCadence');
  await d.save();
  return rc;
}

/** @param {any} d @param {string} tab @param {{ heading: string }} body */
export async function addSection(d, tab, body) {
  const list = d.reviewCadence[CADENCE_AGENDA_FIELD[tab]];
  list.push({ order: nextOrder(list), heading: body.heading, points: [] });
  await d.save();
  return list[list.length - 1];
}

/** @param {any} d @param {string} tab @param {string} sectionId @param {Record<string, any>} patch */
export async function patchSection(d, tab, sectionId, patch) {
  const s = sectionOr404(d, tab, sectionId);
  const before = { heading: s.heading, order: s.order };
  if (patch.heading !== undefined) s.heading = patch.heading;
  if (patch.order !== undefined) s.order = patch.order;
  await d.save();
  return { section: s, before };
}

/** @param {any} d @param {string} tab @param {string} sectionId */
export async function removeSection(d, tab, sectionId) {
  const s = sectionOr404(d, tab, sectionId);
  const summary = { heading: s.heading, points: (s.points ?? []).length };
  d.reviewCadence[CADENCE_AGENDA_FIELD[tab]].pull(sectionId);
  await d.save();
  return summary;
}

/** @param {any} d @param {string} tab @param {string} sectionId @param {{ text: string, indicator?: string | null }} body */
export async function addPoint(d, tab, sectionId, body) {
  const s = sectionOr404(d, tab, sectionId);
  s.points.push({ text: body.text, indicator: body.indicator ?? null });
  await d.save();
  return { section: s, point: s.points[s.points.length - 1] };
}

/** @param {any} d @param {string} tab @param {string} sectionId @param {string} pointId @param {Record<string, any>} patch */
export async function patchPoint(d, tab, sectionId, pointId, patch) {
  const s = sectionOr404(d, tab, sectionId);
  const p = pointOr404(s, pointId);
  const before = { text: p.text, indicator: p.indicator ?? null };
  if (patch.text !== undefined) p.text = patch.text;
  if (patch.indicator !== undefined) p.indicator = patch.indicator;
  await d.save();
  return { section: s, point: p, before };
}

/** @param {any} d @param {string} tab @param {string} sectionId @param {string} pointId */
export async function removePoint(d, tab, sectionId, pointId) {
  const s = sectionOr404(d, tab, sectionId);
  const p = pointOr404(s, pointId);
  const text = p.text;
  s.points.pull(pointId);
  await d.save();
  return { section: s, text };
}

// ---------------------------------------------------------------- assignments

/** Replaces the department's people. @param {any} d @param {{ name: string, positionId?: string | null, role?: string }[]} list */
export async function putAssignments(d, list) {
  const seen = new Set();
  const next = [];
  for (const a of list) {
    const key = cleanName(a.name).toLowerCase();
    if (seen.has(key)) throw badRequest(`${a.name} is in this department's people list twice.`, [{ field: 'assignments', message: 'Duplicate person.' }]);
    seen.add(key);
    if (a.positionId) positionOr404(d, a.positionId);
    if (a.unitKey) {
      const unit = (d.labReadiness?.units ?? []).find((u) => u.key === a.unitKey);
      if (!unit) throw badRequest(`"${a.unitKey}" is not a unit of ${d.name}.`, [{ field: 'assignments', message: `Unknown unit for ${a.name}.` }]);
    }
    next.push({ name: a.name, positionId: a.positionId ?? null, role: a.role ?? 'member', unitKey: a.unitKey ?? '' });
  }
  d.assignments = next;
  await d.save();
  return d.assignments;
}

/**
 * The org-wide map My Activity and the Dashboard look people up in:
 * `{ 'Dr. Anusha Singh': { departmentId, positionId, role } }` (web: EMPLOYEE_ASSIGNMENTS).
 */
export async function assignmentMap() {
  const docs = await Department.find({}, { name: 1, positions: 1, assignments: 1 }).sort({ order: 1 });
  /** @type {Record<string, { departmentId: string, positionId: string | null, role: string, unitKey: string }>} */
  const map = {};

  // 1. The list each department keeps of its people. This covers names from the original roster that
  //    have no login of their own.
  for (const d of docs) {
    for (const a of d.assignments ?? []) {
      map[a.name] = {
        departmentId: d._id.toString(),
        positionId: a.positionId ? a.positionId.toString() : null,
        role: a.role ?? 'member',
        // Which unit of the department they work in — the laboratory uses it, nothing else does.
        unitKey: a.unitKey ?? '',
      };
    }
  }

  // 2. Real accounts win. Whoever has a department chosen on their user record belongs to it — that
  //    single choice in Settings is what gives them their shift checklist in My Activity, so there is
  //    no second place to keep in step. A department that no longer exists changes nothing, and the
  //    roster entry (if any) still stands.
  const byName = new Map(docs.map((d) => [cleanName(d.name).toLowerCase(), d]));
  const users = await User.find({ status: 'active', department: { $nin: ['', null] } }, { name: 1, department: 1, position: 1, labUnit: 1, role: 1 });
  for (const u of users) {
    const d = byName.get(cleanName(u.department).toLowerCase());
    if (!d) continue;
    const wanted = cleanName(u.position ?? '').toLowerCase();
    const pos = wanted ? (d.positions ?? []).find((p) => cleanName(p.name).toLowerCase() === wanted) : null;
    map[u.name] = {
      departmentId: d._id.toString(),
      positionId: pos ? pos._id.toString() : null,
      // No position chosen and they run things: show them everything their department does.
      role: !pos && (u.role === 'admin' || u.role === 'manager') ? 'head' : 'member',
      // The unit chosen on the account wins; one left on the department's own list still counts.
      unitKey: (u.labUnit ?? '') || (map[u.name]?.unitKey ?? ''),
    };
  }
  return map;
}

// ---------------------------------------------------------------- activity ticks

/**
 * The shift log for a day, as the nested map the web app reads.
 * @param {{ date: string, persons?: string[] | null, departmentIds?: string[] | null }} opts
 */
export async function readActivityLog({ date, persons = null, departmentIds = null }) {
  /** @type {Record<string, unknown>} */
  const filter = { date };
  if (persons) filter.person = { $in: persons.map((p) => new RegExp(`^${escapeRegex(cleanName(p))}(\\s*\\(.*\\))?$`, 'i')) };
  if (departmentIds) filter.department = { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) };
  const ticks = await ActivityTick.find(filter);
  return toActivityLog(ticks);
}

/**
 * Ticks or un-ticks one task for one person on one day. The task must exist in the department's lane
 * (the 'review' lane carries the department id itself, which is what the web app ticks).
 * @param {{ person: string, date: string, departmentId: string, kind: string, taskId: string, done: boolean, by: any }} input
 */
export async function setTick({ person, date, departmentId, kind, taskId, done, by }) {
  const d = await findDepartmentOr404(departmentId);
  const task = kind === 'review' ? null : taskOr404(d, kind, taskId);
  if (done) {
    await ActivityTick.updateOne(
      { person, date, kind, taskId },
      { $set: { status: 'done', department: d._id, by: { id: by?._id ?? null, name: by?.name ?? '' } }, $setOnInsert: { person, date, kind, taskId } },
      { upsert: true },
    );
  } else {
    await ActivityTick.deleteOne({ person, date, kind, taskId });
  }
  return { department: d, text: task ? task.text : `${d.name} ${kind} review` };
}

// ---------------------------------------------------------------- logged activities (ad-hoc)

/** The same forgiving person match the tick log uses, so "Pavan" finds "Pavan (IT)". @param {string} p */
const personRe = (p) => new RegExp(`^${escapeRegex(cleanName(p))}(\\s*\\(.*\\))?$`, 'i');

/**
 * One person's logged activities for a day, grouped by lane.
 * @param {{ date: string, person: string }} input
 */
export async function readLoggedActivity({ date, person }) {
  const entries = await ActivityEntry.find({ date, person: personRe(person) }).sort({ createdAt: 1 });
  return toLoggedLanes(entries);
}

/**
 * Records something that was not on the checklist.
 * @param {{ person: string, date: string, lane: string, text: string, atTime?: string, tag?: string, departmentId?: string | null, by: any }} input
 */
export async function addLoggedActivity({ person, date, lane, text, atTime = '', tag = '', departmentId = null, by }) {
  const department = departmentId ? (await findDepartmentOr404(departmentId))._id : null;
  const e = await ActivityEntry.create({
    person, date, lane, text, atTime, tag, done: true, department,
    by: { id: by?._id ?? null, name: by?.name ?? '' },
  });
  return e;
}

/** @param {string} id @param {string} person @param {boolean} forAnyone */
export async function findLoggedOr404(id, person, forAnyone) {
  const e = await ActivityEntry.findById(id);
  if (!e) throw notFound('That logged activity no longer exists. Refresh the page.');
  if (!forAnyone && !personRe(person).test(e.person)) {
    throw notFound('That logged activity no longer exists. Refresh the page.');
  }
  return e;
}

/** @param {any} e @param {{ text?: string, atTime?: string, tag?: string, done?: boolean }} patch */
export async function patchLoggedActivity(e, patch) {
  const before = { text: e.text, atTime: e.atTime, tag: e.tag, done: e.done };
  for (const f of ['text', 'atTime', 'tag', 'done']) if (patch[f] !== undefined) e[f] = patch[f];
  await e.save();
  return before;
}

/** @param {any} e */
export async function removeLoggedActivity(e) {
  const text = e.text;
  await e.deleteOne();
  return { text };
}

// ---------------------------------------------------------------- seed

/**
 * Seeds the 18 TDPL departments from src/data/departments.js (the prototype's normalised list) with their
 * positions, the four task lanes, the review cadences and the roster's position assignments.
 * Idempotent: a department whose code already exists is left exactly as it is.
 * @param {{ quiet?: boolean }} [opts]
 */
export async function seedDepartments(opts = {}) {
  const seeds = buildInitialDepartments();
  /** @type {Record<string, { deptId: any, positions: Record<string, any> }>} */
  const built = {};
  let created = 0;
  let kept = 0;

  for (const [i, s] of seeds.entries()) {
    const existing = await Department.findOne({ code: s.code });
    if (existing) {
      built[s.id] = { deptId: existing._id, positions: {} };
      // Match the seed's positions to the stored ones by name, so assignments still resolve.
      for (const p of s.positions) {
        const found = existing.positions.find((x) => x.name === p.name);
        if (found) built[s.id].positions[p.id] = found._id;
      }
      kept += 1;
      if (!opts.quiet) console.log(`[seed] kept    ${s.code} ${s.name}`);
      continue;
    }
    /** @type {Record<string, any>} */
    const posIds = {};
    const positions = s.positions.map((p) => {
      const _id = new mongoose.Types.ObjectId();
      posIds[p.id] = _id;
      return { _id, name: p.name, description: p.description ?? '' };
    });
    /** @param {any[]} list @param {string} kind */
    const lane = (list, kind) =>
      (list ?? []).map((t, n) => ({
        order: t.order ?? n + 1,
        text: t.text,
        defaultTime: t.defaultTime ?? '',
        positionIds: (t.positionIds ?? []).map((id) => posIds[id]).filter(Boolean),
        ...(kind === 'weekly' ? { daysOfWeek: t.daysOfWeek?.length ? t.daysOfWeek : [1] } : {}),
        ...(kind === 'monthly' ? { dayOfMonth: t.dayOfMonth ?? 1 } : {}),
      }));
    /** @param {any[]} agenda */
    const sections = (agenda) => (agenda ?? []).map((sec, n) => ({ order: sec.order ?? n + 1, heading: sec.heading ?? '', points: (sec.points ?? []).map((p) => ({ text: p.text ?? '', indicator: p.indicator ?? null })) }));
    const rc = s.reviewCadence ?? {};
    const doc = await Department.create({
      code: s.code,
      name: s.name,
      icon: s.icon ?? '🏢',
      description: s.description ?? '',
      order: i + 1,
      positions,
      openingTasks: lane(s.openingTasks, 'opening'),
      closingTasks: lane(s.closingTasks, 'closing'),
      weeklyTasks: lane(s.weeklyTasks, 'weekly'),
      monthlyTasks: lane(s.monthlyTasks, 'monthly'),
      reviewCadence: {
        weekly: { daysOfWeek: rc.weekly?.daysOfWeek ?? [], time: rc.weekly?.time ?? '', duration: rc.weekly?.duration ?? 45 },
        monthly: { dayOfMonth: rc.monthly?.dayOfMonth ?? '', time: rc.monthly?.time ?? '', duration: rc.monthly?.duration ?? 60 },
        owner: rc.owner ?? '',
        primarySystems: rc.primarySystems ?? [],
        weeklyAgenda: sections(rc.weeklyAgenda),
        monthlyAgenda: sections(rc.monthlyAgenda),
      },
    });
    built[s.id] = { deptId: doc._id, positions: posIds };
    created += 1;
    if (!opts.quiet) console.log(`[seed] created ${s.code} ${s.name}`);
  }

  // The roster's department / position assignments (web: EMPLOYEE_ASSIGNMENTS).
  /** @type {Record<string, any[]>} */
  const byDept = {};
  for (const [name, a] of Object.entries(EMPLOYEE_ASSIGNMENTS)) {
    const b = a.departmentId ? built[a.departmentId] : null;
    if (!b) continue;
    (byDept[a.departmentId] ??= []).push({ name, positionId: a.positionId ? (b.positions[a.positionId] ?? null) : null, role: a.role ?? 'member' });
  }
  let people = 0;
  for (const [seedId, list] of Object.entries(byDept)) {
    const doc = await Department.findById(built[seedId].deptId);
    if (!doc || doc.assignments.length) continue; // never overwrite people somebody edited
    doc.assignments = list;
    await doc.save();
    people += list.length;
  }

  const lab = await seedLabReadiness(opts);
  return { created, kept, people, lab };
}

/**
 * Switches Lab Readiness on for the clinical laboratory and fills in its master checklist — the 14 units
 * and 52 activities of TDPL-LAB-SOP-014 (data/labReadiness.js).
 *
 * Safe to run again: a department that already carries a checklist is left exactly as it is, because the
 * units and activities are editable in Department Master and a re-run must never undo somebody's edits.
 * @param {{ quiet?: boolean }} [opts]
 */
export async function seedLabReadiness(opts = {}) {
  const doc = await Department.findOne({ code: LAB_READINESS_DEPARTMENT_CODE });
  if (!doc) {
    if (!opts.quiet) console.log(`[seed] lab readiness skipped — no department with code ${LAB_READINESS_DEPARTMENT_CODE}`);
    return { department: null, units: 0, activities: 0, kept: false };
  }
  const lr = doc.labReadiness ?? {};
  if ((lr.units?.length ?? 0) > 0 || (lr.activities?.length ?? 0) > 0) {
    if (!opts.quiet) console.log(`[seed] lab readiness kept    ${doc.name} · ${lr.units?.length ?? 0} units · ${lr.activities?.length ?? 0} activities`);
    return { department: doc.name, units: lr.units?.length ?? 0, activities: lr.activities?.length ?? 0, kept: true };
  }
  doc.labReadiness = {
    enabled: true,
    openingCutoff: '09:30',
    closingCutoff: '22:30',
    units: LAB_UNITS.map((u) => ({ ...u })),
    activities: LAB_ACTIVITIES.map((a) => ({ ...a })),
  };
  await doc.save();
  if (!opts.quiet) console.log(`[seed] lab readiness created ${doc.name} · ${LAB_UNITS.length} units · ${LAB_ACTIVITIES.length} activities`);
  return { department: doc.name, units: LAB_UNITS.length, activities: LAB_ACTIVITIES.length, kept: false };
}
