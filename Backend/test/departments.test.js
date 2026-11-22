/**
 * Department Master — the department and everything hanging off it (positions, the four task lanes, the
 * review cadence, the people), the shared list contract, and the shift-tick reads behind My Activity and
 * the Dashboard.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';
/** Has `activity` only: can read departments and tick their own tasks, cannot configure anything. */
let staffToken = '';
/** Has neither departments, activity nor dashboard: refused everywhere. */
let outsiderToken = '';

const api = () => request(ctx.app);
const post = (p, b, t = token) => api().post(p).set(auth(t)).send(b);
const get = (p, t = token) => api().get(p).set(auth(t));
const patch = (p, b, t = token) => api().patch(p).set(auth(t)).send(b);
const put = (p, b, t = token) => api().put(p).set(auth(t)).send(b);
const del = (p, t = token) => api().delete(p).set(auth(t));

const base = {
  name: 'Clinical Laboratory',
  icon: '🔬',
  description: 'Core processing units — Biochemistry, Haematology, Serology.',
  positions: [
    { name: 'Lab Technician', description: 'Operates analysers, runs IQC' },
    { name: 'Lab In-charge', description: 'Approves IQC, signs off critical values' },
  ],
  openingTasks: [
    { text: 'Switch on analysers and confirm boot-up diagnostics', defaultTime: '07:00', positions: [0] },
    { text: 'Review & approve IQC results', defaultTime: '07:45', positions: [1] },
    { text: 'Verify reagent stock levels', defaultTime: '07:30' },
  ],
  closingTasks: [{ text: 'End-of-day shut-down protocol', defaultTime: '19:30', positions: [0] }],
  weeklyTasks: [{ text: 'Weekly IQC trend analysis', defaultTime: '11:00', daysOfWeek: [1, 5], positions: [1] }],
  monthlyTasks: [{ text: 'Submit EQAS results for the previous month', defaultTime: '14:00', dayOfMonth: 5, positions: [1] }],
  reviewCadence: {
    weekly: { daysOfWeek: [4], time: '08:30', duration: 45 },
    monthly: { dayOfMonth: 5, time: '10:00', duration: 90 },
    owner: 'Lab Head · Dr. Anusha Singh',
    primarySystems: ['LIS', 'EQAS Portal', 'QMS'],
    weeklyAgenda: [{ heading: 'IQC Performance', points: [{ text: 'IQC out-of-control events this week', indicator: 'red' }, { text: 'Levey-Jennings trend review' }] }],
  },
  assignments: [{ name: 'Dr. Anusha Singh', position: 1 }, { name: 'V. Subramanian', role: 'head' }],
};

const makeDept = async (over = {}) => (await post('/api/departments', { ...base, ...over })).body.department;

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  staffToken = (await createAndLogin(ctx.app, token, { name: 'Dr. Anusha Singh', email: 'anusha.singh@trustlab.co.in', role: 'employee', title: 'Lab In-charge', department: 'Operations', modules: ['activity'] })).token;
  outsiderToken = (await createAndLogin(ctx.app, token, { name: 'Madhavi', email: 'madhavi@trustlab.co.in', role: 'employee', title: 'HR · Payroll', department: 'Corporate Services', modules: ['diary'] })).token;
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  const r = await get('/api/departments?limit=200&fields=code');
  for (const d of r.body.items) await del(`/api/departments/${d.id}`);
});

