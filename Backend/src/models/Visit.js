import { Schema, model } from 'mongoose';

/**
 * One visit observation (web/src/data/visits.js shape). A visit is a field report: where the team went,
 * when, who went, what they observed (`observations`), how they rated the site (`ratings`), the overall
 * assessment, the follow-up actions it produced and whether another visit is needed.
 *
 * `draft` is the editable state; `submitted` is signed off (and stamps `submittedAt`).
 */
export const VISIT_STATUSES = /** @type {const} */ (['draft', 'submitted']);

/** Keys of web/src/data/visits.js VISIT_TYPES. `consultant-review` is used by the Consultant template. */
export const VISIT_TYPE_KEYS = /** @type {const} */ ([
  'supplier-audit',
  'branch-office',
  'new-premises',
  'regulatory',
  'customer-site',
  'partner-lab',
  'consultant-review',
  'other',
]);

/** RATING_AREAS keys — each scored 0 (not rated) to 5. */
export const RATING_KEYS = /** @type {const} */ (['infra', 'quality', 'safety', 'regulatory', 'staff', 'docs']);

/**
 * OVERALL_OPTIONS keys, worst → best severity order. The list endpoint's `severity=` filter is an alias
 * for this field: an "unsatisfactory" visit is the severe one.
 */
export const OVERALL_ASSESSMENTS = /** @type {const} */ (['excellent', 'good', 'satisfactory', 'needs-improvement', 'unsatisfactory']);

export const MAX_PHOTOS = 20;

const orgSchema = new Schema(
  {
    name: { type: String, default: '' },
    branch: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    gps: { type: String, default: '' },
  },
  { _id: false },
);

const hostSchema = new Schema(
  {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false },
);

const ratingsSchema = new Schema(
  Object.fromEntries(RATING_KEYS.map((k) => [k, { type: Number, default: 0, min: 0, max: 5 }])),
  { _id: false },
);

const observationSchema = new Schema(
  {
    category: { type: String, default: 'Other' },
    observation: { type: String, default: '' },
    evidence: { type: String, default: '' },
  },
  { _id: false },
);

/** A follow-up action the visit produced (the detail modal's "Action Items" section). */
const visitActionSchema = new Schema(
  {
    text: { type: String, default: '' },
    owner: { type: String, default: '' },
    /** 'YYYY-MM-DD' or '' */
    deadline: { type: String, default: '' },
  },
  { _id: false },
);

const historySchema = new Schema(
  { user: { type: String, default: '' }, action: { type: String, required: true }, at: { type: String, required: true } },
  { _id: false },
);

const visitSchema = new Schema(
  {
    /** Whose report it is — the person's name, as the web app shows it. */
    owner: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, default: '' },
    type: { type: String, enum: VISIT_TYPE_KEYS, default: 'branch-office' },
    status: { type: String, enum: VISIT_STATUSES, default: 'draft' },
    /** 'YYYY-MM-DD' */
    date: { type: String, required: true },
    /** 'HH:MM' or '' */
    timeIn: { type: String, default: '' },
    timeOut: { type: String, default: '' },
    org: { type: orgSchema, default: () => ({}) },
    host: { type: hostSchema, default: () => ({}) },
    team: { type: [String], default: [] },
    externalParticipants: { type: String, default: '' },
    purpose: { type: String, default: '' },
    scope: { type: String, default: '' },
    references: { type: String, default: '' },
    tags: { type: [String], default: [] },
    ratings: { type: ratingsSchema, default: () => ({}) },
    overallAssessment: { type: String, enum: [...OVERALL_ASSESSMENTS, ''], default: '' },
    executiveSummary: { type: String, default: '' },
    observations: { type: [observationSchema], default: [] },
    /** How many photos are attached (the prototype counts them; file upload is not built). */
    photos: { type: Number, default: 0, min: 0, max: MAX_PHOTOS },
    actionItems: { type: [visitActionSchema], default: [] },
    /** 'YYYY-MM-DD' or '' */
    nextVisitDate: { type: String, default: '' },
    followUpRequired: { type: Boolean, default: false },
    additionalRemarks: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    history: { type: [historySchema], default: [] },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
visitSchema.index({ owner: 1, date: -1 });
visitSchema.index({ status: 1, date: -1 });
visitSchema.index({ type: 1, date: -1 });
visitSchema.index({ 'org.name': 1 });
visitSchema.index({ overallAssessment: 1 });
visitSchema.index({ tags: 1 });

export const Visit = model('Visit', visitSchema);

/** Mean of the ratings that were actually given (0 = not rated), one decimal, or null. @param {any} ratings */
export function averageRating(ratings) {
  const scores = RATING_KEYS.map((k) => Number(ratings?.[k] ?? 0)).filter((n) => n > 0);
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

/** @param {any} v a Visit document */
export function serializeVisit(v) {
  const ratings = Object.fromEntries(RATING_KEYS.map((k) => [k, v.ratings?.[k] ?? 0]));
  return {
    id: v._id.toString(),
    owner: v.owner ?? '',
    ownerId: v.ownerId ? v.ownerId.toString() : null,
    title: v.title ?? '',
    type: v.type ?? 'other',
    status: v.status ?? 'draft',
    date: v.date,
    timeIn: v.timeIn ?? '',
    timeOut: v.timeOut ?? '',
    org: { name: v.org?.name ?? '', branch: v.org?.branch ?? '', address: v.org?.address ?? '', city: v.org?.city ?? '', state: v.org?.state ?? '', gps: v.org?.gps ?? '' },
    host: { name: v.host?.name ?? '', designation: v.host?.designation ?? '', phone: v.host?.phone ?? '', email: v.host?.email ?? '' },
    team: [...(v.team ?? [])],
    externalParticipants: v.externalParticipants ?? '',
    purpose: v.purpose ?? '',
    scope: v.scope ?? '',
    references: v.references ?? '',
    tags: [...(v.tags ?? [])],
    ratings,
    avgRating: averageRating(ratings),
    overallAssessment: v.overallAssessment ?? '',
    executiveSummary: v.executiveSummary ?? '',
    observations: (v.observations ?? []).map((o) => ({ category: o.category ?? 'Other', observation: o.observation ?? '', evidence: o.evidence ?? '' })),
    photos: v.photos ?? 0,
    actionItems: (v.actionItems ?? []).map((a) => ({ text: a.text ?? '', owner: a.owner ?? '', deadline: a.deadline ?? '' })),
    nextVisitDate: v.nextVisitDate ?? '',
    followUpRequired: !!v.followUpRequired,
    additionalRemarks: v.additionalRemarks ?? '',
    submittedAt: v.submittedAt ? new Date(v.submittedAt).toISOString() : null,
    history: (v.history ?? []).map((h) => ({ user: h.user, action: h.action, at: h.at })),
    createdBy: { id: v.createdBy?.id ? v.createdBy.id.toString() : null, name: v.createdBy?.name ?? '' },
    createdAt: (v.createdAt ?? new Date()).toISOString(),
    updatedAt: (v.updatedAt ?? v.createdAt ?? new Date()).toISOString(),
  };
}
