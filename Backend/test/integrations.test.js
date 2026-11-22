/** Integrations — the register of which third-party tools are switched on (admin-only module). */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = ''; // Venkata Cherukuri — admin
let empToken = ''; // an employee: no integrations module
// What a brand-new database looks like, read BEFORE this suite loads its fixture.
let emptyRegister = -1;

const get = (p, t = token) => request(ctx.app).get(p).set(auth(t));
const post = (p, b, t = token) => request(ctx.app).post(p).set(auth(t)).send(b);
const patch = (p, b, t = token) => request(ctx.app).patch(p).set(auth(t)).send(b);
const del = (p, t = token) => request(ctx.app).delete(p).set(auth(t));

/** @param {string} name */
const byName = async (name) => (await get(`/api/integrations?search=${encodeURIComponent(name)}`)).body.items.find((i) => i.name === name);

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  empToken = (await createAndLogin(ctx.app, token, { name: 'Pavan', email: 'pavan@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital' })).token;

  // A fresh database has an empty register: the 15 default tools are demo data and nothing writes them.
  emptyRegister = (await get('/api/integrations?limit=200')).body.total;

  // The list-contract tests below need rows to page and filter, so this suite loads the default set
  // explicitly as its fixture. In the running app nothing calls this.
  const { ensureDefaultIntegrations } = await import('../src/services/integrations.js');
  await ensureDefaultIntegrations();
});
afterAll(() => ctx.stop());

describe('the starting register', () => {
  it('is EMPTY on a fresh database — no integration is ever created automatically', () => {
    expect(emptyRegister).toBe(0);
  });

  it('carries the full card text for every tool once the set is loaded', async () => {
    const r = await get('/api/integrations?limit=200');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(15);
    expect(r.body.items[0]).toMatchObject({ name: 'Google Calendar', ico: '📅', category: 'calendar', status: 'connected', connected: true, order: 1 });
    expect(r.body.items.map((i) => i.name)).toContain('Claude AI (Summary)');
    // Every row carries the card's text, so the page needs nothing else.
    expect(r.body.items.every((i) => i.desc && i.lastSync && i.settings.syncFrequency)).toBe(true);
  });

  it('stays idempotent — asking a second time adds nothing', async () => {
    const { ensureDefaultIntegrations } = await import('../src/services/integrations.js');
    expect(await ensureDefaultIntegrations()).toBe(0);
    expect((await get('/api/integrations?limit=200')).body.total).toBe(15);
  });
});

