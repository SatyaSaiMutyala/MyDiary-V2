/** Module 2 — meetings: CRUD, the list contract, status, duplicate, minutes, presence, parking, RSVP. */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';
let empToken = '';
const base = { type: 'internal', title: 'Q3 Operations Review', date: '2026-11-24', time: '10:00', chair: 'Venkata Cherukuri' };

const api = () => request(ctx.app);
const post = (p, b, t = token) => api().post(p).set(auth(t)).send(b);
const get = (p, t = token) => api().get(p).set(auth(t));
const patch = (p, b, t = token) => api().patch(p).set(auth(t)).send(b);
const del = (p, t = token) => api().delete(p).set(auth(t));
const makeMeeting = async (over = {}) => (await post('/api/meetings', { ...base, ...over })).body.meeting;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  // An employee without the meetings module, to prove the guard works.
  const emp = await createAndLogin(ctx.app, token, { name: 'Pavan', email: 'pavan@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital', modules: ['dashboard'] });
  empToken = emp.token;
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  const r = await get('/api/meetings?limit=200');
  for (const m of r.body.items) await del(`/api/meetings/${m.id}`);
});

describe('create & read', () => {
  it('fills the defaults the web expects', async () => {
    const r = await post('/api/meetings', { ...base, attendees: ['Venkata Cherukuri', 'N. Sharma (CFO)'], agenda: ['Opening', 'TAT dip'] });
    expect(r.status).toBe(201);
    const m = r.body.meeting;
    expect(m).toMatchObject({ status: 'upcoming', dur: '1h', mode: '📍 In-person', loc: 'TBD', minutesFinalised: false });
    expect(m.agendaTimes).toEqual(['10m', '10m']);
    // No note was sent, so each item gets its own empty one rather than none at all.
    expect(m.agendaNotes).toEqual(['', '']);
    expect(m.presence).toEqual({ 'Venkata Cherukuri': 'tbd', 'N. Sharma (CFO)': 'tbd' });
    expect(m.preRead).toEqual([{ name: 'Venkata Cherukuri', opened: false }, { name: 'N. Sharma (CFO)', opened: false }]);
    expect(m.actions).toEqual([]);
    expect(m.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('keeps a note beside the agenda item it was written for', async () => {
    const r = await post('/api/meetings', {
      ...base,
      agenda: ['Opening', 'TAT dip', 'Decisions'],
      agendaTimes: ['5m', '20m', '10m'],
      agendaNotes: ['', 'CFO to bring the W45–W46 branch table', ''],
    });
    expect(r.status).toBe(201);
    const id = r.body.meeting.id;
    expect(r.body.meeting.agendaNotes).toEqual(['', 'CFO to bring the W45–W46 branch table', '']);

    // Editing the agenda re-aligns the notes the same way it re-aligns the times: an item added at
    // the end starts with no note instead of inheriting one, and a dropped item takes its note away.
    const edit = await patch(`/api/meetings/${id}`, {
      agenda: ['Opening', 'TAT dip', 'Decisions', 'AoB'],
      agendaTimes: ['5m', '20m', '10m', '5m'],
      agendaNotes: ['', 'CFO to bring the W45–W46 branch table', 'Park anything that needs the board', ''],
    });
    expect(edit.status).toBe(200);
    expect(edit.body.meeting.agendaNotes).toEqual(['', 'CFO to bring the W45–W46 branch table', 'Park anything that needs the board', '']);

    // A client that knows nothing about notes (an older app) shortens the agenda and sends no notes:
    // what is left keeps its own note, and nothing is carried past the end of the list.
    const older = await patch(`/api/meetings/${id}`, { agenda: ['Opening', 'TAT dip'], agendaTimes: ['5m', '20m'] });
    expect(older.status).toBe(200);
    expect(older.body.meeting.agendaNotes).toEqual(['', 'CFO to bring the W45–W46 branch table']);

    const read = await get(`/api/meetings/${id}`);
    expect(read.body.meeting.agendaNotes).toEqual(['', 'CFO to bring the W45–W46 branch table']);
  });

  it('rejects bad input with a readable message', async () => {
    expect((await post('/api/meetings', { ...base, title: '' })).status).toBe(400);
    const bad = await post('/api/meetings', { ...base, date: '24-11-2026' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/date/i);
    expect((await post('/api/meetings', { ...base, time: '25:00' })).status).toBe(400);
    expect((await post('/api/meetings', { ...base, type: 'picnic' })).status).toBe(400);
  });

  it('404s for an unknown id', async () => {
    const r = await get('/api/meetings/6b02dd827da25d9a175e14e8');
    expect(r.status).toBe(404);
    expect(r.body.error.message).toMatch(/does not exist/i);
  });

  it('needs the meetings module', async () => {
    expect((await get('/api/meetings', empToken)).status).toBe(403);
    expect((await api().get('/api/meetings')).status).toBe(401);
  });
});

describe('list contract', () => {
  beforeEach(async () => {
    await makeMeeting({ title: 'Adani AHC — Pricing', type: 'customer', date: '2026-11-25', attendees: ['Arjun'] });
    await makeMeeting({ title: 'Transasia — Analyser Review', type: 'supplier', date: '2026-11-26' });
    await makeMeeting({ title: 'HR Monthly', type: 'internal', date: '2026-12-02', chair: 'HR Head', attendees: ['HR Head', 'Madhavi'] });
  });

  it('pages and reports meta', async () => {
    const r = await get('/api/meetings?limit=2');
    expect(r.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2, hasMore: true });
    expect((await get('/api/meetings?limit=2&page=2')).body.hasMore).toBe(false);
  });

  it('searches globally across title, chair and attendees', async () => {
    expect((await get('/api/meetings?search=adani')).body.total).toBe(1);
    expect((await get('/api/meetings?search=arjun')).body.total).toBe(1);
    expect((await get('/api/meetings?search=HR Head')).body.total).toBe(1);
    expect((await get('/api/meetings?search=nothinghere')).body.total).toBe(0);
  });

  it('filters, including comma lists, and ranges by date', async () => {
    expect((await get('/api/meetings?type=customer')).body.total).toBe(1);
    expect((await get('/api/meetings?type=customer,supplier')).body.total).toBe(2);
    expect((await get('/api/meetings?from=2026-11-25&to=2026-11-26')).body.total).toBe(2);
    expect((await get('/api/meetings?from=2026-12-01')).body.total).toBe(1);
    const r = await get('/api/meetings?search=adani&type=customer&from=2026-11-01&to=2026-12-31');
    expect(r.body.applied).toMatchObject({ search: 'adani', filters: { type: 'customer' } });
  });

  it('sorts and rejects unknown params', async () => {
    expect((await get('/api/meetings?sort=-date')).body.items[0].title).toBe('HR Monthly');
    const bad = await get('/api/meetings?colour=red');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/Unknown query parameter: colour/);
  });

  it('mine=true returns meetings I chair or attend', async () => {
    // Two of the three: I chair them. HR Monthly is chaired by, and attended by, other people.
    expect((await get('/api/meetings?mine=true')).body.total).toBe(2);
  });
});

describe('status, duplicate and delete', () => {
  it('moves through completed and cancelled and back', async () => {
    const m = await makeMeeting();
    expect((await post(`/api/meetings/${m.id}/status`, { status: 'completed' })).body.meeting.status).toBe('completed');
    const c = await post(`/api/meetings/${m.id}/status`, { status: 'cancelled', cancelReason: 'Vendor rescheduled' });
    expect(c.body.meeting).toMatchObject({ status: 'cancelled', cancelReason: 'Vendor rescheduled' });
    const back = await post(`/api/meetings/${m.id}/status`, { status: 'upcoming' });
    expect(back.body.meeting).toMatchObject({ status: 'upcoming', cancelReason: '' });
  });

  it('duplicates as a fresh upcoming meeting without minutes or actions', async () => {
    const m = await makeMeeting();
    await post(`/api/meetings/${m.id}/action-items`, { desc: 'Original action', owner: 'Arjun', deadline: '2026-11-30' });
    await api().put(`/api/meetings/${m.id}/minutes`).set(auth(token)).send({ minutes: { ag0: { disc: 'Talked.', dec: 'Agreed.' } } });
    const r = await post(`/api/meetings/${m.id}/duplicate`);
    expect(r.status).toBe(201);
    expect(r.body.meeting.title).toBe('Q3 Operations Review (Copy)');
    expect(r.body.meeting).toMatchObject({ status: 'upcoming', minutes: {}, minutesFinalised: false, actions: [] });
    expect(r.body.meeting.date > m.date).toBe(true);
  });

  it('deletes the meeting and its action items', async () => {
    const m = await makeMeeting();
    await post(`/api/meetings/${m.id}/action-items`, { desc: 'Goes away', owner: 'Arjun', deadline: '2026-11-30' });
    expect((await del(`/api/meetings/${m.id}`)).status).toBe(200);
    expect((await get(`/api/meetings/${m.id}`)).status).toBe(404);
    expect((await get('/api/action-items?search=Goes away')).body.total).toBe(0);
  });
});

describe('minutes', () => {
  it('saves, finalises, reopens and reports who the circulation reaches', async () => {
    const m = await makeMeeting({ attendees: ['Venkata Cherukuri', 'Arjun'], external: [{ name: 'Priya Menon', email: 'priya@adani.com' }, { name: 'No Email Person' }] });
    const put = await api().put(`/api/meetings/${m.id}/minutes`).set(auth(token)).send({ minutes: { ag0: { disc: 'Walked the tiers.', dec: 'Anchor on Comprehensive.' }, general: { disc: 'AoB none.' } } });
    expect(put.status).toBe(200);
    expect(put.body.meeting.minutes.ag0.dec).toBe('Anchor on Comprehensive.');

    const fin = await post(`/api/meetings/${m.id}/minutes/finalise`);
    expect(fin.body.meeting.minutesFinalised).toBe(true);

    const circ = await post(`/api/meetings/${m.id}/minutes/circulate`);
    expect(circ.status).toBe(200);
    expect(circ.body.recipients).toMatchObject({ internal: 2, total: 3 });
    expect(circ.body.recipients.externalWithEmail).toEqual(['Priya Menon']);
    expect(circ.body.recipients.externalWithoutEmail).toEqual(['No Email Person']);
    expect(circ.body.meeting.minutesCirculatedAt).toBeTruthy();

    expect((await post(`/api/meetings/${m.id}/minutes/reopen`)).body.meeting.minutesFinalised).toBe(false);
  });
});

describe('presence, parking lot and RSVP', () => {
  it('cycles presence tbd → present → late → absent → tbd', async () => {
    const m = await makeMeeting({ attendees: ['Arjun'] });
    const seq = [];
    for (let i = 0; i < 4; i++) seq.push((await post(`/api/meetings/${m.id}/presence/cycle`, { name: 'Arjun' })).body.meeting.presence.Arjun);
    expect(seq).toEqual(['present', 'late', 'absent', 'tbd']);
    expect((await patch(`/api/meetings/${m.id}/presence`, { name: 'Arjun', status: 'late' })).body.meeting.presence.Arjun).toBe('late');
  });

  it('adds and removes parking lot items', async () => {
    const m = await makeMeeting();
    await post(`/api/meetings/${m.id}/parking`, { text: 'Kiosk idea' });
    const two = await post(`/api/meetings/${m.id}/parking`, { text: 'Second item' });
    expect(two.body.meeting.parkingLot).toEqual(['Kiosk idea', 'Second item']);
    const left = await del(`/api/meetings/${m.id}/parking/0`);
    expect(left.body.meeting.parkingLot).toEqual(['Second item']);
    expect((await del(`/api/meetings/${m.id}/parking/9`)).status).toBe(404);
  });

  it('records an RSVP with its timestamp and note, and lets an email be added', async () => {
    const m = await makeMeeting({ external: [{ name: 'Priya Menon', email: 'priya@adani.com' }] });
    const r = await post(`/api/meetings/${m.id}/rsvp`, { index: 0, rsvp: 'accepted', note: 'Looking forward.' });
    expect(r.body.meeting.external[0]).toMatchObject({ rsvp: 'accepted', respondedNote: 'Looking forward.' });
    expect(r.body.meeting.external[0].respondedAt).toBeTruthy();
    const e = await patch(`/api/meetings/${m.id}/external/0`, { email: 'priya.menon@adani.com' });
    expect(e.body.meeting.external[0].email).toBe('priya.menon@adani.com');
    expect((await post(`/api/meetings/${m.id}/rsvp`, { index: 5, rsvp: 'accepted' })).status).toBe(404);
  });
});

/**
 * Who a meeting is shown to.
 *
 * A meeting is a private conversation between the people on it — a board paper, a salary review, a
 * supplier dispute. Until this was fixed the list was unscoped, so anybody with the meetings module
 * was shown every meeting in the company, and the apps only narrowed it by asking for `mine=true`
 * in some places. A default is not a rule, so the rule is tested here from three sides at once: the
 * list, the meeting's own URL, and global search.
 */
describe('who can see a meeting', () => {
  let kavya = '';
  let sravan = '';

  beforeAll(async () => {
    kavya = (await createAndLogin(ctx.app, token, { name: 'Kavya Reddy', email: 'kavya.see@trustlab.co.in', role: 'employee', title: 'Technologist', department: 'Clinical Laboratory', modules: ['dashboard', 'meetings'] })).token;
    sravan = (await createAndLogin(ctx.app, token, { name: 'Sravan Rao', email: 'sravan.see@trustlab.co.in', role: 'employee', title: 'Accountant', department: 'Finance', modules: ['dashboard', 'meetings'] })).token;
  });

  it('shows it to the people on it and to nobody else', async () => {
    const m = await makeMeeting({ type: 'board', title: 'Private — CMD and Kavya', attendees: ['Venkata Cherukuri', 'Kavya Reddy'] });

    const hers = await get('/api/meetings?limit=50&fields=title', kavya);
    expect(hers.body.items.map((x) => x.title)).toContain('Private — CMD and Kavya');
    expect((await get(`/api/meetings/${m.id}`, kavya)).status).toBe(200);

    const his = await get('/api/meetings?limit=50&fields=title', sravan);
    expect(his.body.items.map((x) => x.title)).not.toContain('Private — CMD and Kavya');
    // 404 rather than 403: the id of a meeting he is not on should not confirm that it exists.
    expect((await get(`/api/meetings/${m.id}`, sravan)).status).toBe(404);
  });

  it('does not let global search go around it', async () => {
    await makeMeeting({ title: 'Needle — CMD and Kavya only', attendees: ['Venkata Cherukuri', 'Kavya Reddy'] });
    const titles = async (t) => {
      const r = await get('/api/search?q=Needle', t);
      const g = (r.body.groups ?? []).find((x) => x.key === 'meetings');
      return (g?.items ?? []).map((i) => i.title);
    };
    expect(await titles(kavya)).toContain('Needle — CMD and Kavya only');
    expect(await titles(sravan)).toEqual([]);
  });

  it('shows the organiser their own meeting even when they are not on the attendee list', async () => {
    const mine = await (await post('/api/meetings', { ...base, title: 'Booked for other people', attendees: ['Kavya Reddy'] }, sravan)).body;
    const back = await get('/api/meetings?limit=50&fields=title', sravan);
    expect(back.body.items.map((x) => x.title)).toContain('Booked for other people');
    expect((await get(`/api/meetings/${mine.meeting.id}`, sravan)).status).toBe(200);
  });

  it('still shows an admin everything', async () => {
    // Made here rather than leaned on from the tests above: every test in this file starts from an
    // empty diary of meetings.
    await makeMeeting({ title: 'Kavya and Pavan only', attendees: ['Kavya Reddy', 'Pavan Kumar'] });
    await post('/api/meetings', { ...base, title: 'Booked by Sravan for other people', attendees: ['Kavya Reddy'] }, sravan);

    const all = await get('/api/meetings?limit=50&fields=title');
    expect(all.body.items.map((x) => x.title)).toEqual(
      expect.arrayContaining(['Kavya and Pavan only', 'Booked by Sravan for other people']),
    );
  });
});
