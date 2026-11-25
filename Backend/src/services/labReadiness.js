import mongoose from 'mongoose';
import { Department, serializeLabReadiness } from '../models/Department.js';
import { LabRun, isSigned, serializeRun } from '../models/LabRun.js';
import { DECLARATIONS, LAB_ACTIVITIES, LAB_UNITS } from '../data/labReadiness.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { deleteEvidence, putEvidence } from './storage.js';

/**
 * Lab Readiness — the daily opening and closing board for a laboratory unit.
 *
 * The rules a record has to satisfy before it can be signed are v1's, unchanged:
 *   · every activity that applies to the unit has a status;
 *   · a deviation carries a remark saying what happened;
 *   · an activity marked photo-required has at least one photograph.
 * A signed record is read-only. Reopening it is recorded, with a reason.
 */

/** The department that runs the board, or a clear 404. */
export async function readinessDepartment(departmentId) {
  const id = departmentId ? String(departmentId) : '';
  if (id && !mongoose.isValidObjectId(id)) throw notFound('That department does not exist.');
  const d = id
    ? await Department.findById(id)
    : await Department.findOne({ 'labReadiness.enabled': true }).sort({ order: 1 });
  if (!d) throw notFound('No department is set up for Lab Readiness yet. Turn it on in Department Master.');
  if (!d.labReadiness?.enabled) throw badRequest(`Lab Readiness is not switched on for ${d.name}.`);
  return d;
}

/** The unit being recorded, by its key. */
export function unitOr404(dept, unitKey) {
  const u = (dept.labReadiness?.units ?? []).find((x) => x.key === unitKey && x.active !== false);
  if (!u) throw notFound(`"${unitKey}" is not a unit of ${dept.name}.`);
  return u;
}

/** The activities that apply to one unit in one phase, in board order. */
export function activitiesFor(dept, unit, phase) {
  const field = unit.kind === 'nrl' ? 'nrl' : 'field';
  return (dept.labReadiness?.activities ?? [])
    .filter((a) => a.active !== false && a.phase === phase && (a.scope === 'all' || a.scope === field))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Is this line that person's?
 *
 * An activity with no positions belongs to everyone in the department, the same as an untagged
 * shift task. A department head, with no position of their own, holds every line.
 * @param {any} activity @param {string | null} positionId @param {string} [role]
 */
export function isFor(activity, positionId, role) {
  const ids = (activity.positionIds ?? []).map(String);
  if (ids.length === 0) return true;
  if (!positionId) return role === 'head' || role === 'cmd';
  return ids.includes(String(positionId));
}

/** Where a person stands in this department: their position, their unit, and what they hold. */
export function standingOf(dept, user) {
  const name = (user?.name ?? '').trim().toLowerCase();
  const listed = (dept.assignments ?? []).find((a) => (a.name ?? '').trim().toLowerCase() === name);
  const wanted = (user?.position ?? '').trim().toLowerCase();
  const byTitle = wanted ? (dept.positions ?? []).find((p) => p.name.trim().toLowerCase() === wanted) : null;
  const positionId = listed?.positionId ? listed.positionId.toString() : byTitle ? byTitle._id.toString() : null;
  const position = (dept.positions ?? []).find((p) => p._id.toString() === positionId);
  return {
    name: user?.name ?? '',
    positionId,
    positionName: position?.name ?? '',
    role: listed?.role ?? (user?.role === 'admin' || user?.role === 'manager' ? 'head' : 'member'),
    unitKey: listed?.unitKey ?? '',
  };
}

/** 'YYYY-MM-DD' or a clear message. @param {string} s */
export function requireDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? '')) throw badRequest('Give the date as YYYY-MM-DD.');
  return s;
}

/** The day's record, created empty the first time anything is written to it. */
export async function findOrStartRun(dept, unit, date, phase, by) {
  const existing = await LabRun.findOne({ department: dept._id, unitKey: unit.key, date, phase });
  if (existing) return existing;
  return LabRun.create({
    department: dept._id,
    unitKey: unit.key,
    unitName: unit.name,
    unitKind: unit.kind,
    date,
    phase,
    startedAt: new Date(),
    startedBy: { id: by?._id ?? null, name: by?.name ?? '' },
  });
}

