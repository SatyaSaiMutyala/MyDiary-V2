/** Module 2 — meeting requests (incl. the CMD → EA routing rule), decisions and notifications. */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';      // Venkata Cherukuri — the CMD / admin
let fayazToken = ''; // an ordinary manager
let eaToken = '';    // Pallavi Elisetti — the EA

const post = (p, b, t = token) => request(ctx.app).post(p).set(auth(t)).send(b);
const get = (p, t = token) => request(ctx.app).get(p).set(auth(t));
const patch = (p, b, t = token) => request(ctx.app).patch(p).set(auth(t)).send(b);

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  fayazToken = (await createAndLogin(ctx.app, token, { name: 'Mohammed Fayazuddin', email: 'mohammed.fayazuddin@trustlab.co.in', role: 'manager', title: 'Quality Manager', department: 'Quality' })).token;
  eaToken = (await createAndLogin(ctx.app, token, { name: 'Pallavi Elisetti', email: 'pallavi.elisetti@trustlab.co.in', role: 'admin', title: 'EA to CMD', department: 'CMD Office' })).token;
});
afterAll(() => ctx.stop());

const body = (over = {}) => ({ to: 'Venkata Cherukuri', proposedDate: '2026-11-26', proposedTime: '15:00', durationMin: 30, topic: 'Mol Bio validation records', notes: 'Twenty minutes before the mock audit.', ...over });

describe('meeting requests', () => {
  it('routes a request for the CMD through the EA', async () => {
    const r = await post('/api/meeting-requests', body(), fayazToken);
    expect(r.status).toBe(201);
    expect(r.body.request).toMatchObject({ from: 'Mohammed Fayazuddin', to: 'Venkata Cherukuri', onBehalfOf: 'Venkata Cherukuri', routedTo: 'Pallavi Elisetti', status: 'pending' });
  });

  it('does not route when the CMD or the EA asks', async () => {
    expect((await post('/api/meeting-requests', body({ to: 'Mohammed Fayazuddin' }))).body.request.routedTo).toBe(null);
    expect((await post('/api/meeting-requests', body(), eaToken)).body.request.routedTo).toBe(null);
  });

  it('separates the inbox from what I sent', async () => {
    const inbox = await get('/api/meeting-requests?box=inbox', eaToken);
    expect(inbox.body.items.every((x) => (x.routedTo || x.to) === 'Pallavi Elisetti')).toBe(true);
    const sent = await get('/api/meeting-requests?box=sent', fayazToken);
    expect(sent.body.items.every((x) => x.from === 'Mohammed Fayazuddin')).toBe(true);
    expect(sent.body.total).toBeGreaterThan(0);
  });

  it('searches and filters like every other list', async () => {
    expect((await get('/api/meeting-requests?search=Mol Bio')).body.total).toBeGreaterThan(0);
    expect((await get('/api/meeting-requests?status=pending')).body.total).toBeGreaterThan(0);
    expect((await get('/api/meeting-requests?from=2026-11-01&to=2026-11-30')).body.total).toBeGreaterThan(0);
    expect((await get('/api/meeting-requests?colour=red')).status).toBe(400);
  });

  it('accepting creates the meeting and links it', async () => {
    const req = (await post('/api/meeting-requests', body({ topic: 'Budget sign-off' }), fayazToken)).body.request;
    const r = await post(`/api/meeting-requests/${req.id}/accept`, { note: 'See you then.' });
    expect(r.status).toBe(200);
    expect(r.body.request).toMatchObject({ status: 'accepted', responseNote: 'See you then.' });
    expect(r.body.meeting).toMatchObject({ title: 'Budget sign-off', date: '2026-11-26', time: '15:00', status: 'upcoming' });
    expect(r.body.request.meetingId).toBe(r.body.meeting.id);
    expect(r.body.meeting.attendees).toEqual(expect.arrayContaining(['Mohammed Fayazuddin', 'Venkata Cherukuri']));
    // A decided request cannot be decided twice.
    expect((await post(`/api/meeting-requests/${req.id}/decline`, { note: 'Changed my mind' })).status).toBe(409);
  });

  it('declining records the reason', async () => {
    const req = (await post('/api/meeting-requests', body({ topic: 'Coffee catch-up' }), fayazToken)).body.request;
    const r = await post(`/api/meeting-requests/${req.id}/decline`, { note: 'Travelling that week.' });
    expect(r.body.request).toMatchObject({ status: 'declined', responseNote: 'Travelling that week.' });
  });

  it('countering swaps the two people and goes back to pending', async () => {
    const req = (await post('/api/meeting-requests', body({ topic: 'EQAS review' }), fayazToken)).body.request;
    const r = await post(`/api/meeting-requests/${req.id}/counter`, { proposedDate: '2026-11-27', proposedTime: '11:30', note: 'Can we move it?' });
    expect(r.body.request).toMatchObject({ status: 'pending', from: 'Venkata Cherukuri', to: 'Mohammed Fayazuddin', proposedDate: '2026-11-27', proposedTime: '11:30', routedTo: null, onBehalfOf: null });
  });
});

