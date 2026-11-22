import { Schema, model } from 'mongoose';

export const REQUEST_STATUSES = /** @type {const} */ (['pending', 'accepted', 'declined', 'countered']);

const historySchema = new Schema(
  {
    at: { type: Date, required: true },
    by: { type: String, default: '' },
    action: { type: String, required: true },
    note: { type: String, default: '' },
    proposedDate: { type: String, default: '' },
    proposedTime: { type: String, default: '' },
  },
  { _id: false },
);

/** A "can we meet?" request (web/src/data/meetings.js MEETING_REQUESTS shape). */
const meetingRequestSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    /** Set when the request was routed through the EA: the person it is really for. */
    onBehalfOf: { type: String, default: null },
    /** Who actually receives it (the EA for CMD requests), else null. */
    routedTo: { type: String, default: null },
    proposedDate: { type: String, required: true },
    proposedTime: { type: String, required: true },
    durationMin: { type: Number, default: 30 },
    topic: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
    respondedAt: { type: Date, default: null },
    responseNote: { type: String, default: '' },
    /** The meeting created when the request was accepted. */
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);
meetingRequestSchema.index({ status: 1, createdAt: -1 });
meetingRequestSchema.index({ to: 1, routedTo: 1 });
meetingRequestSchema.index({ from: 1 });

export const MeetingRequest = model('MeetingRequest', meetingRequestSchema);

/** @param {any} r a MeetingRequest document */
export function serializeRequest(r) {
  return {
    id: r._id.toString(),
    from: r.from,
    to: r.to,
    onBehalfOf: r.onBehalfOf ?? null,
    routedTo: r.routedTo ?? null,
    proposedDate: r.proposedDate,
    proposedTime: r.proposedTime,
    durationMin: r.durationMin ?? 30,
    topic: r.topic,
    notes: r.notes ?? '',
    status: r.status,
    createdAt: (r.createdAt ?? new Date()).toISOString(),
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
    responseNote: r.responseNote ?? '',
    meetingId: r.meetingId ? r.meetingId.toString() : null,
    history: (r.history ?? []).map((h) => ({
      at: h.at.toISOString(),
      by: h.by,
      action: h.action,
      note: h.note ?? '',
      proposedDate: h.proposedDate ?? '',
      proposedTime: h.proposedTime ?? '',
    })),
    updatedAt: (r.updatedAt ?? r.createdAt ?? new Date()).toISOString(),
  };
}
