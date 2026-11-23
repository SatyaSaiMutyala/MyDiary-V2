import { Router } from 'express';
import * as devices from '../controllers/devices.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/devices — where to push.
 *
 * No module gate: notifications belong to everyone who can sign in, so any signed-in person may
 * register the phone in their hand.
 */
export const devicesRouter = Router();
devicesRouter.use(requireAuth);

devicesRouter.post('/', validateBody(devices.registerSchema), devices.register);
devicesRouter.delete('/', validateBody(devices.unregisterSchema), devices.unregister);
