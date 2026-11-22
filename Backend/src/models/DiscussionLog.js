import { Schema, model } from 'mongoose';
import { todayStr } from '../services/people.js';

/**
 * One discussion log (web/src/data/logs.js shape) — the informal conversation the diary would otherwise lose:
 * a phone call, a corridor chat, a WhatsApp exchange. It records who it was with (`with`), when (`date`/`time`),
 * the `topic`, what was said (`summary`), what was agreed (`decisions`), free `tags` and the `followUps` it
 * produced.
 *
 * A log belongs to one person (`owner`) and is `private` by default: only the owner reads or edits it unless
 * its privacy is `shared` (see services/discussionLogs.js visibleTo()).
 */

/** Keys of web/src/data/logs.js CHANNELS — how the conversation happened. */
export const LOG_CHANNELS = /** @type {const} */ (['phone', 'whatsapp', 'in-person', 'video', 'email', 'chat', 'sms']);

/** Who else was in the conversation: a TDPL person or someone outside. */
export const PERSON_TYPES = /** @type {const} */ (['internal', 'external']);

/** Who may read the log. `private` = the owner only (the prototype's default). */
export const LOG_PRIVACIES = /** @type {const} */ (['private', 'shared']);

/**
 * The states the Open Follow-ups view shows. Only `done` is stored (a boolean); `open` and `overdue` are
 * computed from `done` + `deadline`, exactly as the web app does.
 */
export const FOLLOWUP_STATUSES = /** @type {const} */ (['open', 'overdue', 'done']);

const personSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: PERSON_TYPES, default: 'internal' },
    email: { type: String, default: '' },
  },
  { _id: false },
);

/** A thing to do that came out of the conversation. Keeps its own `_id` so the detail modal can tick one. */
const followUpSchema = new Schema({
  text: { type: String, default: '' },
  owner: { type: String, default: '' },
  ownerType: { type: String, enum: PERSON_TYPES, default: 'internal' },
  /** 'YYYY-MM-DD' or '' */
  deadline: { type: String, default: '' },
  done: { type: Boolean, default: false },
  doneAt: { type: String, default: '' },
  doneBy: { type: String, default: '' },
});

const historySchema = new Schema(
  { user: { type: String, default: '' }, action: { type: String, required: true }, at: { type: String, required: true } },
  { _id: false },
);

const discussionLogSchema = new Schema(
  {
    /** Whose log it is — the person's name, as the web app shows it. */
    owner: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** 'YYYY-MM-DD' */
    date: { type: String, required: true },
    /** 'HH:MM' */
    time: { type: String, default: '' },
    /** Free text, as typed: "5 min", "20 mins", "". */
    duration: { type: String, default: '' },
    channel: { type: String, enum: LOG_CHANNELS, default: 'phone' },
    with: { type: [personSchema], default: [] },
    topic: { type: String, default: '' },
    summary: { type: String, default: '' },
    decisions: { type: String, default: '' },
    tags: { type: [String], default: [] },
    followUps: { type: [followUpSchema], default: [] },
    privacy: { type: String, enum: LOG_PRIVACIES, default: 'private' },
    history: { type: [historySchema], default: [] },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
discussionLogSchema.index({ owner: 1, date: -1, time: -1 });
discussionLogSchema.index({ 'with.name': 1, date: -1 });
discussionLogSchema.index({ channel: 1, date: -1 });
discussionLogSchema.index({ tags: 1 });
discussionLogSchema.index({ topic: 1 });
discussionLogSchema.index({ 'followUps.done': 1, 'followUps.deadline': 1 });

export const DiscussionLog = model('DiscussionLog', discussionLogSchema);

/** deadline set, in the past (server date) and not ticked. @param {{ deadline?: string, done?: boolean }} f */
export const isFollowUpOverdue = (f) => !f.done && typeof f.deadline === 'string' && f.deadline !== '' && f.deadline < todayStr();

/** 'open' | 'overdue' | 'done' for one follow-up. @param {{ deadline?: string, done?: boolean }} f */
export const followUpStatus = (f) => (f.done ? 'done' : isFollowUpOverdue(f) ? 'overdue' : 'open');

/** @param {any} f a followUps sub-document */
export function serializeFollowUp(f) {
  return {
    id: f._id.toString(),
    text: f.text ?? '',
    owner: f.owner ?? '',
    ownerType: f.ownerType ?? 'internal',
    deadline: f.deadline ?? '',
    done: !!f.done,
    doneAt: f.doneAt ?? '',
    doneBy: f.doneBy ?? '',
    isOverdue: isFollowUpOverdue(f),
    status: followUpStatus(f),
  };
}

/** @param {any} l a DiscussionLog document */
export function serializeLog(l) {
  const followUps = (l.followUps ?? []).map(serializeFollowUp);
  return {
    id: l._id.toString(),
    owner: l.owner ?? '',
    ownerId: l.ownerId ? l.ownerId.toString() : null,
    date: l.date,
    time: l.time ?? '',
    duration: l.duration ?? '',
    channel: l.channel ?? 'phone',
    with: (l.with ?? []).map((p) => ({ name: p.name, type: p.type ?? 'internal', email: p.email ?? '' })),
    topic: l.topic ?? '',
    summary: l.summary ?? '',
    decisions: l.decisions ?? '',
    tags: [...(l.tags ?? [])],
    followUps,
    openFollowUps: followUps.filter((f) => !f.done).length,
    overdueFollowUps: followUps.filter((f) => f.status === 'overdue').length,
    totalFollowUps: followUps.length,
    privacy: l.privacy ?? 'private',
    history: (l.history ?? []).map((h) => ({ user: h.user, action: h.action, at: h.at })),
    createdBy: { id: l.createdBy?.id ? l.createdBy.id.toString() : null, name: l.createdBy?.name ?? '' },
    createdAt: (l.createdAt ?? new Date()).toISOString(),
    updatedAt: (l.updatedAt ?? l.createdAt ?? new Date()).toISOString(),
  };
}
