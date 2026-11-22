import { Schema, model } from 'mongoose';

/**
 * One entry on a person's own diary (web/src/data/diary.js DIARY_ENTRIES shape).
 *
 * My Diary shows two kinds of thing side by side: these entries and the person's meetings. Meetings
 * are NOT copied in here — the web app reads them from /api/meetings and merges the two lists in the
 * browser, so a meeting has exactly one home. The 'tentative' category the calendar paints for a
 * pending meeting request is likewise derived in the browser from /api/meeting-requests and is never
 * stored, which is why it is not in DIARY_CATS below.
 *
 * Dates are 'YYYY-MM-DD' strings and times 'HH:MM' 24h, exactly as models/Meeting.js stores them, so
 * the two modules agree and ISO dates compare correctly as strings.
 */

/** Same keys as web/src/data/diary.js DIARY_CATS, minus the derived 'tentative'. */
export const DIARY_CATS = /** @type {const} */ (['meeting', 'focus', 'personal', 'travel', 'ooo', 'reminder']);
/** Who put the entry on the diary: the owner ('self') or someone with delegated access, i.e. the EA ('ea'). */
export const ADDED_BY = /** @type {const} */ (['self', 'ea']);
/** The web's Reminder select (modals/EntryModal.jsx). */
export const DIARY_REMINDERS = /** @type {const} */ (['None', '15 min before', '30 min before', '1 hour before', '1 day before']);
export const DIARY_RSVPS = /** @type {const} */ (['pending', 'accepted', 'declined', 'tentative']);

const externalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    rsvp: { type: String, enum: DIARY_RSVPS, default: 'pending' },
    /** 'YYYY-MM-DDTHH:MM' like the web, or null until they respond. */
    respondedAt: { type: String, default: null },
    respondedNote: { type: String, default: '' },
  },
  { _id: false },
);

const diaryEntrySchema = new Schema(
  {
    /** Whose diary this is, as a people string ("Venkata Cherukuri"); the roster is not fully in the DB. */
    owner: { type: String, required: true, trim: true },
    /** The owner's account when the name resolves to one — the indexed path every list is scoped by. */
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    cat: { type: String, enum: DIARY_CATS, required: true },
    /** First day, 'YYYY-MM-DD'. */
    date: { type: String, required: true },
    /** Last day of a multi-day entry (a trip, a week out of office), or null for a single day. */
    endDate: { type: String, default: null },
    /**
     * Every calendar day the entry occupies (date … endDate). `from` / `to` run against this, so a
     * multi-day entry is found by any window it overlaps — the calendar asks for one month, week or
     * day at a time and this is the one indexed path that answers that correctly (multikey index below).
     */
    days: { type: [String], default: [] },
    /** 'HH:MM' 24h, or null for an all-day entry. */
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    allDay: { type: Boolean, default: false },
    loc: { type: String, default: '' },
    notes: { type: String, default: '' },
    reminder: { type: String, enum: DIARY_REMINDERS, default: '15 min before' },
    /** Internal invitees, e.g. "N. Sharma (CFO)". */
    attendees: { type: [String], default: [] },
    external: { type: [externalSchema], default: [] },
    addedBy: { type: String, enum: ADDED_BY, default: 'self' },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
// The calendar's one hot query: this owner's entries overlapping a window.
diaryEntrySchema.index({ ownerId: 1, days: 1 });
diaryEntrySchema.index({ owner: 1, days: 1 });
diaryEntrySchema.index({ days: 1 });
diaryEntrySchema.index({ ownerId: 1, date: 1, startTime: 1 });
diaryEntrySchema.index({ cat: 1, date: 1 });

export const DiaryEntry = model('DiaryEntry', diaryEntrySchema);

/** @param {any} e */
const serializeExternal = (e) => ({
  name: e.name,
  email: e.email ?? '',
  rsvp: e.rsvp ?? 'pending',
  respondedAt: e.respondedAt ?? null,
  respondedNote: e.respondedNote ?? '',
});

/**
 * The diary entry shape the web app renders (`days` stays internal — it is a filter path, derived
 * from date / endDate).
 * @param {any} e a DiaryEntry document
 */
export function serializeDiaryEntry(e) {
  return {
    id: e._id.toString(),
    owner: e.owner,
    ownerId: e.ownerId ? e.ownerId.toString() : null,
    title: e.title,
    cat: e.cat,
    date: e.date,
    endDate: e.endDate ?? null,
    startTime: e.startTime ?? null,
    endTime: e.endTime ?? null,
    allDay: !!e.allDay,
    loc: e.loc ?? '',
    notes: e.notes ?? '',
    reminder: e.reminder ?? '15 min before',
    attendees: [...(e.attendees ?? [])],
    external: (e.external ?? []).map(serializeExternal),
    addedBy: e.addedBy ?? 'self',
    createdBy: { id: e.createdBy?.id ? e.createdBy.id.toString() : null, name: e.createdBy?.name ?? '' },
    createdAt: (e.createdAt ?? new Date()).toISOString(),
    updatedAt: (e.updatedAt ?? e.createdAt ?? new Date()).toISOString(),
  };
}
