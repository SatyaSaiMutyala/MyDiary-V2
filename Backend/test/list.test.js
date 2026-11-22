/** The shared list contract (utils/listQuery.js) as applied to /api/users and /api/audit, plus GET /api/search. */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let adminToken = '';
let admin;
let empToken = '';
beforeAll(async () => {
  ctx = await startTestApp();
  const s = await login(ctx.app);
  admin = s.user;
  adminToken = s.token;
  const people = [
    { name: 'Dr. Anusha Singh', email: 'dr.anusha.singh@trustlab.co.in', role: 'manager', title: 'Lab Head', department: 'Operations' },
    { name: 'Pavan', email: 'pavan@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital' },
    { name: 'Satya', email: 'satya@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital', status: 'inactive' },
    { name: 'R. Krishnan', email: 'r.krishnan@trustlab.co.in', role: 'manager', title: 'CGO', department: 'Commercial' },
  ];
  for (const p of people) await request(ctx.app).post('/api/users').set(auth(adminToken)).send(p).expect(201);
  empToken = (await login(ctx.app, 'pavan@trustlab.co.in', 'mydiary123')).token;
});
afterAll(() => ctx.stop());

const users = (qs = '', token = adminToken) => request(ctx.app).get(`/api/users${qs}`).set(auth(token));
const audit = (qs = '', token = adminToken) => request(ctx.app).get(`/api/audit${qs}`).set(auth(token));

describe('response shape & pagination meta', () => {
  it('returns items, page, limit, total, pages, hasMore and applied', async () => {
    const r = await users();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ page: 1, limit: 25, total: 5, pages: 1, hasMore: false, applied: { search: null, filters: {}, sort: 'name', range: null } });
    expect(r.body.items.map((u) => u.name)).toEqual(['Dr. Anusha Singh', 'Pavan', 'R. Krishnan', 'Satya', 'Venkata Cherukuri']);

    const p1 = await users('?limit=2');
    expect(p1.body).toMatchObject({ page: 1, limit: 2, total: 5, pages: 3, hasMore: true });
    const p3 = await users('?limit=2&page=3');
    expect(p3.body).toMatchObject({ page: 3, pages: 3, hasMore: false });
    expect(p3.body.items.length).toBe(1);
    const p9 = await users('?limit=2&page=9');
    expect(p9.body.items).toEqual([]);
    expect(p9.body.hasMore).toBe(false);
  });
});

describe('search=', () => {
  it('is a global case-insensitive match across the search fields', async () => {
    expect((await users('?search=DEVELOPER')).body.items.map((u) => u.name)).toEqual(['Pavan', 'Satya']);
    expect((await users('?search=it %26 dig')).body.total).toBe(2); // department
    expect((await users('?search=krishnan@')).body.items[0].name).toBe('R. Krishnan'); // email
    expect((await users('?search=dr. anusha')).body.total).toBe(1); // regex-escaped dot
    expect((await users('?search=anusha')).body.applied.search).toBe('anusha');
    expect((await users('?search=zzz-nobody')).body.total).toBe(0);
  });

  it('works the same on the activity log', async () => {
    const r = await audit('?search=krishnan');
    expect(r.body.total).toBeGreaterThan(0);
    expect(r.body.items.every((e) => /krishnan/i.test(`${e.entity} ${e.details} ${e.module} ${e.user.name} ${e.entityId}`))).toBe(true);
    const byUser = await audit('?search=venkata');
    expect(byUser.body.total).toBe((await audit()).body.total - 1); // everything except Pavan's own sign-in
  });
});

describe('filters', () => {
  it('single value, comma multi-value (→ $in) and repeated params', async () => {
    expect((await users('?role=manager')).body.items.map((u) => u.name)).toEqual(['Dr. Anusha Singh', 'R. Krishnan']);
    const multi = await users('?role=admin,manager');
    expect(multi.body.items.map((u) => u.role).sort()).toEqual(['admin', 'manager', 'manager']);
    expect(multi.body.applied.filters).toEqual({ role: ['admin', 'manager'] });
    const repeated = await users('?status=inactive&status=active&role=employee');
    expect(repeated.body.total).toBe(2);
    expect((await users('?status=inactive')).body.items.map((u) => u.name)).toEqual(['Satya']);
    expect((await users('?department=IT%20%26%20Digital&status=active')).body.items.map((u) => u.name)).toEqual(['Pavan']);
  });

  it('audit: action, module, user (id or name), entityId', async () => {
    const creates = await audit('?action=create&module=Settings%20%C2%B7%20Users');
    expect(creates.body.total).toBe(4);
    expect(creates.body.items.every((e) => e.action === 'create')).toBe(true);
    const byId = await audit(`?user=${admin.id}&action=auth,create`);
    expect(byId.body.items.every((e) => e.user.id === admin.id && ['auth', 'create'].includes(e.action))).toBe(true);
    expect(byId.body.total).toBeGreaterThan(4);
    const byName = await audit('?user=Venkata%20Cherukuri,Nobody%20Else');
    expect(byName.body.total).toBe((await audit(`?user=${admin.id}`)).body.total);
    expect(byName.body.total).toBe((await audit()).body.total - 1); // Pavan's sign-in is the only other entry
    const pavanId = (await users('?search=pavan')).body.items[0].id;
    const forPavan = await audit(`?entityId=${pavanId}`);
    expect(forPavan.body.total).toBe(1);
    expect(forPavan.body.items[0].entity).toBe('Pavan');
  });

  it('rejects unknown enum values with the allowed list', async () => {
    const r = await users('?role=king');
    expect(r.status).toBe(400);
    expect(r.body.error).toMatchObject({ code: 'validation', message: 'role must be one of: admin, manager, employee.' });
    const a = await audit('?action=explode');
    expect(a.status).toBe(400);
    expect(a.body.error.message).toBe('action must be one of: create, update, delete, auth, export.');
  });
});

