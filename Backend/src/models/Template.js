import { Schema, model } from 'mongoose';
import { MEETING_TYPES } from './Meeting.js';

/** One agenda line of a template: what is discussed and how long it is given. */
const agendaItemSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    /** '5m', '15m', '1h' … same notation as a meeting's `agendaTimes`. */
    time: { type: String, default: '10m', trim: true },
  },
  { _id: false },
);

/**
 * One card of the Agenda Templates Library (web/src/data/templates.js shape). The prototype only carried
 * `agendaCount`; here the agenda items themselves are stored so "Load from template…" can pre-fill a meeting.
 * `agendaCount` is kept in sync with `agenda.length` so lists can filter and sort on it.
 */
const templateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: MEETING_TYPES, required: true },
    /** The emoji on the card. */
    ico: { type: String, default: '📋', trim: true },
    desc: { type: String, default: '', trim: true },
    agenda: { type: [agendaItemSchema], default: [] },
    agendaCount: { type: Number, default: 0, min: 0 },
    /** "Used 142×" on the card. */
    usedCount: { type: Number, default: 0, min: 0 },
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true },
);
templateSchema.index({ type: 1, createdAt: 1 });
templateSchema.index({ name: 1 });
templateSchema.index({ createdAt: 1 });

// agendaCount is derived — never trusted from the request body.
templateSchema.pre('validate', function syncAgendaCount() {
  this.agendaCount = (this.agenda ?? []).length;
});

export const Template = model('Template', templateSchema);

/** @param {any} t a Template document */
export function serializeTemplate(t) {
  const agenda = (t.agenda ?? []).map((a) => ({ text: a.text, time: a.time ?? '10m' }));
  return {
    id: t._id.toString(),
    name: t.name,
    type: t.type,
    ico: t.ico ?? '📋',
    desc: t.desc ?? '',
    agenda,
    agendaCount: agenda.length,
    usedCount: t.usedCount ?? 0,
    createdBy: { id: t.createdBy?.id ? t.createdBy.id.toString() : null, name: t.createdBy?.name ?? '' },
    createdAt: (t.createdAt ?? new Date()).toISOString(),
    updatedAt: (t.updatedAt ?? t.createdAt ?? new Date()).toISOString(),
  };
}
