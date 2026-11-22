import { Router } from 'express';
import * as notifications from '../controllers/notifications.js';
import { requireAuth } from '../middleware/auth.js';

/** /api/notifications — the signed-in person's own bell list. */
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', notifications.list);
notificationsRouter.post('/read-all', notifications.readAll);
notificationsRouter.patch('/:id/read', notifications.markRead);
