/** My Discussion Logs — the informal conversation record: logs, their follow-ups and the two groupings. */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';

const post = (p, b) => request(ctx.app).post(p).set(auth(token)).send(b);
const get = (p) => request(ctx.app).get(p).set(auth(token));
const patch = (p, b) => request(ctx.app).patch(p).set(auth(token)).send(b);
const del = (p) => request(ctx.app).delete(p).set(auth(token));

const LOG = {
  date: '2026-11-21',
  time: '10:30',
  duration: '5 min',
  channel: 'phone',
  with: [{ name: 'Arjun', type: 'internal' }],
  topic: 'Fernandez contract follow-up',
  summary: 'Called Arjun to chase the Fernandez escalation. Meeting with their CFO on Thu 26 Nov.',
  decisions: 'Arjun to send me the Fernandez proposal before the meeting.',
  tags: ['sales', 'fernandez'],
  followUps: [{ text: 'Review Fernandez proposal when Arjun sends it', owner: 'Venkata Cherukuri', deadline: '2026-11-25' }],
};

const addLog = async (over = {}) => (await post('/api/logs', { ...LOG, ...over })).body.log;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  for (const l of (await get('/api/logs?mine=true&limit=200')).body.items) await del(`/api/logs/${l.id}`);
});

describe('capture, read, edit and delete a log', () => {
  it('captures one with the shape the web app renders', async () => {
    const r = await post('/api/logs', LOG);
    expect(r.status).toBe(201);
    expect(r.body.log).toMatchObject({
      owner: 'Venkata Cherukuri',
      date: '2026-11-21',
      time: '10:30',
      duration: '5 min',
      channel: 'phone',
      topic: 'Fernandez contract follow-up',
      privacy: 'private',
      openFollowUps: 1,
      totalFollowUps: 1,
    });
    expect(r.body.log.with).toEqual([{ name: 'Arjun', type: 'internal', email: '' }]);
    expect(r.body.log.tags).toEqual(['sales', 'fernandez']);
    expect(r.body.log.followUps[0]).toMatchObject({ text: 'Review Fernandez proposal when Arjun sends it', owner: 'Venkata Cherukuri', deadline: '2026-11-25', done: false, status: 'open' });
    expect(r.body.log.followUps[0].id).toMatch(/^[0-9a-f]{24}$/);
    expect(r.body.log.history[0]).toMatchObject({ user: 'Venkata Cherukuri', action: 'captured the log' });
  });

  it('keeps an external person with their email', async () => {
    const l = await addLog({ with: [{ name: 'Dr. Abishekh (MD, Care & Cure)', type: 'external', email: 'MD@careandcure.in' }] });
    expect(l.with[0]).toEqual({ name: 'Dr. Abishekh (MD, Care & Cure)', type: 'external', email: 'md@careandcure.in' });
  });

  it('asks in plain words for the three things a log needs', async () => {
    const noTopic = await post('/api/logs', { ...LOG, topic: '' });
    expect(noTopic.status).toBe(400);
    expect(noTopic.body.error.message).toBe('Please enter a topic (short title for the log).');
    expect((await post('/api/logs', { ...LOG, with: [] })).body.error.message).toBe('Please add at least one person you spoke with.');
    expect((await post('/api/logs', { ...LOG, summary: '' })).body.error.message).toBe('Please capture what was discussed.');
    expect((await post('/api/logs', { ...LOG, channel: 'pigeon' })).body.error.message).toMatch(/Channel must be one of/);
    expect((await post('/api/logs', { ...LOG, date: '21-11-2026' })).status).toBe(400);
    expect((await post('/api/logs', { ...LOG, colour: 'red' })).status).toBe(400);
  });

  it('reads one back and 404s for anything else', async () => {
    const l = await addLog();
    expect((await get(`/api/logs/${l.id}`)).body.log.id).toBe(l.id);
    expect((await get('/api/logs/not-an-id')).status).toBe(404);
    expect((await get('/api/logs/656565656565656565656565')).status).toBe(404);
  });

  it('edits the fields the modal saves, replacing the follow-up list', async () => {
    const l = await addLog();
    const r = await patch(`/api/logs/${l.id}`, { topic: 'Fernandez — countered', channel: 'whatsapp', tags: ['sales'], followUps: [{ text: 'Send the counter', deadline: '2026-11-26' }] });
    expect(r.status).toBe(200);
    expect(r.body.log).toMatchObject({ topic: 'Fernandez — countered', channel: 'whatsapp', totalFollowUps: 1 });
    expect(r.body.log.tags).toEqual(['sales']);
    expect(r.body.log.followUps[0].text).toBe('Send the counter');
    expect(r.body.log.history.map((h) => h.action)).toContain('edited the log');
    expect((await patch(`/api/logs/${l.id}`, {})).status).toBe(400);
    expect((await patch(`/api/logs/${l.id}`, { privacy: 'everyone' })).status).toBe(400);
  });

  it('deletes', async () => {
    const l = await addLog();
    expect((await del(`/api/logs/${l.id}`)).status).toBe(200);
    expect((await get(`/api/logs/${l.id}`)).status).toBe(404);
  });

  it('writes what happened to the Activity Log', async () => {
    const l = await addLog();
    const entries = (await get('/api/audit?module=Discussion%20Logs&limit=5')).body.items;
    expect(entries[0]).toMatchObject({ action: 'create', module: 'Discussion Logs', entity: l.topic });
    expect(entries[0].details).toMatch(/phone conversation with Arjun on 2026-11-21/);
  });
});

