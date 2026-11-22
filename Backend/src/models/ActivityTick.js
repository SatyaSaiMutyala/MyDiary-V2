import { Schema, model } from 'mongoose';

/** The lanes My Activity ticks (the four task lanes plus the review meeting). */
export const TICK_KINDS = /** @type {const} */ (['opening', 'closing', 'weekly', 'monthly', 'review']);

/**
 * One ticked task: "<person> finished <task> of <department> on <date>".
 *
 * The web app keeps this as ACTIVITY_LOG[person][date][kind][taskId] = 'done'
 * (web/src/utils/departments.js getTaskStatus), so a tick is a row here and the API rebuilds that nested
 * map on read. Only rows that are done exist — un-ticking deletes the row.
 */
const activityTickSchema = new Schema(
  {
    /** Person name as the roster writes it ("Dr. Anusha Singh") — the key the web app looks up. */
    person: { type: String, required: true, trim: true },
    /** 'YYYY-MM-DD' (the shift day), stored as a string like every other date the web app sends. */
    date: { type: String, required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    kind: { type: String, enum: TICK_KINDS, required: true },
    /** The task sub-document's id inside its department (or the agenda id for 'review'). */
    taskId: { type: String, required: true },
    /** Only 'done' exists today; the field is here so a future 'skipped' needs no migration. */
    status: { type: String, enum: ['done'], default: 'done' },
    /** Who recorded it (normally the person themselves). */
    by: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
activityTickSchema.index({ person: 1, date: 1, kind: 1, taskId: 1 }, { unique: true });
activityTickSchema.index({ date: 1, department: 1 });

export const ActivityTick = model('ActivityTick', activityTickSchema);

/**
 * Rebuilds the web app's nested log: { [person]: { [date]: { opening: { [taskId]: 'done' }, … } } }.
 * Every date present gets all five lanes, so the client never has to guard for a missing bucket.
 * @param {any[]} ticks
 */
export function toActivityLog(ticks) {
  /** @type {Record<string, Record<string, Record<string, Record<string, string>>>>} */
  const log = {};
  for (const t of ticks) {
    const byDate = (log[t.person] ??= {});
    const day = (byDate[t.date] ??= { opening: {}, closing: {}, weekly: {}, monthly: {}, review: {} });
    day[t.kind][t.taskId] = t.status ?? 'done';
  }
  return log;
}

/** @param {any} t */
export const serializeTick = (t) => ({
  id: t._id.toString(),
  person: t.person,
  date: t.date,
  departmentId: t.department.toString(),
  kind: t.kind,
  taskId: t.taskId,
  status: t.status ?? 'done',
  by: { id: t.by?.id ? t.by.id.toString() : null, name: t.by?.name ?? '' },
  createdAt: (t.createdAt ?? new Date()).toISOString(),
});
