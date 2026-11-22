/** Module — My Visit Observations: the report, its observations, its follow-up actions and the list contract. */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';
/** A signed-in person without the `visits` module. */
let outsider = null;

const post = (p, b) => request(ctx.app).post(p).set(auth(token)).send(b);
const get = (p) => request(ctx.app).get(p).set(auth(token));
const patch = (p, b) => request(ctx.app).patch(p).set(auth(token)).send(b);
const del = (p) => request(ctx.app).delete(p).set(auth(token));

const FULL = {
  title: 'Q3 Supplier Audit — Roche Diagnostics, Mumbai',
  type: 'supplier-audit',
  date: '2026-11-18',
  timeIn: '10:00',
  timeOut: '15:30',
  org: { name: 'Roche Diagnostics India Pvt Ltd', branch: 'Mumbai Distribution Hub', address: 'Plot 12, MIDC, Andheri East', city: 'Mumbai', state: 'Maharashtra' },
  host: { name: 'Anita Desai', designation: 'Key Accounts Lead', phone: '+91 98765 11111', email: 'anita.desai@roche.com' },
  team: ['Head of Procurement', 'BMO Head'],
  externalParticipants: 'Roche QC Head · 2 Technical Reps',
  purpose: 'Annual supplier audit — validate quality systems and cold-chain compliance.',
  scope: 'Warehouse infrastructure, QC lab, cold-chain monitoring, batch records.',
  references: 'ISO 13485, ISO 15189, SOP-PRC-001',
  tags: ['audit', 'vendor', 'mumbai'],
  ratings: { infra: 5, quality: 5, safety: 4, regulatory: 5, staff: 4, docs: 4 },
  overallAssessment: 'excellent',
  executiveSummary: 'Strong across the board. Minor gaps in Zone B safety signage.',
  observations: [{ category: 'Safety', observation: 'Zone B warehouse missing eye-wash signage.', evidence: 'Photo 5' }],
  photos: 7,
  actionItems: [{ text: 'Add missing eye-wash signage in Zone B', owner: 'Head of Procurement', deadline: '2026-11-28' }],
  nextVisitDate: '2027-02-15',
  followUpRequired: true,
  additionalRemarks: 'Worth keeping warm for the next-gen kit.',
};

const addVisit = async (over = {}) => (await post('/api/visits', { ...FULL, ...over })).body.visit;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  outsider = await createAndLogin(ctx.app, token, { name: 'Ravi Kumar', email: 'ravi.kumar@trustlab.co.in', role: 'employee', modules: ['dashboard', 'todo'] });
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  for (const v of (await get('/api/visits?limit=200')).body.items) await del(`/api/visits/${v.id}`);
});

