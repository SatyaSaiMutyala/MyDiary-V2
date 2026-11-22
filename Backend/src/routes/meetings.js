import { Router } from 'express';
import * as actionItems from '../controllers/actionItems.js';
import * as decisions from '../controllers/decisions.js';
import * as meetings from '../controllers/meetings.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/** /api/meetings — the meeting itself plus everything that hangs off one (minutes, presence, RSVP, …). */
export const meetingsRouter = Router();
meetingsRouter.use(requireAuth, requireModule('meetings'));

meetingsRouter.get('/', meetings.list);
meetingsRouter.post('/', validateBody(meetings.createSchema), meetings.create);
meetingsRouter.get('/:id', meetings.get);
meetingsRouter.patch('/:id', validateBody(meetings.patchSchema), meetings.update);
meetingsRouter.delete('/:id', meetings.remove);

meetingsRouter.post('/:id/status', validateBody(meetings.statusSchema), meetings.setStatus);
meetingsRouter.post('/:id/duplicate', meetings.duplicate);

// Minutes
meetingsRouter.put('/:id/minutes', validateBody(meetings.minutesSchema), meetings.putMinutes);
meetingsRouter.post('/:id/minutes/finalise', meetings.finaliseMinutes);
meetingsRouter.post('/:id/minutes/reopen', meetings.reopenMinutes);
meetingsRouter.post('/:id/minutes/circulate', meetings.circulateMinutes);

// Attendee presence and the parking lot
meetingsRouter.patch('/:id/presence', validateBody(meetings.presenceSchema), meetings.patchPresence);
meetingsRouter.post('/:id/presence/cycle', validateBody(meetings.presenceCycleSchema), meetings.cyclePresence);
meetingsRouter.post('/:id/parking', validateBody(meetings.parkingSchema), meetings.addParking);
meetingsRouter.delete('/:id/parking/:index', meetings.removeParking);

// External invitees and their RSVP
meetingsRouter.patch('/:id/external/:index', validateBody(meetings.externalPatchSchema), meetings.patchExternal);
meetingsRouter.post('/:id/rsvp', validateBody(meetings.rsvpSchema), meetings.rsvp);

// Live transcription and the AI summary
meetingsRouter.post('/:id/transcript/append', validateBody(meetings.transcriptSchema), meetings.appendTranscript);
meetingsRouter.delete('/:id/transcript', meetings.clearTranscript);
meetingsRouter.put('/:id/ai-summary', validateBody(meetings.aiSummarySchema), meetings.putAiSummary);
meetingsRouter.post('/:id/ai-summary/apply-actions', meetings.applyAiActions);
meetingsRouter.post('/:id/ai-summary/log-decisions', meetings.logAiDecisions);

// Action items and decisions that belong to this meeting
meetingsRouter.post('/:id/action-items', validateBody(actionItems.actionSchema), actionItems.createForMeeting);
meetingsRouter.post('/:id/action-items/extract', actionItems.extractFromMinutes);
meetingsRouter.post('/:id/remind-owners', meetings.remindOwners);
meetingsRouter.post('/:id/decisions', validateBody(decisions.createSchema), decisions.createForMeeting);