describe('follow-ups of one log', () => {
  it('adds, edits, ticks, flips and removes one', async () => {
    const l = await addLog({ followUps: [] });
    const add = await post(`/api/logs/${l.id}/followups`, { text: 'Task Fayaz to pull the records', owner: 'Mohammed Fayazuddin', deadline: '2026-11-28' });
    expect(add.status).toBe(201);
    expect(add.body.followUp).toMatchObject({ text: 'Task Fayaz to pull the records', owner: 'Mohammed Fayazuddin', done: false, status: 'open' });
    const fuId = add.body.followUp.id;

    const edited = await patch(`/api/logs/${l.id}/followups/${fuId}`, { deadline: '2026-12-01', owner: 'Fayaz' });
    expect(edited.body.followUp).toMatchObject({ deadline: '2026-12-01', owner: 'Fayaz' });

    const ticked = await post(`/api/logs/${l.id}/followups/${fuId}/status`, { done: true });
    expect(ticked.body.followUp).toMatchObject({ done: true, status: 'done', doneBy: 'Venkata Cherukuri' });
    expect(ticked.body.log.openFollowUps).toBe(0);

    const flipped = await post(`/api/logs/${l.id}/followups/${fuId}/toggle`);
    expect(flipped.body.followUp.done).toBe(false);
    expect(flipped.body.log.openFollowUps).toBe(1);

    const gone = await del(`/api/logs/${l.id}/followups/${fuId}`);
    expect(gone.status).toBe(200);
    expect(gone.body.log.totalFollowUps).toBe(0);
    expect(gone.body.log.history.map((h) => h.action).join(' ')).toMatch(/removed follow-up/);
  });

  it('marks a follow-up that is past its deadline overdue', async () => {
    const l = await addLog({ followUps: [{ text: 'Chase the proposal', deadline: '2020-01-01' }] });
    expect(l.followUps[0]).toMatchObject({ status: 'overdue', isOverdue: true });
    expect(l.overdueFollowUps).toBe(1);
  });

  it('refuses a follow-up that does not exist and a bad body', async () => {
    const l = await addLog();
    expect((await patch(`/api/logs/${l.id}/followups/656565656565656565656565`, { text: 'x' })).status).toBe(404);
    expect((await post(`/api/logs/${l.id}/followups/nope/toggle`)).status).toBe(404);
    expect((await post(`/api/logs/${l.id}/followups/${l.followUps[0].id}/status`, {})).status).toBe(400);
    expect((await post(`/api/logs/${l.id}/followups`, { deadline: 'next week' })).status).toBe(400);
  });

  it('tells the follow-up owner about it, with every typed word escaped', async () => {
    const fayaz = await createAndLogin(ctx.app, token, { name: 'Mohammed Fayazuddin', email: 'mohammed.fayazuddin@trustlab.co.in', role: 'employee' });
    await addLog({ topic: '<img src=x onerror=alert(1)>', followUps: [{ text: 'Pull the records', owner: 'Mohammed Fayazuddin', deadline: '2026-11-28' }] });
    const notes = await request(ctx.app).get('/api/notifications').set(auth(fayaz.token));
    expect(notes.body.items[0]).toMatchObject({ type: 'action', icon: '\u26a1' });
    expect(notes.body.items[0].text).toContain('Pull the records');
    expect(notes.body.items[0].text).toContain('due <strong>2026-11-28</strong>');
    expect(notes.body.items[0].text).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(notes.body.items[0].text).not.toContain('<img');
  });

  it('does not notify me about my own follow-up', async () => {
    const before = (await get('/api/notifications')).body.total;
    await addLog({ followUps: [{ text: 'Mine to do', owner: 'Venkata Cherukuri' }] });
    expect((await get('/api/notifications')).body.total).toBe(before);
  });
});

