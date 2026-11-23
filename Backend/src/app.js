import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { auditRequests } from './middleware/audit.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { actionItemsRouter } from './routes/actionItems.js';
import { auditRouter } from './routes/audit.js';
import { decisionsRouter } from './routes/decisions.js';
import { devicesRouter } from './routes/devices.js';
import { diaryRouter } from './routes/diary.js';
import { logsRouter } from './routes/logs.js';
import { projectsRouter } from './routes/projects.js';
import { remindersRouter } from './routes/reminders.js';
import { departmentsRouter } from './routes/departments.js';
import { integrationsRouter } from './routes/integrations.js';
import { meetingRequestsRouter } from './routes/meetingRequests.js';
import { meetingsRouter } from './routes/meetings.js';
import { notificationsRouter } from './routes/notifications.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { searchRouter } from './routes/search.js';
import { templatesRouter } from './routes/templates.js';
import { visitsRouter } from './routes/visits.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  // Activity Log for every successful mutating request (see middleware/audit.js).
  app.use('/api', auditRequests);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/meetings', meetingsRouter);
  app.use('/api/action-items', actionItemsRouter);
  app.use('/api/meeting-requests', meetingRequestsRouter);
  app.use('/api/decisions', decisionsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/reminders', remindersRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/visits', visitsRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/diary', diaryRouter);
  app.use('/api/projects', projectsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
