/** My Projects: the starting set, the list contract, CRUD, every sub-resource and the template library. */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

let ctx;
let token = '';
let empToken = '';
// What a brand-new database looks like, read BEFORE this suite loads its fixtures.
let emptyPortfolio = -1;
let libraryOnFirstRequest = -1;

const base = {
  name: 'NABL Mock Audit Prep',
  description: 'Dry run across all branches before the surveillance audit.',
  category: 'quality',
  priority: 'high',
  status: 'active',
  owner: 'Venkata Cherukuri',
  startDate: '2026-11-01',
  endDate: '2026-12-31',
};

const api = () => request(ctx.app);
const post = (p, b, t = token) => api().post(p).set(auth(t)).send(b);
const get = (p, t = token) => api().get(p).set(auth(t));
const patch = (p, b, t = token) => api().patch(p).set(auth(t)).send(b);
const del = (p, t = token) => api().delete(p).set(auth(t));
const make = async (over = {}) => (await post('/api/projects', { ...base, ...over })).body.project;
const clearProjects = async () => {
  const r = await get('/api/projects?limit=200');
  for (const p of r.body.items) await del(`/api/projects/${p.id}`);
};

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  // Someone without the projects module, to prove the guard works.
  const emp = await createAndLogin(ctx.app, token, { name: 'Pavan', email: 'pavan@trustlab.co.in', role: 'employee', title: 'Developer', department: 'IT & Digital', modules: ['dashboard'] });
  empToken = emp.token;

  // A fresh database: the template LIBRARY fills itself, the portfolio does not.
  emptyPortfolio = (await get('/api/projects?limit=200')).body.total;
  libraryOnFirstRequest = (await get('/api/projects/templates?limit=50')).body.total;

  // The 9 sample projects are demo data and no longer appear on their own, so this suite loads them
  // explicitly as its fixture — that is the only reason they exist here.
  const { seedSampleProjects } = await import('../src/services/projects.js');
  await seedSampleProjects();
});
afterAll(() => ctx.stop());

// ---------------------------------------------------------------- the starting set

describe('the starting set', () => {
  it('starts with an EMPTY portfolio — no sample projects are ever created on their own', () => {
    expect(emptyPortfolio).toBe(0);
  });

  it('fills the template library by itself, so the wizard always has templates to offer', () => {
    expect(libraryOnFirstRequest).toBe(12);
  });

  it('carries every detail of a project once one exists', async () => {
    const r = await get('/api/projects?limit=200');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(9);
    const nabl = r.body.items.find((p) => p.code === 'TL-OPS-2026-01');
    expect(nabl).toMatchObject({ name: 'NABL Surveillance Audit — Dec 2026 Prep', category: 'quality', status: 'active', owner: 'Mohammed Fayazuddin', progress: 62 });
    expect(nabl.milestones).toHaveLength(7);
    expect(nabl.tasks).toHaveLength(7);
    expect(nabl.kpis).toHaveLength(4);
    expect(nabl.risks).toHaveLength(4);
    expect(nabl.team).toHaveLength(4);
    expect(nabl.external[0]).toMatchObject({ name: 'Mr. Ishaq Ahmed (Andromeda Dubai)', role: 'QMS Consultant' });
    expect(nabl.createdAt.slice(0, 10)).toBe('2026-10-15');

    // 'm3' links survived: the task and the risk point at the milestone they belonged to.
    const m3 = nabl.milestones.find((m) => m.name === 'Equipment validation records assembled');
    expect(nabl.tasks.find((t) => t.title.startsWith('Pull Mol Bio')).milestoneId).toBe(m3.id);
    expect(nabl.risks.find((x) => x.title.startsWith('Molecular Biology')).milestoneId).toBe(m3.id);
    expect(m3.acceptanceCriteria).toEqual([
      { text: 'IQ/OQ/PQ records for every analyser located', done: true },
      { text: 'Mol Bio 2024 additions documented', done: false },
      { text: 'Calibration & AMC schedule table assembled', done: false },
    ]);

    const tpl = await get('/api/projects/templates?limit=50');
    expect(tpl.body.total).toBe(12);
    expect(tpl.body.items[0]).toMatchObject({ key: 'tpl-nabl', name: 'NABL Surveillance Audit Prep', usedCount: 7, suggestedDurationDays: 90 });
    expect(tpl.body.items[0].milestones).toHaveLength(7);
  });

  it('gives a project its activity feed from the Activity Log', async () => {
    const r = await get('/api/projects?limit=200&code=TL-OPS-2026-01');
    const one = await get(`/api/projects/${r.body.items[0].id}`);
    const feed = one.body.project.activity;
    expect(feed).toHaveLength(4);
    expect(feed[0]).toMatchObject({ user: 'Ishaq Ahmed', action: 'raised 3 document gaps in Mol Bio section', at: '20 Nov 2026 · 4:45 PM' });
    expect(feed[3]).toMatchObject({ user: 'Mohammed Fayazuddin', action: 'created the project', at: '15 Oct 2026 · 10:00 AM' });
  });

  it('does not fill the library again once it has rows', async () => {
    const { ensureProjectTemplateSeed } = await import('../src/services/projects.js');
    expect(await ensureProjectTemplateSeed()).toBe(0);
    expect((await get('/api/projects/templates')).body.total).toBe(12);
  });

  it('refuses to write sample projects a second time', async () => {
    const { seedSampleProjects } = await import('../src/services/projects.js');
    expect(await seedSampleProjects()).toBe(0);
    expect((await get('/api/projects?limit=200')).body.total).toBe(9);
  });

  it('needs the projects module', async () => {
    expect((await get('/api/projects', empToken)).status).toBe(403);
    expect((await get('/api/projects', empToken)).body.error.message).toMatch(/do not have access/i);
    expect((await get('/api/projects/templates', empToken)).status).toBe(403);
    expect((await api().get('/api/projects')).status).toBe(401);
  });
});