/** The record as it stands, without creating one. */
export const findRun = (dept, unitKey, date, phase) =>
  LabRun.findOne({ department: dept._id, unitKey, date, phase });

/** Refuses to change a record that has been signed. */
function assertOpen(run) {
  if (isSigned(run)) throw conflict('This record is signed off. Reopen it before changing an activity.');
}

/** The line for one activity, created on first touch. */
function itemFor(run, activity) {
  let item = run.items.find((i) => i.taskKey === activity.key);
  if (!item) {
    run.items.push({
      taskKey: activity.key,
      text: activity.text,
      section: activity.section ?? '',
      scheduledTime: activity.scheduledTime ?? '',
    });
    item = run.items[run.items.length - 1];
  }
  return item;
}

/** Sets an activity to done / deviation / N-A, or clears it. */
export async function setItemStatus({ dept, unit, date, phase, taskKey, status, by }) {
  const activity = activitiesFor(dept, unit, phase).find((a) => a.key === taskKey);
  if (!activity) throw badRequest('That activity does not apply to this record.');
  const run = await findOrStartRun(dept, unit, date, phase, by);
  assertOpen(run);

  const item = itemFor(run, activity);
  item.status = status ?? null;
  item.text = activity.text;
  item.section = activity.section ?? '';
  item.scheduledTime = activity.scheduledTime ?? '';
  item.actionedAt = status ? new Date() : null;
  item.actionedBy = status ? { id: by?._id ?? null, name: by?.name ?? '' } : { id: null, name: '' };
  if (!run.startedAt) {
    run.startedAt = new Date();
    run.startedBy = { id: by?._id ?? null, name: by?.name ?? '' };
  }
  await run.save();
  return run;
}

/** Notes what happened on an activity — required when it is a deviation. */
export async function setItemRemark({ dept, unit, date, phase, taskKey, remark, by }) {
  const activity = activitiesFor(dept, unit, phase).find((a) => a.key === taskKey);
  if (!activity) throw badRequest('That activity does not apply to this record.');
  const run = await findOrStartRun(dept, unit, date, phase, by);
  assertOpen(run);
  itemFor(run, activity).remark = (remark ?? '').trim();
  await run.save();
  return run;
}

/** Files a photograph against an activity. */
export async function addPhoto({ dept, unit, date, phase, taskKey, body, contentType, name, by }) {
  const activity = activitiesFor(dept, unit, phase).find((a) => a.key === taskKey);
  if (!activity) throw badRequest('That activity does not apply to this record.');
  const run = await findOrStartRun(dept, unit, date, phase, by);
  assertOpen(run);

  const stored = await putEvidence({ phase, unitKey: unit.key, date, taskKey, body, contentType });
  run.photos.push({
    taskKey,
    name: name || `${taskKey}.jpg`,
    mimeType: contentType,
    sizeBytes: body.length,
    path: stored.path,
    disk: stored.disk,
    uploadedBy: { id: by?._id ?? null, name: by?.name ?? '' },
  });
  await run.save();
  return run;
}

/** Removes a photograph, and the file behind it. */
export async function removePhoto({ dept, unitKey, date, phase, photoId }) {
  const run = await findRun(dept, unitKey, date, phase);
  if (!run) throw notFound('There is no record for that day yet.');
  assertOpen(run);
  const photo = run.photos.id(photoId);
  if (!photo) throw notFound('That photograph is not on this record.');
  await deleteEvidence(photo.path, photo.disk);
  photo.deleteOne();
  await run.save();
  return run;
}

/**
 * What is still missing before the record can be signed — v1's rules, unchanged:
 *
 *   · every activity has a status;
 *   · a deviation OR an N/A carries a remark saying why;
 *   · an activity done as written, where the sheet asks for evidence, carries a photograph.
 *
 * A photograph is asked for only on `done`: an activity that did not happen as written has a remark
 * explaining it instead, and there may be nothing to photograph.
 *
 * `done` counts everything recorded, whatever the answer — it is what the progress ring reads. The
 * breakdown beside it says how those answers were split.
 * @returns {{ total: number, done: number, completed: number, deviations: number, na: number, pending: number, missing: string[], complete: boolean }}
 */
