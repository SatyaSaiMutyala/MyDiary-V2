import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let admin;
let adminToken = '';
let employee;
beforeAll(async () => {
  ctx = await startTestApp();
  const s = await login(ctx.app);
  admin = s.user;
  adminToken = s.token;
  employee = await createAndLogin(ctx.app, adminToken, {
    name: 'Ravi Kumar', email: 'ravi.kumar@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital',
  });
});
afterAll(() => ctx.stop());

describe('permissions', () => {
  it('users endpoints are admin only', async () => {
    const r = await request(ctx.app).get('/api/users').set(auth(employee.token));
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe('Only admins can do this.');
    expect((await request(ctx.app).post('/api/users').set(auth(employee.token)).send({})).status).toBe(403);
    expect((await request(ctx.app).get('/api/users')).status).toBe(401);
  });
});

describe('POST /api/users', () => {
  it('creates with role defaults for modules and the default password', async () => {
    const r = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({
      name: 'Dr. Anusha Singh', email: 'Dr.Anusha.Singh@trustlab.co.in', role: 'manager', title: 'Lab Head', department: 'Operations',
    });
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: 'dr.anusha.singh@trustlab.co.in', role: 'manager', status: 'active', title: 'Lab Head' });
    expect(r.body.user.modules).toContain('departments');
    expect(r.body.user.modules).not.toContain('settings');
    // default password = SEED_PASSWORD
    await login(ctx.app, 'dr.anusha.singh@trustlab.co.in', 'mydiary123');
  });

  it('refuses duplicates, bad emails, unknown roles and unknown modules', async () => {
    const dup = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({ name: 'X', email: 'ravi.kumar@trustlab.co.in', role: 'employee' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe('An account with the email ravi.kumar@trustlab.co.in already exists.');

    const bad = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({ name: 'X', email: 'not-an-email', role: 'employee' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Enter a valid email.');

    const role = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({ name: 'X', email: 'x@trustlab.co.in', role: 'boss' });
    expect(role.status).toBe(400);
    expect(role.body.error.message).toBe('Role must be admin, manager or employee.');

    const mod = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({ name: 'X', email: 'x@trustlab.co.in', role: 'employee', modules: ['diary', 'rockets'] });
    expect(mod.status).toBe(400);
    expect(mod.body.error.message).toBe('Unknown module: rockets.');
  });

  it('admins always get every module', async () => {
    const r = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({
      name: 'Pallavi Elisetti', email: 'pallavi.elisetti@trustlab.co.in', role: 'admin', modules: ['diary'],
    });
    expect(r.status).toBe(201);
    expect(r.body.user.modules).toContain('settings');
    expect(r.body.user.modules).toContain('integrations');
  });
});

describe('GET /api/users', () => {
  it('paginates and searches case-insensitively', async () => {
    const all = await request(ctx.app).get('/api/users').set(auth(adminToken));
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ page: 1, limit: 25 });
    expect(all.body.total).toBeGreaterThanOrEqual(4);
    expect(all.body.items.length).toBe(all.body.total);

    const s = await request(ctx.app).get('/api/users?search=RAVI').set(auth(adminToken));
    expect(s.body.total).toBe(1);
    expect(s.body.items[0].name).toBe('Ravi Kumar');

    const byTitle = await request(ctx.app).get('/api/users?search=lab head').set(auth(adminToken));
    expect(byTitle.body.total).toBe(1);

    const paged = await request(ctx.app).get('/api/users?page=2&limit=2').set(auth(adminToken));
    expect(paged.body.items.length).toBe(2);
    expect(paged.body.page).toBe(2);
  });

  it('filters by role, department and status; rejects bad params', async () => {
    const mgrs = await request(ctx.app).get('/api/users?role=manager').set(auth(adminToken));
    expect(mgrs.body.items.every((u) => u.role === 'manager')).toBe(true);
    expect(mgrs.body.total).toBe(1);

    const dept = await request(ctx.app).get('/api/users?department=IT%20%26%20Digital').set(auth(adminToken));
    expect(dept.body.total).toBe(1);

    const act = await request(ctx.app).get('/api/users?status=inactive').set(auth(adminToken));
    expect(act.body.total).toBe(0);

    const bad = await request(ctx.app).get('/api/users?limit=999').set(auth(adminToken));
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('limit must be a whole number from 1 to 200.');
    const badRole = await request(ctx.app).get('/api/users?role=king').set(auth(adminToken));
    expect(badRole.status).toBe(400);
  });
});

