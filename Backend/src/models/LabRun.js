import { Schema, model } from 'mongoose';
import { LAB_PHASES } from './Department.js';

/** What a person can say about an activity. A deviation always needs a remark. */
export const ITEM_STATUSES = /** @type {const} */ (['done', 'deviation', 'na']);

/**
 * One activity on a day's board.
 *
 * `text`, `section` and `scheduledTime` are copied from the department's configuration at the moment
 * the activity is actioned. A completed record has to keep reading the way it was signed, so later
 * edits to the master checklist never rewrite history.
 */
const runItemSchema = new Schema(
  {
    taskKey: { type: String, required: true, trim: true },
    status: { type: String, enum: [...ITEM_STATUSES, null], default: null },
    remark: { type: String, default: '', trim: true },
    text: { type: String, default: '' },
    section: { type: String, default: '' },
    scheduledTime: { type: String, default: '' },
    actionedAt: { type: Date, default: null },
    actionedBy: { id: { type: Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },
  },
  { _id: false, minimize: false },
);

/** A photograph filed against one activity. `path` is where the storage driver put the bytes. */
const runPhotoSchema = new Schema({
  taskKey: { type: String, required: true, trim: true },
  name: { type: String, default: '' },
  mimeType: { type: String, default: 'image/jpeg' },
  sizeBytes: { type: Number, default: 0 },
  path: { type: String, required: true },
  disk: { type: String, default: 'local' },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { id: { type: Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },
});

/** Every time a signed record was opened again, and why. */
const reopenSchema = new Schema(
  { at: { type: Date, default: Date.now }, by: { type: String, default: '' }, reason: { type: String, default: '' } },
  { _id: false },
);

/**
 * One unit's readiness board for one phase of one day — v1's lab_readiness_runs.
 *
 * The board stamps the two times the paper sheet asks for and a tick cannot prove: `startedAt` when the
 * first activity is actioned, `signedAt` at sign-off.
 */
const labRunSchema = new Schema(
  {
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    unitKey: { type: String, required: true, trim: true },
    unitName: { type: String, default: '' },
    unitKind: { type: String, default: 'nrl' },
    /** 'YYYY-MM-DD' — the day being recorded, not the moment of writing. */
    date: { type: String, required: true },
    phase: { type: String, enum: LAB_PHASES, required: true },

    startedAt: { type: Date, default: null },
    startedBy: { id: { type: Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },

    items: { type: [runItemSchema], default: () => [] },
    photos: { type: [runPhotoSchema], default: () => [] },

    signedAt: { type: Date, default: null },
    signedBy: {
      id: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      /** Their designation — what an assessor expects beside a signature. */
      role: { type: String, default: '' },
    },
    declaration: { type: String, default: '' },
    selfiePath: { type: String, default: '' },
    selfieDisk: { type: String, default: '' },
    /** Signed after the department's cut-off. Accepted, but recorded. */
    late: { type: Boolean, default: false },

    reopenLog: { type: [reopenSchema], default: () => [] },
  },
  { timestamps: true, minimize: false },
);
// One board per unit, per day, per phase.
labRunSchema.index({ department: 1, unitKey: 1, date: 1, phase: 1 }, { unique: true });
labRunSchema.index({ date: -1 });
labRunSchema.index({ 'signedBy.name': 1 });

export const LabRun = model('LabRun', labRunSchema);

/** True once the record is signed; a signed record is read-only until it is reopened. */
export const isSigned = (run) => Boolean(run?.signedAt);

/** @param {any} p */
const serializePhoto = (p) => ({
  id: p._id.toString(),
  taskKey: p.taskKey,
  name: p.name ?? '',
  mimeType: p.mimeType ?? 'image/jpeg',
  sizeBytes: p.sizeBytes ?? 0,
  uploadedAt: (p.uploadedAt ?? new Date()).toISOString(),
  uploadedBy: p.uploadedBy?.name ?? '',
});

/** The record as the board reads it. @param {any} r */
export function serializeRun(r) {
  return {
    id: r._id.toString(),
    departmentId: r.department.toString(),
    unitKey: r.unitKey,
    unitName: r.unitName ?? '',
    unitKind: r.unitKind ?? 'nrl',
    date: r.date,
    phase: r.phase,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
    startedBy: r.startedBy?.name ?? '',
    items: (r.items ?? []).map((i) => ({
      taskKey: i.taskKey,
      status: i.status ?? null,
      remark: i.remark ?? '',
      text: i.text ?? '',
      section: i.section ?? '',
      scheduledTime: i.scheduledTime ?? '',
      actionedAt: i.actionedAt ? i.actionedAt.toISOString() : null,
      actionedBy: i.actionedBy?.name ?? '',
    })),
    photos: (r.photos ?? []).map(serializePhoto),
    signedAt: r.signedAt ? r.signedAt.toISOString() : null,
    signedBy: { name: r.signedBy?.name ?? '', role: r.signedBy?.role ?? '' },
    declaration: r.declaration ?? '',
    hasSelfie: Boolean(r.selfiePath),
    late: Boolean(r.late),
    reopenLog: (r.reopenLog ?? []).map((x) => ({ at: (x.at ?? new Date()).toISOString(), by: x.by ?? '', reason: x.reason ?? '' })),
  };
}
