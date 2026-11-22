import { Schema, model } from 'mongoose';
import { todayStr } from '../services/people.js';

/** Stored statuses. "overdue" is never stored: it is computed (deadline < today and not done) and exposed as `isOverdue`. */
export const ACTION_STATUSES = /** @type {const} */ (['open', 'in-progress', 'blocked', 'done']);
export const ACTION_PRIORITIES = /** @type {const} */ (['low', 'medium', 'high', 'critical']);
export const OWNER_TYPES = /** @type {const} */ (['internal', 'external']);

const subtaskSchema = new Schema({ text: { type: String, required: true }, done: { type: Boolean, default: false } }, { _id: false });
const dependencySchema = new Schema({ id: { type: String, required: true }, desc: { type: String, default: '' }, status: { type: String, default: 'open' } }, { _id: false });
const commentSchema = new Schema(
  { user: { type: String, default: '' }, ini: { type: String, default: '??' }, text: { type: String, required: true }, at: { type: String, required: true } },
  { _id: false },
);
const historySchema = new Schema({ user: { type: String, default: '' }, action: { type: String, required: true }, at: { type: String, required: true } }, { _id: false });

/**
 * One action item of a meeting (web: meeting.actions[i] + ACTION_EXTRAS[id]). Its own collection so My To-Do can
 * query across meetings (owner, overdue, deadline range).
 */
const actionItemSchema = new Schema(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    /** Denormalised for list views and search; kept in sync when the meeting is renamed. */
    meetingTitle: { type: String, default: '' },
    desc: { type: String, default: '' },
    owner: { type: String, default: '' },
    ownerShort: { type: String, default: '??' },
    ownerType: { type: String, enum: OWNER_TYPES, default: 'internal' },
    /** 'YYYY-MM-DD' */
    deadline: { type: String, required: true },
    priority: { type: String, enum: ACTION_PRIORITIES, default: 'medium' },
    status: { type: String, enum: ACTION_STATUSES, default: 'open' },
    subtasks: { type: [subtaskSchema], default: [] },
    dependencies: { type: [dependencySchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    history: { type: [historySchema], default: [] },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
actionItemSchema.index({ meetingId: 1, createdAt: 1 });
actionItemSchema.index({ owner: 1, status: 1, deadline: 1 });
actionItemSchema.index({ status: 1, deadline: 1 });
actionItemSchema.index({ 'dependencies.id': 1 });

export const ActionItem = model('ActionItem', actionItemSchema);

/** deadline < today (server date) and not done. @param {{ deadline: string, status: string }} a */
export const isOverdue = (a) => a.status !== 'done' && typeof a.deadline === 'string' && a.deadline < todayStr();

/** @param {any} a an ActionItem document */
export function serializeAction(a) {
  return {
    id: a._id.toString(),
    meetingId: a.meetingId ? a.meetingId.toString() : null,
    meetingTitle: a.meetingTitle ?? '',
    desc: a.desc ?? '',
    owner: a.owner ?? '',
    ownerShort: a.ownerShort ?? '??',
    ownerType: a.ownerType ?? 'internal',
    deadline: a.deadline,
    priority: a.priority ?? 'medium',
    status: a.status ?? 'open',
    isOverdue: isOverdue(a),
    subtasks: (a.subtasks ?? []).map((s) => ({ text: s.text, done: !!s.done })),
    dependencies: (a.dependencies ?? []).map((d) => ({ id: d.id, desc: d.desc ?? '', status: d.status ?? 'open' })),
    comments: (a.comments ?? []).map((c) => ({ user: c.user, ini: c.ini, text: c.text, at: c.at })),
    history: (a.history ?? []).map((h) => ({ user: h.user, action: h.action, at: h.at })),
    createdBy: { id: a.createdBy?.id ? a.createdBy.id.toString() : null, name: a.createdBy?.name ?? '' },
    createdAt: (a.createdAt ?? new Date()).toISOString(),
    updatedAt: (a.updatedAt ?? a.createdAt ?? new Date()).toISOString(),
  };
}
