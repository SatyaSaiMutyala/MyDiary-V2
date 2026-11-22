import { Router } from 'express';
import * as actionItems from '../controllers/actionItems.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/** /api/action-items — read across every meeting (My To-Do) and edit one item. */
export const actionItemsRouter = Router();
actionItemsRouter.use(requireAuth, requireModule('meetings', 'todo'));

actionItemsRouter.get('/', actionItems.list);
actionItemsRouter.get('/:id', actionItems.get);
actionItemsRouter.patch('/:id', validateBody(actionItems.actionPatchSchema), actionItems.update);
actionItemsRouter.delete('/:id', actionItems.remove);
actionItemsRouter.post('/:id/subtasks', validateBody(actionItems.subtaskSchema), actionItems.addSubtask);
actionItemsRouter.patch('/:id/subtasks/:index', validateBody(actionItems.subtaskPatchSchema), actionItems.setSubtask);
actionItemsRouter.post('/:id/comments', validateBody(actionItems.commentSchema), actionItems.addComment);
actionItemsRouter.post('/:id/dependencies', validateBody(actionItems.dependencySchema), actionItems.addDependency);
