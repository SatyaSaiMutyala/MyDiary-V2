/** Templates — the Agenda Templates Library: the list contract, the CRUD cycle, seeding and module access. */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = ''; // Venkata Cherukuri — the admin
let outsiderToken = ''; // an employee without the templates module

const get = (p, t = token) => request(ctx.app).get(p).set(auth(t));
const post = (p, b, t = token) => request(ctx.app).post(p).set(auth(t)).send(b);
const patch = (p, b, t = token) => request(ctx.app).patch(p).set(auth(t)).send(b);
const del = (p, t = token) => request(ctx.app).delete(p).set(auth(t));

const body = (over = {}) => ({
  name: 'Lab Readiness Review',
  type: 'internal',
  ico: '🧪',
  desc: 'Pre-accreditation readiness walkthrough — equipment, competency, documents.',
  agenda: [
    { text: 'Equipment calibration status', time: '15m' },
    { text: 'Analyst competency records', time: '10m' },
    { text: 'Document control gaps', time: '20m' },
  ],
  ...over,
});

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  outsiderToken = (
    await createAndLogin(ctx.app, token, {
      name: 'Srikanth Rao',
      email: 'srikanth.rao@trustlab.co.in',
      role: 'employee',
      title: 'Lab Technician',
      department: 'Biochemistry',
      modules: ['dashboard', 'meetings'],
    })
  ).token;
});
afterAll(() => ctx.stop());

describe('templates list', () => {
  it('starts with the 12 library templates, oldest first', async () => {
    const r = await get('/api/templates?limit=200');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(12);
    expect(r.body.items).toHaveLength(12);
    expect(r.body.items[0]).toMatchObject({ name: 'Weekly Ops Review', type: 'internal', ico: '📊', agendaCount: 6, usedCount: 142 });
    expect(r.body.items[0].agenda[0]).toEqual({ text: 'Opening & context setting', time: '5m' });
    expect(r.body.items.at(-1)).toMatchObject({ name: '1:1 Catch-up', agendaCount: 4 });
    // Every seeded card's agendaCount matches the agenda it carries.
    expect(r.body.items.every((t) => t.agendaCount === t.agenda.length)).toBe(true);
    expect(r.body.applied).toMatchObject({ search: null, sort: 'createdAt' });
  });

  it('pages', async () => {
    const p1 = await get('/api/templates?limit=5');
    expect(p1.body).toMatchObject({ page: 1, limit: 5, total: 12, pages: 3, hasMore: true });
    expect(p1.body.items).toHaveLength(5);
    const p3 = await get('/api/templates?limit=5&page=3');
    expect(p3.body).toMatchObject({ page: 3, hasMore: false });
    expect(p3.body.items).toHaveLength(2);
    expect(p3.body.items[0].id).not.toBe(p1.body.items[0].id);
  });

  it('searches names, descriptions and agenda items', async () => {
    expect((await get('/api/templates?search=AGM')).body.total).toBe(1);
    expect((await get('/api/templates?search=vendor')).body.total).toBe(2);
    expect((await get('/api/templates?search=dividend')).body.total).toBe(1); // only in the AGM agenda
    expect((await get('/api/templates?search=nothing-like-this')).body.total).toBe(0);
  });

  it('filters by meeting type, one or several', async () => {
    const internal = await get('/api/templates?type=internal');
    expect(internal.body.total).toBe(3);
    expect(internal.body.items.every((t) => t.type === 'internal')).toBe(true);
    expect(internal.body.applied.filters).toMatchObject({ type: 'internal' });
    expect((await get('/api/templates?type=board')).body.total).toBe(3);
    expect((await get('/api/templates?type=customer,supplier')).body.total).toBe(5);
    expect((await get('/api/templates?type=consultants')).body.total).toBe(1);
  });

  it('sorts, projects fields and ranges on numbers', async () => {
    expect((await get('/api/templates?sort=-usedCount&limit=1')).body.items[0].name).toBe('Weekly Ops Review');
    expect((await get('/api/templates?sort=name&limit=1')).body.items[0].name).toBe('1:1 Catch-up');
    expect(Object.keys((await get('/api/templates?fields=name,type&limit=1')).body.items[0]).sort()).toEqual(['id', 'name', 'type']);
    expect((await get('/api/templates?min_agendaCount=7')).body.total).toBe(2); // QBR (7) and AGM (8)
    expect((await get('/api/templates?from=2020-01-01')).body.total).toBe(12);
  });

  it('refuses a parameter it does not know, naming it', async () => {
    const r = await get('/api/templates?colour=red');
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Unknown query parameter: colour/);
    expect(r.body.error.code).toBe('validation');
    const badType = await get('/api/templates?type=wedding');
    expect(badType.status).toBe(400);
    expect(badType.body.error.message).toBe('type must be one of: internal, customer, supplier, consultants, board, other.');
    expect((await get('/api/templates?sort=ico')).status).toBe(400);
    expect((await get('/api/templates?limit=0')).status).toBe(400);
  });
});