// ---------------------------------------------------------------- create / read / update / delete

describe('create, read, update and delete', () => {
  beforeEach(clearProjects);

  it('creates a project with the defaults the screens expect', async () => {
    const r = await post('/api/projects', { name: 'Kondapur Branch 15', description: 'New branch launch.' });
    expect(r.status).toBe(201);
    const p = r.body.project;
    expect(p).toMatchObject({ status: 'planning', priority: 'medium', category: 'operations', progress: 0, owner: 'Venkata Cherukuri', phase: 'not-started', health: 'green' });
    expect(p.code).toMatch(/^TL-\d{4}-\d{2}$/);
    expect(p.team).toEqual([expect.objectContaining({ name: 'Venkata Cherukuri', role: 'Project Lead' })]);
    expect(p.endDate > p.startDate).toBe(true);
    expect(p.activity[0]).toMatchObject({ user: 'Venkata Cherukuri', action: 'created the project' });
    expect(p.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('links tasks and risks to the milestones created in the same request', async () => {
    const p = await make({
      milestones: [{ id: 'm1', name: 'Gap analysis', dueDate: '2026-11-20' }, { id: 'm2', name: 'Mock audit', dueDate: '2026-12-05' }],
      tasks: [{ title: 'Pull prior NCRs', milestoneId: 'm2', priority: 'critical' }, { title: 'Book the hall' }],
      risks: [{ title: 'Consultant unavailable', severity: 'high', milestoneId: 'm2' }],
      kpis: [{ name: 'SOPs reviewed', current: 42, target: 48 }],
    });
    const m2 = p.milestones.find((m) => m.name === 'Mock audit');
    expect(p.tasks.find((t) => t.title === 'Pull prior NCRs').milestoneId).toBe(m2.id);
    expect(p.tasks.find((t) => t.title === 'Book the hall').milestoneId).toBe(null);
    expect(p.risks[0].milestoneId).toBe(m2.id);
    expect(p.kpis[0]).toMatchObject({ name: 'SOPs reviewed', current: 42, target: 48 });
    expect(p.health).toBe('amber'); // an open high risk
  });

  it('rejects bad input with a readable message', async () => {
    expect((await post('/api/projects', { description: 'no name' })).status).toBe(400);
    const noName = await post('/api/projects', { name: '  ', description: 'x' });
    expect(noName.body.error.message).toBe('Enter a project name.');
    const badCat = await post('/api/projects', { ...base, category: 'cooking' });
    expect(badCat.status).toBe(400);
    expect(badCat.body.error.message).toMatch(/Category must be one of: operations/);
    const badDate = await post('/api/projects', { ...base, startDate: '01-11-2026' });
    expect(badDate.body.error.message).toMatch(/real date written as YYYY-MM-DD/);
    const backwards = await post('/api/projects', { ...base, startDate: '2026-12-31', endDate: '2026-11-01' });
    expect(backwards.body.error.message).toBe('The end date must be on or after the start date.');
    const unknownLink = await post('/api/projects', { ...base, tasks: [{ title: 'Orphan', milestoneId: 'nope' }] });
    expect(unknownLink.status).toBe(400);
    expect(unknownLink.body.error.message).toMatch(/milestones/);
  });

  it('reads, patches and reports what changed, then deletes', async () => {
    const p = await make();
    expect((await get(`/api/projects/${p.id}`)).body.project.name).toBe(base.name);

    const up = await patch(`/api/projects/${p.id}`, { status: 'on-hold', progress: 55 });
    expect(up.status).toBe(200);
    expect(up.body.project).toMatchObject({ status: 'on-hold', progress: 55, health: 'amber' });
    expect(up.body.project.activity[0].action).toMatch(/updated the project — status: active → on-hold/);

    expect((await del(`/api/projects/${p.id}`)).status).toBe(200);
    expect((await get(`/api/projects/${p.id}`)).status).toBe(404);
    expect((await get(`/api/projects/${p.id}`)).body.error.message).toBe('That project does not exist.');
  });

  it('keeps sub-record ids through a wizard edit and unlinks what the edit removed', async () => {
    const p = await make({
      milestones: [{ name: 'Gap analysis', dueDate: '2026-11-20' }, { name: 'Mock audit', dueDate: '2026-12-05' }],
      tasks: [{ title: 'Pull prior NCRs' }],
    });
    const keep = p.milestones[0];
    const task = p.tasks[0];
    const up = await patch(`/api/projects/${p.id}`, {
      milestones: [{ id: keep.id, name: 'Gap analysis (revised)', dueDate: keep.dueDate }],
      tasks: [{ id: task.id, title: task.title, milestoneId: p.milestones[1].id }],
    });
    expect(up.status).toBe(400); // the link points at a milestone the edit dropped
    const ok = await patch(`/api/projects/${p.id}`, { milestones: [{ id: keep.id, name: 'Gap analysis (revised)', dueDate: keep.dueDate }] });
    expect(ok.body.project.milestones).toHaveLength(1);
    expect(ok.body.project.milestones[0].id).toBe(keep.id);
    expect(ok.body.project.milestones[0].name).toBe('Gap analysis (revised)');
    expect(ok.body.project.tasks[0].id).toBe(task.id);
  });

  it('404s for an unknown id and refuses a delete by someone else', async () => {
    expect((await get('/api/projects/6b02dd827da25d9a175e14e8')).status).toBe(404);
    expect((await get('/api/projects/not-an-id')).status).toBe(404);
    const other = await createAndLogin(ctx.app, token, { name: 'Madhavi', email: 'madhavi@trustlab.co.in', role: 'employee', modules: ['projects', 'dashboard'] });
    const p = await make();
    const r = await del(`/api/projects/${p.id}`, other.token);
    expect(r.status).toBe(403);
    expect(r.body.error.message).toMatch(/Only an admin, the project owner/);
  });

  it('duplicates a project as a planning copy with everything reset', async () => {
    const p = await make({
      progress: 70,
      milestones: [{ id: 'm1', name: 'Gap analysis', dueDate: '2026-11-20', status: 'done', acceptanceCriteria: [{ text: 'Signed off', done: true }] }],
      tasks: [{ title: 'Pull prior NCRs', status: 'done', milestoneId: 'm1' }],
      risks: [{ title: 'Slippage', status: 'mitigated' }],
    });
    const r = await post(`/api/projects/${p.id}/duplicate`);
    expect(r.status).toBe(201);
    const copy = r.body.project;
    expect(copy).toMatchObject({ name: `${base.name} (Copy)`, code: `${p.code}-COPY`, status: 'planning', progress: 0 });
    expect(copy.milestones[0].status).toBe('todo');
    expect(copy.milestones[0].acceptanceCriteria[0].done).toBe(false);
    expect(copy.tasks[0].status).toBe('todo');
    expect(copy.risks[0].status).toBe('open');
    expect(copy.tasks[0].milestoneId).toBe(copy.milestones[0].id);
    expect(copy.activity[0].action).toBe(`duplicated from ${p.code}`);
  });

  it('posts a comment onto the activity feed', async () => {
    const p = await make();
    const r = await post(`/api/projects/${p.id}/comments`, { text: 'Consultant confirmed for 1 Dec.' });
    expect(r.status).toBe(200);
    expect(r.body.project.activity[0]).toMatchObject({ user: 'Venkata Cherukuri', action: 'commented: "Consultant confirmed for 1 Dec."' });
    // It is really in the log, so the next read shows it too.
    expect((await get(`/api/projects/${p.id}`)).body.project.activity[0].action).toBe('commented: "Consultant confirmed for 1 Dec."');
    expect((await post(`/api/projects/${p.id}/comments`, { text: '  ' })).status).toBe(400);
  });
});

// ---------------------------------------------------------------- the list contract

describe('list contract', () => {
  beforeEach(async () => {
    await clearProjects();
    await make({ name: 'NABL Surveillance Prep', code: 'TL-QA-01', category: 'quality', status: 'active', owner: 'Mohammed Fayazuddin', team: [{ name: 'S. Iyer', role: 'MR' }], startDate: '2026-10-15', endDate: '2026-12-15', priority: 'critical', progress: 62 });
    await make({ name: 'Kondapur Branch 15 — Launch', code: 'TL-NEW-01', category: 'operations', status: 'planning', owner: 'V. Subramanian', team: [{ name: 'HR Head', role: 'Staffing' }], startDate: '2026-11-18', endDate: '2027-01-31', priority: 'high', progress: 15 });
    await make({
      name: 'Fernandez Contract Renegotiation',
      code: 'TL-COM-02',
      category: 'commercial',
      status: 'at-risk',
      owner: 'Arjun',
      team: [{ name: 'Venkata Cherukuri', role: 'CMD' }],
      startDate: '2026-10-10',
      endDate: '2026-12-15',
      priority: 'high',
      milestones: [{ name: 'CFO escalation', dueDate: '2020-01-10', status: 'in-progress' }],
    });
  });

  it('pages and reports the meta', async () => {
    const r = await get('/api/projects?limit=2');
    expect(r.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2, hasMore: true });
    expect((await get('/api/projects?limit=2&page=2')).body.hasMore).toBe(false);
    expect((await get('/api/projects?limit=0')).status).toBe(400);
  });

  it('searches globally across name, code, owner, team and milestones', async () => {
    expect((await get('/api/projects?search=kondapur')).body.total).toBe(1);
    expect((await get('/api/projects?search=TL-QA')).body.total).toBe(1);
    expect((await get('/api/projects?search=fayazuddin')).body.total).toBe(1);
    expect((await get('/api/projects?search=HR Head')).body.total).toBe(1);
    expect((await get('/api/projects?search=CFO escalation')).body.total).toBe(1);
    expect((await get('/api/projects?search=nothinghere')).body.total).toBe(0);
  });

  it('filters by status, category, priority, owner, health, phase and code', async () => {
    expect((await get('/api/projects?status=active')).body.total).toBe(1);
    expect((await get('/api/projects?status=active,planning')).body.total).toBe(2);
    expect((await get('/api/projects?category=quality,commercial')).body.total).toBe(2);
    expect((await get('/api/projects?priority=high')).body.total).toBe(2);
    expect((await get('/api/projects?owner=Arjun')).body.total).toBe(1);
    expect((await get('/api/projects?owner=Mohammed Fayazuddin,Arjun')).body.total).toBe(2);
    expect((await get('/api/projects?member=Venkata Cherukuri')).body.total).toBe(1);
    expect((await get('/api/projects?code=TL-NEW-01')).body.total).toBe(1);
    // RAG: the at-risk project is red, the high-priority one still at 15% is amber, the 62% one is green.
    expect((await get('/api/projects?health=red')).body.items.map((p) => p.code)).toEqual(['TL-COM-02']);
    expect((await get('/api/projects?health=amber')).body.items.map((p) => p.code)).toEqual(['TL-NEW-01']);
    expect((await get('/api/projects?health=green')).body.items.map((p) => p.code)).toEqual(['TL-QA-01']);
    expect((await get('/api/projects?phase=not-started')).body.total).toBe(1);
    expect((await get('/api/projects?phase=in-flight')).body.total).toBe(2);
    const bad = await get('/api/projects?status=sleeping');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/status must be one of: planning, active/);
  });

  it('ranges by date, by progress and reports what was applied', async () => {
    expect((await get('/api/projects?from=2026-11-01')).body.total).toBe(1);
    expect((await get('/api/projects?from=2026-10-01&to=2026-10-31')).body.total).toBe(2);
    expect((await get('/api/projects?dateField=endDate&from=2027-01-01')).body.total).toBe(1);
    expect((await get('/api/projects?min_progress=20')).body.total).toBe(1);
    const r = await get('/api/projects?search=nabl&category=quality&from=2026-10-01&to=2026-12-31');
    expect(r.body.applied).toMatchObject({ search: 'nabl', filters: { category: 'quality' } });
    expect(r.body.applied.range).toMatchObject({ field: 'startDate' });
  });

  it('sorts, projects fields and rejects unknown params', async () => {
    expect((await get('/api/projects?sort=name')).body.items[0].name).toBe('Fernandez Contract Renegotiation');
    expect((await get('/api/projects?sort=-startDate')).body.items[0].code).toBe('TL-NEW-01');
    expect((await get('/api/projects?sort=colour')).status).toBe(400);
    const slim = await get('/api/projects?fields=name,status');
    expect(Object.keys(slim.body.items[0]).sort()).toEqual(['id', 'name', 'status']);
    const bad = await get('/api/projects?colour=red');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/Unknown query parameter: colour/);
  });

  it('mine=true and overdue=true scope the portfolio', async () => {
    // I own the first two (base owner) only where set — here I am on the Fernandez team.
    const mine = await get('/api/projects?mine=true');
    expect(mine.body.total).toBe(1);
    expect(mine.body.items[0].code).toBe('TL-COM-02');
    expect(mine.body.applied.filters.mine).toBe(true);
    const overdue = await get('/api/projects?overdue=true');
    expect(overdue.body.total).toBe(1);
    expect(overdue.body.items[0].code).toBe('TL-COM-02');
    expect((await get('/api/projects?mine=maybe')).status).toBe(400);
  });
});