export function completeness(dept, unit, phase, run) {
  const activities = activitiesFor(dept, unit, phase);
  const items = new Map((run?.items ?? []).map((i) => [i.taskKey, i]));
  const photos = new Set((run?.photos ?? []).map((p) => p.taskKey));
  /** @type {string[]} */
  const missing = [];
  let completed = 0;
  let deviations = 0;
  let na = 0;
  let pending = 0;

  for (const a of activities) {
    const item = items.get(a.key);
    const status = item?.status ?? null;
    if (status === 'done') completed += 1;
    else if (status === 'deviation') deviations += 1;
    else if (status === 'na') na += 1;
    else pending += 1;

    if (!status) {
      missing.push(`${a.key} — no status yet`);
      continue;
    }
    if ((status === 'deviation' || status === 'na') && !(item.remark ?? '').trim()) {
      missing.push(`${a.key} — ${status === 'na' ? 'an N/A' : 'a deviation'} needs a remark`);
    }
    if (status === 'done' && a.photoRequired && !photos.has(a.key)) missing.push(`${a.key} — needs a photograph`);
  }
  return {
    total: activities.length,
    done: completed + deviations + na,
    completed,
    deviations,
    na,
    pending,
    missing,
    complete: activities.length > 0 && missing.length === 0,
  };
}

/** Signs the record off: declaration, selfie, and the closing timestamp the sheet asks for. */
export async function signOff({ dept, unit, date, phase, selfie, contentType, by, role }) {
  const run = await findRun(dept, unit.key, date, phase);
  if (!run) throw badRequest('Nothing has been recorded for this day yet.');
  if (isSigned(run)) throw conflict('This record is already signed off.');

  const state = completeness(dept, unit, phase, run);
  if (!state.complete) {
    throw badRequest(
      'Every activity needs a status, a remark where required, and its photograph.',
      state.missing.slice(0, 10).map((m) => ({ field: m.split(' — ')[0], message: m })),
    );
  }
  if (!selfie?.length) throw badRequest('A sign-off photograph of the person signing is required.');

  const stored = await putEvidence({ phase: 'signoff', unitKey: unit.key, date, taskKey: phase, body: selfie, contentType });
  const cutoff = phase === 'opening' ? dept.labReadiness?.openingCutoff : dept.labReadiness?.closingCutoff;

  run.signedAt = new Date();
  run.signedBy = { id: by?._id ?? null, name: by?.name ?? '', role: role ?? '' };
  run.declaration = DECLARATIONS[phase];
  run.selfiePath = stored.path;
  run.selfieDisk = stored.disk;
  run.late = isLate(run.signedAt, date, cutoff);
  await run.save();
  return run;
}

/** Signed after the department's cut-off for that phase. Accepted, but recorded. */
export function isLate(signedAt, date, cutoff) {
  if (!/^\d{2}:\d{2}$/.test(cutoff ?? '')) return false;
  const [h, m] = cutoff.split(':').map(Number);
  const deadline = new Date(`${date}T00:00:00`);
  deadline.setHours(h, m, 0, 0);
  return signedAt > deadline;
}

/** Opens a signed record again, with a reason on the record. */
export async function reopen({ dept, unitKey, date, phase, reason, by }) {
  const run = await findRun(dept, unitKey, date, phase);
  if (!run) throw notFound('There is no record for that day.');
  if (!isSigned(run)) throw badRequest('That record is not signed off, so there is nothing to reopen.');
  if (!(reason ?? '').trim()) throw badRequest('Say why the record is being reopened — it goes on the record.');

  run.reopenLog.push({ at: new Date(), by: by?.name ?? '', reason: reason.trim() });
  if (run.selfiePath) await deleteEvidence(run.selfiePath, run.selfieDisk);
  run.signedAt = null;
  run.signedBy = { id: null, name: '', role: '' };
  run.declaration = '';
  run.selfiePath = '';
  run.selfieDisk = '';
  run.late = false;
  await run.save();
  return run;
}

/**
 * Everything the board needs to draw one unit's day.
 *
 * Every line of the round is here, whoever it belongs to — the sheet is signed as one record, and a
 * line nobody can see is a line nobody does. `positions` says whose each one is and `mine` marks the
 * reader's own, so the apps can show that without hiding anything.
 * @param {any} [who] the person reading it, from standingOf()
 */
