import { Router } from 'express';
import * as decisions from '../controllers/decisions.js';
import { requireAuth, requireModule } from '../middleware/auth.js';

/** /api/decisions — the Decisions Registry (decisions are created on a meeting, read here). */
export const decisionsRouter = Router();
decisionsRouter.use(requireAuth, requireModule('decisions', 'meetings'));

decisionsRouter.get('/', decisions.list);
decisionsRouter.get('/:id', decisions.get);
decisionsRouter.delete('/:id', decisions.remove);