describe('create & read', () => {
  it('stores the whole department the way the web app renders it', async () => {
    const r = await post('/api/departments', base);
    expect(r.status).toBe(201);
    const d = r.body.department;
    expect(d.id).toMatch(/^[0-9a-f]{24}$/);
    expect(d).toMatchObject({ name: 'Clinical Laboratory', icon: '🔬' });
    expect(d.code).toMatch(/^TDPL-NEW-\d{3}$/);

    // Tasks reference the positions they were created against, by index.
    expect(d.positions.map((p) => p.name)).toEqual(['Lab Technician', 'Lab In-charge']);
    expect(d.openingTasks[0].positionIds).toEqual([d.positions[0].id]);
    expect(d.openingTasks[1].positionIds).toEqual([d.positions[1].id]);
    expect(d.openingTasks[2].positionIds).toEqual([]); // "All in department"
    expect(d.openingTasks.map((t) => t.order)).toEqual([1, 2, 3]);

    // Lane-specific fields only where they belong.
    expect(d.weeklyTasks[0].daysOfWeek).toEqual([1, 5]);
    expect(d.monthlyTasks[0].dayOfMonth).toBe(5);
    expect(d.openingTasks[0].daysOfWeek).toBeUndefined();
    expect(d.openingTasks[0].dayOfMonth).toBeUndefined();

    // Review cadence, including the agenda template and its RAG flags.
    expect(d.reviewCadence).toMatchObject({ owner: 'Lab Head · Dr. Anusha Singh', primarySystems: ['LIS', 'EQAS Portal', 'QMS'] });
    expect(d.reviewCadence.weekly).toEqual({ daysOfWeek: [4], time: '08:30', duration: 45 });
    expect(d.reviewCadence.monthly).toEqual({ dayOfMonth: 5, time: '10:00', duration: 90 });
    expect(d.reviewCadence.weeklyAgenda[0].heading).toBe('IQC Performance');
    expect(d.reviewCadence.weeklyAgenda[0].points.map((p) => p.indicator)).toEqual(['red', null]);
    expect(d.reviewCadence.monthlyAgenda).toEqual([]);

    // People, with the position resolved.
    expect(d.assignments).toEqual([
      { name: 'Dr. Anusha Singh', positionId: d.positions[1].id, role: 'member' },
      { name: 'V. Subramanian', positionId: null, role: 'head' },
    ]);

    expect((await get(`/api/departments/${d.id}`)).body.department).toEqual(d);
  });

  it('fills the defaults a blank department needs', async () => {
    const d = await makeDept({ name: 'TAT', icon: undefined, description: undefined, positions: undefined, openingTasks: undefined, closingTasks: undefined, weeklyTasks: undefined, monthlyTasks: undefined, reviewCadence: undefined, assignments: undefined });
    expect(d).toMatchObject({ icon: '🏢', description: '', positions: [], openingTasks: [], closingTasks: [], weeklyTasks: [], monthlyTasks: [] });
    expect(d.reviewCadence).toEqual({ weekly: { daysOfWeek: [], time: '', duration: 45 }, monthly: { dayOfMonth: '', time: '', duration: 60 }, owner: '', primarySystems: [], weeklyAgenda: [], monthlyAgenda: [] });
  });

  it('gives each new department its own code, and refuses a duplicate one', async () => {
    const a = await makeDept({ name: 'One' });
    const b = await makeDept({ name: 'Two' });
    expect(a.code).not.toBe(b.code);
    const clash = await post('/api/departments', { ...base, code: a.code });
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toContain(a.code);
  });

  it('rejects bad input with a message a non-technical person can read', async () => {
    const noName = await post('/api/departments', { ...base, name: '' });
    expect(noName.status).toBe(400);
    expect(noName.body.error.message).toBe('Enter the department name.');

    const badTime = await post('/api/departments', { ...base, openingTasks: [{ text: 'Something', defaultTime: '7 am' }] });
    expect(badTime.status).toBe(400);
    expect(badTime.body.error.message).toMatch(/24-hour clock/);

    const badDow = await post('/api/departments', { ...base, weeklyTasks: [{ text: 'Something', daysOfWeek: [9] }] });
    expect(badDow.status).toBe(400);
    expect(badDow.body.error.message).toMatch(/0 \(Sunday\) to 6 \(Saturday\)/);

    const badDom = await post('/api/departments', { ...base, monthlyTasks: [{ text: 'Something', dayOfMonth: 44 }] });
    expect(badDom.status).toBe(400);
    expect(badDom.body.error.message).toMatch(/1 to 31|between 1 and 31/);

    const badPos = await post('/api/departments', { ...base, positions: [{ name: 'Only one' }], openingTasks: [{ text: 'Something', positions: [3] }] });
    expect(badPos.status).toBe(400);
    expect(badPos.body.error.message).toMatch(/does not exist/);

    const stray = await post('/api/departments', { ...base, colour: 'teal' });
    expect(stray.status).toBe(400);
  });

  it('404s for an unknown id', async () => {
    const r = await get('/api/departments/6b02dd827da25d9a175e14e8');
    expect(r.status).toBe(404);
    expect(r.body.error.message).toBe('That department does not exist.');
    expect((await get('/api/departments/not-an-id')).status).toBe(404);
  });
});