export function boardState(dept, unit, date, phase, run, who) {
  const byId = new Map((dept.positions ?? []).map((p) => [p._id.toString(), p.name]));
  return {
    department: { id: dept._id.toString(), name: dept.name, code: dept.code },
    config: serializeLabReadiness(dept.labReadiness),
    unit: { key: unit.key, name: unit.name, kind: unit.kind },
    date,
    phase,
    declaration: DECLARATIONS[phase],
    me: who ?? null,
    activities: activitiesFor(dept, unit, phase).map((a) => ({
      key: a.key, section: a.section ?? '', text: a.text,
      scheduledTime: a.scheduledTime ?? '', photoRequired: Boolean(a.photoRequired),
      positions: (a.positionIds ?? []).map((id) => ({ id: id.toString(), name: byId.get(id.toString()) ?? '' })),
      mine: who ? isFor(a, who.positionId, who.role) : true,
    })),
    run: run ? serializeRun(run) : null,
    progress: completeness(dept, unit, phase, run),
  };
}

/**
 * One person's readiness lines for a day — what My Activity shows in place of the shift tasks.
 *
 * Their unit comes from Department Master (their assignment), their lines from the positions each
 * activity is tagged to. Untagged activities belong to everyone, so a lab that has tagged nothing
 * sees the whole round here, which is the same as today.
 */
export async function myLines(dept, user, date) {
  const who = standingOf(dept, user);
  const units = dept.labReadiness?.units ?? [];
  const unit = who.unitKey ? units.find((u) => u.key === who.unitKey && u.active !== false) : null;
  if (!unit) {
    return { me: who, unit: null, date, phases: {}, total: 0, done: 0 };
  }

  const runs = await LabRun.find({ department: dept._id, unitKey: unit.key, date });
  const phases = {};
  let total = 0;
  let done = 0;

  for (const phase of LAB_PHASES_ORDER) {
    const run = runs.find((r) => r.phase === phase) ?? null;
    const recorded = new Map((run?.items ?? []).map((i) => [i.taskKey, i]));
    const photos = new Set((run?.photos ?? []).map((p) => p.taskKey));
    const lines = activitiesFor(dept, unit, phase)
      .filter((a) => isFor(a, who.positionId, who.role))
      .map((a) => {
        const item = recorded.get(a.key);
        return {
          key: a.key,
          text: a.text,
          section: a.section ?? '',
          scheduledTime: a.scheduledTime ?? '',
          photoRequired: Boolean(a.photoRequired),
          status: item?.status ?? null,
          remark: item?.remark ?? '',
          photos: photos.has(a.key) ? (run?.photos ?? []).filter((p) => p.taskKey === a.key).length : 0,
          complete: Boolean(item?.status) && !missingOn(a, item, photos),
        };
      });
    total += lines.length;
    done += lines.filter((l) => l.complete).length;
    phases[phase] = { lines, signedAt: run?.signedAt ? run.signedAt.toISOString() : null };
  }

  return { me: who, unit: { key: unit.key, name: unit.name, kind: unit.kind }, date, phases, total, done };
}

const LAB_PHASES_ORDER = ['opening', 'closing'];

/** The same three rules completeness() applies, for one line. */
function missingOn(activity, item, photos) {
  const status = item?.status ?? null;
  if (!status) return true;
  if ((status === 'deviation' || status === 'na') && !(item.remark ?? '').trim()) return true;
  return status === 'done' && activity.photoRequired && !photos.has(activity.key);
}

/** Is this person allowed to record for this department? Admins and its own people are. */
export function assertCanRecord(dept, user) {
  if (user.role === 'admin') return;
  const inDept = (dept.assignments ?? []).some((a) => a.name === user.name)
    || (user.department ?? '').trim().toLowerCase() === dept.name.trim().toLowerCase();
  if (!inDept) throw forbidden(`Only ${dept.name} staff can record this board.`);
}

// ---------------------------------------------------------------- Department Master: the configuration

/** The readiness block on a department, created on first use. @param {any} d */
const block = (d) => {
  if (!d.labReadiness) d.labReadiness = {};
  return d.labReadiness;
};

