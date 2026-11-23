import { Router } from 'express';
import * as reminders from '../controllers/reminders.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/reminders — a note that fires at a chosen minute for chosen people.
 *
 * Reading is scoped by the controller to what the person set or will receive; changing and
 * deleting is the creator's alone, and only before it fires.
 */
export const remindersRouter = Router();
remindersRouter.use(requireAuth, requireModule('reminders'));

remindersRouter.get('/', reminders.list);
remindersRouter.post('/', validateBody(reminders.createSchema), reminders.create);
remindersRouter.get('/:id', reminders.get);
remindersRouter.patch('/:id', validateBody(reminders.patchSchema), reminders.update);
remindersRouter.delete('/:id', reminders.remove);
