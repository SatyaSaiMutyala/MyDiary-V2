import { Router } from 'express';
import * as requests from '../controllers/meetingRequests.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/** /api/meeting-requests — peer-to-peer "can we meet?" requests (CMD requests route through the EA). */
export const meetingRequestsRouter = Router();
meetingRequestsRouter.use(requireAuth, requireModule('meetings'));

meetingRequestsRouter.get('/', requests.list);
meetingRequestsRouter.post('/', validateBody(requests.createSchema), requests.create);
meetingRequestsRouter.get('/:id', requests.get);
meetingRequestsRouter.post('/:id/accept', validateBody(requests.acceptSchema), requests.accept);
meetingRequestsRouter.post('/:id/decline', validateBody(requests.declineSchema), requests.decline);
meetingRequestsRouter.post('/:id/counter', validateBody(requests.counterSchema), requests.counter);