describe('permissions', () => {
  it('needs a signed-in user', async () => {
    expect((await api().get('/api/departments')).status).toBe(401);
  });

  it('lets My Activity read, but only Department Master configure', async () => {
    const d = await makeDept();
    expect((await get('/api/departments', staffToken)).status).toBe(200);
    expect((await get(`/api/departments/${d.id}`, staffToken)).status).toBe(200);
    expect((await get('/api/departments/assignments', staffToken)).status).toBe(200);

    const refused = await post('/api/departments', base, staffToken);
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toMatch(/do not have access to this module/i);
    expect((await patch(`/api/departments/${d.id}`, { name: 'Nope' }, staffToken)).status).toBe(403);
    expect((await del(`/api/departments/${d.id}`, staffToken)).status).toBe(403);
    expect((await post(`/api/departments/${d.id}/positions`, { name: 'Nope' }, staffToken)).status).toBe(403);
  });

  it('refuses someone without departments, activity or dashboard entirely', async () => {
    const d = await makeDept();
    expect((await get('/api/departments', outsiderToken)).status).toBe(403);
    expect((await get(`/api/departments/${d.id}`, outsiderToken)).status).toBe(403);
    expect((await get('/api/departments/activity', outsiderToken)).status).toBe(403);
    expect((await post('/api/departments', base, outsiderToken)).status).toBe(403);
  });
});

describe('list contract', () => {
  beforeEach(async () => {
    await makeDept();
    await makeDept({
      name: 'Logistics', icon: '🚚', description: 'Sample transport from branches to the central lab.',
      positions: [{ name: 'Dispatch Co-ordinator' }, { name: 'Driver / Rider' }],
      openingTasks: [{ text: 'Vehicle check — fuel, tyres, cold-box ice packs', defaultTime: '06:30', positions: [1] }],
      closingTasks: [], weeklyTasks: [], monthlyTasks: [],
      reviewCadence: { weekly: { daysOfWeek: [1], time: '09:00', duration: 30 }, owner: 'Logistics Head', primarySystems: ['TruFlow'] },
      assignments: [{ name: 'Logistics Head', position: 0 }],
    });
    await makeDept({
      name: 'HR', icon: '👥', description: 'People operations — hiring, induction, attendance.',
      positions: [{ name: 'HR Executive' }], openingTasks: [], closingTasks: [], weeklyTasks: [], monthlyTasks: [],
      reviewCadence: { weekly: { daysOfWeek: [1], time: '10:30', duration: 45 }, owner: 'HR Head', primarySystems: ['HRMS', 'PACE'] },
      assignments: [{ name: 'Madhavi' }, { name: 'HR Head', role: 'head' }],
    });
  });

  it('pages and reports the meta', async () => {
    const r = await get('/api/departments?limit=2');
    expect(r.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2, hasMore: true });
    expect(r.body.items).toHaveLength(2);
    expect((await get('/api/departments?limit=2&page=2')).body.hasMore).toBe(false);
  });

  it('searches globally across names, codes, tasks, positions, owners and people', async () => {
    expect((await get('/api/departments?search=logistics')).body.total).toBe(1);
    expect((await get('/api/departments?search=cold-box')).body.total).toBe(1); // a task's text
    expect((await get('/api/departments?search=lab in-charge')).body.total).toBe(1); // a position
    expect((await get('/api/departments?search=anusha')).body.total).toBe(1); // an assigned person
    expect((await get('/api/departments?search=HR Head')).body.total).toBe(1); // the cadence owner
    expect((await get('/api/departments?search=HRMS')).body.total).toBe(1); // a primary system
    expect((await get('/api/departments?search=nothinghere')).body.total).toBe(0);
    expect((await get('/api/departments?search=logistics')).body.applied.search).toBe('logistics');
  });

  it('filters by every filter, including comma lists', async () => {
    const all = (await get('/api/departments?limit=200')).body.items;
    const hr = all.find((d) => d.name === 'HR');
    expect((await get(`/api/departments?code=${hr.code}`)).body.total).toBe(1);
    expect((await get('/api/departments?name=HR')).body.total).toBe(1);
    expect((await get('/api/departments?name=HR,Logistics')).body.total).toBe(2);
    expect((await get('/api/departments?icon=👥')).body.total).toBe(1);
    expect((await get('/api/departments?position=HR Executive')).body.total).toBe(1);
    expect((await get('/api/departments?person=Madhavi')).body.total).toBe(1);
    expect((await get('/api/departments?person=Madhavi,Logistics Head')).body.total).toBe(2);
    expect((await get('/api/departments?owner=head')).body.total).toBe(3); // every owner here is a "… Head"
    expect((await get('/api/departments?owner=HR Head')).body.total).toBe(1);
    expect((await get('/api/departments?system=TruFlow')).body.total).toBe(1);
    expect((await get('/api/departments?reviewDay=1')).body.total).toBe(2);
    expect((await get('/api/departments?reviewDay=4')).body.total).toBe(1);
    expect((await get('/api/departments?min_order=2')).body.total).toBe(2);
    const combined = await get('/api/departments?search=hr&reviewDay=1&person=Madhavi');
    expect(combined.body.total).toBe(1);
    expect(combined.body.applied.filters).toMatchObject({ reviewDay: '1', person: 'Madhavi' });
  });

  it('ranges by date and reports the range it applied', async () => {
    const today = new Date().toISOString().slice(0, 10);
    expect((await get(`/api/departments?from=${today}`)).body.total).toBe(3);
    expect((await get('/api/departments?from=2020-01-01&to=2020-12-31')).body.total).toBe(0);
    const r = await get(`/api/departments?createdAt_from=2020-01-01&createdAt_to=${today}`);
    expect(r.body.total).toBe(3);
    expect(r.body.applied.range).toMatchObject({ field: 'createdAt' });
    const backwards = await get(`/api/departments?from=${today}&to=2020-01-01`);
    expect(backwards.status).toBe(400);
  });

  it('sorts, projects fields and rejects anything it does not know', async () => {
    expect((await get('/api/departments?sort=name')).body.items.map((d) => d.name)).toEqual(['Clinical Laboratory', 'HR', 'Logistics']);
    expect((await get('/api/departments?sort=-name')).body.items[0].name).toBe('Logistics');
    expect((await get('/api/departments')).body.items.map((d) => d.name)).toEqual(['Clinical Laboratory', 'Logistics', 'HR']); // order = the grid's own order

    const projected = (await get('/api/departments?fields=name,icon')).body.items[0];
    expect(Object.keys(projected).sort()).toEqual(['icon', 'id', 'name']);

    const bad = await get('/api/departments?colour=red');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/^Unknown query parameter: colour\. Allowed:/);
    expect((await get('/api/departments?sort=colour')).status).toBe(400);
    expect((await get('/api/departments?reviewDay=sunday')).status).toBe(400);
    expect((await get('/api/departments?fields=secrets')).status).toBe(400);
    expect((await get('/api/departments?limit=0')).status).toBe(400);
  });
});