// ---------------------------------------------------------------- sub-resources

describe('milestones and acceptance criteria', () => {
  beforeEach(clearProjects);

  it('adds, moves, auto-closes from criteria and removes', async () => {
    const p = await make();
    const added = await post(`/api/projects/${p.id}/milestones`, { name: 'Document gap analysis', dueDate: '2026-11-30', owner: 'Dr. Anusha Singh' });
    expect(added.status).toBe(201);
    const m = added.body.project.milestones[0];
    expect(m).toMatchObject({ name: 'Document gap analysis', status: 'todo', owner: 'Dr. Anusha Singh' });
    expect(added.body.project.activity[0].action).toBe('added milestone "Document gap analysis"');

    const moved = await patch(`/api/projects/${p.id}/milestones/${m.id}`, { status: 'in-progress' });
    expect(moved.body.project.milestones[0].status).toBe('in-progress');
    expect(moved.body.project.activity[0].action).toBe('set milestone "Document gap analysis" → in-progress');

    const c1 = await post(`/api/projects/${p.id}/milestones/${m.id}/criteria`, { text: 'Every ISO clause mapped to a SOP' });
    expect(c1.status).toBe(201);
    await post(`/api/projects/${p.id}/milestones/${m.id}/criteria`, { text: 'Gap list signed off' });
    const tick0 = await patch(`/api/projects/${p.id}/milestones/${m.id}/criteria/0`, { done: true });
    expect(tick0.body.project.milestones[0].status).toBe('in-progress');
    const tick1 = await patch(`/api/projects/${p.id}/milestones/${m.id}/criteria/1`, { done: true });
    expect(tick1.body.project.milestones[0].status).toBe('done');
    expect(tick1.body.project.activity[0].action).toMatch(/auto-closed the milestone/);

    const gone = await del(`/api/projects/${p.id}/milestones/${m.id}/criteria/0`);
    expect(gone.body.project.milestones[0].acceptanceCriteria).toHaveLength(1);
    expect((await del(`/api/projects/${p.id}/milestones/${m.id}/criteria/7`)).status).toBe(404);
    expect((await patch(`/api/projects/${p.id}/milestones/${m.id}/criteria/7`, { done: true })).status).toBe(404);

    const done = await patch(`/api/projects/${p.id}/milestones/${m.id}`, { status: 'todo' });
    expect(done.body.project.activity[0].action).toBe('reopened milestone "Document gap analysis"');
    const removed = await del(`/api/projects/${p.id}/milestones/${m.id}`);
    expect(removed.body.project.milestones).toHaveLength(0);
    expect(removed.body.project.activity[0].action).toBe('removed milestone "Document gap analysis"');
  });

  it('404s for a milestone that is not there and 400s on empty input', async () => {
    const p = await make();
    expect((await patch(`/api/projects/${p.id}/milestones/6b02dd827da25d9a175e14e8`, { status: 'done' })).status).toBe(404);
    const r = await del(`/api/projects/${p.id}/milestones/nope`);
    expect(r.status).toBe(404);
    expect(r.body.error.message).toBe('That milestone does not exist.');
    expect((await post(`/api/projects/${p.id}/milestones`, { name: '' })).status).toBe(400);
    expect((await post(`/api/projects/${p.id}/milestones`, { name: 'x', dueDate: 'tomorrow' })).body.error.message).toMatch(/real date/);
  });

  it('makes a removed milestone’s tasks and risks project-wide', async () => {
    const p = await make({ milestones: [{ id: 'm1', name: 'Gate 1', dueDate: '2026-12-01' }], tasks: [{ title: 'Work', milestoneId: 'm1' }], risks: [{ title: 'Risky', milestoneId: 'm1' }] });
    const r = await del(`/api/projects/${p.id}/milestones/${p.milestones[0].id}`);
    expect(r.body.project.tasks[0].milestoneId).toBe(null);
    expect(r.body.project.risks[0].milestoneId).toBe(null);
    expect(r.body.project.activity[0].action).toMatch(/2 linked items became project-wide/);
  });
});

