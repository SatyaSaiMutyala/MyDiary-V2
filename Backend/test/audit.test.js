import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let admin;
let adminToken = '';
beforeAll(async () => {
  ctx = await startTestApp();
  const s = await login(ctx.app);
  admin = s.user;
  adminToken = s.token;
});
afterAll(() => ctx.stop());

/** @param {string} qs */
const list = (qs = '') => request(ctx.app).get(`/api/audit${qs}`).set(auth(adminToken));

describe('automatic audit entries', () => {
  it('login writes an auth entry and the log is admin only', async () => {
    const r = await list();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ page: 1, limit: 25 });
    const signIn = r.body.items.find((e) => e.action === 'auth' && e.entity === 'Sign in');
    expect(signIn).toBeTruthy();
    expect(signIn.user).toEqual({ id: admin.id, name: 'Venkata Cherukuri' });
    expect(signIn.module).toBe('Session');
    expect(typeof signIn.at).toBe('string');

    const emp = await createAndLogin(ctx.app, adminToken, { name: 'Audit Emp', email: 'audit.emp@trustlab.co.in', role: 'employee' });
    expect((await request(ctx.app).get('/api/audit').set(auth(emp.token))).status).toBe(403);
  });

  it('a user create, update, reset and delete are recorded with details', async () => {
    const created = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({
      name: 'Priya Nair', email: 'priya.nair@trustlab.co.in', role: 'employee', department: 'Operations',
    });
    expect(created.status).toBe(201);
    const id = created.body.user.id;

    await request(ctx.app).patch(`/api/users/${id}`).set(auth(adminToken)).send({ role: 'manager', title: 'Lab Head' }).expect(200);
    // No-op PATCH writes nothing.
    await request(ctx.app).patch(`/api/users/${id}`).set(auth(adminToken)).send({ title: 'Lab Head' }).expect(200);
    await request(ctx.app).post(`/api/users/${id}/reset-password`).set(auth(adminToken)).send({ password: 'resetpass1' }).expect(200);
    await request(ctx.app).delete(`/api/users/${id}`).set(auth(adminToken)).expect(200);

    const r = await list(`?user=${admin.id}&module=${encodeURIComponent('Settings · Users')}`);
    const forPriya = r.body.items.filter((e) => e.entityId === id);
    expect(forPriya.map((e) => e.action)).toEqual(['delete', 'update', 'update', 'create']); // newest first
    const update = forPriya.find((e) => e.action === 'update' && e.details.includes('role'));
    expect(update.entity).toBe('Priya Nair');
    expect(update.details).toContain('role: employee → manager');
    expect(update.details).toContain('title: — → Lab Head');
    expect(update.details).toContain('modules:');
    // The trail says what the reset did to them, not just that it happened: an admin-chosen
    // password puts the person behind the "set your password" gate until they replace it.
    const reset = forPriya.find((e) => e.details.startsWith('Password reset by admin'));
    expect(reset).toBeTruthy();
    expect(reset.details).toContain('must set their own');
    expect(forPriya[0].details).toBe('Deleted manager account priya.nair@trustlab.co.in');
    expect(forPriya.every((e) => e.user.name === 'Venkata Cherukuri')).toBe(true);
  });

  it('failed requests write nothing', async () => {
    const before = (await list()).body.total;
    await request(ctx.app).post('/api/users').set(auth(adminToken)).send({ name: 'X', email: 'bad', role: 'employee' }).expect(400);
    await request(ctx.app).post('/api/auth/login').send({ email: 'ghost@trustlab.co.in', password: 'whatever1' }).expect(401);
    expect((await list()).body.total).toBe(before);
  });
});

describe('GET /api/audit filters', () => {
  it('search, action, module, user, from/to and paging', async () => {
    const byAction = await list('?action=create');
    expect(byAction.body.items.every((e) => e.action === 'create')).toBe(true);
    expect(byAction.body.total).toBeGreaterThan(0);

    const search = await list('?search=priya');
    expect(search.body.total).toBeGreaterThan(0);
    expect(search.body.items.every((e) => /priya/i.test(`${e.entity} ${e.details}`))).toBe(true);

    const byName = await list(`?user=${encodeURIComponent('Venkata Cherukuri')}&action=auth`);
    expect(byName.body.total).toBeGreaterThan(0);

    const today = new Date().toISOString().slice(0, 10);
    const inRange = await list(`?from=${today}&to=${today}`);
    expect(inRange.body.total).toBe((await list()).body.total);
    const future = await list('?from=2999-01-01');
    expect(future.body.total).toBe(0);

    const paged = await list('?limit=2&page=2');
    expect(paged.body.items.length).toBe(2);
    expect(paged.body.limit).toBe(2);
    const t0 = new Date(paged.body.items[0].at).getTime();
    const t1 = new Date(paged.body.items[1].at).getTime();
    expect(t0).toBeGreaterThanOrEqual(t1);

    const badAction = await list('?action=explode');
    expect(badAction.status).toBe(400);
    const badDate = await list('?from=yesterday');
    expect(badDate.status).toBe(400);
    expect(badDate.body.error.message).toBe('from must be a date like 2026-11-22 or an ISO date-time.');
  });
});

describe('GET /api/audit/export.csv', () => {
  it('downloads a CSV with the same filters and logs an export entry', async () => {
    const r = await request(ctx.app).get('/api/audit/export.csv?action=auth').set(auth(adminToken));
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.headers['content-disposition']).toMatch(/attachment; filename="mydiary-activity-log-\d{4}-\d{2}-\d{2}\.csv"/);
    const text = r.text;
    expect(text.startsWith('﻿"Time","User","Action","Module","Item","Item ID","Details","IP"\r\n')).toBe(true);
    const lines = text.trim().split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((l) => l.includes('"auth"'))).toBe(true);

    const exported = await list('?action=export');
    expect(exported.body.total).toBe(1);
    expect(exported.body.items[0]).toMatchObject({ module: 'Settings · Activity Log', entity: 'CSV export' });
    expect(exported.body.items[0].details).toMatch(/^\d+ rows \(filters: action=auth\)$/);
  });
});