describe('the list contract', () => {
  const seed = async () => {
    await addLog();
    await addLog({ date: '2026-11-21', time: '09:15', channel: 'whatsapp', with: [{ name: 'Dr. Abishekh', type: 'external', email: 'md@careandcure.in' }], topic: 'CME date confirmed', summary: 'Second Sat of December, 60-40 cost split.', decisions: '', tags: ['cme', 'care-and-cure'], followUps: [{ text: 'Schedule the OPD kiosk chat', deadline: '2026-12-05' }] });
    await addLog({ date: '2026-11-20', time: '16:45', channel: 'phone', with: [{ name: 'Mr. Ishaq Ahmed', type: 'external' }], topic: 'QMS urgent — document gap flagged', summary: 'Three gaps in the Molecular Biology SOP section.', decisions: '', tags: ['qms', 'nabl'], followUps: [{ text: 'Pull the validation records', owner: 'Mohammed Fayazuddin', deadline: '2020-01-01' }] });
    await addLog({ date: '2026-11-20', time: '14:00', channel: 'in-person', with: [{ name: 'Pavan', type: 'internal' }, { name: 'Satya', type: 'internal' }], topic: 'Gatebook demo review', summary: 'Visitor check-in flow is clean; QR code per visit suggested.', decisions: '', tags: ['gatebook'], followUps: [] });
    await addLog({ date: '2026-11-17', time: '10:00', channel: 'whatsapp', with: [{ name: 'Priya Menon (Adani HR Lead)', type: 'external' }], topic: 'Adani — pre-meeting prep', summary: 'Per-head pricing, on-site coordinator, 48 hour turnaround.', decisions: '', tags: ['adani', 'sales'], followUps: [{ text: 'Ensure the deck addresses all three', done: true, deadline: '2026-11-24' }] });
  };

  beforeEach(seed);

  it('pages, ordering newest conversation first', async () => {
    const all = await get('/api/logs');
    expect(all.body.total).toBe(5);
    expect(all.body.items.map((l) => l.topic)).toEqual(['Fernandez contract follow-up', 'CME date confirmed', 'QMS urgent — document gap flagged', 'Gatebook demo review', 'Adani — pre-meeting prep']);
    const p2 = await get('/api/logs?limit=2&page=2');
    expect(p2.body).toMatchObject({ page: 2, limit: 2, total: 5, pages: 3, hasMore: true });
    expect(p2.body.items.map((l) => l.topic)).toEqual(['QMS urgent — document gap flagged', 'Gatebook demo review']);
  });

  it('searches the topic, the summary, the people, the tags and the follow-ups', async () => {
    expect((await get('/api/logs?search=fernandez')).body.total).toBe(1);
    expect((await get('/api/logs?search=molecular')).body.total).toBe(1); // the summary
    expect((await get('/api/logs?search=abishekh')).body.total).toBe(1); // a person
    expect((await get('/api/logs?search=careandcure')).body.total).toBe(1); // their email
    expect((await get('/api/logs?search=sales')).body.total).toBe(2); // a tag
    expect((await get('/api/logs?search=fayazuddin')).body.total).toBe(1); // a follow-up owner
    expect((await get('/api/logs?search=')).body.total).toBe(5);
    expect((await get('/api/logs?search=nothing-like-this')).body.total).toBe(0);
  });

  it('filters by channel, person, topic, tag and person type', async () => {
    expect((await get('/api/logs?channel=phone')).body.total).toBe(2);
    expect((await get('/api/logs?channel=phone,whatsapp')).body.total).toBe(4);
    expect((await get('/api/logs?person=Arjun')).body.total).toBe(1);
    expect((await get('/api/logs?person=Pavan,Satya')).body.total).toBe(1);
    expect((await get('/api/logs?person=Priya Menon')).body.total).toBe(1); // the "(Adani HR Lead)" suffix is ignored
    expect((await get('/api/logs?topic=gatebook')).body.total).toBe(1);
    expect((await get('/api/logs?tag=sales')).body.total).toBe(2);
    expect((await get('/api/logs?tag=qms,nabl')).body.total).toBe(1);
    expect((await get('/api/logs?personType=external')).body.total).toBe(3);
    expect((await get('/api/logs?channel=pigeon')).status).toBe(400);
    expect((await get('/api/logs?channel=pigeon')).body.error.message).toMatch(/channel must be one of/i);
  });

  it('filters by follow-up status', async () => {
    expect((await get('/api/logs?followUpStatus=open')).body.total).toBe(3); // the overdue one counts as open
    expect((await get('/api/logs?followUpStatus=overdue')).body.total).toBe(1);
    expect((await get('/api/logs?followUpStatus=done')).body.total).toBe(1);
    expect((await get('/api/logs?followUpStatus=none')).body.total).toBe(1);
    expect((await get('/api/logs?hasFollowUps=false')).body.total).toBe(1);
    expect((await get('/api/logs?hasFollowUps=true')).body.total).toBe(4);
    expect((await get('/api/logs?hasFollowUps=sometimes')).status).toBe(400);
    expect((await get('/api/logs?hasFollowUps=sometimes')).body.error.message).toBe('hasFollowUps must be true or false.');
    const bad = await get('/api/logs?followUpStatus=later');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/followUpStatus must be one of: open, overdue, done, none\./);
  });

  it('takes a date range, a sort, a projection and mine=true', async () => {
    expect((await get('/api/logs?from=2026-11-20&to=2026-11-21')).body.total).toBe(4);
    expect((await get('/api/logs?from=2026-11-21')).body.total).toBe(2);
    expect((await get('/api/logs?to=2026-11-17')).body.total).toBe(1);
    expect((await get('/api/logs?from=2026-11-21&to=2026-11-17')).status).toBe(400);
    expect((await get('/api/logs?sort=date,time')).body.items[0].topic).toBe('Adani — pre-meeting prep');
    expect((await get('/api/logs?sort=mood')).status).toBe(400);
    const projected = await get('/api/logs?fields=topic,channel&limit=1');
    expect(Object.keys(projected.body.items[0]).sort()).toEqual(['channel', 'id', 'topic']);
    expect((await get('/api/logs?fields=secrets')).status).toBe(400);
    const mine = await get('/api/logs?mine=true');
    expect(mine.body.total).toBe(5);
    expect(mine.body.applied.filters.mine).toBe(true);
  });

  it('refuses a parameter it does not know, naming it', async () => {
    const r = await get('/api/logs?colour=red');
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/^Unknown query parameter: colour\. Allowed: /);
  });
});

