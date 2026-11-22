import { Router } from 'express';
import * as logs from '../controllers/discussionLogs.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/logs — My Discussion Logs: the log itself, the two groupings the screens need (one row per person,
 * one row per follow-up) and the follow-ups of a single log.
 *
 * The grouping routes come before `/:id` so "people", "tags" and "followups" are never read as an id.
 */
export const logsRouter = Router();
logsRouter.use(requireAuth, requireModule('logs'));

logsRouter.get('/', logs.list);
logsRouter.get('/people', logs.people);
logsRouter.get('/tags', logs.tags);
logsRouter.get('/followups', logs.followUps);
logsRouter.post('/', validateBody(logs.createSchema), logs.create);
logsRouter.get('/:id', logs.get);
logsRouter.patch('/:id', validateBody(logs.patchSchema), logs.update);
logsRouter.delete('/:id', logs.remove);

// Follow-ups of one log
logsRouter.post('/:id/followups', validateBody(logs.followUpSchema), logs.addFollowUp);
logsRouter.patch('/:id/followups/:fuId', validateBody(logs.followUpPatchSchema), logs.patchFollowUp);
logsRouter.post('/:id/followups/:fuId/status', validateBody(logs.followUpDoneSchema), logs.setFollowUpStatus);
logsRouter.post('/:id/followups/:fuId/toggle', logs.toggleFollowUp);
logsRouter.delete('/:id/followups/:fuId', logs.removeFollowUp);