describe('templates create / read / update / remove', () => {
  it('runs the whole cycle and records it in the Activity Log', async () => {
    const created = await post('/api/templates', body());
    expect(created.status).toBe(201);
    expect(created.body.template).toMatchObject({ name: 'Lab Readiness Review', type: 'internal', ico: '🧪', agendaCount: 3, usedCount: 0 });
    expect(created.body.template.createdBy.name).toBe('Venkata Cherukuri');
    const id = created.body.template.id;

    const read = await get(`/api/templates/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.template.agenda).toEqual(body().agenda);

    const changed = await patch(`/api/templates/${id}`, { name: 'Lab Readiness Review (NABL)', agenda: [{ text: 'Scope & readiness', time: '30m' }] });
    expect(changed.status).toBe(200);
    expect(changed.body.template).toMatchObject({ name: 'Lab Readiness Review (NABL)', agendaCount: 1 });
    expect(changed.body.template.agenda).toEqual([{ text: 'Scope & readiness', time: '30m' }]);

    // It shows up in the library, and the mutations are in the audit trail.
    expect((await get('/api/templates?search=NABL')).body.total).toBe(1);
    const audit = await get('/api/audit?module=Templates&limit=10');
    expect(audit.body.total).toBeGreaterThanOrEqual(2);
    expect(audit.body.items.map((a) => a.action)).toEqual(expect.arrayContaining(['create', 'update']));

    expect((await del(`/api/templates/${id}`)).body).toEqual({ ok: true });
    expect((await get(`/api/templates/${id}`)).status).toBe(404);
    expect((await get(`/api/templates/${id}`)).body.error.message).toBe('That template does not exist.');
    expect((await get('/api/templates?limit=200')).body.total).toBe(12);
  });

  it('copies a template, agenda and all', async () => {
    const source = (await get('/api/templates?search=Quarterly')).body.items[0];
    const copy = await post(`/api/templates/${source.id}/duplicate`, {});
    expect(copy.status).toBe(201);
    expect(copy.body.template).toMatchObject({ name: 'Quarterly Business Review (copy)', type: 'customer', agendaCount: 7, usedCount: 0 });
    expect(copy.body.template.agenda).toEqual(source.agenda);
    expect(copy.body.template.id).not.toBe(source.id);
    await del(`/api/templates/${copy.body.template.id}`);
  });

  it('says in plain words what is wrong with a bad body', async () => {
    expect((await post('/api/templates', { type: 'internal' })).body.error.message).toBe('Enter a name for this template.');
    expect((await post('/api/templates', body({ name: '' }))).body.error.message).toBe('Enter a name for this template.');
    expect((await post('/api/templates', body({ type: 'wedding' }))).body.error.message).toBe('Choose the meeting type this template is for: internal, customer, supplier, consultants, board, other.');
    expect((await post('/api/templates', body({ agenda: [{ text: '' }] }))).body.error.message).toBe('Every agenda item needs some text.');
    expect((await post('/api/templates', body({ colour: 'red' }))).status).toBe(400);
    expect((await patch(`/api/templates/${(await get('/api/templates?limit=1')).body.items[0].id}`, {})).body.error.message).toBe('Nothing to change — send at least one field.');
    expect((await patch('/api/templates/not-an-id', { name: 'x' })).status).toBe(404);
    expect((await get('/api/templates?limit=200')).body.total).toBe(12);
  });
});

describe('templates access', () => {
  it('refuses someone without the templates module', async () => {
    const r = await get('/api/templates', outsiderToken);
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe('You do not have access to this module. Ask an admin to enable it for you.');
    expect((await post('/api/templates', body(), outsiderToken)).status).toBe(403);
  });

  it('refuses a request with no token at all', async () => {
    expect((await request(ctx.app).get('/api/templates')).status).toBe(401);
  });
});

describe('templates seeding', () => {
  it('fills an empty library again, and never doubles it up', async () => {
    for (const t of (await get('/api/templates?limit=200')).body.items) await del(`/api/templates/${t.id}`);

    // The next request through the router notices the empty library and puts the 12 back.
    const back = await get('/api/templates?limit=200');
    expect(back.body.total).toBe(12);
    expect(back.body.items.map((t) => t.name)).toContain('Weekly Ops Review');
    expect(back.body.items[0].agenda).toHaveLength(6);

    // Running the seed again on a full library inserts nothing.
    const { ensureTemplateSeed } = await import('../src/services/templates.js');
    expect(await ensureTemplateSeed()).toBe(0);
    expect((await get('/api/templates?limit=200')).body.total).toBe(12);
  });
});
