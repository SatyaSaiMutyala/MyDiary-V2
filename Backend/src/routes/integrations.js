import { Router } from 'express';
import * as integrations from '../controllers/integrations.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/integrations — the register of which third-party tools are switched on (admin-only module).
 * Nothing here calls a third party: connect / disconnect write this record and the Activity Log only.
 */
export const integrationsRouter = Router();
integrationsRouter.use(requireAuth, requireModule('integrations'));

// The register starts EMPTY. The 15 default tools are demo data, so nothing writes them automatically;
// add the ones you actually use with POST /api/integrations.

integrationsRouter.get('/', integrations.list);
integrationsRouter.post('/', validateBody(integrations.createSchema), integrations.create);

integrationsRouter.get('/:id', integrations.get);
integrationsRouter.patch('/:id', validateBody(integrations.updateSchema), integrations.update);
integrationsRouter.delete('/:id', integrations.remove);

integrationsRouter.patch('/:id/settings', validateBody(integrations.settingsBodySchema), integrations.saveSettings);
integrationsRouter.post('/:id/connect', validateBody(integrations.toggleSchema), integrations.setStatus('connected'));
integrationsRouter.post('/:id/disconnect', validateBody(integrations.toggleSchema), integrations.setStatus('disconnected'));
integrationsRouter.post('/:id/pending', validateBody(integrations.toggleSchema), integrations.setStatus('pending'));
