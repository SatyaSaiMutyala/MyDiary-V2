import { Schema, model } from 'mongoose';

/** One line of the Decisions Registry (web/src/data/decisions.js shape). */
const decisionSchema = new Schema(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    /** Denormalised for search and the registry list; synced when the meeting is renamed. */
    meetingTitle: { type: String, default: '' },
    agendaIdx: { type: Number, default: 0 },
    text: { type: String, required: true, trim: true },
    decidedBy: { type: String, default: '' },
    tags: { type: [String], default: [] },
    department: { type: String, default: 'General' },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
decisionSchema.index({ meetingId: 1, agendaIdx: 1 });
decisionSchema.index({ department: 1, createdAt: -1 });
decisionSchema.index({ tags: 1 });
decisionSchema.index({ createdAt: -1 });

export const Decision = model('Decision', decisionSchema);

/** @param {any} d a Decision document */
export function serializeDecision(d) {
  return {
    id: d._id.toString(),
    meetingId: d.meetingId ? d.meetingId.toString() : null,
    meetingTitle: d.meetingTitle ?? '',
    agendaIdx: d.agendaIdx ?? 0,
    text: d.text,
    decidedBy: d.decidedBy ?? '',
    tags: [...(d.tags ?? [])],
    department: d.department ?? 'General',
    createdBy: { id: d.createdBy?.id ? d.createdBy.id.toString() : null, name: d.createdBy?.name ?? '' },
    createdAt: (d.createdAt ?? new Date()).toISOString(),
    updatedAt: (d.updatedAt ?? d.createdAt ?? new Date()).toISOString(),
  };
}
