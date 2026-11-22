import { Schema, model } from 'mongoose';

/** Same keys as web/src/data/projects.js PROJ_CATEGORIES. */
export const PROJECT_CATEGORIES = /** @type {const} */ (['operations', 'clinical', 'quality', 'technology', 'commercial', 'hr', 'finance', 'strategic', 'compliance']);
/** Same keys as web/src/data/projects.js PROJ_STATUSES. */
export const PROJECT_STATUSES = /** @type {const} */ (['planning', 'active', 'at-risk', 'on-hold', 'completed', 'cancelled']);
export const PRIORITIES = /** @type {const} */ (['low', 'medium', 'high', 'critical']);
export const MILESTONE_STATUSES = /** @type {const} */ (['todo', 'in-progress', 'done']);
export const TASK_STATUSES = /** @type {const} */ (['todo', 'in-progress', 'review', 'done']);
export const RISK_STATUSES = /** @type {const} */ (['open', 'mitigated']);
/** RAG health, derived (never sent by the client) — see `computeHealth`. */
export const PROJECT_HEALTH = /** @type {const} */ (['green', 'amber', 'red']);
/** Where the project is in its milestone run, derived — see `computePhase`. */
export const PROJECT_PHASES = /** @type {const} */ (['not-started', 'in-flight', 'wrapping-up', 'closed']);

/** One pass/fail test of a milestone. Addressed by its position in the list (no id of its own). */
const criterionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

/** A milestone / phase gate. `_id` is what the web renders as `id` and what tasks and risks link to. */
const milestoneSchema = new Schema({
  name: { type: String, required: true, trim: true },
  /** 'YYYY-MM-DD' — stored as a string like a meeting's date, so ranges still compare correctly. */
  dueDate: { type: String, default: '' },
  status: { type: String, enum: MILESTONE_STATUSES, default: 'todo' },
  owner: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  acceptanceCriteria: { type: [criterionSchema], default: [] },
});

const taskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  assignee: { type: String, default: '', trim: true },
  status: { type: String, enum: TASK_STATUSES, default: 'todo' },
  dueDate: { type: String, default: '' },
  priority: { type: String, enum: PRIORITIES, default: 'medium' },
  /** The milestone this task rolls up into, or null for project-level work. */
  milestoneId: { type: Schema.Types.ObjectId, default: null },
});

const kpiSchema = new Schema({
  name: { type: String, required: true, trim: true },
  current: { type: Number, default: 0 },
  target: { type: Number, default: 100 },
  /** Free text shown after the numbers: '%', ' days left', ' · ₹28L' … Never trimmed: the leading space is part of the label. */
  unit: { type: String, default: '' },
});

const riskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  severity: { type: String, enum: PRIORITIES, default: 'medium' },
  mitigation: { type: String, default: '', trim: true },
  owner: { type: String, default: '', trim: true },
  status: { type: String, enum: RISK_STATUSES, default: 'open' },
  milestoneId: { type: Schema.Types.ObjectId, default: null },
});

const memberSchema = new Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: '', trim: true },
});

const externalSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  role: { type: String, default: '', trim: true },
});

/**
 * A project (web/src/data/projects.js PROJECTS shape). Everything the detail panes show lives in here;
 * the Activity pane is not stored — it is read back from the Activity Log (services/projects.js
 * `projectActivity`), so the feed can only ever contain changes that really happened.
 */
const projectSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: PROJECT_CATEGORIES, default: 'operations' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'planning' },
    owner: { type: String, default: '', trim: true },
    /** 'YYYY-MM-DD'. */
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    /** Manual fallback percentage; the screens prefer the milestone average when there are milestones. */
    progress: { type: Number, default: 0, min: 0, max: 100 },
    team: { type: [memberSchema], default: [] },
    external: { type: [externalSchema], default: [] },
    milestones: { type: [milestoneSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    kpis: { type: [kpiSchema], default: [] },
    risks: { type: [riskSchema], default: [] },
    /** Derived on every save, so `?health=red` and the serialized value can never disagree. */
    health: { type: String, enum: PROJECT_HEALTH, default: 'green' },
    phase: { type: String, enum: PROJECT_PHASES, default: 'not-started' },
    /** The template this project was started from (ProjectTemplate id), or null. */
    template: { type: Schema.Types.ObjectId, ref: 'ProjectTemplate', default: null },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true, minimize: false },
);
projectSchema.index({ status: 1, startDate: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ health: 1 });
projectSchema.index({ phase: 1 });
projectSchema.index({ code: 1 });
projectSchema.index({ createdAt: -1 });

