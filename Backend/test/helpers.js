import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_EMAIL = 'venkata.cherukuri@trustlab.co.in';
process.env.ADMIN_PASSWORD = 'mydiary123';
process.env.SEED_PASSWORD = 'mydiary123';

export const ADMIN = { email: 'venkata.cherukuri@trustlab.co.in', password: 'mydiary123' };

/** @param {string} t */
export const auth = (t) => ({ Authorization: `Bearer ${t}` });

/**
 * Starts an in-memory MongoDB, connects Mongoose, creates the first admin and builds the app.
 * @returns {Promise<{ app: import('express').Express, stop: () => Promise<void> }>}
 */
export async function startTestApp() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('mydiary-test'));
  const { ensureDefaultAdmin } = await import('../src/services/users.js');
  const { createApp } = await import('../src/app.js');
  await ensureDefaultAdmin();
  const app = createApp();
  return {
    app,
    stop: async () => {
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}

/** @param {import('express').Express} app @param {string} email @param {string} password */
export async function login(app, email = ADMIN.email, password = ADMIN.password) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  if (r.status !== 200) throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return /** @type {{ token: string, user: any }} */ (r.body);
}

/**
 * Creates a user as the admin and signs them in.
 * @param {import('express').Express} app
 * @param {string} adminToken
 * @param {Record<string, unknown>} body
 */
export async function createAndLogin(app, adminToken, body) {
  const password = /** @type {string} */ (body.password ?? 'password123');
  const r = await request(app).post('/api/users').set(auth(adminToken)).send({ password, ...body });
  if (r.status !== 201) throw new Error(`create failed: ${r.status} ${JSON.stringify(r.body)}`);
  const s = await login(app, /** @type {string} */ (body.email), password);
  return { user: r.body.user, token: s.token };
}