describe('GET/PATCH/DELETE /api/users/:id', () => {
  it('reads one user and 404s cleanly', async () => {
    const r = await request(ctx.app).get(`/api/users/${employee.user.id}`).set(auth(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.user.email).toBe('ravi.kumar@trustlab.co.in');
    const missing = await request(ctx.app).get('/api/users/not-an-id').set(auth(adminToken));
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBe('That user does not exist.');
  });

  it('updates fields and validates modules against the list', async () => {
    const r = await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ title: 'Senior Developer', modules: ['dashboard', 'diary', 'settings'] });
    expect(r.status).toBe(200);
    expect(r.body.user.title).toBe('Senior Developer');
    // 'settings' is admin-only, so it is dropped for an employee.
    expect(r.body.user.modules).toEqual(['dashboard', 'diary']);

    const bad = await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ modules: ['nope'] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Unknown module: nope.');

    const unknownField = await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ password: 'x' });
    expect(unknownField.status).toBe(400);
  });

  it('promotion to admin grants all modules; role change resets to defaults', async () => {
    const up = await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ role: 'manager' });
    expect(up.body.user.modules).toContain('departments');
    const adm = await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ role: 'admin' });
    expect(adm.body.user.modules).toContain('settings');
    await request(ctx.app).patch(`/api/users/${employee.user.id}`).set(auth(adminToken)).send({ role: 'employee' }).expect(200);
  });

  it('cannot deactivate, demote or delete yourself', async () => {
    const deact = await request(ctx.app).patch(`/api/users/${admin.id}`).set(auth(adminToken)).send({ status: 'inactive' });
    expect(deact.status).toBe(400);
    expect(deact.body.error.message).toBe('You cannot deactivate your own account.');
    const demote = await request(ctx.app).patch(`/api/users/${admin.id}`).set(auth(adminToken)).send({ role: 'employee' });
    expect(demote.status).toBe(400);
    const del = await request(ctx.app).delete(`/api/users/${admin.id}`).set(auth(adminToken));
    expect(del.status).toBe(400);
    expect(del.body.error.message).toBe('You cannot delete your own account.');
  });

  it('resets a password and deletes a user', async () => {
    const short = await request(ctx.app).post(`/api/users/${employee.user.id}/reset-password`).set(auth(adminToken)).send({ password: '123' });
    expect(short.status).toBe(400);
    const reset = await request(ctx.app).post(`/api/users/${employee.user.id}/reset-password`).set(auth(adminToken)).send({ password: 'resetpass1' });
    expect(reset.status).toBe(200);
    await login(ctx.app, employee.user.email, 'resetpass1');

    const del = await request(ctx.app).delete(`/api/users/${employee.user.id}`).set(auth(adminToken));
    expect(del.status).toBe(200);
    expect((await request(ctx.app).get(`/api/users/${employee.user.id}`).set(auth(adminToken))).status).toBe(404);
    expect((await request(ctx.app).get('/api/auth/me').set(auth(employee.token))).status).toBe(401);
  });
});

describe('GET /api/users/directory', () => {
  it('lets anybody signed in see who there is, without exposing anything private', async () => {
    const staff = await createAndLogin(ctx.app, adminToken, {
      name: 'Deepa Rao', email: 'deepa.dir@trustlab.co.in', role: 'employee',
      department: 'Commercial', title: 'Sales Lead', modules: ['todo'],
    });

    // The admin-only list stays admin-only.
    expect((await request(ctx.app).get('/api/users').set(auth(staff.token))).status).toBe(403);

    // The directory does not.
    const r = await request(ctx.app).get('/api/users/directory').set(auth(staff.token));
    expect(r.status).toBe(200);
    const her = r.body.items.find((u) => u.name === 'Deepa Rao');
    expect(her).toMatchObject({ name: 'Deepa Rao', department: 'Commercial', title: 'Sales Lead' });
    // Names, not credentials: no email, role, modules or status comes back.
    expect(Object.keys(her).sort()).toEqual(['department', 'id', 'name', 'position', 'title']);
  });

  it('leaves out people who can no longer sign in', async () => {
    const made = await request(ctx.app).post('/api/users').set(auth(adminToken)).send({
      name: 'Gone Person', email: 'gone.dir@trustlab.co.in', password: 'password123', role: 'employee', status: 'inactive',
    });
    expect(made.status).toBe(201);
    const r = await request(ctx.app).get('/api/users/directory').set(auth(adminToken));
    expect(r.body.items.some((u) => u.name === 'Gone Person')).toBe(false);
  });
});

