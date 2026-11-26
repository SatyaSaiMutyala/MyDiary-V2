import { Schema, model } from 'mongoose';

/**
 * The lanes a logged activity can go into. Unlike the tick lanes (models/ActivityTick.js) there is one
 * 'daily' lane rather than opening/closing: somebody recording a call they took at 3pm is not thinking
 * about which end of their shift it belongs to, and the prototype's Log Activity modal offers the same
 * three.
 */
export const LOG_LANES = /** @type {const} */ (['daily', 'weekly', 'monthly']);

/** The eight chips the prototype's modal offers. 'other' is the catch-all; a blank tag is also fine. */
export const LOG_TAGS = /** @type {const} */ (['approval', 'meeting', 'review', 'call', 'decision', 'visit', 'task', 'other']);

/**
 * One thing a person did that was not on their checklist — "Signed MoU with Apollo for the shared TB
 * panel", "Rescheduled the CMD's 4pm".
 *
 * A tick (ActivityTick) says a preset task got done; this says work happened that nobody had preset. It
 * is the person's own record, so it is written done and can be un-ticked if they mis-logged it, and it
 * is deliberately kept out of the shift percentage the Dashboard and Department Master roll up: those
 * measure checklist compliance, and ad-hoc work would inflate them.
 */
const activityEntrySchema = new Schema(
  {
    /** Person name as the roster writes it — the same key ActivityTick uses. */
    person: { type: String, required: true, trim: true },
    /** 'YYYY-MM-DD' — the day the work happened, not when it was typed. */
    date: { type: String, required: true },
    lane: { type: String, enum: LOG_LANES, required: true },
    text: { type: String, required: true, trim: true },
    /** Optional 'HH:MM' — roughly when, for people who reconstruct a day at the end of it. */
    atTime: { type: String, default: '' },
    tag: { type: String, enum: [...LOG_TAGS, ''], default: '' },
    /** Written true: it is a record of something already done. Un-ticking leaves the row in place. */
    done: { type: Boolean, default: true },
    /** Whose department it was logged under, for the governance view. Null when they have none. */
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    by: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
activityEntrySchema.index({ person: 1, date: 1, lane: 1 });
activityEntrySchema.index({ date: 1, department: 1 });

export const ActivityEntry = model('ActivityEntry', activityEntrySchema);

/** @param {any} e */
export const serializeEntry = (e) => ({
  id: e._id.toString(),
  person: e.person,
  date: e.date,
  lane: e.lane,
  text: e.text,
  atTime: e.atTime ?? '',
  tag: e.tag ?? '',
  done: e.done !== false,
  departmentId: e.department ? e.department.toString() : null,
  by: { id: e.by?.id ? e.by.id.toString() : null, name: e.by?.name ?? '' },
  createdAt: (e.createdAt ?? new Date()).toISOString(),
});

/**
 * Groups entries the way the screens draw them: { [lane]: Entry[] }, newest-typed last so a day reads
 * in the order it was lived. Every lane is present, so the client never guards for a missing bucket.
 * @param {any[]} entries
 */
export function toLoggedLanes(entries) {
  /** @type {Record<string, any[]>} */
  const lanes = { daily: [], weekly: [], monthly: [] };
  for (const e of entries) lanes[e.lane]?.push(serializeEntry(e));
  return lanes;
}