/** @param {any} d @param {string} unitId */
const unitOr404ById = (d, unitId) => {
  const u = block(d).units.id(unitId);
  if (!u) throw notFound('That unit is not in this department.');
  return u;
};

/** @param {any} d @param {string} activityId */
const activityOr404 = (d, activityId) => {
  const a = block(d).activities.id(activityId);
  if (!a) throw notFound('That activity is not in this department’s checklist.');
  return a;
};

/** Turns the board on or off and sets the two cut-off times. */
export async function setConfig(d, patch) {
  const lr = block(d);
  const before = { enabled: Boolean(lr.enabled), openingCutoff: lr.openingCutoff ?? '', closingCutoff: lr.closingCutoff ?? '' };
  if (patch.enabled !== undefined) lr.enabled = patch.enabled;
  if (patch.openingCutoff !== undefined) lr.openingCutoff = patch.openingCutoff;
  if (patch.closingCutoff !== undefined) lr.closingCutoff = patch.closingCutoff;
  if (patch.enabled && (lr.units?.length ?? 0) === 0) {
    throw badRequest('Add at least one unit before switching Lab Readiness on, or restore the standard checklist.');
  }
  await d.save();
  return before;
}

/** A unit's key is what every past record points at, so it has to be unique and it never changes. */
export async function addUnit(d, body) {
  const lr = block(d);
  const key = slugKey(body.key || body.name);
  if (lr.units.some((u) => u.key === key)) throw conflict(`This department already has a unit keyed "${key}".`);
  lr.units.push({
    key,
    name: body.name,
    kind: body.kind ?? 'nrl',
    active: body.active !== false,
    order: body.order ?? (lr.units.reduce((m, u) => Math.max(m, u.order ?? 0), 0) + 1),
  });
  await d.save();
  return lr.units[lr.units.length - 1];
}

export async function patchUnit(d, unitId, patch) {
  const u = unitOr404ById(d, unitId);
  const before = { name: u.name, kind: u.kind, active: u.active, order: u.order };
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.kind !== undefined) u.kind = patch.kind;
  if (patch.active !== undefined) u.active = patch.active;
  if (patch.order !== undefined) u.order = patch.order;
  await d.save();
  return { unit: u, before };
}

/**
 * Removes a unit. Its completed records stay — they are the laboratory's evidence — so a unit that has
 * ever been recorded is switched off instead of deleted, and the caller is told so.
 */
export async function removeUnit(d, unitId) {
  const u = unitOr404ById(d, unitId);
  const runs = await LabRun.countDocuments({ department: d._id, unitKey: u.key });
  const name = u.name;
  if (runs > 0) {
    u.active = false;
    await d.save();
    return { name, deleted: false, runs };
  }
  block(d).units.pull(unitId);
  await d.save();
  return { name, deleted: true, runs: 0 };
}

export async function addActivity(d, body) {
  const lr = block(d);
  const key = slugKey(body.key || `x-${lr.activities.length + 1}`);
  if (lr.activities.some((a) => a.key === key)) throw conflict(`This checklist already has an activity keyed "${key}".`);
  const samePhase = lr.activities.filter((a) => a.phase === body.phase);
  lr.activities.push({
    key,
    phase: body.phase,
    section: body.section ?? '',
    text: body.text,
    scheduledTime: body.scheduledTime ?? '',
    scope: body.scope ?? 'all',
    positionIds: body.positionIds ?? [],
    photoRequired: Boolean(body.photoRequired),
    active: body.active !== false,
    order: body.order ?? (samePhase.reduce((m, a) => Math.max(m, a.order ?? 0), 0) + 1),
  });
  await d.save();
  return lr.activities[lr.activities.length - 1];
}

export async function patchActivity(d, activityId, patch) {
  const a = activityOr404(d, activityId);
  const before = {
    text: a.text, section: a.section, scheduledTime: a.scheduledTime, scope: a.scope,
    positionIds: (a.positionIds ?? []).map(String).join(','),
    photoRequired: a.photoRequired, active: a.active, order: a.order,
  };
  for (const f of ['section', 'text', 'scheduledTime', 'scope', 'positionIds', 'photoRequired', 'active', 'order']) {
    if (patch[f] !== undefined) a[f] = patch[f];
  }
  await d.save();
  return { activity: a, before };
}