describe('date ranges', () => {
  it('from/to are inclusive dates on the default date field; <field>_from/_to work too', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = (await audit()).body.total;
    const r = await audit(`?from=${today}&to=${today}`);
    expect(r.body.total).toBe(all);
    expect(r.body.applied.range).toMatchObject({ field: 'at', from: `${today}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` });
    expect((await audit('?from=2999-01-01')).body.total).toBe(0);
    expect((await audit('?to=2000-01-01')).body.total).toBe(0);
    expect((await audit('?at_from=2000-01-01&at_to=2999-12-31')).body.total).toBe(all);
    expect((await users(`?from=${today}`)).body.total).toBe(5); // createdAt
    expect((await users('?dateField=updatedAt&to=2000-01-01')).body.total).toBe(0);

    const bad = await audit('?from=yesterday');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('from must be a date like 2026-11-22 or an ISO date-time.');
    const crossed = await audit('?from=2026-02-01&to=2026-01-01');
    expect(crossed.status).toBe(400);
    expect(crossed.body.error.message).toBe('from must be before to.');
  });
});

describe('sort=', () => {
  it('field, -field and comma-separated multi-sort; unknown fields → 400', async () => {
    expect((await users('?sort=-name')).body.items[0].name).toBe('Venkata Cherukuri');
    const multi = await users('?sort=role,-name');
    expect(multi.body.items.map((u) => `${u.role}:${u.name}`)).toEqual([
      'admin:Venkata Cherukuri', 'employee:Satya', 'employee:Pavan', 'manager:R. Krishnan', 'manager:Dr. Anusha Singh',
    ]);
    expect(multi.body.applied.sort).toBe('role,-name');
    const oldest = await audit('?sort=at&limit=1');
    expect(oldest.body.items[0]).toMatchObject({ action: 'auth', entity: 'Sign in' });
    const bad = await users('?sort=passwordHash');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/^sort must be one of: name, email, title, department, role, status, createdAt, updatedAt/);
  });
});

describe('fields= and invalid params', () => {
  it('projects the serialized item (id always kept) and refuses unknown fields', async () => {
    const r = await users('?fields=name,role&limit=1');
    expect(Object.keys(r.body.items[0]).sort()).toEqual(['id', 'name', 'role']);
    const bad = await users('?fields=passwordHash');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/^fields can only include: /);
  });

  it('unknown query params → 400 naming the param', async () => {
    const r = await users('?colour=blue');
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/^Unknown query parameter: colour\. Allowed: /);
    expect(r.body.error.details).toEqual([{ field: 'colour', message: 'Unknown query parameter.' }]);
    const two = await audit('?a=1&b=2');
    expect(two.body.error.message).toMatch(/^Unknown query parameters: a, b\./);
    const page = await users('?page=0');
    expect(page.status).toBe(400);
    expect(page.body.error.message).toBe('page must be a whole number of 1 or more.');
    const limit = await users('?limit=201');
    expect(limit.body.error.message).toBe('limit must be a whole number from 1 to 200.');
  });

  it('the CSV export honours the same filters and records them', async () => {
    const r = await request(ctx.app).get('/api/audit/export.csv?action=create&search=pavan&limit=1&page=3').set(auth(adminToken));
    expect(r.status).toBe(200);
    const lines = r.text.trim().split('\r\n');
    expect(lines.length).toBe(2); // header + Pavan's create
    expect(lines[1]).toContain('"Pavan"');
    const logged = await audit('?action=export');
    expect(logged.body.items[0].details).toBe('1 rows (filters: search=pavan, action=create)');
  });
});

describe('GET /api/search', () => {
  it('searches every registered group the user may use', async () => {
    const r = await request(ctx.app).get('/api/search?q=anusha').set(auth(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.q).toBe('anusha');
    expect(r.body.groups.map((g) => g.key)).toEqual(['users', 'audit']);
    const usersGroup = r.body.groups[0];
    expect(usersGroup.label).toBe('Users');
    expect(usersGroup.items[0]).toMatchObject({ title: 'Dr. Anusha Singh', subtitle: 'Lab Head · Operations · dr.anusha.singh@trustlab.co.in' });
    expect(usersGroup.items[0].route).toMatch(/^\/settings\?tab=users&user=[0-9a-f]{24}$/);
    const auditGroup = r.body.groups[1];
    expect(auditGroup.items.length).toBeGreaterThan(0);
    expect(auditGroup.items[0]).toMatchObject({ title: 'Dr. Anusha Singh' });
    expect(Object.keys(auditGroup.items[0]).sort()).toEqual(['id', 'route', 'subtitle', 'title']);

    const limited = await request(ctx.app).get('/api/search?q=a&limit=1').set(auth(adminToken));
    expect(limited.body.groups.every((g) => g.items.length <= 1)).toBe(true);
  });

  it('employees only see groups they may use; q is required; unknown params → 400', async () => {
    const r = await request(ctx.app).get('/api/search?q=anusha').set(auth(empToken));
    expect(r.status).toBe(200);
    expect(r.body.groups).toEqual([]);
    const empty = await request(ctx.app).get('/api/search?q=').set(auth(adminToken));
    expect(empty.status).toBe(400);
    expect(empty.body.error.message).toBe('Enter something to search for.');
    expect((await request(ctx.app).get('/api/search?q=x&foo=1').set(auth(adminToken))).status).toBe(400);
    expect((await request(ctx.app).get('/api/search?q=x')).status).toBe(401);
  });
});