describe('decisions registry', () => {
  let meetingId = '';
  beforeEach(async () => {
    for (const d of (await get('/api/decisions?limit=200')).body.items) await request(ctx.app).delete(`/api/decisions/${d.id}`).set(auth(token));
    meetingId = (await post('/api/meetings', { type: 'board', title: 'BM-2026-11 Board Meeting', date: '2026-11-28', time: '11:00', chair: 'Independent Director' })).body.meeting.id;
  });

  it('logs a decision against an agenda item with the chair as the default decider', async () => {
    const r = await post(`/api/meetings/${meetingId}/decisions`, { agendaIdx: 1, text: 'Approved the 60-40 cost split.', department: 'Commercial', tags: ['approved', 'financial'] });
    expect(r.status).toBe(201);
    expect(r.body.decision).toMatchObject({ meetingId, agendaIdx: 1, decidedBy: 'Independent Director', department: 'Commercial', tags: ['approved', 'financial'] });
    const plain = await post(`/api/meetings/${meetingId}/decisions`, { text: 'Noted the auditor report.' });
    expect(plain.body.decision).toMatchObject({ tags: ['approved'], department: 'General', agendaIdx: 0 });
  });

  it('lists with search, tag filter and meeting filter', async () => {
    await post(`/api/meetings/${meetingId}/decisions`, { text: 'Approved the 60-40 cost split.', department: 'Commercial', tags: ['approved', 'financial'] });
    expect((await get('/api/decisions?search=60-40')).body.total).toBe(1);
    expect((await get('/api/decisions?tag=financial')).body.total).toBe(1);
    expect((await get('/api/decisions?tag=governance')).body.total).toBe(0);
    expect((await get(`/api/decisions?meetingId=${meetingId}`)).body.total).toBeGreaterThan(0);
    expect((await get('/api/decisions?department=Commercial')).body.total).toBe(1);
  });
});

describe('notifications', () => {
  it('tells the recipient about a request and can be marked read', async () => {
    await post('/api/meeting-requests', body({ topic: 'Notify me please' }), fayazToken);
    const mine = await get('/api/notifications', eaToken);
    expect(mine.status).toBe(200);
    expect(mine.body.total).toBeGreaterThan(0);
    expect(mine.body.unreadTotal).toBeGreaterThan(0);
    expect(mine.body.items[0].text).toMatch(/Notify me please|meeting request/i);

    const one = mine.body.items[0];
    expect((await patch(`/api/notifications/${one.id}/read`, {}, eaToken)).body.notification.unread).toBe(false);
    const after = await post('/api/notifications/read-all', {}, eaToken);
    expect(after.status).toBe(200);
    expect((await get('/api/notifications?unread=true', eaToken)).body.total).toBe(0);
  });

  it('only ever shows my own', async () => {
    const mine = await get('/api/notifications', fayazToken);
    expect(mine.body.items.every((n) => !n.user || n.user === 'Mohammed Fayazuddin')).toBe(true);
  });
});
