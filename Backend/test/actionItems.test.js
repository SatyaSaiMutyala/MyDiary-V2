/** Module 2 — action items: the To-Do source of truth (own collection, queried across meetings). */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, login, startTestApp } from './helpers.js';

let ctx;
let token = '';
let meetingId = '';

const post = (p, b) => request(ctx.app).post(p).set(auth(token)).send(b);
const get = (p) => request(ctx.app).get(p).set(auth(token));
const patch = (p, b) => request(ctx.app).patch(p).set(auth(token)).send(b);
const del = (p) => request(ctx.app).delete(p).set(auth(token));
const addAction = async (over = {}) =>
  (await post(`/api/meetings/${meetingId}/action-items`, { desc: 'Send revised pricing deck', owner: 'Arjun', deadline: '2026-11-28', priority: 'high', ...over })).body.action;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  meetingId = (await post('/api/meetings', { type: 'customer', title: 'Adani AHC — Pricing', date: '2026-11-25', time: '14:30', chair: 'Venkata Cherukuri' })).body.meeting.id;
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  for (const a of (await get('/api/action-items?limit=200')).body.items) await del(`/api/action-items/${a.id}`);
});

describe('create, edit, delete', () => {
  it('creates with the shape the web uses and opens a history trail', async () => {
    const a = await addAction();
    expect(a).toMatchObject({ meetingId, meetingTitle: 'Adani AHC — Pricing', desc: 'Send revised pricing deck', owner: 'Arjun', ownerShort: 'AR', ownerType: 'internal', status: 'open', isOverdue: false });
    expect(a.history[0]).toMatchObject({ user: 'Venkata Cherukuri', action: 'created the action' });
    expect(a.subtasks).toEqual([]);
    expect(a.comments).toEqual([]);
  });

  it('records a status change in the history', async () => {
    const a = await addAction();
    const r = await patch(`/api/action-items/${a.id}`, { status: 'in-progress' });
    expect(r.body.action.status).toBe('in-progress');
    expect(r.body.action.history.map((h) => h.action)).toContain('set status → in-progress');
  });

  it('rejects an empty patch and bad values', async () => {
    const a = await addAction();
    expect((await patch(`/api/action-items/${a.id}`, {})).status).toBe(400);
    expect((await patch(`/api/action-items/${a.id}`, { priority: 'urgent' })).status).toBe(400);
    expect((await patch(`/api/action-items/${a.id}`, { status: 'maybe' })).status).toBe(400);
  });

  it('deletes', async () => {
    const a = await addAction();
    expect((await del(`/api/action-items/${a.id}`)).status).toBe(200);
    expect((await get(`/api/action-items/${a.id}`)).status).toBe(404);
  });
});

describe('sub-tasks, comments and dependencies', () => {
  it('adds and ticks sub-tasks, logging both', async () => {
    const a = await addAction();
    const add = await post(`/api/action-items/${a.id}/subtasks`, { text: 'Pull Q3 volumes' });
    expect(add.status).toBe(201);
    expect(add.body.action.subtasks).toEqual([{ text: 'Pull Q3 volumes', done: false }]);
    const tick = await patch(`/api/action-items/${a.id}/subtasks/0`, { done: true });
    expect(tick.body.action.subtasks[0].done).toBe(true);
    expect(tick.body.action.history.map((h) => h.action)).toEqual(expect.arrayContaining(['added sub-task', 'completed sub-task']));
    expect((await patch(`/api/action-items/${a.id}/subtasks/7`, { done: true })).status).toBe(404);
  });

  it('adds a comment stamped with the signed-in person', async () => {
    const a = await addAction();
    const r = await post(`/api/action-items/${a.id}/comments`, { text: 'Deck is with design.' });
    expect(r.status).toBe(201);
    expect(r.body.action.comments[0]).toMatchObject({ user: 'Venkata Cherukuri', ini: 'VC', text: 'Deck is with design.' });
  });

  it('links a dependency but refuses to depend on itself', async () => {
    const a = await addAction();
    const b = await addAction({ desc: 'Blocking item' });
    const r = await post(`/api/action-items/${a.id}/dependencies`, { dependsOn: b.id });
    expect(r.status).toBe(201);
    expect(r.body.action.dependencies[0]).toMatchObject({ id: b.id, desc: 'Blocking item' });
    const self = await post(`/api/action-items/${a.id}/dependencies`, { dependsOn: a.id });
    expect(self.status).toBe(400);
    expect(self.body.error.message).toMatch(/cannot depend on itself/i);
  });
});

describe('list contract across meetings', () => {
  it('searches, filters, ranges and flags overdue', async () => {
    await addAction({ desc: 'Send revised pricing deck', owner: 'Arjun', priority: 'high' });
    await addAction({ desc: 'Book the board room', owner: 'Venkata Cherukuri', priority: 'low', deadline: '2020-01-01' });
    await addAction({ desc: 'Chase Roche contract', owner: 'Head of Procurement', priority: 'medium', status: 'done' });

    expect((await get('/api/action-items?search=deck')).body.total).toBe(1); // matches the description
    expect((await get('/api/action-items?search=procurement')).body.total).toBe(1); // matches the owner
    expect((await get('/api/action-items?search=adani')).body.total).toBe(3); // matches every item's meeting title
    expect((await get('/api/action-items?owner=Arjun')).body.total).toBe(1);
    expect((await get('/api/action-items?priority=high,low')).body.total).toBe(2);
    expect((await get('/api/action-items?mine=true')).body.total).toBe(1);
    expect((await get(`/api/action-items?meetingId=${meetingId}`)).body.total).toBe(3);
    expect((await get('/api/action-items?deadline_from=2019-01-01&deadline_to=2021-01-01')).body.total).toBe(1);

    const over = await get('/api/action-items?overdue=true');
    expect(over.body.total).toBe(1);
    expect(over.body.items[0]).toMatchObject({ desc: 'Book the board room', isOverdue: true });
    expect((await get('/api/action-items?colour=red')).status).toBe(400);
  });

  it('is embedded on its meeting with open/total counts', async () => {
    await addAction();
    await addAction({ desc: 'Second', status: 'done' });
    const m = (await get(`/api/meetings/${meetingId}`)).body.meeting;
    expect(m.actions.length).toBe(2);
    expect(m).toMatchObject({ totalActions: 2, openActions: 1 });
  });
});

describe('extract from minutes', () => {
  it('turns commitment sentences in the decisions into action items', async () => {
    await request(ctx.app).put(`/api/meetings/${meetingId}/minutes`).set(auth(token))
      .send({ minutes: { ag0: { disc: 'Discussed the tiers.', dec: 'CFO to send the weekly AR snapshot by Monday. Marketing will prepare the co-branding deck.' } } });
    const r = await post(`/api/meetings/${meetingId}/action-items/extract`);
    expect(r.status).toBe(201);
    expect(r.body.count).toBeGreaterThan(0);
    expect(r.body.created[0].desc).toMatch(/CFO|Marketing/);
  });

  it('says so plainly when there is nothing to extract', async () => {
    await request(ctx.app).put(`/api/meetings/${meetingId}/minutes`).set(auth(token)).send({ minutes: { ag0: { disc: 'Chat.', dec: 'Noted.' } } });
    const r = await post(`/api/meetings/${meetingId}/action-items/extract`);
    expect(r.body.count).toBe(0);
    expect(r.body.message).toMatch(/No commitment/i);
  });
});
