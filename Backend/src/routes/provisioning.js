import { Router } from 'express';
import * as provisioning from '../controllers/provisioning.js';
import { requireProvisioningToken } from '../middleware/provisioningAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

/**
 * /api/provisioning — the identity hub's door.
 *
 * PACE is the source of truth for who works here. When HR creates an employee there, or
 * switches one off, PACE calls the same five endpoints on every Trustlab app so the one
 * action lands everywhere. This router is MyDiary's side of that contract; the paths and
 * the header are fixed by PACE (see its AppConnector), not chosen here.
 *
 * Everything behind requireProvisioningToken is machine-to-machine: no JWT, no req.user,
 * and no route here may ever be reachable from a browser session.
 *
 * Deliberately NOT offered: delete. PACE disables people, it does not erase them, and a
 * removed user would take their diary, their meetings and their action items with them.
 */
export const provisioningRouter = Router();
provisioningRouter.use(requireProvisioningToken);

provisioningRouter.get('/ping', provisioning.ping);
provisioningRouter.get('/users/lookup', validateQuery(provisioning.lookupQuerySchema), provisioning.lookup);
provisioningRouter.post('/users', validateBody(provisioning.createSchema), provisioning.create);
provisioningRouter.post('/users/enable', validateBody(provisioning.keySchema), provisioning.enable);
provisioningRouter.post('/users/disable', validateBody(provisioning.keySchema), provisioning.disable);
