import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let adminToken = '';
beforeAll(async () => {
  ctx = await startTestApp();
  adminToken = (await login(ctx.app)).token;
});
afterAll(() => ctx.stop());

describe('POST /api/auth/login', () => {
  it('returns a token and the session user shape', async () => {
    const r = await request(ctx.app).post('/api/auth/login').send(ADMIN);
    expect(r.status).toBe(200);
    expect(typeof r.body.token).toBe('string');
    expect(r.body.user).toMatchObject({
      name: 'Venkata Cherukuri',
      email: ADMIN.email,
      role: 'admin',
      status: 'active',
    });
    expect(Object.keys(r.body.user)).toEqual(expect.arrayContaining(['id', 'name', 'email', 'role', 'title', 'department', 'modules', 'status']));
    expect(r.body.user.modules).toContain('settings');
    expect(r.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password with a clear message', async () => {
    const r = await request(ctx.app).post('/api/auth/login').send({ email: ADMIN.email, password: 'nope-nope' });
    expect(r.status).toBe(401);
    expect(r.body.error).toEqual({ message: 'Email or password is incorrect.', code: 'unauthorized' });
  });

  it('rejects an unknown email the same way', async () => {
    const r = await request(ctx.app).post('/api/auth/login').send({ email: 'ghost@trustlab.co.in', password: 'whatever1' });
    expect(r.status).toBe(401);
    expect(r.body.error.message).toBe('Email or password is incorrect.');
  });

  it('validates the body', async () => {
    const r = await request(ctx.app).post('/api/auth/login').send({ email: '' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation');
    expect(r.body.error.message).toBe('Enter your email.');
    expect(r.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });

  it('refuses inactive accounts and invalidates their existing tokens', async () => {
    const { user, token } = await createAndLogin(ctx.app, adminToken, {
      name: 'Inactive Person', email: 'inactive@trustlab.co.in', role: 'employee', password: 'password123',
    });
    await request(ctx.app).patch(`/api/users/${user.id}`).set(auth(adminToken)).send({ status: 'inactive' }).expect(200);
    const r = await request(ctx.app).post('/api/auth/login').send({ email: user.email, password: 'password123' });
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe('Your account is inactive. Ask an admin to reactivate it.');
    const me = await request(ctx.app).get('/api/auth/me').set(auth(token));
    expect(me.status).toBe(401);
  });
});

describe('/api/auth/me', () => {
  it('needs a bearer token', async () => {
    const r = await request(ctx.app).get('/api/auth/me');
    expect(r.status).toBe(401);
    expect(r.body.error.message).toBe('Please sign in.');
    const bad = await request(ctx.app).get('/api/auth/me').set(auth('garbage'));
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Your session has expired. Please sign in again.');
  });

  it('returns and updates the signed-in user', async () => {
    const me = await request(ctx.app).get('/api/auth/me').set(auth(adminToken));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(ADMIN.email);

    const upd = await request(ctx.app).patch('/api/auth/me').set(auth(adminToken)).send({ title: 'CMD · Super Admin' });
    expect(upd.status).toBe(200);
    expect(upd.body.user.title).toBe('CMD · Super Admin');

    const strict = await request(ctx.app).patch('/api/auth/me').set(auth(adminToken)).send({ role: 'employee' });
    expect(strict.status).toBe(400);
  });
});

describe('POST /api/auth/change-password', () => {
  it('checks the current password and the new one', async () => {
    const { token, user } = await createAndLogin(ctx.app, adminToken, {
      name: 'Pwd Person', email: 'pwd@trustlab.co.in', role: 'employee', password: 'password123',
    });
    const short = await request(ctx.app).post('/api/auth/change-password').set(auth(token)).send({ current: 'password123', next: 'short' });
    expect(short.status).toBe(400);
    expect(short.body.error.message).toBe('Password must be at least 8 characters.');

    const wrong = await request(ctx.app).post('/api/auth/change-password').set(auth(token)).send({ current: 'wrong-one', next: 'newpassword1' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toEqual({ message: 'Your current password is incorrect.', code: 'validation', details: { current: 'Your current password is incorrect.' } });

    const ok = await request(ctx.app).post('/api/auth/change-password').set(auth(token)).send({ current: 'password123', next: 'newpassword1' });
    expect(ok.status).toBe(200);
    await login(ctx.app, user.email, 'newpassword1');
    const old = await request(ctx.app).post('/api/auth/login').send({ email: user.email, password: 'password123' });
    expect(old.status).toBe(401);
  });
});

describe('requireModule', () => {
  it('lets admins through, refuses unticked modules, honours granted ones', async () => {
    const { requireAuth, requireModule } = await import('../src/middleware/auth.js');
    const { errorHandler } = await import('../src/middleware/errors.js');
    const mini = express();
    mini.get('/departments', requireAuth, requireModule('departments'), (_req, res) => res.json({ ok: true }));
    mini.get('/diary', requireAuth, requireModule('diary'), (_req, res) => res.json({ ok: true }));
    mini.use(errorHandler);

    const emp = await createAndLogin(ctx.app, adminToken, { name: 'Emp Mod', email: 'empmod@trustlab.co.in', role: 'employee' });
    const mgr = await createAndLogin(ctx.app, adminToken, { name: 'Mgr Mod', email: 'mgrmod@trustlab.co.in', role: 'manager' });

    expect((await request(mini).get('/departments').set(auth(adminToken))).status).toBe(200);
    expect((await request(mini).get('/departments').set(auth(mgr.token))).status).toBe(200);
    const denied = await request(mini).get('/departments').set(auth(emp.token));
    expect(denied.status).toBe(403);
    expect(denied.body.error.message).toBe('You do not have access to this module. Ask an admin to enable it for you.');
    expect((await request(mini).get('/diary').set(auth(emp.token))).status).toBe(200);

    // Admin unticks diary for the employee → refused.
    await request(ctx.app).patch(`/api/users/${emp.user.id}`).set(auth(adminToken)).send({ modules: ['dashboard', 'todo'] }).expect(200);
    expect((await request(mini).get('/diary').set(auth(emp.token))).status).toBe(403);
  });
});
