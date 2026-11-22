import { Router } from 'express';
import * as templates from '../controllers/templates.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ensureTemplateSeed } from '../services/templates.js';

/** /api/templates — the Agenda Templates Library (module `templates`). */
export const templatesRouter = Router();
templatesRouter.use(requireAuth, requireModule('templates'));

/**
 * The library is never empty on a fresh database: the 12 prototype templates are inserted on the first
 * request that reaches this router (idempotent — see services/templates.js `ensureTemplateSeed`).
 * @type {import('express').RequestHandler}
 */
const seedLibrary = async (_req, _res, next) => {
  await ensureTemplateSeed();
  next();
};
templatesRouter.use(seedLibrary);

templatesRouter.get('/', templates.list);
templatesRouter.post('/', validateBody(templates.createSchema), templates.create);
templatesRouter.get('/:id', templates.get);
templatesRouter.patch('/:id', validateBody(templates.updateSchema), templates.update);
templatesRouter.delete('/:id', templates.remove);
templatesRouter.post('/:id/duplicate', templates.duplicate);
