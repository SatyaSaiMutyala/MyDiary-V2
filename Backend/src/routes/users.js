import { Router } from 'express';
import * as users from '../controllers/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('admin'));
usersRouter.get('/modules', users.modules);
usersRouter.get('/departments', users.departments);
usersRouter.get('/', users.list);
usersRouter.post('/', validateBody(users.createSchema), users.create);
usersRouter.get('/:id', users.get);
usersRouter.patch('/:id', validateBody(users.patchSchema), users.update);
usersRouter.delete('/:id', users.remove);
usersRouter.post('/:id/reset-password', validateBody(users.resetPasswordSchema), users.resetPassword);