describe('the groupings the screens need', () => {
  beforeEach(async () => {
    await addLog({ date: '2026-11-21', time: '10:30', with: [{ name: 'Arjun', type: 'internal' }], topic: 'Fernandez contract follow-up', tags: ['sales'], followUps: [] });
    await addLog({ date: '2026-11-19', time: '12:30', with: [{ name: 'Arjun', type: 'internal' }], topic: 'Corridor chat', tags: ['sales'], followUps: [{ text: 'Chase it', deadline: '2020-01-01' }] });
    await addLog({ date: '2026-11-20', time: '09:00', with: [{ name: 'Dr. Abishekh', type: 'external', email: 'md@careandcure.in' }], topic: 'CME date confirmed', tags: ['cme'], followUps: [{ text: 'Book the hall', deadline: '2026-12-05' }, { text: 'Share the brief', done: true }] });
  });

  it('gives one row per person, newest conversation first', async () => {
    const r = await get('/api/logs/people?mine=true');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(2);
    expect(r.body.items.map((p) => p.name)).toEqual(['Arjun', 'Dr. Abishekh']);
    expect(r.body.items[0]).toMatchObject({ name: 'Arjun', type: 'internal', count: 2, lastDate: '2026-11-21', lastTime: '10:30', lastTopic: 'Fernandez contract follow-up', openFollowUps: 1 });
    expect(r.body.items[1]).toMatchObject({ name: 'Dr. Abishekh', type: 'external', email: 'md@careandcure.in', count: 1, lastDate: '2026-11-20', openFollowUps: 1 });
  });

  it('narrows the grouping with the same filters', async () => {
    expect((await get('/api/logs/people?tag=cme')).body.items.map((p) => p.name)).toEqual(['Dr. Abishekh']);
    expect((await get('/api/logs/people?search=corridor')).body.total).toBe(1);
    expect((await get('/api/logs/people?colour=red')).status).toBe(400);
  });

  it('lists the tags in use, most used first', async () => {
    const r = await get('/api/logs/tags?mine=true');
    expect(r.body.items).toEqual([{ tag: 'sales', count: 2 }, { tag: 'cme', count: 1 }]);
  });

  it('lists every follow-up with its log and the three counts', async () => {
    const r = await get('/api/logs/followups?mine=true');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.counts).toEqual({ total: 3, open: 2, overdue: 1, done: 1 });
    const first = r.body.items[0];
    expect(first).toMatchObject({ text: 'Chase it', status: 'overdue', isOverdue: true });
    expect(first.log).toMatchObject({ topic: 'Corridor chat', date: '2026-11-19', channel: 'phone' });
    expect(first.logId).toBe(first.log.id);

    const overdue = await get('/api/logs/followups?status=overdue');
    expect(overdue.body.total).toBe(1);
    expect(overdue.body.items[0].text).toBe('Chase it');
    expect((await get('/api/logs/followups?status=done')).body.items.map((f) => f.text)).toEqual(['Share the brief']);
    expect((await get('/api/logs/followups?status=whenever')).status).toBe(400);
  });
});