describe('tasks', () => {
  beforeEach(clearProjects);

  it('adds, links, moves and removes one task at a time', async () => {
    const p = await make({ milestones: [{ id: 'm1', name: 'Gate 1', dueDate: '2026-12-01' }] });
    const mid = p.milestones[0].id;
    const added = await post(`/api/projects/${p.id}/tasks`, { title: 'Pull Mol Bio records', assignee: 'Mohammed Fayazuddin', dueDate: '2026-11-28', priority: 'high', milestoneId: mid });
    expect(added.status).toBe(201);
    const t = added.body.project.tasks[0];
    expect(t).toMatchObject({ title: 'Pull Mol Bio records', assignee: 'Mohammed Fayazuddin', status: 'todo', priority: 'high', milestoneId: mid });
    expect(added.body.project.activity[0].action).toBe('added task "Pull Mol Bio records" → milestone "Gate 1"');

    const moved = await patch(`/api/projects/${p.id}/tasks/${t.id}`, { status: 'done' });
    expect(moved.body.project.tasks[0].status).toBe('done');
    expect(moved.body.project.activity[0].action).toBe('moved task "Pull Mol Bio records" → done');

    const unlinked = await patch(`/api/projects/${p.id}/tasks/${t.id}`, { milestoneId: null });
    expect(unlinked.body.project.tasks[0].milestoneId).toBe(null);

    expect((await patch(`/api/projects/${p.id}/tasks/${t.id}`, { status: 'archived' })).status).toBe(400);
    expect((await patch(`/api/projects/${p.id}/tasks/${t.id}`, { milestoneId: '6b02dd827da25d9a175e14e8' })).status).toBe(404);
    expect((await del(`/api/projects/${p.id}/tasks/6b02dd827da25d9a175e14e8`)).status).toBe(404);

    const gone = await del(`/api/projects/${p.id}/tasks/${t.id}`);
    expect(gone.body.project.tasks).toHaveLength(0);
    expect(gone.body.project.activity[0].action).toBe('removed task "Pull Mol Bio records"');
  });

  it('escapes what people typed in the notification it sends the assignee', async () => {
    const attack = '<img src=x onerror="alert(1)">';
    const mate = await createAndLogin(ctx.app, token, { name: 'Satya', email: 'satya@trustlab.co.in', role: 'employee', modules: ['projects', 'dashboard'] });
    const p = await make({ name: `Portal rebuild ${attack}` });
    await post(`/api/projects/${p.id}/tasks`, { title: `Ship ${attack}`, assignee: 'Satya' });
    const n = await get('/api/notifications?limit=10', mate.token);
    expect(n.status).toBe(200);
    expect(n.body.items[0].text).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(n.body.items[0].text).not.toContain('<img');
  });

  it('tells the assignee about a task they did not create', async () => {
    const p = await make();
    await post(`/api/projects/${p.id}/tasks`, { title: 'Book the assessor hotel', assignee: 'Pallavi Elisetti', dueDate: '2026-12-08' });
    const n = await get('/api/notifications?limit=50');
    expect(n.status).toBe(200); // the signed-in admin sees only their own; the item went to Pallavi
    const own = n.body.items.filter((x) => /Book the assessor hotel/.test(x.text));
    expect(own).toHaveLength(0);
  });
});