/** Like a unit: an activity that has been recorded is switched off rather than removed. */
export async function removeActivity(d, activityId) {
  const a = activityOr404(d, activityId);
  const used = await LabRun.countDocuments({ department: d._id, 'items.taskKey': a.key });
  const key = a.key;
  const text = a.text;
  if (used > 0) {
    a.active = false;
    await d.save();
    return { key, text, deleted: false, runs: used };
  }
  block(d).activities.pull(activityId);
  await d.save();
  return { key, text, deleted: true, runs: 0 };
}

/**
 * Puts back anything missing from the standard sheet (TDPL-LAB-SOP-014) without touching what is there:
 * an activity whose wording was corrected keeps the correction, one that was deleted comes back.
 */
export async function restoreStandard(d) {
  const lr = block(d);
  const haveUnits = new Set(lr.units.map((u) => u.key));
  const haveActs = new Set(lr.activities.map((a) => a.key));
  let units = 0;
  let activities = 0;
  for (const u of LAB_UNITS) if (!haveUnits.has(u.key)) { lr.units.push({ ...u }); units += 1; }
  for (const a of LAB_ACTIVITIES) if (!haveActs.has(a.key)) { lr.activities.push({ ...a }); activities += 1; }
  if (!lr.openingCutoff) lr.openingCutoff = '09:30';
  if (!lr.closingCutoff) lr.closingCutoff = '22:30';
  await d.save();
  return { units, activities };
}

/** 'Clinical Biochemistry' → 'clinical-biochemistry'. Keys are lower case, dashed and stable. */
export const slugKey = (s) =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// ---------------------------------------------------------------- the day at a glance, and the history

/**
 * Every unit with where its two phases stand on one date — what the landing screen lists.
 * One query for the whole day, then the counting is done in memory.
 */
export async function dayOverview(dept, date) {
  const units = [...(dept.labReadiness?.units ?? [])].filter((u) => u.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const runs = await LabRun.find({ department: dept._id, date });
  const at = (unitKey, phase) => runs.find((r) => r.unitKey === unitKey && r.phase === phase) ?? null;

  return units.map((u) => {
    const phases = {};
    for (const phase of ['opening', 'closing']) {
      const run = at(u.key, phase);
      const p = completeness(dept, u, phase, run);
      phases[phase] = {
        total: p.total,
        done: p.done,
        complete: p.complete,
        deviations: (run?.items ?? []).filter((i) => i.status === 'deviation').length,
        photos: (run?.photos ?? []).length,
        signedAt: run?.signedAt ? run.signedAt.toISOString() : null,
        signedBy: run?.signedBy?.name ?? '',
        late: Boolean(run?.late),
        status: run?.signedAt ? 'signed' : p.done > 0 ? 'in-progress' : 'not-started',
      };
    }
    return { key: u.key, name: u.name, kind: u.kind ?? 'nrl', phases };
  });
}

/** Past records, newest first — the audit trail an assessor asks for. */
export async function history(dept, { unitKey, phase, from, to, limit = 60 } = {}) {
  /** @type {any} */
  const q = { department: dept._id };
  if (unitKey) q.unitKey = unitKey;
  if (phase) q.phase = phase;
  if (from || to) q.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const runs = await LabRun.find(q).sort({ date: -1, phase: 1 }).limit(Math.min(Number(limit) || 60, 200));
  return runs.map((r) => {
    const unit = (dept.labReadiness?.units ?? []).find((u) => u.key === r.unitKey);
    const p = unit ? completeness(dept, unit, r.phase, r) : { total: r.items.length, done: r.items.filter((i) => i.status).length, complete: false, missing: [] };
    return {
      id: r._id.toString(),
      date: r.date,
      phase: r.phase,
      unitKey: r.unitKey,
      unitName: r.unitName ?? unit?.name ?? r.unitKey,
      done: p.done,
      total: p.total,
      deviations: r.items.filter((i) => i.status === 'deviation').length,
      photos: r.photos.length,
      signedAt: r.signedAt ? r.signedAt.toISOString() : null,
      signedBy: r.signedBy?.name ?? '',
      late: Boolean(r.late),
      reopened: r.reopenLog.length,
    };
  });
}