describe('the shared list contract', () => {
  it('returns the standard envelope and pages', async () => {
    const r = await get('/api/integrations?limit=10');
    expect(r.body).toMatchObject({ page: 1, limit: 10, total: 15, pages: 2, hasMore: true, applied: { search: null, filters: {}, sort: 'order', range: null } });
    expect(r.body.items.length).toBe(10);
    const p2 = await get('/api/integrations?limit=10&page=2');
    expect(p2.body).toMatchObject({ page: 2, pages: 2, hasMore: false });
    expect(p2.body.items.length).toBe(5);
  });

  it('searches across the name and the description', async () => {
    expect((await get('/api/integrations?search=zoom')).body.total).toBe(1);
    const transcription = await get('/api/integrations?search=transcription');
    expect(transcription.body.total).toBeGreaterThan(1);
    expect(transcription.body.applied.search).toBe('transcription');
    expect((await get('/api/integrations?search=nothing-like-this')).body.total).toBe(0);
  });

  it('filters by category, including a comma list', async () => {
    expect((await get('/api/integrations?category=video')).body.total).toBe(3);
    const both = await get('/api/integrations?category=video,calendar');
    expect(both.body.total).toBe(5);
    expect(both.body.applied.filters.category).toEqual(['video', 'calendar']);
    expect(both.body.items.every((i) => ['video', 'calendar'].includes(i.category))).toBe(true);
  });

  it('filters by connected state, by status and by sync frequency', async () => {
    const on = await get('/api/integrations?connected=true');
    expect(on.body.total).toBe(11);
    expect(on.body.items.every((i) => i.connected && i.status === 'connected')).toBe(true);
    const off = await get('/api/integrations?connected=false');
    expect(off.body.total).toBe(4); // 2 pending + 2 disconnected
    expect(off.body.items.every((i) => i.status !== 'connected')).toBe(true);
    expect((await get('/api/integrations?status=pending')).body.total).toBe(2);
    expect((await get('/api/integrations?status=pending,disconnected')).body.total).toBe(4);
    expect((await get('/api/integrations?syncFrequency=hourly')).body.total).toBe(15);
  });

  it('sorts, projects fields and takes a date range', async () => {
    const byName2 = await get('/api/integrations?sort=name&limit=1');
    expect(byName2.body.items[0].name).toBe('CMD Approval Hub');
    expect((await get('/api/integrations?sort=-name&limit=1')).body.items[0].name).toBe('Zoom');
    const projected = await get('/api/integrations?fields=name,status&limit=1');
    expect(Object.keys(projected.body.items[0]).sort()).toEqual(['id', 'name', 'status']);
    const range = await get('/api/integrations?from=2020-01-01&limit=200');
    expect(range.body.total).toBe(15);
    expect(range.body.applied.range.field).toBe('createdAt');
  });

  it('refuses anything it does not understand, in plain language', async () => {
    const unknown = await get('/api/integrations?colour=red');
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.message).toMatch(/Unknown query parameter: colour/);
    expect((await get('/api/integrations?category=banana')).status).toBe(400);
    expect((await get('/api/integrations?category=banana')).body.error.message).toBe('category must be one of: calendar, video, chat, crm, finance, tasks, ai, storage.');
    expect((await get('/api/integrations?connected=maybe')).body.error.message).toBe('connected must be true or false.');
    expect((await get('/api/integrations?sort=secret')).status).toBe(400);
    expect((await get('/api/integrations?limit=0')).status).toBe(400);
    expect((await get('/api/integrations?from=yesterday')).status).toBe(400);
  });
});

describe('switching a tool on and off', () => {
  it('connects, survives a re-read, and disconnects again', async () => {
    const before = await byName('WhatsApp Business');
    expect(before).toMatchObject({ status: 'disconnected', connected: false, lastSync: 'Not connected', connectedAt: null });

    const on = await post(`/api/integrations/${before.id}/connect`, { note: 'Approved by the CMD.' });
    expect(on.status).toBe(200);
    expect(on.body.integration).toMatchObject({ status: 'connected', connected: true, lastSync: 'Just now' });
    expect(on.body.integration.changedBy.name).toBe('Venkata Cherukuri');
    expect(on.body.integration.connectedAt).toBeTruthy();

    // A fresh read of the record and of the list both show the saved state.
    expect((await get(`/api/integrations/${before.id}`)).body.integration).toMatchObject({ status: 'connected', lastSync: 'Just now', settings: { notes: 'Approved by the CMD.' } });
    expect((await byName('WhatsApp Business')).status).toBe('connected');
    expect((await get('/api/integrations?connected=true')).body.total).toBe(12);

    // Switching it on twice is refused with a sentence a person can read.
    const again = await post(`/api/integrations/${before.id}/connect`, {});
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe('WhatsApp Business is already switched on.');

    const off = await post(`/api/integrations/${before.id}/disconnect`, {});
    expect(off.body.integration).toMatchObject({ status: 'disconnected', connected: false, lastSync: 'Not connected' });
    expect((await byName('WhatsApp Business')).status).toBe('disconnected');
    expect((await get('/api/integrations?connected=true')).body.total).toBe(11);
  });

  it('resumes a mid-setup tool and can put one back into setup', async () => {
    const meet = await byName('Google Meet');
    expect(meet.status).toBe('pending');
    expect((await post(`/api/integrations/${meet.id}/connect`, {})).body.integration.status).toBe('connected');
    expect((await post(`/api/integrations/${meet.id}/pending`, {})).body.integration).toMatchObject({ status: 'pending', lastSync: 'Setup in progress' });
  });

  it('records the change in the Activity Log', async () => {
    const slack = await byName('Slack / Teams Chat');
    await post(`/api/integrations/${slack.id}/connect`, {});
    const log = await get('/api/audit?module=Integrations&limit=5&sort=-at');
    expect(log.body.total).toBeGreaterThan(0);
    expect(log.body.items[0]).toMatchObject({ action: 'create', module: 'Integrations', entity: 'Slack / Teams Chat', user: { name: 'Venkata Cherukuri' } });
    expect(log.body.items[0].details).toBe('Switched on Slack / Teams Chat (disconnected → connected)');
    await post(`/api/integrations/${slack.id}/disconnect`, {});
  });

  it('404s on an id that is not there', async () => {
    expect((await get('/api/integrations/not-an-id')).status).toBe(404);
    const r = await post('/api/integrations/000000000000000000000000/connect', {});
    expect(r.status).toBe(404);
    expect(r.body.error.message).toBe('That integration does not exist.');
  });
});