describe('update & delete', () => {
  it('edits the name, icon and description', async () => {
    const d = await makeDept();
    const r = await patch(`/api/departments/${d.id}`, { name: 'Clinical Laboratory & Molecular', icon: '🧬', description: 'Now with Molecular Biology.' });
    expect(r.status).toBe(200);
    expect(r.body.department).toMatchObject({ name: 'Clinical Laboratory & Molecular', icon: '🧬', description: 'Now with Molecular Biology.' });
    expect((await patch(`/api/departments/${d.id}`, {})).status).toBe(400);
    expect((await patch(`/api/departments/${d.id}`, { name: '' })).status).toBe(400);
  });

  it('deletes the department, its tasks and its activity ticks', async () => {
    const d = await makeDept();
    await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: d.openingTasks[0].id, done: true, date: '2026-11-21' });
    expect((await del(`/api/departments/${d.id}`)).body).toEqual({ ok: true });
    expect((await get(`/api/departments/${d.id}`)).status).toBe(404);
    const log = await get('/api/departments/activity?date=2026-11-21');
    expect(log.body.log['Venkata Cherukuri']['2026-11-21'].opening).toEqual({});
  });

  it('records what it changed in the Activity Log', async () => {
    const d = await makeDept({ name: 'Audit trail dept' });
    await patch(`/api/departments/${d.id}`, { name: 'Renamed dept' });
    const r = await get('/api/audit?module=Department%20Master&limit=5&sort=-at');
    expect(r.status).toBe(200);
    const [newest] = r.body.items;
    expect(newest).toMatchObject({ action: 'update', module: 'Department Master', entity: 'Renamed dept' });
    expect(newest.details).toContain('Audit trail dept → Renamed dept');
  });
});

