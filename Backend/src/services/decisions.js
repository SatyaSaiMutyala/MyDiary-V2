import mongoose from 'mongoose';
import { Decision } from '../models/Decision.js';
import { notFound } from '../utils/errors.js';

/** @param {string} id */
export async function findDecisionOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That decision does not exist.');
  const d = await Decision.findById(id);
  if (!d) throw notFound('That decision does not exist.');
  return d;
}

/**
 * Logs one decision against a meeting. Defaults mirror the web's linkDecision(): decidedBy = chair,
 * tags = ['approved'], department = 'General'.
 * @param {any} meeting
 * @param {{ agendaIdx?: number, text: string, department?: string, tags?: string[], decidedBy?: string }} input
 * @param {any} me
 */
export function createDecision(meeting, input, me) {
  return Decision.create({
    meetingId: meeting._id,
    meetingTitle: meeting.title,
    agendaIdx: input.agendaIdx ?? 0,
    text: input.text,
    decidedBy: input.decidedBy || meeting.chair || me.name,
    tags: input.tags && input.tags.length ? input.tags : ['approved'],
    department: input.department || 'General',
    createdBy: { id: me._id, name: me.name },
  });
}
