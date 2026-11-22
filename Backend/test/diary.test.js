/**
 * My Diary — the list contract (paging, search, filters, date windows), the create/read/update/remove
 * cycle, entries being scoped to the diary they belong to, and the module guard.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';        // Venkata Cherukuri (admin, the diary owner in the web's delegation matrix)
let eaToken = '';      // Pallavi Elisetti — EA with edit access to Venkata's diary
let strangerToken = ''; // Arjun Reddy — has the diary module, no access to anyone else's diary
let empToken = '';     // no diary module at all

const base = { title: 'Deep focus — Q3 ops prep', cat: 'focus', date: '2026-11-23', startTime: '09:00', endTime: '11:00' };

const api = () => request(ctx.app);
const post = (p, b, t = token) => api().post(p).set(auth(t)).send(b);
const get = (p, t = token) => api().get(p).set(auth(t));
const patch = (p, b, t = token) => api().patch(p).set(auth(t)).send(b);
const del = (p, t = token) => api().delete(p).set(auth(t));
const makeEntry = async (over = {}, t = token) => (await post('/api/diary', { ...base, ...over }, t)).body.entry;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  eaToken = (await createAndLogin(ctx.app, token, { name: 'Pallavi Elisetti', email: 'pallavi.elisetti@trustlab.co.in', role: 'manager', title: 'Secretary', department: 'Administration' })).token;
  strangerToken = (await createAndLogin(ctx.app, token, { name: 'Arjun Reddy', email: 'arjun.reddy@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital' })).token;
  empToken = (await createAndLogin(ctx.app, token, { name: 'Pavan', email: 'pavan@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital', modules: ['dashboard'] })).token;
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  // The admin may reach every diary, so mine=false clears the collection between tests.
  const r = await get('/api/diary?mine=false&limit=200');
  for (const e of r.body.items) await del(`/api/diary/${e.id}`);
});

describe('create & read', () => {
  it('fills the defaults the web expects', async () => {
    const r = await post('/api/diary', { ...base, loc: 'Begumpet HQ · Office', notes: 'Pull branch TAT numbers.', attendees: ['N. Sharma (CFO)'], external: [{ name: 'Dr. Abishekh', email: 'MD@careandcure.in' }] });
    expect(r.status).toBe(201);
    const e = r.body.entry;
    expect(e).toMatchObject({
      owner: 'Venkata Cherukuri', title: base.title, cat: 'focus', date: '2026-11-23', startTime: '09:00', endTime: '11:00',
      endDate: null, allDay: false, reminder: '15 min before', addedBy: 'self',
    });
    expect(e.external).toEqual([{ name: 'Dr. Abishekh', email: 'md@careandcure.in', rsvp: 'pending', respondedAt: null, respondedNote: '' }]);
    expect(e.attendees).toEqual(['N. Sharma (CFO)']);
    expect(e.createdBy).toMatchObject({ name: 'Venkata Cherukuri' });
    expect(e.id).toMatch(/^[0-9a-f]{24}$/);

    const one = await get(`/api/diary/${e.id}`);
    expect(one.body.entry).toMatchObject({ id: e.id, title: base.title });
  });

  it('stores an all-day and a multi-day entry without times', async () => {
    const e = await makeEntry({ title: 'Vacation — Family · Goa', cat: 'ooo', date: '2026-12-22', endDate: '2026-12-30', allDay: true, startTime: '09:00', endTime: '10:00' });
    expect(e).toMatchObject({ allDay: true, startTime: null, endTime: null, endDate: '2026-12-30' });
  });

  it('rejects impossible dates and times in plain language', async () => {
    const noTitle = await post('/api/diary', { ...base, title: '' });
    expect(noTitle.status).toBe(400);
    expect(noTitle.body.error.message).toBe('Enter a title for the entry.');

    const badDate = await post('/api/diary', { ...base, date: '23-11-2026' });
    expect(badDate.status).toBe(400);
    expect(badDate.body.error.message).toMatch(/real date written as YYYY-MM-DD/);

    const noSuchDay = await post('/api/diary', { ...base, date: '2026-02-30' });
    expect(noSuchDay.status).toBe(400);
    expect(noSuchDay.body.error.message).toMatch(/real date/);

    const badTime = await post('/api/diary', { ...base, startTime: '25:00' });
    expect(badTime.status).toBe(400);
    expect(badTime.body.error.message).toMatch(/24-hour clock/);

    const backwards = await post('/api/diary', { ...base, startTime: '11:00', endTime: '09:00' });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.message).toBe('The end time is not after the start time. Check the two times.');

    const endsFirst = await post('/api/diary', { ...base, date: '2026-11-25', endDate: '2026-11-23' });
    expect(endsFirst.status).toBe(400);
    expect(endsFirst.body.error.message).toMatch(/ends before it starts/);

    const noStart = await post('/api/diary', { title: 'No time at all', cat: 'reminder', date: '2026-11-25' });
    expect(noStart.status).toBe(400);
    expect(noStart.body.error.message).toBe('Add a start time, or tick "All-day event".');

    const badCat = await post('/api/diary', { ...base, cat: 'picnic' });
    expect(badCat.status).toBe(400);
    expect(badCat.body.error.message).toMatch(/Category must be one of/);
  });

  it('404s for an unknown id', async () => {
    const r = await get('/api/diary/6b02dd827da25d9a175e14e8');
    expect(r.status).toBe(404);
    expect(r.body.error.message).toMatch(/does not exist/i);
  });

  it('needs the diary module', async () => {
    expect((await get('/api/diary', empToken)).status).toBe(403);
    expect((await api().get('/api/diary')).status).toBe(401);
  });
});

describe('list contract', () => {
  beforeEach(async () => {
    await makeEntry();
    await makeEntry({ title: 'Lunch with Dr. Abishekh', cat: 'personal', date: '2026-11-24', startTime: '13:00', endTime: '14:30', loc: 'Taj Deccan · Royal China', attendees: ['Deepti'] });
    await makeEntry({ title: 'Flight to Delhi · AI 2764', cat: 'travel', date: '2026-11-25', startTime: '06:30', endTime: '09:00', notes: 'PNR: XYZQ12 · Seat 4A' });
    await makeEntry({ title: 'Diwali Lakshmi Puja', cat: 'personal', date: '2026-11-28', allDay: true });
    await makeEntry({ title: 'Vacation — Family · Goa', cat: 'ooo', date: '2026-12-22', endDate: '2026-12-30', allDay: true });
  });

  it('pages and reports meta', async () => {
    const r = await get('/api/diary?limit=2');
    expect(r.body).toMatchObject({ page: 1, limit: 2, total: 5, pages: 3, hasMore: true });
    expect((await get('/api/diary?limit=2&page=3')).body).toMatchObject({ page: 3, hasMore: false });
    expect((await get('/api/diary?limit=2&page=3')).body.items.length).toBe(1);
  });

  it('searches globally across title, notes, location and invitees', async () => {
    expect((await get('/api/diary?search=goa')).body.total).toBe(1);
    expect((await get('/api/diary?search=XYZQ12')).body.total).toBe(1);
    expect((await get('/api/diary?search=taj deccan')).body.total).toBe(1);
    expect((await get('/api/diary?search=deepti')).body.total).toBe(1);
    expect((await get('/api/diary?search=nothinghere')).body.total).toBe(0);
  });

  it('filters by category, comma lists, all-day and invitee', async () => {
    expect((await get('/api/diary?cat=personal')).body.total).toBe(2);
    expect((await get('/api/diary?cat=travel,ooo')).body.total).toBe(2);
    expect((await get('/api/diary?allDay=true')).body.total).toBe(2);
    expect((await get('/api/diary?allDay=false')).body.total).toBe(3);
    expect((await get('/api/diary?attendee=Deepti')).body.total).toBe(1);
    expect((await get('/api/diary?addedBy=self')).body.total).toBe(5);
    const bad = await get('/api/diary?cat=picnic');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/cat must be one of/);
  });

  it('returns a date window inclusive of both boundary days', async () => {
    const r = await get('/api/diary?from=2026-11-23&to=2026-11-25');
    expect(r.body.total).toBe(3);
    expect(r.body.items.map((e) => e.date)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
    // Each edge on its own day: the boundary entry is in, the next one is out.
    expect((await get('/api/diary?from=2026-11-23&to=2026-11-23')).body.total).toBe(1);
    expect((await get('/api/diary?from=2026-11-25&to=2026-11-25')).body.total).toBe(1);
    expect((await get('/api/diary?from=2026-11-26&to=2026-11-27')).body.total).toBe(0);
    expect((await get('/api/diary?from=2026-11-28')).body.total).toBe(2);
    expect((await get('/api/diary?to=2026-11-24')).body.total).toBe(2);
    const applied = (await get('/api/diary?from=2026-11-23&to=2026-11-25')).body.applied;
    expect(applied.range).toMatchObject({ field: 'days' });
    expect(applied.filters).toMatchObject({ mine: true });
  });

  it('finds a multi-day entry from any day it covers', async () => {
    expect((await get('/api/diary?from=2026-12-24&to=2026-12-26')).body.total).toBe(1);   // middle of the trip
    expect((await get('/api/diary?from=2026-12-30&to=2026-12-30')).body.total).toBe(1);   // its last day
    expect((await get('/api/diary?from=2026-12-22&to=2026-12-22')).body.total).toBe(1);   // its first day
    expect((await get('/api/diary?from=2026-12-31&to=2027-01-05')).body.total).toBe(0);   // after it
    expect((await get('/api/diary?from=2026-12-01&to=2026-12-21')).body.total).toBe(0);   // before it
  });

  it('sorts, projects fields and rejects unknown or impossible params', async () => {
    expect((await get('/api/diary?sort=-date')).body.items[0].title).toBe('Vacation — Family · Goa');
    expect((await get('/api/diary?sort=title')).body.items[0].title).toBe('Deep focus — Q3 ops prep');

    const projected = await get('/api/diary?fields=title,date&limit=1');
    expect(Object.keys(projected.body.items[0]).sort()).toEqual(['date', 'id', 'title']);

    const unknown = await get('/api/diary?colour=red');
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.message).toMatch(/Unknown query parameter: colour/);

    const badSort = await get('/api/diary?sort=colour');
    expect(badSort.status).toBe(400);
    expect(badSort.body.error.message).toMatch(/sort must be one of/);

    const badRange = await get('/api/diary?from=yesterday');
    expect(badRange.status).toBe(400);
    expect(badRange.body.error.message).toMatch(/from must be a date/);

    const reversed = await get('/api/diary?from=2026-11-25&to=2026-11-23');
    expect(reversed.status).toBe(400);
    expect(reversed.body.error.message).toMatch(/must be before/);
  });
});

describe('every entry belongs to one diary', () => {
  it('lists only my own entries by default', async () => {
    await makeEntry({ title: 'Mine' });
    await makeEntry({ title: 'Theirs', date: '2026-11-24' }, strangerToken);

    const mine = await get('/api/diary');
    expect(mine.body.total).toBe(1);
    expect(mine.body.items[0].title).toBe('Mine');

    const theirs = await get('/api/diary', strangerToken);
    expect(theirs.body.total).toBe(1);
    expect(theirs.body.items[0]).toMatchObject({ title: 'Theirs', owner: 'Arjun Reddy' });
  });

  it('refuses another person a diary that is not shared with them', async () => {
    const mine = await makeEntry({ title: 'Private focus block' });
    const read = await get(`/api/diary/${mine.id}`, strangerToken);
    expect(read.status).toBe(403);
    expect(read.body.error.message).toMatch(/do not have access to Venkata Cherukuri's diary/);
    expect((await del(`/api/diary/${mine.id}`, strangerToken)).status).toBe(403);
    expect((await get('/api/diary?owner=Venkata Cherukuri', strangerToken)).status).toBe(403);
    // Widening the list never leaks: the stranger still only sees their own.
    const wide = await get('/api/diary?mine=false', strangerToken);
    expect(wide.status).toBe(200);
    expect(wide.body.total).toBe(0);
  });

  it('lets the EA fill in the diary delegated to her, marked as added by the EA', async () => {
    const r = await post('/api/diary', { ...base, title: 'Travel coordination · CMD Delhi trip', owner: 'Venkata Cherukuri' }, eaToken);
    expect(r.status).toBe(201);
    expect(r.body.entry).toMatchObject({ owner: 'Venkata Cherukuri', addedBy: 'ea' });

    // It is on the CMD's diary, not on hers.
    expect((await get('/api/diary')).body.total).toBe(1);
    expect((await get('/api/diary', eaToken)).body.total).toBe(0);
    // She reads it through the shared diary, and through mine=false.
    expect((await get('/api/diary?owner=Venkata Cherukuri', eaToken)).body.total).toBe(1);
    expect((await get('/api/diary?mine=false', eaToken)).body.total).toBe(1);
    expect((await get(`/api/diary/${r.body.entry.id}`, eaToken)).status).toBe(200);
    expect((await patch(`/api/diary/${r.body.entry.id}`, { loc: 'Hyderabad T1' }, eaToken)).status).toBe(200);
  });

  it('refuses to put an entry on a diary the person cannot edit', async () => {
    const r = await post('/api/diary', { ...base, owner: 'Venkata Cherukuri' }, strangerToken);
    expect(r.status).toBe(403);
    expect(r.body.error.message).toMatch(/do not have access/);
  });
});

describe('update & remove', () => {
  it('edits one field at a time and keeps the rest', async () => {
    const e = await makeEntry();
    const moved = await patch(`/api/diary/${e.id}`, { date: '2026-11-26', startTime: '10:00', endTime: '12:00' });
    expect(moved.status).toBe(200);
    expect(moved.body.entry).toMatchObject({ date: '2026-11-26', startTime: '10:00', endTime: '12:00', title: base.title, cat: 'focus' });
    // The moved entry answers from its new day and no longer from the old one.
    expect((await get('/api/diary?from=2026-11-26&to=2026-11-26')).body.total).toBe(1);
    expect((await get('/api/diary?from=2026-11-23&to=2026-11-23')).body.total).toBe(0);

    const allDay = await patch(`/api/diary/${e.id}`, { allDay: true });
    expect(allDay.body.entry).toMatchObject({ allDay: true, startTime: null, endTime: null });

    const bad = await patch(`/api/diary/${e.id}`, { allDay: false, endTime: '09:00', startTime: '14:00' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/not after the start time/);

    expect((await patch(`/api/diary/${e.id}`, {})).status).toBe(400);
    expect((await patch(`/api/diary/${e.id}`, { colour: 'red' })).status).toBe(400);
  });

  it('removes the entry for good', async () => {
    const e = await makeEntry();
    expect((await del(`/api/diary/${e.id}`)).status).toBe(200);
    expect((await get(`/api/diary/${e.id}`)).status).toBe(404);
    expect((await del(`/api/diary/${e.id}`)).status).toBe(404);
    expect((await get('/api/diary')).body.total).toBe(0);
  });

  it('writes the Activity Log and notifies the invitees', async () => {
    const e = await makeEntry({ title: 'Investor meeting — Delhi', cat: 'meeting', attendees: ['Arjun Reddy'], external: [{ name: 'Rohan Mehta', email: 'rohan@everstone.in' }] });
    const logged = await get('/api/audit?search=Investor meeting');
    expect(logged.body.total).toBeGreaterThan(0);
    expect(logged.body.items[0]).toMatchObject({ module: 'My Diary', action: 'create' });

    const theirs = await get('/api/notifications', strangerToken);
    const invite = theirs.body.items.find((n) => n.text.includes('Investor meeting'));
    expect(invite).toBeTruthy();
    expect(invite.text).toContain('<strong>Venkata Cherukuri</strong>');

    await del(`/api/diary/${e.id}`);
    const removed = await get('/api/audit?action=delete&search=Investor meeting');
    expect(removed.body.total).toBeGreaterThan(0);
  });

  it('escapes a title that looks like HTML before it reaches anyone', async () => {
    await makeEntry({ title: '<img src=x onerror="alert(1)">', attendees: ['Arjun Reddy'] });
    const theirs = await get('/api/notifications', strangerToken);
    const hit = theirs.body.items.find((n) => n.text.includes('img'));
    expect(hit).toBeTruthy();
    expect(hit.text).not.toContain('<img');
    expect(hit.text).toContain('&lt;img');
  });
});
