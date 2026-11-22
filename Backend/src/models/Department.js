import { Schema, model } from 'mongoose';

/** The four task lanes a department configures (web: openingTasks / closingTasks / weeklyTasks / monthlyTasks). */
export const TASK_KINDS = /** @type {const} */ (['opening', 'closing', 'weekly', 'monthly']);
/** Which lane holds which field: weekly tasks carry daysOfWeek, monthly tasks carry dayOfMonth. */
export const TASK_LIST_FIELD = { opening: 'openingTasks', closing: 'closingTasks', weekly: 'weeklyTasks', monthly: 'monthlyTasks' };
/** The two review-cadence agendas. */
export const CADENCE_TABS = /** @type {const} */ (['weekly', 'monthly']);
export const CADENCE_AGENDA_FIELD = { weekly: 'weeklyAgenda', monthly: 'monthlyAgenda' };
/** RAG flag an agenda point can carry during the meeting. */
export const INDICATORS = /** @type {const} */ (['red', 'amber', 'green']);
/** What a person is in their department. 'head' / 'cmd' / 'cgo' see the whole department (web: EMPLOYEE_ASSIGNMENTS.role). */
export const ASSIGNMENT_ROLES = /** @type {const} */ (['member', 'head', 'cmd', 'cgo']);

/** A sub-role inside a department ("Lab Technician"). Tasks are tagged to none, one or several of them. */
const positionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: false },
);

/**
 * One configured task. `positionIds` empty = "All in department".
 * `daysOfWeek` is used by weekly tasks only (0 = Sun … 6 = Sat), `dayOfMonth` by monthly tasks only
 * (1–31 or the string 'last').
 */
const taskSchema = new Schema(
  {
    order: { type: Number, default: 1 },
    text: { type: String, required: true, trim: true },
    defaultTime: { type: String, default: '' },
    positionIds: { type: [Schema.Types.ObjectId], default: () => [] },
    daysOfWeek: { type: [Number], default: () => [] },
    dayOfMonth: { type: Schema.Types.Mixed, default: 1 },
  },
  { minimize: false },
);

/** One checklist line of a review agenda, with an optional RAG flag. */
const agendaPointSchema = new Schema({
  text: { type: String, default: '', trim: true },
  indicator: { type: String, enum: [...INDICATORS, null], default: null },
});

/** A heading plus its points ("Stockouts & Near-Stockouts"). */
const agendaSectionSchema = new Schema({
  order: { type: Number, default: 1 },
  heading: { type: String, default: '', trim: true },
  points: { type: [agendaPointSchema], default: () => [] },
});

/** A person who works in this department, optionally pinned to one of its positions. */
const assignmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    positionId: { type: Schema.Types.ObjectId, default: null },
    role: { type: String, enum: ASSIGNMENT_ROLES, default: 'member' },
  },
  { _id: false },
);

/** The governance forum for the department: when it meets, who owns it, and the standing agenda. */
const reviewCadenceSchema = new Schema(
  {
    weekly: {
      daysOfWeek: { type: [Number], default: () => [] },
      time: { type: String, default: '' },
      duration: { type: Number, default: 45 },
    },
    monthly: {
      /** 1–31, the string 'last', or '' when not set (web: rc.monthly.dayOfMonth). */
      dayOfMonth: { type: Schema.Types.Mixed, default: '' },
      time: { type: String, default: '' },
      duration: { type: Number, default: 60 },
    },
    owner: { type: String, default: '' },
    primarySystems: { type: [String], default: () => [] },
    weeklyAgenda: { type: [agendaSectionSchema], default: () => [] },
    monthlyAgenda: { type: [agendaSectionSchema], default: () => [] },
  },
  { _id: false, minimize: false },
);

/**
 * A department (web/src/data/departments.js, fully normalised by buildInitialDepartments()).
 * Positions, tasks and agenda sections/points are sub-documents, so their `_id` is the stable id the
 * web app already uses for `positionIds`, task rows and agenda rows.
 */
const departmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '🏢' },
    description: { type: String, default: '', trim: true },
    /** Display order on the Department Master grid (the prototype's array order). */
    order: { type: Number, default: 0 },
    positions: { type: [positionSchema], default: () => [] },
    openingTasks: { type: [taskSchema], default: () => [] },
    closingTasks: { type: [taskSchema], default: () => [] },
    weeklyTasks: { type: [taskSchema], default: () => [] },
    monthlyTasks: { type: [taskSchema], default: () => [] },
    reviewCadence: { type: reviewCadenceSchema, default: () => ({}) },
    assignments: { type: [assignmentSchema], default: () => [] },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true, minimize: false },
);
departmentSchema.index({ order: 1 });
departmentSchema.index({ name: 1 });
departmentSchema.index({ 'assignments.name': 1 });

export const Department = model('Department', departmentSchema);

/** @param {any} p */
const serializePosition = (p) => ({ id: p._id.toString(), name: p.name, description: p.description ?? '' });

/**
 * A task row as the web renders it. Weekly rows get `daysOfWeek`, monthly rows get `dayOfMonth`.
 * @param {any} t @param {typeof TASK_KINDS[number]} kind
 */
function serializeTask(t, kind) {
  const base = {
    id: t._id.toString(),
    order: t.order ?? 1,
    text: t.text,
    defaultTime: t.defaultTime ?? '',
    positionIds: (t.positionIds ?? []).map((id) => id.toString()),
  };
  if (kind === 'weekly') return { ...base, daysOfWeek: [...(t.daysOfWeek ?? [])] };
  if (kind === 'monthly') return { ...base, dayOfMonth: t.dayOfMonth ?? 1 };
  return base;
}

/** @param {any} s */
const serializeSection = (s) => ({
  id: s._id.toString(),
  order: s.order ?? 1,
  heading: s.heading ?? '',
  points: (s.points ?? []).map((p) => ({ id: p._id.toString(), text: p.text ?? '', indicator: p.indicator ?? null })),
});

/** @param {any} rc */
function serializeCadence(rc) {
  const c = rc ?? {};
  return {
    weekly: { daysOfWeek: [...(c.weekly?.daysOfWeek ?? [])], time: c.weekly?.time ?? '', duration: c.weekly?.duration ?? 45 },
    monthly: { dayOfMonth: c.monthly?.dayOfMonth ?? '', time: c.monthly?.time ?? '', duration: c.monthly?.duration ?? 60 },
    owner: c.owner ?? '',
    primarySystems: [...(c.primarySystems ?? [])],
    weeklyAgenda: (c.weeklyAgenda ?? []).map(serializeSection),
    monthlyAgenda: (c.monthlyAgenda ?? []).map(serializeSection),
  };
}

/** Exactly the department shape the web app renders (web/src/data/departments.js). @param {any} d */
export function serializeDepartment(d) {
  return {
    id: d._id.toString(),
    code: d.code,
    name: d.name,
    icon: d.icon ?? '',
    description: d.description ?? '',
    order: d.order ?? 0,
    positions: (d.positions ?? []).map(serializePosition),
    openingTasks: (d.openingTasks ?? []).map((t) => serializeTask(t, 'opening')),
    closingTasks: (d.closingTasks ?? []).map((t) => serializeTask(t, 'closing')),
    weeklyTasks: (d.weeklyTasks ?? []).map((t) => serializeTask(t, 'weekly')),
    monthlyTasks: (d.monthlyTasks ?? []).map((t) => serializeTask(t, 'monthly')),
    reviewCadence: serializeCadence(d.reviewCadence),
    assignments: (d.assignments ?? []).map((a) => ({ name: a.name, positionId: a.positionId ? a.positionId.toString() : null, role: a.role ?? 'member' })),
    createdBy: { id: d.createdBy?.id ? d.createdBy.id.toString() : null, name: d.createdBy?.name ?? '' },
    createdAt: (d.createdAt ?? new Date()).toISOString(),
    updatedAt: (d.updatedAt ?? d.createdAt ?? new Date()).toISOString(),
  };
}