describe('settings and the register itself', () => {
  it('stores scope, sync frequency and notes', async () => {
    const zoom = await byName('Zoom');
    const r = await patch(`/api/integrations/${zoom.id}/settings`, { scope: 'Meetings only', syncFrequency: 'daily', notes: 'Recording bot off for board meetings.' });
    expect(r.status).toBe(200);
    expect(r.body.integration.settings).toEqual({ scope: 'Meetings only', syncFrequency: 'daily', notes: 'Recording bot off for board meetings.' });
    expect((await get(`/api/integrations/${zoom.id}`)).body.integration.settings.syncFrequency).toBe('daily');
    expect((await get('/api/integrations?syncFrequency=daily')).body.total).toBe(1);

    const bad = await patch(`/api/integrations/${zoom.id}/settings`, { syncFrequency: 'whenever' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Sync frequency must be one of: realtime, 15min, hourly, daily, manual.');
    expect((await patch(`/api/integrations/${zoom.id}/settings`, { colour: 'red' })).status).toBe(400);
  });

  it('adds, edits and removes a row', async () => {
    const created = await post('/api/integrations', { name: 'Trust GateBook', ico: '🛡', desc: 'Visitor register hand-off.', category: 'tasks' });
    expect(created.status).toBe(201);
    expect(created.body.integration).toMatchObject({ name: 'Trust GateBook', status: 'disconnected', order: 16 });
    expect((await post('/api/integrations', { name: 'Trust GateBook' })).status).toBe(409);
    expect((await post('/api/integrations', { name: '' })).status).toBe(400);

    const id = created.body.integration.id;
    expect((await patch(`/api/integrations/${id}`, { desc: 'Visitor register hand-off (gate pass).' })).body.integration.desc).toBe('Visitor register hand-off (gate pass).');
    expect((await patch(`/api/integrations/${id}`, {})).status).toBe(400);

    expect((await del(`/api/integrations/${id}`)).body).toEqual({ ok: true });
    expect((await get(`/api/integrations/${id}`)).status).toBe(404);
    expect((await get('/api/integrations?limit=200')).body.total).toBe(15);
  });
});

describe('who may use it', () => {
  it('refuses someone without the integrations module and anyone not signed in', async () => {
    const r = await get('/api/integrations', empToken);
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe('You do not have access to this module. Ask an admin to enable it for you.');
    const zoom = await byName('Zoom');
    expect((await post(`/api/integrations/${zoom.id}/connect`, {}, empToken)).status).toBe(403);
    expect((await patch(`/api/integrations/${zoom.id}/settings`, { scope: 'All' }, empToken)).status).toBe(403);
    expect((await request(ctx.app).get('/api/integrations')).status).toBe(401);
  });
});
