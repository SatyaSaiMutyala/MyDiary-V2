import { Schema, model } from 'mongoose';

/**
 * A reminder: a note that fires at a chosen minute, for chosen people.
 *
 * "Remind my manager at 4 PM that the review meeting starts." Ported from the v1 mobile app
 * (MyDairy/app/Models/Reminder.php and its controller), with one change forced by this codebase:
 * v1 addressed recipients by user id, because its API was id-based. Everything in v2 — meeting
 * attendees, action-item owners, visit teams, and the notifications service itself — addresses a
 * person by name, so recipients are names here too.
 */

export const REMINDER_STATUSES = /** @type {const} */ (['scheduled', 'sent', 'cancelled']);

const STATUS_LABELS = { scheduled: 'Scheduled', sent: 'Sent', cancelled: 'Cancelled' };

const reminderSchema = new Schema(
  {
    creator: { type: String, required: true, trim: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, default: '', trim: true, maxlength: 2000 },
    /** The day and the minute it fires, kept apart so a list can be filtered by day. */
    date: { type: String, required: true },
    time: { type: String, required: true },
    /** The same moment as one value, which is what the sender sorts and claims on. */
    remindAt: { type: Date, required: true },
    status: { type: String, enum: REMINDER_STATUSES, default: 'scheduled' },
    sentAt: { type: Date, default: null },
    recipients: { type: [String], default: [] },
  },
  { timestamps: true },
);

reminderSchema.index({ status: 1, remindAt: 1 });
reminderSchema.index({ creator: 1, remindAt: -1 });
reminderSchema.index({ recipients: 1, remindAt: -1 });

export const Reminder = model('Reminder', reminderSchema);

/**
 * One reminder as the app reads it. `viewer` decides the three "is this mine" flags, exactly as
 * the v1 payload did, so the screens need no rules of their own.
 *
 * @param {any} r a Reminder document
 * @param {string} [viewerName]
 */
export function serializeReminder(r, viewerName = '') {
  const me = String(viewerName).trim().toLowerCase();
  const isCreator = String(r.creator ?? '').trim().toLowerCase() === me;
  const recipients = (r.recipients ?? []).map((name) => ({ name }));
  const scheduled = r.status === 'scheduled';

  return {
    id: r._id.toString(),
    title: r.title,
    note: r.note ?? '',
    remindAt: `${r.date} ${r.time}`,
    date: r.date,
    time: r.time,
    status: r.status,
    statusLabel: STATUS_LABELS[r.status] ?? r.status,
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
    /** Still scheduled, but its minute has passed: the sender has not reached it yet. */
    late: scheduled && r.remindAt instanceof Date && r.remindAt.getTime() <= Date.now(),
    creator: r.creator,
    mine: isCreator,
    forMe: (r.recipients ?? []).some((n) => String(n).trim().toLowerCase() === me),
    /** Only the person who set it can change it, and only before it fires. */
    mineToEdit: isCreator && scheduled,
    recipients,
    createdAt: r.createdAt?.toISOString?.() ?? null,
    updatedAt: r.updatedAt?.toISOString?.() ?? null,
  };
}