describe('who may read and change a log', () => {
  let other;

  beforeAll(async () => {
    other = await createAndLogin(ctx.app, token, { name: 'Ravi Kumar', email: 'ravi.kumar@trustlab.co.in', role: 'employee', title: 'Sales Manager' });
  });

  it('refuses someone without the module', async () => {
    const noModule = await createAndLogin(ctx.app, token, { name: 'Kiran Rao', email: 'kiran.rao@trustlab.co.in', role: 'employee', modules: ['dashboard'] });
    const r = await request(ctx.app).get('/api/logs').set(auth(noModule.token));
    expect(r.status).toBe(403);
    expect(r.body.error.message).toBe('You do not have access to this module. Ask an admin to enable it for you.');
    expect((await request(ctx.app).post('/api/logs').set(auth(noModule.token)).send(LOG)).status).toBe(403);
  });

  it('keeps a private log out of everyone else\'s hands', async () => {
    const mine = await addLog();
    const theirs = request(ctx.app);
    expect((await theirs.get('/api/logs').set(auth(other.token))).body.total).toBe(0);
    expect((await request(ctx.app).get(`/api/logs/${mine.id}`).set(auth(other.token))).status).toBe(404);
    expect((await request(ctx.app).get('/api/logs/people').set(auth(other.token))).body.total).toBe(0);
    expect((await request(ctx.app).delete(`/api/logs/${mine.id}`).set(auth(other.token))).status).toBe(404);
  });

  it('lets a shared log be read but still only its owner change it', async () => {
    const mine = await addLog();
    await patch(`/api/logs/${mine.id}`, { privacy: 'shared' });
    expect((await request(ctx.app).get(`/api/logs/${mine.id}`).set(auth(other.token))).status).toBe(200);
    const refused = await request(ctx.app).patch(`/api/logs/${mine.id}`).set(auth(other.token)).send({ topic: 'Mine now' });
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toMatch(/belongs to Venkata Cherukuri\. Only they can change it\./);
    expect((await request(ctx.app).post(`/api/logs/${mine.id}/followups`).set(auth(other.token)).send({ text: 'no' })).status).toBe(403);
  });

  it('files every log under the person who captured it', async () => {
    const theirs = await request(ctx.app).post('/api/logs').set(auth(other.token)).send({ ...LOG, topic: "Ravi's own call", followUps: [] });
    expect(theirs.body.log.owner).toBe('Ravi Kumar');
    expect((await get('/api/logs?search=Ravi')).body.total).toBe(0);
    expect((await request(ctx.app).get('/api/logs?mine=true').set(auth(other.token))).body.total).toBe(1);
    await request(ctx.app).delete(`/api/logs/${theirs.body.log.id}`).set(auth(other.token));
  });
});