describe('positions', () => {
  it('adds, renames and removes one, untagging its tasks', async () => {
    const d = await makeDept();
    const added = await post(`/api/departments/${d.id}/positions`, { name: 'Phlebotomist', description: 'Sample collection' });
    expect(added.status).toBe(201);
    expect(added.body.department.positions).toHaveLength(3);
    const pid = added.body.position.id;

    const renamed = await patch(`/api/departments/${d.id}/positions/${pid}`, { name: 'Senior Phlebotomist' });
    expect(renamed.body.department.positions[2].name).toBe('Senior Phlebotomist');

    // Tag an opening task to the first position, then remove that position: the task reverts to all-department.
    const techId = d.positions[0].id;
    const taskId = d.openingTasks[0].id;
    expect((await patch(`/api/departments/${d.id}/tasks/opening/${taskId}`, { positionIds: [techId] })).body.department.openingTasks[0].positionIds).toEqual([techId]);
    const removed = await del(`/api/departments/${d.id}/positions/${techId}`);
    expect(removed.status).toBe(200);
    expect(removed.body.department.positions.map((p) => p.name)).toEqual(['Lab In-charge', 'Senior Phlebotomist']);
    expect(removed.body.department.openingTasks[0].positionIds).toEqual([]);

    expect((await del(`/api/departments/${d.id}/positions/6b02dd827da25d9a175e14e8`)).status).toBe(404);
    expect((await post(`/api/departments/${d.id}/positions`, { name: '' })).status).toBe(400);
  });
});

describe('tasks', () => {
  it('adds a task to each lane with the lane’s own fields', async () => {
    const d = await makeDept();
    const open = await post(`/api/departments/${d.id}/tasks/opening`, { text: 'Fridge temperature log', defaultTime: '07:15' });
    expect(open.status).toBe(201);
    expect(open.body.department.openingTasks).toHaveLength(4);
    expect(open.body.department.openingTasks[3]).toMatchObject({ order: 4, text: 'Fridge temperature log', defaultTime: '07:15', positionIds: [] });

    const weekly = await post(`/api/departments/${d.id}/tasks/weekly`, { text: 'Spot-audit one lab section', defaultTime: '14:00', daysOfWeek: [5, 5] });
    expect(weekly.body.department.weeklyTasks[1].daysOfWeek).toEqual([5]); // de-duplicated
    const weeklyNoDay = await post(`/api/departments/${d.id}/tasks/weekly`, { text: 'No day given', daysOfWeek: [] });
    expect(weeklyNoDay.body.department.weeklyTasks[2].daysOfWeek).toEqual([1]); // falls back to Monday

    const monthly = await post(`/api/departments/${d.id}/tasks/monthly`, { text: 'Month-end rollup', dayOfMonth: 'last' });
    expect(monthly.body.department.monthlyTasks[1].dayOfMonth).toBe('last');

    expect((await post(`/api/departments/${d.id}/tasks/sometimes`, { text: 'Nope' })).status).toBe(400);
    expect((await post(`/api/departments/${d.id}/tasks/opening`, { text: '' })).status).toBe(400);
  });

  it('edits a task, including its position tags and its schedule', async () => {
    const d = await makeDept();
    const t = d.openingTasks[0];
    const both = [d.positions[0].id, d.positions[1].id];
    const r = await patch(`/api/departments/${d.id}/tasks/opening/${t.id}`, { text: 'Switch on analysers', defaultTime: '06:45', positionIds: both });
    expect(r.body.department.openingTasks[0]).toMatchObject({ text: 'Switch on analysers', defaultTime: '06:45', positionIds: both });
    expect((await patch(`/api/departments/${d.id}/tasks/opening/${t.id}`, { positionIds: [] })).body.department.openingTasks[0].positionIds).toEqual([]);

    const w = d.weeklyTasks[0];
    expect((await patch(`/api/departments/${d.id}/tasks/weekly/${w.id}`, { daysOfWeek: [3] })).body.department.weeklyTasks[0].daysOfWeek).toEqual([3]);
    const m = d.monthlyTasks[0];
    expect((await patch(`/api/departments/${d.id}/tasks/monthly/${m.id}`, { dayOfMonth: 'last' })).body.department.monthlyTasks[0].dayOfMonth).toBe('last');

    // A lane only accepts its own schedule field, and only positions of this department.
    expect((await patch(`/api/departments/${d.id}/tasks/opening/${t.id}`, { daysOfWeek: [2] })).status).toBe(400);
    expect((await patch(`/api/departments/${d.id}/tasks/weekly/${w.id}`, { dayOfMonth: 4 })).status).toBe(400);
    const foreign = await patch(`/api/departments/${d.id}/tasks/opening/${t.id}`, { positionIds: ['6b02dd827da25d9a175e14e8'] });
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.message).toMatch(/not in this department/);
    expect((await patch(`/api/departments/${d.id}/tasks/opening/${t.id}`, {})).status).toBe(400);
  });

  it('removes a task and the ticks recorded against it', async () => {
    const d = await makeDept();
    const t = d.openingTasks[0];
    await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t.id, done: true, date: '2026-11-21' });
    const r = await del(`/api/departments/${d.id}/tasks/opening/${t.id}`);
    expect(r.status).toBe(200);
    expect(r.body.department.openingTasks).toHaveLength(2);
    expect((await get('/api/departments/activity?date=2026-11-21')).body.log['Venkata Cherukuri']['2026-11-21'].opening).toEqual({});
    expect((await del(`/api/departments/${d.id}/tasks/opening/${t.id}`)).status).toBe(404);
  });
});

