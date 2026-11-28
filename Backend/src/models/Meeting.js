import { Schema, model } from 'mongoose';

/** Same keys as web/src/data/meetings.js TYPES. */
export const MEETING_TYPES = /** @type {const} */ (['internal', 'customer', 'supplier', 'consultants', 'board', 'other']);
export const MEETING_STATUSES = /** @type {const} */ (['upcoming', 'completed', 'cancelled']);
export const RSVPS = /** @type {const} */ (['pending', 'accepted', 'declined', 'tentative']);
export const PRESENCE = /** @type {const} */ (['tbd', 'present', 'late', 'absent']);
export const MODES = /** @type {const} */ (['📍 In-person', '💻 Virtual', '🔀 Hybrid']);

const externalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    rsvp: { type: String, enum: RSVPS, default: 'pending' },
    /** 'YYYY-MM-DDTHH:MM' like the web, or null until they respond. */
    respondedAt: { type: String, default: null },
    respondedNote: { type: String, default: '' },
  },
  { _id: false },
);

const transcriptLineSchema = new Schema(
  {
    speaker: { type: String, default: '' },
    chip: { type: String, default: '' },
    time: { type: String, default: '' },
    text: { type: String, default: '' },
  },
  { _id: false },
);

const preReadSchema = new Schema({ name: { type: String, required: true }, opened: { type: Boolean, default: false } }, { _id: false });

/**
 * A meeting (web/src/data/meetings.js INITIAL_MEETINGS shape). Action items live in their own collection
 * (models/ActionItem.js) and are embedded on read.
 */
const meetingSchema = new Schema(
  {
    type: { type: String, enum: MEETING_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    /** 'YYYY-MM-DD' — stored as a string (what the web uses); ISO dates compare correctly as strings. */
    date: { type: String, required: true },
    /** 'HH:MM' 24h. */
    time: { type: String, required: true },
    /** '1h', '45m', '1h 30m' … */
    dur: { type: String, default: '1h' },
    status: { type: String, enum: MEETING_STATUSES, default: 'upcoming' },
    chair: { type: String, default: '' },
    loc: { type: String, default: 'TBD' },
    mode: { type: String, default: '📍 In-person' },
    /** Internal attendees, e.g. "N. Sharma (CFO)". */
    attendees: { type: [String], default: [] },
    external: { type: [externalSchema], default: [] },
    agenda: { type: [String], default: [] },
    agendaTimes: { type: [String], default: [] },
    /** One short note per agenda item — context for the chair, kept beside the line it belongs to. */
    agendaNotes: { type: [String], default: [] },
    /** { ag0: { disc, dec }, …, general: { disc } } */
    minutes: { type: Schema.Types.Mixed, default: () => ({}) },
    subBadge: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    /** { [attendee]: 'tbd' | 'present' | 'late' | 'absent' } */
    presence: { type: Schema.Types.Mixed, default: () => ({}) },
    parkingLot: { type: [String], default: [] },
    preRead: { type: [preReadSchema], default: [] },
    contributions: { type: Schema.Types.Mixed, default: () => [] },
    carriedOver: { type: Schema.Types.Mixed, default: () => [] },
    polls: { type: Schema.Types.Mixed, default: () => [] },
    contextCard: { type: Schema.Types.Mixed, default: null },
    transcript: { type: [transcriptLineSchema], default: [] },
    /** { overview, decisions: [{ text, owner, deadline }], actions: [{ desc, owner, deadline, priority }], risks: [] } */
    aiSummary: { type: Schema.Types.Mixed, default: null },
    minutesFinalised: { type: Boolean, default: false },
    minutesCirculatedAt: { type: Date, default: null },
    clientCode: { type: String, default: '' },
    clientName: { type: String, default: '' },
    /** Set when the meeting was created by accepting a meeting request. */
    fromRequest: { type: Schema.Types.ObjectId, ref: 'MeetingRequest', default: null },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true, minimize: false },
);
meetingSchema.index({ date: 1, time: 1 });
meetingSchema.index({ status: 1, date: 1 });
meetingSchema.index({ type: 1, date: 1 });
meetingSchema.index({ chair: 1 });
meetingSchema.index({ 'createdBy.id': 1 });
meetingSchema.index({ clientCode: 1 });

export const Meeting = model('Meeting', meetingSchema);

/** @param {any} e */
const serializeExternal = (e) => ({
  name: e.name,
  email: e.email ?? '',
  rsvp: e.rsvp ?? 'pending',
  respondedAt: e.respondedAt ?? null,
  respondedNote: e.respondedNote ?? '',
});

/**
 * The meeting shape the web app renders. `actions` are the serialized action items of this meeting.
 * @param {any} m a Meeting document
 * @param {any[]} [actions]
 */
export function serializeMeeting(m, actions = []) {
  return {
    id: m._id.toString(),
    type: m.type,
    title: m.title,
    date: m.date,
    time: m.time,
    dur: m.dur ?? '1h',
    status: m.status,
    chair: m.chair ?? '',
    loc: m.loc ?? '',
    mode: m.mode ?? '',
    attendees: [...(m.attendees ?? [])],
    external: (m.external ?? []).map(serializeExternal),
    agenda: [...(m.agenda ?? [])],
    agendaTimes: [...(m.agendaTimes ?? [])],
    agendaNotes: [...(m.agendaNotes ?? [])],
    minutes: m.minutes ?? {},
    subBadge: m.subBadge ?? '',
    cancelReason: m.cancelReason ?? '',
    presence: m.presence ?? {},
    parkingLot: [...(m.parkingLot ?? [])],
    preRead: (m.preRead ?? []).map((p) => ({ name: p.name, opened: !!p.opened })),
    contributions: m.contributions ?? [],
    carriedOver: m.carriedOver ?? [],
    polls: m.polls ?? [],
    contextCard: m.contextCard ?? null,
    transcript: (m.transcript ?? []).map((t) => ({ speaker: t.speaker, chip: t.chip, time: t.time, text: t.text })),
    aiSummary: m.aiSummary ?? null,
    minutesFinalised: !!m.minutesFinalised,
    minutesCirculatedAt: m.minutesCirculatedAt ? m.minutesCirculatedAt.toISOString() : null,
    clientCode: m.clientCode ?? '',
    clientName: m.clientName ?? '',
    fromRequest: m.fromRequest ? m.fromRequest.toString() : null,
    createdBy: { id: m.createdBy?.id ? m.createdBy.id.toString() : null, name: m.createdBy?.name ?? '' },
    createdAt: (m.createdAt ?? new Date()).toISOString(),
    updatedAt: (m.updatedAt ?? m.createdAt ?? new Date()).toISOString(),
    actions,
    openActions: actions.filter((a) => a.status !== 'done').length,
    totalActions: actions.length,
  };
}
