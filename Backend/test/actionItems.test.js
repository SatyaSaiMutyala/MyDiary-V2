/** Module 2 — action items: the To-Do source of truth (own collection, queried across meetings). */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

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

describe('a task allocated from My To-Do, with no meeting behind it', () => {
  it('gives it to you when you name nobody', async () => {
    const r = await post('/api/action-items', { desc: 'Chase the courier contract', deadline: '2026-12-01' });
    expect(r.status).toBe(201);
    expect(r.body.action).toMatchObject({
      owner: 'Venkata Cherukuri', // the signed-in person
      source: 'standalone',
      meetingId: null,
      meetingTitle: '',
      status: 'open',
      priority: 'medium',
    });

    // And it is in their own inbox, which is the whole point.
    const mine = await get('/api/action-items?mine=true&limit=200');
    expect(mine.body.items.some((a) => a.desc === 'Chase the courier contract')).toBe(true);
  });

  it('gives it to somebody else when you name them, and tells them', async () => {
    const staff = await createAndLogin(ctx.app, token, {
      name: 'Arjun Mehta', email: 'arjun.todo@trustlab.co.in', role: 'employee', modules: ['todo', 'meetings'],
    });

    const r = await post('/api/action-items', { desc: 'Send the revised pricing deck', owner: 'Arjun Mehta', deadline: '2026-12-02', priority: 'high' });
    expect(r.status).toBe(201);
    expect(r.body.action).toMatchObject({ owner: 'Arjun Mehta', ownerShort: 'AM', priority: 'high', source: 'standalone' });

    // It reaches them: it is in their inbox, not only in the sender's list.
    const theirs = await request(ctx.app).get('/api/action-items?mine=true&limit=200').set(auth(staff.token));
    expect(theirs.body.items.some((a) => a.desc === 'Send the revised pricing deck')).toBe(true);

    // And they were told, on screen and on their phone.
    const bell = await request(ctx.app).get('/api/notifications').set(auth(staff.token));
    expect(bell.body.items.some((n) => n.text.includes('allocated you') && n.text.includes('Send the revised pricing deck'))).toBe(true);
  });

  it('does not notify you about a task you wrote for yourself', async () => {
    const before = (await get('/api/notifications')).body.items.length;
    await post('/api/action-items', { desc: 'Read the NABL circular', deadline: '2026-12-03' });
    const after = (await get('/api/notifications')).body.items.length;
    expect(after).toBe(before);
  });

  it('defaults the deadline to a week out, and still insists on a description', async () => {
    const r = await post('/api/action-items', { desc: 'Book the auditor' });
    expect(r.status).toBe(201);
    expect(r.body.action.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const empty = await post('/api/action-items', { desc: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.message).toContain('Enter what has to be done.');
  });

  it('keeps meeting actions working exactly as before', async () => {
    const a = await addAction();
    expect(a).toMatchObject({ source: 'meeting', meetingTitle: 'Adani AHC — Pricing' });
    expect(a.meetingId).toBe(meetingId);
  });
});

describe('the two To-Do lists, narrowed on the server', () => {
  it('separates what you owe from what you handed out', async () => {
    const staff = await createAndLogin(ctx.app, token, {
      name: 'Nisha Rao', email: 'nisha.todo@trustlab.co.in', role: 'employee', modules: ['todo', 'meetings'],
    });

    await post('/api/action-items', { desc: 'MINE — I kept this', deadline: '2026-12-20' });
    await post('/api/action-items', { desc: 'HERS — I gave her this', owner: 'Nisha Rao', deadline: '2026-12-21' });

    const owed = await get('/api/action-items?mine=true&limit=200');
    expect(owed.body.items.some((a) => a.desc === 'MINE — I kept this')).toBe(true);
    expect(owed.body.items.some((a) => a.desc === 'HERS — I gave her this')).toBe(false);

    const handed = await get('/api/action-items?delegated=true&limit=200');
    expect(handed.body.items.some((a) => a.desc === 'HERS — I gave her this')).toBe(true);
    // A task you wrote for yourself is not "delegated" — it is simply yours.
    expect(handed.body.items.some((a) => a.desc === 'MINE — I kept this')).toBe(false);

    // And hers is hers: she sees it owed, and has delegated nothing.
    const hers = await request(ctx.app).get('/api/action-items?mine=true&limit=200').set(auth(staff.token));
    expect(hers.body.items.some((a) => a.desc === 'HERS — I gave her this')).toBe(true);
    const herDelegated = await request(ctx.app).get('/api/action-items?delegated=true&limit=200').set(auth(staff.token));
    expect(herDelegated.body.items.every((a) => a.desc !== 'HERS — I gave her this')).toBe(true);
  });

  it('counts everything it holds, so a capped page can say what it is hiding', async () => {
    await createAndLogin(ctx.app, token, { name: 'Vikram Shah', email: 'vikram.todo@trustlab.co.in', role: 'employee', modules: ['todo'] });
    for (const n of [1, 2, 3]) {
      await post('/api/action-items', { desc: `Handed over ${n}`, owner: 'Vikram Shah', deadline: `2026-12-0${n}` });
    }

    // The screen can ask for at most 200 rows. The total it reports has to be the real one, or a
    // person with more than that is never told there is more to see.
    const r = await get('/api/action-items?delegated=true&limit=1');
    expect(r.body.items).toHaveLength(1);
    expect(r.body.total).toBe(3);
  });

  it('pages, so nothing is stranded beyond the first screenful', async () => {
    await createAndLogin(ctx.app, token, { name: 'Imran Shaikh', email: 'imran.todo@trustlab.co.in', role: 'employee', modules: ['todo'] });
    for (const n of [1, 2, 3]) {
      await post('/api/action-items', { desc: `Paged ${n}`, owner: 'Imran Shaikh', deadline: `2026-12-0${n}` });
    }

    const one = await get('/api/action-items?delegated=true&limit=2&page=1&sort=deadline');
    const two = await get('/api/action-items?delegated=true&limit=2&page=2&sort=deadline');
    expect(one.body.items).toHaveLength(2);
    expect(two.body.items).toHaveLength(1); // the third, which the first page could not hold
    expect(one.body.items.map((a) => a.id)).not.toContain(two.body.items[0].id);
  });

  it('refuses a flag it does not understand', async () => {
    expect((await get('/api/action-items?delegated=maybe')).status).toBe(400);
  });
});


/**
 * Telling the person who set a task that it moved.
 *
 * "Blocker raised — expect a reply" is a promise the screen makes on the server's behalf. Until this
 * was sent it was not kept: a blocked task sat on the owner's board and the one person who could
 * clear it heard nothing. Nobody is told about their own change.
 */
describe('status changes reach whoever set the task', () => {
  let kavya;
  const inbox = async (t) => (await request(ctx.app).get('/api/notifications?limit=20').set(auth(t))).body.items ?? [];

  beforeAll(async () => {
    kavya = await createAndLogin(ctx.app, token, { name: 'Kavya Status', email: 'kavya.status@trustlab.co.in', role: 'employee', title: 'Technologist', department: 'Clinical Laboratory', modules: ['dashboard', 'meetings', 'todo'] });
  });

  /** A task the admin allocates to Kavya. */
  const allocate = async (desc) => (await request(ctx.app).post('/api/action-items').set(auth(token))
    .send({ desc, owner: 'Kavya Status', deadline: '2026-12-20', priority: 'high' })).body.action;

  it('tells the setter when the owner raises a blocker', async () => {
    const a = await allocate('Pull the NABL validation records');
    const before = (await inbox(token)).length;

    const r = await request(ctx.app).patch(`/api/action-items/${a.id}`).set(auth(kavya.token)).send({ status: 'blocked' });
    expect(r.status).toBe(200);

    const mine = await inbox(token);
    expect(mine.length).toBe(before + 1);
    expect(mine[0].text).toContain('blocked');
    expect(mine[0].text).toContain('Pull the NABL validation records');
  });

  it('tells the setter when it is started and when it is finished', async () => {
    const a = await allocate('Collect the W48 branch figures');
    await request(ctx.app).patch(`/api/action-items/${a.id}`).set(auth(kavya.token)).send({ status: 'in-progress' });
    expect((await inbox(token))[0].text).toContain('started on');
    await request(ctx.app).patch(`/api/action-items/${a.id}`).set(auth(kavya.token)).send({ status: 'done' });
    expect((await inbox(token))[0].text).toContain('completed');
  });

  it('says nothing when somebody moves their own task', async () => {
    const own = (await request(ctx.app).post('/api/action-items').set(auth(token))
      .send({ desc: 'Something I set myself', deadline: '2026-12-20' })).body.action;
    const before = (await inbox(token)).length;
    await request(ctx.app).patch(`/api/action-items/${own.id}`).set(auth(token)).send({ status: 'done' });
    expect((await inbox(token)).length).toBe(before);
  });
});