describe('create, read, edit, delete', () => {
  it('creates a draft owned by the signed-in person with every field the web form sends', async () => {
    const v = await addVisit();
    expect(v).toMatchObject({
      title: FULL.title, type: 'supplier-audit', status: 'draft', date: '2026-11-18', timeIn: '10:00', timeOut: '15:30',
      owner: 'Venkata Cherukuri', photos: 7, followUpRequired: true, nextVisitDate: '2027-02-15', overallAssessment: 'excellent',
    });
    expect(v.org).toMatchObject({ name: FULL.org.name, branch: FULL.org.branch, city: 'Mumbai', gps: '' });
    expect(v.host.name).toBe('Anita Desai');
    expect(v.team).toEqual(['Head of Procurement', 'BMO Head']);
    expect(v.ratings).toEqual({ infra: 5, quality: 5, safety: 4, regulatory: 5, staff: 4, docs: 4 });
    expect(v.avgRating).toBe(4.5);
    expect(v.observations[0]).toEqual({ category: 'Safety', observation: 'Zone B warehouse missing eye-wash signage.', evidence: 'Photo 5' });
    expect(v.actionItems[0]).toEqual({ text: 'Add missing eye-wash signage in Zone B', owner: 'Head of Procurement', deadline: '2026-11-28' });
    expect(v.submittedAt).toBeNull();
    expect(v.history[0]).toMatchObject({ user: 'Venkata Cherukuri', action: 'created the draft' });
    expect(v.createdBy.name).toBe('Venkata Cherukuri');
  });

  it('saves a half-filled draft (only a title and a date are required)', async () => {
    const r = await post('/api/visits', { title: 'Draft — Fernandez Hospital Pathology', date: '2026-11-21' });
    expect(r.status).toBe(201);
    expect(r.body.visit).toMatchObject({ status: 'draft', type: 'branch-office', overallAssessment: '', photos: 0, followUpRequired: false });
    expect(r.body.visit.avgRating).toBeNull();
    expect(r.body.visit.observations).toEqual([]);
  });

  it('refuses a visit with no title, a bad date, an unknown type and an unknown field', async () => {
    expect((await post('/api/visits', { date: '2026-11-18' })).status).toBe(400);
    const noTitle = await post('/api/visits', { title: '   ', date: '2026-11-18' });
    expect(noTitle.body.error.message).toBe('Please enter a visit title.');
    const badDate = await post('/api/visits', { title: 'X', date: '18-11-2026' });
    expect(badDate.status).toBe(400);
    expect(badDate.body.error.message).toMatch(/YYYY-MM-DD/);
    expect((await post('/api/visits', { title: 'X', date: '2026-11-18', type: 'space-station' })).status).toBe(400);
    expect((await post('/api/visits', { title: 'X', date: '2026-11-18', ratings: { infra: 9 } })).status).toBe(400);
    expect((await post('/api/visits', { title: 'X', date: '2026-11-18', photos: 99 })).status).toBe(400);
    expect((await post('/api/visits', { title: 'X', date: '2026-11-18', colour: 'red' })).status).toBe(400);
  });

  it('reads one back and 404s a made-up id', async () => {
    const v = await addVisit();
    expect((await get(`/api/visits/${v.id}`)).body.visit.id).toBe(v.id);
    const miss = await get('/api/visits/not-an-id');
    expect(miss.status).toBe(404);
    expect(miss.body.error.message).toBe('That visit observation does not exist.');
  });

  it('patches one field at a time and merges nested objects', async () => {
    const v = await addVisit();
    const r = await patch(`/api/visits/${v.id}`, { org: { city: 'Pune' }, ratings: { safety: 2 }, photos: 9 });
    expect(r.status).toBe(200);
    expect(r.body.visit.org).toMatchObject({ name: FULL.org.name, city: 'Pune' }); // the other org fields survive
    expect(r.body.visit.ratings).toMatchObject({ safety: 2, infra: 5 });
    expect(r.body.visit.photos).toBe(9);
    expect((await patch(`/api/visits/${v.id}`, {})).status).toBe(400);
  });

  it('deletes', async () => {
    const v = await addVisit();
    expect((await del(`/api/visits/${v.id}`)).status).toBe(200);
    expect((await get(`/api/visits/${v.id}`)).status).toBe(404);
  });
});