/**
 * RAG health from what is stored (no "today" in it, so it never drifts between a save and a read):
 * red for an at-risk / cancelled project or an open critical risk, amber for on-hold, an open high risk or
 * a high-priority project still under 40%, green otherwise.
 * @param {{ status: string, priority: string, progress?: number, risks?: { severity: string, status: string }[] }} p
 * @returns {'green' | 'amber' | 'red'}
 */
export function computeHealth(p) {
  const open = (p.risks ?? []).filter((r) => r.status !== 'mitigated');
  if (p.status === 'at-risk' || p.status === 'cancelled' || open.some((r) => r.severity === 'critical')) return 'red';
  if (p.status === 'completed') return 'green';
  if (p.status === 'on-hold' || open.some((r) => r.severity === 'high')) return 'amber';
  if ((p.priority === 'critical' || p.priority === 'high') && (p.progress ?? 0) < 40) return 'amber';
  return 'green';
}

/**
 * Where the project stands in its milestone run: closed once it is completed or cancelled, wrapping-up when
 * every milestone is done, in-flight once anything has started, not-started before that.
 * @param {{ status: string, milestones?: { status: string }[] }} p
 * @returns {'not-started' | 'in-flight' | 'wrapping-up' | 'closed'}
 */
export function computePhase(p) {
  if (p.status === 'completed' || p.status === 'cancelled') return 'closed';
  const ms = p.milestones ?? [];
  if (!ms.length) return p.status === 'planning' ? 'not-started' : 'in-flight';
  if (ms.every((m) => m.status === 'done')) return 'wrapping-up';
  if (ms.some((m) => m.status !== 'todo')) return 'in-flight';
  return p.status === 'planning' ? 'not-started' : 'in-flight';
}

projectSchema.pre('validate', function deriveFacets() {
  this.health = computeHealth(this);
  this.phase = computePhase(this);
});

export const Project = model('Project', projectSchema);

/** @param {any} id */
const str = (id) => (id ? id.toString() : null);

/** @param {any} m */
const serializeMilestone = (m) => ({
  id: m._id.toString(),
  name: m.name,
  dueDate: m.dueDate ?? '',
  status: m.status,
  owner: m.owner ?? '',
  description: m.description ?? '',
  acceptanceCriteria: (m.acceptanceCriteria ?? []).map((c) => ({ text: c.text, done: !!c.done })),
});

/** @param {any} t */
const serializeTask = (t) => ({
  id: t._id.toString(),
  title: t.title,
  assignee: t.assignee ?? '',
  status: t.status,
  dueDate: t.dueDate ?? '',
  priority: t.priority,
  milestoneId: str(t.milestoneId),
});

/** @param {any} k */
const serializeKpi = (k) => ({ id: k._id.toString(), name: k.name, current: k.current ?? 0, target: k.target ?? 0, unit: k.unit ?? '' });

/** @param {any} r */
const serializeRisk = (r) => ({
  id: r._id.toString(),
  title: r.title,
  severity: r.severity,
  mitigation: r.mitigation ?? '',
  owner: r.owner ?? '',
  status: r.status,
  milestoneId: str(r.milestoneId),
});

/**
 * The project shape the web app renders. `activity` comes from the Activity Log (newest first) and is
 * empty unless the caller passes it in.
 * @param {any} p a Project document
 * @param {{ user: string, action: string, at: string, atIso: string }[]} [activity]
 */
export function serializeProject(p, activity = []) {
  const milestones = (p.milestones ?? []).map(serializeMilestone);
  const tasks = (p.tasks ?? []).map(serializeTask);
  const risks = (p.risks ?? []).map(serializeRisk);
  return {
    id: p._id.toString(),
    code: p.code,
    name: p.name,
    description: p.description ?? '',
    category: p.category,
    priority: p.priority,
    status: p.status,
    owner: p.owner ?? '',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    progress: p.progress ?? 0,
    health: p.health,
    phase: p.phase,
    team: (p.team ?? []).map((t) => ({ id: t._id.toString(), name: t.name, role: t.role ?? '' })),
    external: (p.external ?? []).map((e) => ({ id: e._id.toString(), name: e.name, email: e.email ?? '', role: e.role ?? '' })),
    milestones,
    tasks,
    kpis: (p.kpis ?? []).map(serializeKpi),
    risks,
    activity,
    template: str(p.template),
    createdBy: { id: str(p.createdBy?.id), name: p.createdBy?.name ?? '' },
    createdAt: (p.createdAt ?? new Date()).toISOString(),
    updatedAt: (p.updatedAt ?? p.createdAt ?? new Date()).toISOString(),
    // Counts the portfolio cards and tabs show, so the web does not have to recount them.
    milestoneCount: milestones.length,
    doneMilestones: milestones.filter((m) => m.status === 'done').length,
    taskCount: tasks.length,
    openRisks: risks.filter((r) => r.status !== 'mitigated').length,
  };
}