describe('review cadence', () => {
  it('changes when the reviews happen, who owns them and the systems they draw from', async () => {
    const d = await makeDept();
    const r = await put(`/api/departments/${d.id}/cadence`, { weekly: { daysOfWeek: [6], time: '10:00', duration: 120 }, monthly: { dayOfMonth: 'last', time: '11:00' }, owner: 'CMD · Venkata Cherukuri', primarySystems: ['CMD Approval Hub'] });
    expect(r.status).toBe(200);
    expect(r.body.department.reviewCadence).toMatchObject({ owner: 'CMD · Venkata Cherukuri', primarySystems: ['CMD Approval Hub'] });
    expect(r.body.department.reviewCadence.weekly).toEqual({ daysOfWeek: [6], time: '10:00', duration: 120 });
    expect(r.body.department.reviewCadence.monthly).toEqual({ dayOfMonth: 'last', time: '11:00', duration: 90 });
    expect((await put(`/api/departments/${d.id}/cadence`, {})).status).toBe(400);
    expect((await put(`/api/departments/${d.id}/cadence`, { weekly: { daysOfWeek: [7] } })).status).toBe(400);
  });

  it('builds the agenda template section by section and point by point', async () => {
    const d = await makeDept();
    const sec = await post(`/api/departments/${d.id}/cadence/monthly/sections`, { heading: 'Monthly IQC Rollup' });
    expect(sec.status).toBe(201);
    const sid = sec.body.sectionId;
    expect(sec.body.department.reviewCadence.monthlyAgenda[0]).toMatchObject({ order: 1, heading: 'Monthly IQC Rollup', points: [] });

    const pt = await post(`/api/departments/${d.id}/cadence/monthly/sections/${sid}/points`, { text: 'Monthly CV% per assay vs vendor claim' });
    expect(pt.status).toBe(201);
    const pid = pt.body.pointId;
    expect(pt.body.department.reviewCadence.monthlyAgenda[0].points[0]).toMatchObject({ text: 'Monthly CV% per assay vs vendor claim', indicator: null });

    const flagged = await patch(`/api/departments/${d.id}/cadence/monthly/sections/${sid}/points/${pid}`, { indicator: 'amber' });
    expect(flagged.body.department.reviewCadence.monthlyAgenda[0].points[0].indicator).toBe('amber');
    const cleared = await patch(`/api/departments/${d.id}/cadence/monthly/sections/${sid}/points/${pid}`, { indicator: null });
    expect(cleared.body.department.reviewCadence.monthlyAgenda[0].points[0].indicator).toBe(null);
    expect((await patch(`/api/departments/${d.id}/cadence/monthly/sections/${sid}/points/${pid}`, { indicator: 'purple' })).status).toBe(400);

    const renamed = await patch(`/api/departments/${d.id}/cadence/monthly/sections/${sid}`, { heading: 'IQC Rollup' });
    expect(renamed.body.department.reviewCadence.monthlyAgenda[0].heading).toBe('IQC Rollup');

    expect((await del(`/api/departments/${d.id}/cadence/monthly/sections/${sid}/points/${pid}`)).body.department.reviewCadence.monthlyAgenda[0].points).toEqual([]);
    expect((await del(`/api/departments/${d.id}/cadence/monthly/sections/${sid}`)).body.department.reviewCadence.monthlyAgenda).toEqual([]);

    expect((await post(`/api/departments/${d.id}/cadence/yearly/sections`, { heading: 'Nope' })).status).toBe(400);
    expect((await post(`/api/departments/${d.id}/cadence/weekly/sections/6b02dd827da25d9a175e14e8/points`, { text: 'Nope' })).status).toBe(404);
  });
});