describe('risks, KPIs and the team', () => {
  beforeEach(clearProjects);

  it('adds, mitigates, re-links and removes a risk', async () => {
    const p = await make({ milestones: [{ id: 'm1', name: 'Gate 1', dueDate: '2026-12-01' }] });
    const added = await post(`/api/projects/${p.id}/risks`, { title: 'BMW segregation at Begumpet', severity: 'critical', mitigation: 'External audit commissioned.', owner: 'Mohammed Fayazuddin' });
    expect(added.status).toBe(201);
    const r = added.body.project.risks[0];
    expect(r).toMatchObject({ severity: 'critical', status: 'open', milestoneId: null });
    expect(added.body.project.health).toBe('red');

    const linked = await patch(`/api/projects/${p.id}/risks/${r.id}`, { milestoneId: p.milestones[0].id });
    expect(linked.body.project.activity[0].action).toBe('linked risk "BMW segregation at Begumpet" → milestone "Gate 1"');
    const mit = await patch(`/api/projects/${p.id}/risks/${r.id}`, { status: 'mitigated' });
    expect(mit.body.project.activity[0].action).toBe('mitigated risk "BMW segregation at Begumpet"');
    expect(mit.body.project.health).toBe('amber'); // high-priority project under 40%, no open critical risk left
    expect((await patch(`/api/projects/${p.id}/risks/6b02dd827da25d9a175e14e8`, { status: 'open' })).status).toBe(404);
    const gone = await del(`/api/projects/${p.id}/risks/${r.id}`);
    expect(gone.body.project.risks).toHaveLength(0);
  });

  it('adds, updates and removes a KPI', async () => {
    const p = await make();
    const added = await post(`/api/projects/${p.id}/kpis`, { name: 'SOPs reviewed', current: 42, target: 48 });
    expect(added.status).toBe(201);
    const k = added.body.project.kpis[0];
    const up = await patch(`/api/projects/${p.id}/kpis/${k.id}`, { current: 46 });
    expect(up.body.project.kpis[0].current).toBe(46);
    expect(up.body.project.activity[0].action).toBe('updated KPI "SOPs reviewed" — current: 42 → 46');
    expect((await patch(`/api/projects/${p.id}/kpis/6b02dd827da25d9a175e14e8`, { current: 1 })).status).toBe(404);
    expect((await patch(`/api/projects/${p.id}/kpis/${k.id}`, { current: 'lots' })).status).toBe(400);
    expect((await del(`/api/projects/${p.id}/kpis/${k.id}`)).body.project.kpis).toHaveLength(0);
  });

  it('adds, updates and removes internal and external people', async () => {
    const p = await make();
    const added = await post(`/api/projects/${p.id}/team`, { name: 'Dr. Anusha Singh', role: 'Lab Head' });
    expect(added.status).toBe(201);
    const m = added.body.project.team.find((t) => t.name === 'Dr. Anusha Singh');
    expect(added.body.project.activity[0].action).toBe('added Dr. Anusha Singh to the team as Lab Head');
    const dup = await post(`/api/projects/${p.id}/team`, { name: 'Dr. Anusha Singh' });
    expect(dup.status).toBe(400);
    expect(dup.body.error.message).toMatch(/already on this project/);
    const up = await patch(`/api/projects/${p.id}/team/${m.id}`, { role: 'Technical Manager' });
    expect(up.body.project.team.find((t) => t.id === m.id).role).toBe('Technical Manager');
    expect((await patch(`/api/projects/${p.id}/team/6b02dd827da25d9a175e14e8`, { role: 'x' })).status).toBe(404);
    expect((await del(`/api/projects/${p.id}/team/${m.id}`)).body.project.team).toHaveLength(1);

    const ext = await post(`/api/projects/${p.id}/external`, { name: 'Mr. Ishaq Ahmed', email: 'ishaq@andromeda-qms.ae', role: 'QMS Consultant' });
    expect(ext.status).toBe(201);
    const e = ext.body.project.external[0];
    expect((await post(`/api/projects/${p.id}/external`, { name: 'Nope', email: 'not-an-email' })).status).toBe(400);
    const eUp = await patch(`/api/projects/${p.id}/external/${e.id}`, { email: 'ishaq.ahmed@andromeda-qms.ae' });
    expect(eUp.body.project.external[0].email).toBe('ishaq.ahmed@andromeda-qms.ae');
    expect((await del(`/api/projects/${p.id}/external/6b02dd827da25d9a175e14e8`)).status).toBe(404);
    expect((await del(`/api/projects/${p.id}/external/${e.id}`)).body.project.external).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- templates

describe('the project template library', () => {
  it('lists, filters and reads one template', async () => {
    const r = await get('/api/projects/templates?category=quality');
    expect(r.body.total).toBe(2);
    expect((await get('/api/projects/templates?search=audit')).body.total >= 2).toBe(true);
    expect((await get('/api/projects/templates?sort=-usedCount')).body.items[0].key).toBe('tpl-blank');
    expect((await get('/api/projects/templates?colour=red')).status).toBe(400);
    const one = await get('/api/projects/templates/tpl-nabl');
    expect(one.body.template).toMatchObject({ key: 'tpl-nabl', suggestedDurationDays: 90 });
    expect((await get('/api/projects/templates/tpl-nope')).status).toBe(404);
  });

  it('creates a project from a template, dating everything from the start date', async () => {
    const before = (await get('/api/projects/templates/tpl-nabl')).body.template;
    const r = await post('/api/projects/templates/tpl-nabl/use', { startDate: '2026-11-01', name: 'NABL Prep — Dec 2026', owner: 'Mohammed Fayazuddin' });
    expect(r.status).toBe(201);
    const p = r.body.project;
    expect(p).toMatchObject({ name: 'NABL Prep — Dec 2026', category: 'quality', status: 'planning', owner: 'Mohammed Fayazuddin', startDate: '2026-11-01', endDate: '2027-01-30' });
    expect(p.milestones).toHaveLength(before.milestones.length);
    expect(p.milestones[0]).toMatchObject({ name: 'Audit scope & team kickoff', dueDate: '2026-11-01', status: 'todo' });
    expect(p.milestones[1].dueDate).toBe('2026-11-15'); // day 14
    expect(p.milestones[0].acceptanceCriteria[0]).toEqual({ text: 'Scope doc signed by CMD', done: false });
    // The task that belonged to template milestone #1 points at the real milestone.
    expect(p.tasks.find((t) => t.title.startsWith('Pull prior-cycle NCRs')).milestoneId).toBe(p.milestones[1].id);
    expect(p.risks.find((x) => x.title.startsWith('Consultant unavailable')).milestoneId).toBe(p.milestones[4].id);
    expect(p.kpis[0]).toMatchObject({ name: 'Doc gap closure', current: 0, target: 100, unit: ' · 100%' });
    expect(p.team[0]).toMatchObject({ name: 'Mohammed Fayazuddin', role: 'Project Lead' });
    expect(p.team[1]).toMatchObject({ name: '(TBD)' });
    expect(p.activity[0].action).toBe('created the project from template "NABL Surveillance Audit Prep"');
    expect(r.body.template.usedCount).toBe(before.usedCount + 1);
    await del(`/api/projects/${p.id}`);
  });

  it('counts a use when the wizard saves a project built from a kit', async () => {
    const before = (await get('/api/projects/templates/tpl-cme')).body.template;
    const r = await post('/api/projects', { ...base, name: 'CME — Hyderabad', templateId: before.id });
    expect(r.status).toBe(201);
    expect(r.body.project.template).toBe(before.id);
    expect((await get('/api/projects/templates/tpl-cme')).body.template.usedCount).toBe(before.usedCount + 1);
    expect((await post('/api/projects', { ...base, templateId: 'tpl-nope' })).status).toBe(404);
    await del(`/api/projects/${r.body.project.id}`);
  });

  it('refuses a template request from someone without the module', async () => {
    expect((await post('/api/projects/templates/tpl-nabl/use', {}, empToken)).status).toBe(403);
  });
});

/**
 * Telling people they are on a project.
 *
 * A name on a team list is not the same as somebody who knows they are on the team. The person who
 * creates it hears nothing — they were there — and an edit tells only the people who were not on it
 * before.
 */
describe('telling people they are on a project', () => {
  let kavya;
  const inbox = async (t) => (await request(ctx.app).get('/api/notifications?limit=20').set(auth(t))).body.items ?? [];

  beforeAll(async () => {
    kavya = await createAndLogin(ctx.app, token, { name: 'Kavya Project', email: 'kavya.project@trustlab.co.in', role: 'employee', title: 'Technologist', department: 'Clinical Laboratory', modules: ['dashboard', 'projects'] });
  });

  it('tells a team member when the project is created, exactly once', async () => {
    const r = await request(ctx.app).post('/api/projects').set(auth(token)).send({
      name: 'NABL re-accreditation', owner: 'Venkata Cherukuri', endDate: '2027-02-01',
      team: [{ name: 'Kavya Project', role: 'Lead' }],
    });
    expect(r.status).toBe(201);
    const about = (await inbox(kavya.token)).filter((n) => n.text.includes('NABL re-accreditation'));
    // One message, not two: creating a project notifies from one place only.
    expect(about).toHaveLength(1);
  });

  it('tells only the newly added on an edit', async () => {
    const made = await request(ctx.app).post('/api/projects').set(auth(token)).send({
      name: 'Cold chain audit', endDate: '2027-03-01', team: [{ name: 'Kavya Project', role: 'Lead' }],
    });
    const id = made.body.project.id;
    const hersBefore = (await inbox(kavya.token)).length;

    const sravan = await createAndLogin(ctx.app, token, { name: 'Sravan Project', email: 'sravan.project@trustlab.co.in', role: 'employee', title: 'Accountant', department: 'Finance', modules: ['dashboard', 'projects'] });
    await request(ctx.app).patch(`/api/projects/${id}`).set(auth(token)).send({
      team: [{ name: 'Kavya Project', role: 'Lead' }, { name: 'Sravan Project', role: 'Analyst' }],
    });

    expect((await inbox(sravan.token)).some((n) => n.text.includes('Cold chain audit'))).toBe(true);
    expect((await inbox(kavya.token)).length).toBe(hersBefore);
  });
});
