import { Router } from 'express';
import * as visits from '../controllers/visits.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/visits — My Visit Observations: the visit report itself plus the parts the detail screen edits
 * (observations, follow-up actions, draft ⇄ submitted).
 */
export const visitsRouter = Router();
visitsRouter.use(requireAuth, requireModule('visits'));

visitsRouter.get('/', visits.list);
visitsRouter.post('/', validateBody(visits.createSchema), visits.create);
visitsRouter.get('/:id', visits.get);
visitsRouter.patch('/:id', validateBody(visits.patchSchema), visits.update);
visitsRouter.delete('/:id', visits.remove);

// Sign-off
visitsRouter.post('/:id/status', validateBody(visits.statusSchema), visits.setStatus);

// Detailed observations
visitsRouter.post('/:id/observations', validateBody(visits.observationSchema), visits.addObservation);
visitsRouter.patch('/:id/observations/:index', validateBody(visits.observationPatchSchema), visits.patchObservation);
visitsRouter.delete('/:id/observations/:index', visits.removeObservation);

// Follow-up actions
visitsRouter.post('/:id/action-items', validateBody(visits.visitActionSchema), visits.addAction);
visitsRouter.patch('/:id/action-items/:index', validateBody(visits.visitActionPatchSchema), visits.patchAction);
visitsRouter.delete('/:id/action-items/:index', visits.removeAction);