describe('people and the assignment map', () => {
  it('replaces a department’s people and refuses duplicates or foreign positions', async () => {
    const d = await makeDept();
    const r = await put(`/api/departments/${d.id}/assignments`, { assignments: [{ name: 'Dr. P. Reddy', positionId: d.positions[1].id }, { name: 'Dr. Bharath', role: 'head' }] });
    expect(r.status).toBe(200);
    expect(r.body.department.assignments).toEqual([
      { name: 'Dr. P. Reddy', positionId: d.positions[1].id, role: 'member' },
      { name: 'Dr. Bharath', positionId: null, role: 'head' },
    ]);
    const dupe = await put(`/api/departments/${d.id}/assignments`, { assignments: [{ name: 'Dr. Bharath' }, { name: 'Dr. Bharath' }] });
    expect(dupe.status).toBe(400);
    expect(dupe.body.error.message).toContain('twice');
    expect((await put(`/api/departments/${d.id}/assignments`, { assignments: [{ name: 'X', positionId: '6b02dd827da25d9a175e14e8' }] })).status).toBe(404);
  });

  it('answers the org-wide person → department / position map', async () => {
    const lab = await makeDept();
    await makeDept({ name: 'IT', positions: [{ name: 'IT Head' }], openingTasks: [], closingTasks: [], weeklyTasks: [], monthlyTasks: [], reviewCadence: undefined, assignments: [{ name: 'Pavan', position: 0 }] });
    const r = await get('/api/departments/assignments');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.assignments['Dr. Anusha Singh']).toEqual({ departmentId: lab.id, positionId: lab.positions[1].id, role: 'member' });
    expect(r.body.assignments['V. Subramanian']).toEqual({ departmentId: lab.id, positionId: null, role: 'head' });
    expect(r.body.assignments.Pavan.role).toBe('member');
    expect((await get('/api/departments/assignments?colour=red')).status).toBe(400);
  });
});

