import { Router } from 'express';
import * as auth from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();
authRouter.post('/login', validateBody(auth.loginSchema), auth.login);
authRouter.post('/logout', requireAuth, auth.logout);
authRouter.get('/me', requireAuth, auth.me);
authRouter.patch('/me', requireAuth, validateBody(auth.meSchema), auth.updateMe);
authRouter.post('/change-password', requireAuth, validateBody(auth.changePasswordSchema), auth.changePassword);
