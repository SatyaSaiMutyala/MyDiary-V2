import { Router } from 'express';
import * as users from '../controllers/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Names only, for the screens that have to offer a list of colleagues to anybody signed in.
usersRouter.get('/directory', users.directory);

// Everything else on this router carries emails, roles and module grants: admins only.
usersRouter.use(requireRole('admin'));
usersRouter.get('/modules', users.modules);
usersRouter.get('/departments', users.departments);
usersRouter.get('/', users.list);
usersRouter.post('/', validateBody(users.createSchema), users.create);
usersRouter.get('/:id', users.get);
usersRouter.patch('/:id', validateBody(users.patchSchema), users.update);
usersRouter.delete('/:id', users.remove);
// Fixed path before /:id/… so it is not read as a user id.
usersRouter.post('/reset-passwords', validateBody(users.bulkResetPasswordSchema), users.bulkResetPassword);
usersRouter.post('/:id/reset-password', validateBody(users.resetPasswordSchema), users.resetPassword);
