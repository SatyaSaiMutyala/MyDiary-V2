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

describe('the laboratory flag on the session user', () => {
  it('says whether this person works somewhere that runs a readiness board', async () => {
    // Nobody has a board yet, so nobody is a laboratory person.
    // The flag is about the person's own department, not their power: an admin whose department
    // runs no board is not a laboratory person, however much else they can see.
    const before = await request(ctx.app).get('/api/auth/me').set(auth(adminToken));
    expect(before.body.user.lab).toBe(false);
    expect(before.body.user.seesAll).toBe(true);

    // Give a department a board, and put somebody in it.
    const dept = await request(ctx.app).post('/api/departments').set(auth(adminToken)).send({ code: 'TDPL-LAB-X', name: 'Pathology Lab' });
    const id = dept.body.department.id;
    await request(ctx.app).post(`/api/departments/${id}/lab-readiness/restore`).set(auth(adminToken));
    await request(ctx.app).put(`/api/departments/${id}/lab-readiness`).set(auth(adminToken)).send({ enabled: true });

    const staff = await createAndLogin(ctx.app, adminToken, {
      name: 'Meera Joshi', email: 'meera.lab@trustlab.co.in', role: 'employee', department: 'Pathology Lab',
    });

    // It rides on the sign-in answer too, so the phone can lay out its tabs straight away.
    expect(staff.user.lab ?? (await login(ctx.app, 'meera.lab@trustlab.co.in', 'password123')).user.lab).toBe(true);
    const mine = await request(ctx.app).get('/api/auth/me').set(auth(staff.token));
    expect(mine.body.user.lab).toBe(true);
    expect(mine.body.user.seesAll).toBe(false);
  });
});

describe('choosing your own unit', () => {
  it('lets a laboratory person set it once, and refuses one that is not theirs', async () => {
    const dept = await request(ctx.app).post('/api/departments').set(auth(adminToken)).send({ code: 'TDPL-LAB-U', name: 'Pathology Unit Lab' });
    const id = dept.body.department.id;
    await request(ctx.app).post(`/api/departments/${id}/lab-readiness/restore`).set(auth(adminToken));
    await request(ctx.app).put(`/api/departments/${id}/lab-readiness`).set(auth(adminToken)).send({ enabled: true });
    const units = (await request(ctx.app).get(`/api/departments/${id}`).set(auth(adminToken))).body.department.labReadiness.units;
    const mine = units[1].key;

    const staff = await createAndLogin(ctx.app, adminToken, {
      name: 'Latha Menon', email: 'latha.unit@trustlab.co.in', role: 'employee',
      department: 'Pathology Unit Lab', modules: ['labReadiness', 'activity'],
    });
    expect(staff.user.labUnit).toBe('');

    // They set it themselves — no admin involved.
    const saved = await request(ctx.app).patch('/api/auth/me').set(auth(staff.token)).send({ labUnit: mine });
    expect(saved.status).toBe(200);
    expect(saved.body.user.labUnit).toBe(mine);

    // And it is what the board reads back for them.
    const board = await request(ctx.app).get('/api/lab-readiness/mine').set(auth(staff.token));
    expect(board.body.unit.key).toBe(mine);

    // A unit that is not their department's is refused rather than quietly stored.
    const wrong = await request(ctx.app).patch('/api/auth/me').set(auth(staff.token)).send({ labUnit: 'nrl-nowhere' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.message).toContain('not a unit of your department');
    expect((await request(ctx.app).get('/api/auth/me').set(auth(staff.token))).body.user.labUnit).toBe(mine);
  });
});

