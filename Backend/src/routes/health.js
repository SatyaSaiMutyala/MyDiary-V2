import { Router } from 'express';
import { health } from '../controllers/health.js';

export const healthRouter = Router();
healthRouter.get('/', health);
