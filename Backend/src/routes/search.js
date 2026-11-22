import { Router } from 'express';
import { search, searchQuerySchema } from '../controllers/search.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';

export const searchRouter = Router();
searchRouter.get('/', requireAuth, validateQuery(searchQuerySchema), search);
