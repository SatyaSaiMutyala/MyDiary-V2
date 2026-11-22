import { Router } from 'express';
import * as audit from '../controllers/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('admin'));
auditRouter.get('/', audit.list);
auditRouter.get('/export.csv', audit.exportCsv);
auditRouter.get('/modules', audit.modules);
auditRouter.get('/stats', validateQuery(audit.statsQuerySchema), audit.stats);