describe('my activity ticks', () => {
  it('ticks and un-ticks a task and reads back the log the web app expects', async () => {
    const d = await makeDept();
    const [t1, t2] = d.openingTasks;
    const on = await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t1.id, done: true, date: '2026-11-21' });
    expect(on.status).toBe(200);
    expect(on.body).toMatchObject({ ok: true, date: '2026-11-21', person: 'Venkata Cherukuri' });
    expect(on.body.log['Venkata Cherukuri']['2026-11-21'].opening).toEqual({ [t1.id]: 'done' });

    // Ticking twice is not an error and does not duplicate.
    await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t1.id, done: true, date: '2026-11-21' });
    await put('/api/departments/activity', { departmentId: d.id, kind: 'weekly', taskId: d.weeklyTasks[0].id, done: true, date: '2026-11-21' });
    const r = await get('/api/departments/activity?date=2026-11-21');
    const day = r.body.log['Venkata Cherukuri']['2026-11-21'];
    expect(day.opening).toEqual({ [t1.id]: 'done' });
    expect(day.weekly).toEqual({ [d.weeklyTasks[0].id]: 'done' });
    expect(day.closing).toEqual({});

    const off = await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t1.id, done: false, date: '2026-11-21' });
    expect(off.body.log['Venkata Cherukuri']['2026-11-21'].opening).toEqual({});

    // Another day is untouched, and an empty day still comes back with all five lanes.
    const other = await get('/api/departments/activity?date=2026-11-20');
    expect(other.body.log['Venkata Cherukuri']['2026-11-20']).toEqual({ opening: {}, closing: {}, weekly: {}, monthly: {}, review: {} });
    expect(t2.id).toBeTruthy();
  });

  it('rejects a tick for a task or department that is not there', async () => {
    const d = await makeDept();
    expect((await put('/api/departments/activity', { departmentId: '6b02dd827da25d9a175e14e8', kind: 'opening', taskId: d.openingTasks[0].id, done: true })).status).toBe(404);
    const wrongLane = await put('/api/departments/activity', { departmentId: d.id, kind: 'closing', taskId: d.openingTasks[0].id, done: true });
    expect(wrongLane.status).toBe(404);
    expect(wrongLane.body.error.message).toMatch(/closing task is not in this department/);
    expect((await put('/api/departments/activity', { departmentId: d.id, kind: 'brunch', taskId: d.openingTasks[0].id, done: true })).status).toBe(400);
    expect((await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: d.openingTasks[0].id, done: 'yes' })).status).toBe(400);
    expect((await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: d.openingTasks[0].id, done: true, date: '21-11-2026' })).status).toBe(400);
  });

  it('shows other people’s ticks to the Dashboard, and only their own to everybody else', async () => {
    const d = await makeDept();
    await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: d.openingTasks[1].id, done: true, date: '2026-11-21' }, staffToken);

    // The CMD (admin, every module) can see the whole organisation and one department.
    const org = await get('/api/departments/activity?date=2026-11-21&scope=org');
    expect(org.status).toBe(200);
    expect(org.body.log['Dr. Anusha Singh']['2026-11-21'].opening).toEqual({ [d.openingTasks[1].id]: 'done' });
    const dept = await get(`/api/departments/activity?date=2026-11-21&scope=department&departmentId=${d.id}`);
    expect(dept.status).toBe(200);
    expect(Object.keys(dept.body.log).sort()).toEqual(['Dr. Anusha Singh', 'V. Subramanian']);
    const one = await get('/api/departments/activity?date=2026-11-21&scope=person&person=Dr. Anusha Singh');
    expect(one.body.log['Dr. Anusha Singh']['2026-11-21'].opening).toEqual({ [d.openingTasks[1].id]: 'done' });

    // Somebody with My Activity only sees themselves.
    const own = await get('/api/departments/activity?date=2026-11-21', staffToken);
    expect(own.body.log['Dr. Anusha Singh']['2026-11-21'].opening).toEqual({ [d.openingTasks[1].id]: 'done' });
    const refused = await get('/api/departments/activity?date=2026-11-21&scope=org', staffToken);
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toMatch(/only see your own shift checklist/);
    expect((await get('/api/departments/activity?scope=person&person=Venkata Cherukuri', staffToken)).status).toBe(403);
  });

  it('lets Department Master tick for somebody else, and nobody else do it', async () => {
    const d = await makeDept();
    const t = d.openingTasks[0];
    const forHer = await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t.id, done: true, date: '2026-11-21', person: 'Dr. Anusha Singh' });
    expect(forHer.status).toBe(200);
    expect(forHer.body.person).toBe('Dr. Anusha Singh');
    expect(forHer.body.log['Dr. Anusha Singh']['2026-11-21'].opening).toEqual({ [t.id]: 'done' });

    const refused = await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t.id, done: true, date: '2026-11-21', person: 'Venkata Cherukuri' }, staffToken);
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toMatch(/only tick off your own tasks/);
    // Their own name is always fine.
    expect((await put('/api/departments/activity', { departmentId: d.id, kind: 'opening', taskId: t.id, done: true, person: 'Dr. Anusha Singh' }, staffToken)).status).toBe(200);
  });

  it('rejects unknown activity parameters and missing ones', async () => {
    const bad = await get('/api/departments/activity?colour=red');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/^Unknown query parameter: colour\. Allowed:/);
    expect((await get('/api/departments/activity?scope=everyone')).status).toBe(400);
    expect((await get('/api/departments/activity?date=yesterday')).status).toBe(400);
    expect((await get('/api/departments/activity?scope=department')).status).toBe(400);
    expect((await get('/api/departments/activity?scope=person')).status).toBe(400);
    expect((await get('/api/departments/activity?scope=department&departmentId=nope')).status).toBe(400);
  });
});
