import { config } from '../config.js';
import { dbStatus } from '../db.js';

/** GET /api/health — public; 503 when the database is not connected. @type {import('express').RequestHandler} */
export const health = (_req, res) => {
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({ ok: db === 'connected', name: config.appName, node: process.version, db, env: config.nodeEnv });
};