describe('submit and reopen', () => {
  it('submits a complete report, stamps it and logs the history', async () => {
    const v = await addVisit();
    const r = await post(`/api/visits/${v.id}/status`, { status: 'submitted' });
    expect(r.status).toBe(200);
    expect(r.body.visit.status).toBe('submitted');
    expect(r.body.visit.submittedAt).toBeTruthy();
    expect(r.body.visit.history.map((h) => h.action)).toContain('submitted the report');
  });

  it('says plainly which field is missing before it will submit', async () => {
    const bare = (await post('/api/visits', { title: 'Walkthrough — Kondapur candidate', date: '2026-11-15' })).body.visit;
    const noOrg = await post(`/api/visits/${bare.id}/status`, { status: 'submitted' });
    expect(noOrg.status).toBe(400);
    expect(noOrg.body.error.message).toBe('Organisation name required to submit.');

    await patch(`/api/visits/${bare.id}`, { org: { name: 'Prestige Towers' } });
    expect((await post(`/api/visits/${bare.id}/status`, { status: 'submitted' })).body.error.message).toBe('Purpose of visit required to submit.');

    await patch(`/api/visits/${bare.id}`, { purpose: 'Evaluate the ground-floor space.' });
    expect((await post(`/api/visits/${bare.id}/status`, { status: 'submitted' })).body.error.message).toBe('Overall Assessment required to submit.');

    await patch(`/api/visits/${bare.id}`, { overallAssessment: 'satisfactory' });
    expect((await post(`/api/visits/${bare.id}/status`, { status: 'submitted' })).status).toBe(200);
  });

  it('refuses to submit twice, reopens as a draft and refuses an unknown status', async () => {
    const v = await addVisit();
    await post(`/api/visits/${v.id}/status`, { status: 'submitted' });
    const again = await post(`/api/visits/${v.id}/status`, { status: 'submitted' });
    expect(again.status).toBe(400);
    expect(again.body.error.message).toBe('This report is already submitted.');

    const reopened = await post(`/api/visits/${v.id}/status`, { status: 'draft' });
    expect(reopened.body.visit.status).toBe('draft');
    expect(reopened.body.visit.history.map((h) => h.action)).toContain('reopened the report as a draft');
    expect((await post(`/api/visits/${v.id}/status`, { status: 'filed' })).status).toBe(400);
  });

  it('notifies the owners of its follow-up actions on submit', async () => {
    const v = await addVisit({ actionItems: [{ text: 'Chase the declaration certificate', owner: 'Anusha Reddy', deadline: '2026-11-25' }] });
    await post(`/api/visits/${v.id}/status`, { status: 'submitted' });
    const { Notification } = await import('../src/models/Notification.js');
    const rows = await Notification.find({ userName: 'Anusha Reddy' });
    expect(rows.length).toBe(1);
    expect(rows[0].text).toContain('<strong>Venkata Cherukuri</strong>');
    expect(rows[0].text).toContain('Roche Diagnostics India Pvt Ltd');
  });

  it('can be created already submitted, and refuses that when it is incomplete', async () => {
    const r = await post('/api/visits', { ...FULL, status: 'submitted' });
    expect(r.status).toBe(201);
    expect(r.body.visit.submittedAt).toBeTruthy();
    const bad = await post('/api/visits', { title: 'Nothing filled in', date: '2026-11-20', status: 'submitted' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Organisation name required to submit.');
  });

  it('keeps a submitted report complete: an edit that empties a required field is refused', async () => {
    const v = await addVisit({ status: 'submitted' });
    const r = await patch(`/api/visits/${v.id}`, { purpose: '' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toBe('Purpose of visit required to submit.');
  });
});

describe('observations', () => {
  it('adds, edits and removes one', async () => {
    const v = await addVisit({ observations: [] });
    const add = await post(`/api/visits/${v.id}/observations`, { category: 'Documentation', observation: 'NPI batch B-240918 certificate not in file.', evidence: 'Batch Register' });
    expect(add.status).toBe(201);
    expect(add.body.visit.observations).toEqual([{ category: 'Documentation', observation: 'NPI batch B-240918 certificate not in file.', evidence: 'Batch Register' }]);

    const edit = await patch(`/api/visits/${v.id}/observations/0`, { evidence: 'Batch Register p.12' });
    expect(edit.body.visit.observations[0]).toMatchObject({ category: 'Documentation', evidence: 'Batch Register p.12' });

    expect((await patch(`/api/visits/${v.id}/observations/0`, {})).status).toBe(400);
    const gone = await del(`/api/visits/${v.id}/observations/0`);
    expect(gone.body.visit.observations).toEqual([]);
  });

  it('404s an index that is not there and 400s one that is not a number', async () => {
    const v = await addVisit({ observations: [] });
    const miss = await patch(`/api/visits/${v.id}/observations/4`, { evidence: 'x' });
    expect(miss.status).toBe(404);
    expect(miss.body.error.message).toBe('That observation does not exist.');
    expect((await del(`/api/visits/${v.id}/observations/abc`)).status).toBe(400);
  });
});

describe('follow-up actions', () => {
  it('adds, edits and removes one', async () => {
    const v = await addVisit({ actionItems: [] });
    const add = await post(`/api/visits/${v.id}/action-items`, { text: 'Brief the architect on two more sites', owner: 'V. Subramanian', deadline: '2026-11-25' });
    expect(add.status).toBe(201);
    expect(add.body.visit.actionItems).toEqual([{ text: 'Brief the architect on two more sites', owner: 'V. Subramanian', deadline: '2026-11-25' }]);

    const edit = await patch(`/api/visits/${v.id}/action-items/0`, { deadline: '2026-11-30' });
    expect(edit.body.visit.actionItems[0].deadline).toBe('2026-11-30');
    expect((await patch(`/api/visits/${v.id}/action-items/0`, { deadline: 'next week' })).status).toBe(400);

    const gone = await del(`/api/visits/${v.id}/action-items/0`);
    expect(gone.body.visit.actionItems).toEqual([]);
    const miss = await del(`/api/visits/${v.id}/action-items/3`);
    expect(miss.status).toBe(404);
    expect(miss.body.error.message).toBe('That follow-up action does not exist.');
  });

  it('tells the owner right away when the report is already submitted', async () => {
    const v = await addVisit({ actionItems: [], status: 'submitted' });
    await post(`/api/visits/${v.id}/action-items`, { text: 'Enforce the name-tag protocol', owner: 'Pallavi Elisetti', deadline: '2026-11-30' });
    const { Notification } = await import('../src/models/Notification.js');
    const rows = await Notification.find({ userName: 'Pallavi Elisetti' });
    expect(rows.length).toBe(1);
    expect(rows[0].text).toContain('Enforce the name-tag protocol');
  });
});

describe('list contract', () => {
  beforeEach(async () => {
    // Roche · supplier-audit · excellent · 2026-11-18 · Mumbai · 7 photos · team + 1 action
    await addVisit();
    await addVisit({
      title: 'New Premises Walkthrough — Kondapur Branch Candidate', type: 'new-premises', date: '2026-11-15',
      org: { name: 'Prestige Towers', branch: 'Shop 4-5 Ground Floor', city: 'Hyderabad', state: 'Telangana' },
      host: { name: 'Ramesh Reddy', designation: 'Property Manager' }, team: ['V. Subramanian'], externalParticipants: 'Architect from Trio Design', photos: 12,
      overallAssessment: 'satisfactory', tags: ['new-branch', 'kondapur'], observations: [{ category: 'Infrastructure', observation: 'Ceiling height 10.5 ft.' }],
      actionItems: [], status: 'submitted', followUpRequired: true,
    });
    await addVisit({
      title: 'Branch Visit — Secunderabad Hub', type: 'branch-office', date: '2026-11-12', owner: 'Pallavi Elisetti',
      org: { name: 'TrustLab Diagnostics — Secunderabad', branch: 'Secunderabad Hub', city: 'Hyderabad' },
      host: { name: 'Branch Manager' }, team: [], externalParticipants: '', photos: 5,
      overallAssessment: 'needs-improvement', tags: ['branch-audit'], observations: [], actionItems: [], followUpRequired: false,
    });
  });

  it('pages, sorts newest first and reports what it applied', async () => {
    const r = await get('/api/visits?limit=2');
    expect(r.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2, hasMore: true });
    expect(r.body.items.map((v) => v.date)).toEqual(['2026-11-18', '2026-11-15']);
    expect(r.body.applied.sort).toBe('-date');
    const p2 = await get('/api/visits?limit=2&page=2');
    expect(p2.body.items.length).toBe(1);
    expect(p2.body.hasMore).toBe(false);
    expect((await get('/api/visits?sort=title')).body.items[0].title).toMatch(/^Branch Visit/);
  });

  it('searches across the title, the site, the observations and the tags', async () => {
    expect((await get('/api/visits?search=kondapur')).body.total).toBe(1); // the title and the tag of one report
    expect((await get('/api/visits?search=roche')).body.total).toBe(1); // the organisation name
    expect((await get('/api/visits?search=eye-wash')).body.total).toBe(1); // an observation
    expect((await get('/api/visits?search=procurement')).body.total).toBe(1); // a team member and an action owner
    expect((await get('/api/visits?search=zzzz')).body.total).toBe(0);
  });

  it('filters by status, by site, by severity and by the rest', async () => {
    expect((await get('/api/visits?status=submitted')).body.total).toBe(1);
    expect((await get('/api/visits?status=draft,submitted')).body.total).toBe(3);
    expect((await get('/api/visits?site=roche')).body.total).toBe(1); // contains match, either org name or branch
    expect((await get('/api/visits?site=secunderabad')).body.total).toBe(1);
    expect((await get('/api/visits?severity=needs-improvement')).body.total).toBe(1);
    expect((await get('/api/visits?severity=excellent,satisfactory')).body.total).toBe(2);
    expect((await get('/api/visits?overallAssessment=excellent')).body.total).toBe(1);
    expect((await get('/api/visits?type=new-premises,branch-office')).body.total).toBe(2);
    expect((await get('/api/visits?city=Hyderabad')).body.total).toBe(2);
    expect((await get('/api/visits?tag=branch-audit')).body.total).toBe(1);
    expect((await get('/api/visits?category=Infrastructure')).body.total).toBe(1);
    expect((await get('/api/visits?followUpRequired=true')).body.total).toBe(2);
    expect((await get('/api/visits?owner=Pallavi Elisetti')).body.total).toBe(1);
    expect((await get('/api/visits?min_photos=7')).body.total).toBe(2); // 7 and 12 photos; the third has 5
  });

  it('limits to my own visits with mine=true', async () => {
    const r = await get('/api/visits?mine=true');
    expect(r.body.total).toBe(2); // the third one is Pallavi's
    expect(r.body.items.every((v) => v.owner === 'Venkata Cherukuri')).toBe(true);
    expect(r.body.applied.filters.mine).toBe(true);
    expect((await get('/api/visits?mine=yes')).status).toBe(400);
  });

  it('takes date ranges on the visit date and on the other date fields', async () => {
    expect((await get('/api/visits?from=2026-11-14&to=2026-11-16')).body.total).toBe(1);
    expect((await get('/api/visits?from=2026-11-13')).body.total).toBe(2);
    expect((await get('/api/visits?nextVisitDate_from=2027-01-01')).body.total).toBe(3);
    expect((await get('/api/visits?from=2026-11-20&to=2026-11-01')).status).toBe(400);
    expect((await get('/api/visits?from=20-11-2026')).status).toBe(400);
  });

  it('projects with fields= and refuses anything it does not know', async () => {
    const r = await get('/api/visits?fields=title,status&limit=1');
    expect(Object.keys(r.body.items[0]).sort()).toEqual(['id', 'status', 'title']);
    expect((await get('/api/visits?fields=secrets')).status).toBe(400);

    const bad = await get('/api/visits?colour=red');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/Unknown query parameter: colour/);
    expect((await get('/api/visits?status=filed')).body.error.message).toMatch(/status must be one of/);
    expect((await get('/api/visits?severity=very-bad')).body.error.message).toMatch(/severity must be one of/);
    expect((await get('/api/visits?sort=colour')).status).toBe(400);
    expect((await get('/api/visits?limit=0')).status).toBe(400);
  });
});

describe('permissions', () => {
  it('refuses every route to a signed-in person without the visits module', async () => {
    const v = await addVisit();
    const outside = (p, method = 'get', body) => request(ctx.app)[method](p).set(auth(outsider.token)).send(body);
    const refused = await outside('/api/visits');
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toBe('You do not have access to this module. Ask an admin to enable it for you.');
    expect((await outside(`/api/visits/${v.id}`)).status).toBe(403);
    expect((await outside('/api/visits', 'post', { title: 'Sneaky', date: '2026-11-20' })).status).toBe(403);
    expect((await outside(`/api/visits/${v.id}`, 'patch', { title: 'Renamed' })).status).toBe(403);
    expect((await outside(`/api/visits/${v.id}/status`, 'post', { status: 'submitted' })).status).toBe(403);
    expect((await outside(`/api/visits/${v.id}/observations`, 'post', { observation: 'x' })).status).toBe(403);
    expect((await outside(`/api/visits/${v.id}/action-items`, 'post', { text: 'x' })).status).toBe(403);
    expect((await outside(`/api/visits/${v.id}`, 'delete')).status).toBe(403);
  });

  it('needs a token at all', async () => {
    const r = await request(ctx.app).get('/api/visits');
    expect(r.status).toBe(401);
    expect(r.body.error.message).toBe('Please sign in.');
  });
});

describe('activity log', () => {
  it('records the create, the submit and the delete in plain words', async () => {
    const v = await addVisit();
    await post(`/api/visits/${v.id}/status`, { status: 'submitted' });
    await del(`/api/visits/${v.id}`);
    const rows = (await get(`/api/audit?entityId=${v.id}&limit=20`)).body.items;
    const actions = rows.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['create', 'update', 'delete']));
    expect(rows.every((r) => r.module === 'Visit Observations')).toBe(true);
    expect(rows.every((r) => r.entity.includes('Roche'))).toBe(true);
    expect(rows.map((r) => r.details).join(' | ')).toMatch(/Report submitted/);
  });
});
