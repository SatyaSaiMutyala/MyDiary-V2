import mongoose from 'mongoose';
import { config } from '../config.js';
import { PROJECT_SEED, PROJECT_TEMPLATE_SEED } from '../data/projects.js';
import { AuditLog } from '../models/AuditLog.js';
import { Project, serializeProject } from '../models/Project.js';
import { ProjectTemplate } from '../models/ProjectTemplate.js';
import { badRequest, notFound } from '../utils/errors.js';
import { listResponse, pickFields } from '../utils/paginate.js';
import { MODULE_LABELS } from './audit.js';
import { nameClause, plusDays, todayStr } from './people.js';

/** The Activity Log module label every project change is filed under. */
export const PROJECT_MODULE = MODULE_LABELS.projects;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '20 Nov 2026 · 4:45 PM' — the stamp the activity feed shows (no time when it is midnight). @param {Date} d */
export function formatActivityAt(d) {
  const date = `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (d.getHours() === 0 && d.getMinutes() === 0) return date;
  const h = d.getHours() % 12 || 12;
  return `${date} · ${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Reads a stamp written the way `formatActivityAt` writes it; null when it is not one. @param {string} s */
function parseActivityAt(s) {
  const [datePart, timePart] = String(s).split('·').map((x) => x.trim());
  const d = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(datePart ?? '');
  if (!d) return null;
  const month = MONTHS.indexOf(d[2]);
  if (month < 0) return null;
  let hours = 0;
  let minutes = 0;
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timePart ?? '');
  if (t) {
    hours = Number(t[1]) % 12 + (/pm/i.test(t[3]) ? 12 : 0);
    minutes = Number(t[2]);
  }
  return new Date(Number(d[3]), month, Number(d[1]), hours, minutes, 0, 0);
}

// ---------- lookups ----------

/** @param {string} id */
export async function findProjectOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That project does not exist.');
  const p = await Project.findById(id);
  if (!p) throw notFound('That project does not exist.');
  return p;
}

/** A template by its id or by its `key` ('tpl-nabl'). @param {string} id */
export async function findTemplateOr404(id) {
  const t = mongoose.isValidObjectId(id) ? await ProjectTemplate.findById(id) : await ProjectTemplate.findOne({ key: id });
  if (!t) throw notFound('That project template does not exist.');
  return t;
}

/**
 * One embedded record by id, or 404 with a message naming what was looked for.
 * @param {any[]} list @param {string} id @param {string} label e.g. 'task'
 */
function subOr404(list, id, label) {
  const hit = mongoose.isValidObjectId(id) ? list.id(id) : null;
  if (!hit) throw notFound(`That ${label} does not exist.`);
  return hit;
}

/** @param {any} p @param {string} id */
export const milestoneOr404 = (p, id) => subOr404(p.milestones, id, 'milestone');
/** @param {any} p @param {string} id */
export const taskOr404 = (p, id) => subOr404(p.tasks, id, 'task');
/** @param {any} p @param {string} id */
export const riskOr404 = (p, id) => subOr404(p.risks, id, 'risk');
/** @param {any} p @param {string} id */
export const kpiOr404 = (p, id) => subOr404(p.kpis, id, 'KPI');
/** @param {any} p @param {string} id */
export const teamMemberOr404 = (p, id) => subOr404(p.team, id, 'team member');
/** @param {any} p @param {string} id */
export const externalOr404 = (p, id) => subOr404(p.external, id, 'external collaborator');

/** One acceptance criterion of a milestone by its position. @param {any} m @param {number} index */
export function criterionOr404(m, index) {
  const c = (m.acceptanceCriteria ?? [])[index];
  if (!c) throw notFound('That acceptance criterion does not exist.');
  return c;
}

// ---------- list filters ----------

/** `owner=` / `member=` tolerate the "(role)" suffix the web puts on names. @param {string} name */
export const ownerClause = (name) => nameClause('owner', name);
/** Projects this person owns or is on the team of (the web's `isMine`). @param {string} name */
export const mineClause = (name) => ({ $or: [nameClause('owner', name), nameClause('team.name', name)] });
/** Anyone on the project: owner, internal team or external collaborator. @param {string} name */
export const memberClause = (name) => ({ $or: [nameClause('owner', name), nameClause('team.name', name), nameClause('external.name', name)] });
/** Projects with at least one milestone that is not done and whose due date has passed. */
export const overdueClause = () => ({ milestones: { $elemMatch: { status: { $ne: 'done' }, dueDate: { $gt: '', $lt: todayStr() } } } });

/** GET /api/projects — the standard list envelope. @param {import('../utils/listQuery.js').ListQuery} lq */
export async function listProjects(lq) {
  const [docs, total] = await Promise.all([Project.find(lq.filter).sort(lq.sort).skip(lq.skip).limit(lq.limit), Project.countDocuments(lq.filter)]);
  // Lists leave the activity feed out; it is read per project (GET /api/projects/:id).
  const items = docs.map((d) => pickFields(serializeProject(d), lq.fields));
  return listResponse(items, total, lq);
}

// ---------- the activity feed ----------

/**
 * The project's activity feed, newest first — read back from the Activity Log, so it only ever contains
 * changes that really happened (middleware/audit.js writes one line per successful mutating request from
 * `res.locals.audit`).
 * @param {any} projectId @param {number} [limit]
 */
export async function projectActivity(projectId, limit = 60) {
  const rows = await AuditLog.find({ module: PROJECT_MODULE, entityId: String(projectId), details: { $ne: '' } })
    .sort({ at: -1, _id: -1 })
    .limit(limit);
  return rows.map((e) => ({ user: e.user?.name || 'System', action: e.details, at: formatActivityAt(e.at), atIso: e.at.toISOString() }));
}

/** The project with its feed embedded. @param {any} p */
export async function withActivity(p) {
  return serializeProject(p, await projectActivity(p._id));
}

// ---------- building embedded lists ----------

const clean = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

/**
 * Rebuilds an embedded list from a request: entries that carry the `id` of a record that is still there keep
 * that record (and its id), everything else becomes a new record. Anything the request leaves out is dropped.
 * @template T
 * @param {any[]} current @param {any[]} incoming @param {(raw: any, prev: any | null, id: any) => T} build
 */
function rebuild(current, incoming, build) {
  const byId = new Map((current ?? []).map((d) => [d._id.toString(), d]));
  return incoming.map((raw) => {
    const prev = raw.id && mongoose.isValidObjectId(raw.id) ? (byId.get(String(raw.id)) ?? null) : null;
    return build(raw, prev, prev ? prev._id : new mongoose.Types.ObjectId());
  });
}

/** @param {any[]} current @param {any[]} incoming */
function buildMilestones(current, incoming) {
  /** @type {Map<string, any>} */
  const refs = new Map();
  const milestones = rebuild(current, incoming, (raw, prev, id) => {
    if (raw.id) refs.set(String(raw.id), id);
    return {
      _id: id,
      name: raw.name,
      dueDate: clean(raw.dueDate, prev?.dueDate ?? ''),
      status: clean(raw.status, prev?.status ?? 'todo'),
      owner: clean(raw.owner, prev?.owner ?? ''),
      description: clean(raw.description, prev?.description ?? ''),
      acceptanceCriteria: (raw.acceptanceCriteria ?? prev?.acceptanceCriteria ?? []).map((/** @type {any} */ c) => ({ text: c.text, done: !!c.done })),
    };
  });
  milestones.forEach((m, i) => refs.set(`#${i}`, m._id));
  return { milestones, refs };
}

/**
 * Turns a `milestoneId` sent by the client into the id of a milestone of this project. Accepts a milestone id
 * from the same request, a position ('#2'), '' / null for project-level work.
 * @param {Map<string, any>} refs @param {unknown} value @param {string} field
 */
function resolveMilestone(refs, value, field) {
  if (value === undefined || value === null || value === '') return null;
  const hit = refs.get(String(value));
  if (!hit) throw badRequest('Link this to one of the project’s milestones, or leave the milestone blank.', [{ field, message: `Unknown milestone "${value}".` }]);
  return hit;
}

/** The map of milestone ids a project already has, for resolving links on sub-resource requests. @param {any} p */
export function milestoneRefs(p) {
  /** @type {Map<string, any>} */
  const refs = new Map();
  (p.milestones ?? []).forEach((m, i) => {
    refs.set(m._id.toString(), m._id);
    refs.set(`#${i}`, m._id);
  });
  return refs;
}

/** @param {any[]} current @param {any[]} incoming @param {Map<string, any>} refs */
const buildTasks = (current, incoming, refs) =>
  rebuild(current, incoming, (raw, prev, id) => ({
    _id: id,
    title: raw.title,
    assignee: clean(raw.assignee, prev?.assignee ?? ''),
    status: clean(raw.status, prev?.status ?? 'todo'),
    dueDate: clean(raw.dueDate, prev?.dueDate ?? ''),
    priority: clean(raw.priority, prev?.priority ?? 'medium'),
    milestoneId: raw.milestoneId === undefined ? (prev?.milestoneId ?? null) : resolveMilestone(refs, raw.milestoneId, 'tasks.milestoneId'),
  }));

/** @param {any[]} current @param {any[]} incoming @param {Map<string, any>} refs */
const buildRisks = (current, incoming, refs) =>
  rebuild(current, incoming, (raw, prev, id) => ({
    _id: id,
    title: raw.title,
    severity: clean(raw.severity, prev?.severity ?? 'medium'),
    mitigation: clean(raw.mitigation, prev?.mitigation ?? ''),
    owner: clean(raw.owner, prev?.owner ?? ''),
    status: clean(raw.status, prev?.status ?? 'open'),
    milestoneId: raw.milestoneId === undefined ? (prev?.milestoneId ?? null) : resolveMilestone(refs, raw.milestoneId, 'risks.milestoneId'),
  }));

/** @param {any[]} current @param {any[]} incoming */
const buildKpis = (current, incoming) =>
  rebuild(current, incoming, (raw, prev, id) => ({ _id: id, name: raw.name, current: clean(raw.current, prev?.current ?? 0), target: clean(raw.target, prev?.target ?? 100), unit: clean(raw.unit, prev?.unit ?? '') }));

/** @param {any[]} current @param {any[]} incoming */
const buildTeam = (current, incoming) => rebuild(current, incoming, (raw, prev, id) => ({ _id: id, name: raw.name, role: clean(raw.role, prev?.role ?? '') }));

/** @param {any[]} current @param {any[]} incoming */
const buildExternal = (current, incoming) => rebuild(current, incoming, (raw, prev, id) => ({ _id: id, name: raw.name, email: clean(raw.email, prev?.email ?? ''), role: clean(raw.role, prev?.role ?? '') }));

// ---------- create / update ----------

/** 'TL-2026-07' — the next free code in this year's series, the way the web's blank draft numbers them. */
export async function nextProjectCode() {
  const year = new Date().getFullYear();
  const n = (await Project.countDocuments({})) + 1;
  const base = `TL-${year}-`;
  for (let i = n; i < n + 200; i += 1) {
    const code = base + String(i).padStart(2, '0');
    if (!(await Project.exists({ code }))) return code;
  }
  return base + Date.now();
}

/**
 * Creates a project from a validated body. Tasks and risks may link to the milestones in the same request by
 * their id or position.
 * @param {Record<string, any>} input @param {any} me @param {any} [template] the ProjectTemplate it came from
 */
export async function createProject(input, me, template = null) {
  const { milestones, refs } = buildMilestones([], input.milestones ?? []);
  const start = input.startDate || todayStr();
  return Project.create({
    code: input.code || (await nextProjectCode()),
    name: input.name,
    description: input.description ?? '',
    category: input.category ?? 'operations',
    priority: input.priority ?? 'medium',
    status: input.status ?? 'planning',
    owner: input.owner || me.name,
    startDate: start,
    endDate: input.endDate || plusDays(60, new Date(`${start}T00:00:00`)),
    progress: input.progress ?? 0,
    team: buildTeam([], input.team ?? [{ name: me.name, role: 'Project Lead' }]),
    external: buildExternal([], input.external ?? []),
    milestones,
    tasks: buildTasks([], input.tasks ?? [], refs),
    kpis: buildKpis([], input.kpis ?? []),
    risks: buildRisks([], input.risks ?? [], refs),
    template: template ? template._id : null,
    createdBy: { id: me._id, name: me.name },
  });
}

/** Fields `describeChanges` reports on a PATCH. */
export const PROJECT_CHANGE_FIELDS = ['code', 'name', 'description', 'category', 'priority', 'status', 'owner', 'startDate', 'endDate', 'progress', 'team', 'external', 'milestones', 'tasks', 'kpis', 'risks'];

/** A flat before/after picture of a project, for `describeChanges`. @param {any} p */
export const projectSnapshot = (p) => ({
  code: p.code,
  name: p.name,
  description: p.description,
  category: p.category,
  priority: p.priority,
  status: p.status,
  owner: p.owner,
  startDate: p.startDate,
  endDate: p.endDate,
  progress: p.progress,
  team: (p.team ?? []).map((/** @type {any} */ t) => t.name),
  external: (p.external ?? []).map((/** @type {any} */ e) => e.name),
  milestones: (p.milestones ?? []).map((/** @type {any} */ m) => m.name),
  tasks: (p.tasks ?? []).map((/** @type {any} */ t) => t.title),
  kpis: (p.kpis ?? []).map((/** @type {any} */ k) => k.name),
  risks: (p.risks ?? []).map((/** @type {any} */ r) => r.title),
});

/**
 * Applies a partial update. Any embedded list that is sent replaces the stored one, keeping the ids of the
 * records that are still in it (so links from tasks and risks survive an edit in the wizard).
 * @param {any} p @param {Record<string, any>} patch
 */
export async function patchProject(p, patch) {
  const before = projectSnapshot(p);
  for (const f of ['code', 'name', 'description', 'category', 'priority', 'status', 'owner', 'startDate', 'endDate', 'progress']) {
    if (patch[f] !== undefined) p[f] = patch[f];
  }
  if (patch.team !== undefined) p.team = buildTeam(p.team, patch.team);
  if (patch.external !== undefined) p.external = buildExternal(p.external, patch.external);

  let refs = milestoneRefs(p);
  if (patch.milestones !== undefined) {
    const built = buildMilestones(p.milestones, patch.milestones);
    p.milestones = built.milestones;
    refs = built.refs;
    // Tasks and risks that pointed at a milestone the edit removed become project-level.
    const kept = new Set(built.milestones.map((m) => m._id.toString()));
    for (const t of p.tasks) if (t.milestoneId && !kept.has(t.milestoneId.toString())) t.milestoneId = null;
    for (const r of p.risks) if (r.milestoneId && !kept.has(r.milestoneId.toString())) r.milestoneId = null;
  }
  if (patch.tasks !== undefined) p.tasks = buildTasks(p.tasks, patch.tasks, refs);
  if (patch.kpis !== undefined) p.kpis = buildKpis(p.kpis, patch.kpis);
  if (patch.risks !== undefined) p.risks = buildRisks(p.risks, patch.risks, refs);
  await p.save();
  return before;
}

/**
 * The web's duplicateProject(): a planning copy named "… (Copy)" with code "…-COPY", progress reset and every
 * milestone and task back to "to do".
 * @param {any} p @param {any} me
 */
export function duplicateProject(p, me) {
  const src = p.toObject();
  delete src._id;
  delete src.createdAt;
  delete src.updatedAt;
  return Project.create({
    ...src,
    code: `${p.code}-COPY`,
    name: `${p.name} (Copy)`,
    status: 'planning',
    progress: 0,
    milestones: (src.milestones ?? []).map((/** @type {any} */ m) => ({ ...m, status: 'todo', acceptanceCriteria: (m.acceptanceCriteria ?? []).map((/** @type {any} */ c) => ({ text: c.text, done: false })) })),
    tasks: (src.tasks ?? []).map((/** @type {any} */ t) => ({ ...t, status: 'todo' })),
    risks: (src.risks ?? []).map((/** @type {any} */ r) => ({ ...r, status: 'open' })),
    createdBy: { id: me._id, name: me.name },
  });
}

// ---------- templates ----------

/**
 * Starts a project from a template: day offsets become real dates from the start date, template milestone
 * positions become real milestone links, and the template's used count goes up by one.
 * @param {any} t a ProjectTemplate document
 * @param {{ startDate?: string, name?: string, owner?: string, code?: string, priority?: string, status?: string }} input
 * @param {any} me
 */
export async function projectFromTemplate(t, input, me) {
  const startDate = input.startDate || todayStr();
  const from = new Date(`${startDate}T00:00:00`);
  const at = (/** @type {number} */ offset) => plusDays(offset ?? 0, from);
  const blank = t.key === 'tpl-blank';

  const project = await createProject(
    {
      code: input.code,
      // The blank kit carries no content, so only its name is used (a client that knows better sends one).
      name: input.name || t.name,
      description: blank ? '' : t.description,
      category: t.category,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'planning',
      owner: input.owner || me.name,
      startDate,
      endDate: at(t.suggestedDurationDays),
      progress: 0,
      team: [{ name: input.owner || me.name, role: 'Project Lead' }, ...(t.teamRoles ?? []).filter((/** @type {string} */ r) => r !== 'Project Lead').map((/** @type {string} */ role) => ({ name: '(TBD)', role }))],
      milestones: (t.milestones ?? []).map((/** @type {any} */ m) => ({
        name: m.name,
        dueDate: at(m.dayOffset),
        status: 'todo',
        owner: input.owner || me.name,
        description: '',
        acceptanceCriteria: (m.acceptanceCriteria ?? []).map((/** @type {string} */ text) => ({ text, done: false })),
      })),
      tasks: (t.tasks ?? []).map((/** @type {any} */ tk) => ({
        title: tk.name,
        assignee: '(unassigned)',
        dueDate: at(tk.dayOffset),
        status: 'todo',
        priority: 'medium',
        milestoneId: tk.milestoneIdx === null || tk.milestoneIdx === undefined ? null : `#${tk.milestoneIdx}`,
      })),
      // A template KPI only states the target in words ('≥ 95%'), so it becomes a 0 → 100 bar with that text.
      kpis: (t.kpis ?? []).map((/** @type {any} */ k) => ({ name: k.name, current: 0, target: 100, unit: ` · ${k.target}` })),
      risks: (t.risks ?? []).map((/** @type {any} */ r) => ({
        title: r.name,
        severity: r.impact,
        mitigation: r.mitigation ?? '',
        owner: input.owner || me.name,
        status: 'open',
        milestoneId: r.milestoneIdx === null || r.milestoneIdx === undefined ? null : `#${r.milestoneIdx}`,
      })),
    },
    me,
    t,
  );
  await ProjectTemplate.updateOne({ _id: t._id }, { $inc: { usedCount: 1 } });
  return project;
}

/** Counts one use of a template (the web wizard bumps it when a project built from a kit is saved). @param {any} id */
export const bumpTemplateUse = (id) => ProjectTemplate.updateOne({ _id: id }, { $inc: { usedCount: 1 } });

// ---------- the starting set ----------

/** @param {any} s a PROJECT_TEMPLATE_SEED entry @param {number} idx */
function templateSeedDoc(s, idx) {
  return {
    key: s.id,
    emoji: s.emoji,
    category: s.category,
    name: s.name,
    description: s.description,
    suggestedDurationDays: s.suggestedDurationDays,
    usedCount: s.usedCount ?? 0,
    teamRoles: [...(s.teamRoles ?? [])],
    milestones: (s.milestones ?? []).map((m) => ({ name: m.name, dayOffset: m.dayOffset, acceptanceCriteria: [...(m.acceptanceCriteria ?? [])] })),
    tasks: (s.tasks ?? []).map((t) => ({ name: t.name, dayOffset: t.dayOffset, milestoneIdx: t.milestoneIdx ?? null })),
    kpis: (s.kpis ?? []).map((k) => ({ name: k.name, target: String(k.target ?? '') })),
    risks: (s.risks ?? []).map((r) => ({ name: r.name, impact: r.impact ?? 'medium', mitigation: r.mitigation ?? '', milestoneIdx: r.milestoneIdx ?? null })),
    order: idx + 1,
  };
}

/** @param {any} s a PROJECT_SEED entry */
function projectSeedDoc(s) {
  /** @type {Map<string, any>} */
  const refs = new Map();
  const milestones = (s.milestones ?? []).map((m) => {
    const _id = new mongoose.Types.ObjectId();
    refs.set(m.id, _id);
    return {
      _id,
      name: m.name,
      dueDate: m.dueDate,
      status: m.status,
      owner: m.owner ?? '',
      description: m.description ?? '',
      acceptanceCriteria: (m.acceptanceCriteria ?? []).map((c) => ({ text: c.text, done: !!c.done })),
    };
  });
  const link = (/** @type {string | null | undefined} */ id) => (id ? (refs.get(id) ?? null) : null);
  return {
    code: s.code,
    name: s.name,
    description: s.description,
    category: s.category,
    priority: s.priority,
    status: s.status,
    owner: s.owner,
    startDate: s.startDate,
    endDate: s.endDate,
    progress: s.progress ?? 0,
    team: (s.team ?? []).map((t) => ({ name: t.name, role: t.role ?? '' })),
    external: (s.external ?? []).map((e) => ({ name: e.name, email: e.email ?? '', role: e.role ?? '' })),
    milestones,
    tasks: (s.tasks ?? []).map((t) => ({ title: t.title, assignee: t.assignee ?? '', status: t.status, dueDate: t.dueDate ?? '', priority: t.priority ?? 'medium', milestoneId: link(t.milestoneId) })),
    kpis: (s.kpis ?? []).map((k) => ({ name: k.name, current: k.current ?? 0, target: k.target ?? 0, unit: k.unit ?? '' })),
    risks: (s.risks ?? []).map((r) => ({ title: r.title, severity: r.severity, mitigation: r.mitigation ?? '', owner: r.owner ?? '', status: r.status ?? 'open', milestoneId: link(r.milestoneId) })),
    createdBy: { id: null, name: s.owner },
  };
}

/**
 * Seeding writes rows nobody asked for, so it is only ever allowed on a database that is ours to fill: the
 * test database, the embedded dev one (no MONGODB_URI) or an explicit localhost URI. A real cluster — an
 * Atlas connection string, say — is left exactly as it is, even on a completely empty collection.
 * @param {string} [uri]
 */
export function seedingAllowed(uri = config.mongodbUri) {
  if (config.isTest) return true;
  if (!uri) return true; // the embedded dev database
  return /^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(uri);
}

/**
 * Puts the 12 templates and the 9 sample projects in place the first time each collection is empty — the same
 * idea as `ensureDefaultAdmin()` in services/users.js, and idempotent: with anything already stored it does
 * nothing. Called by the projects router before every request, so a fresh database is never an empty portfolio.
 *
 * The sample projects' activity lines are written as Activity Log entries (that is where the feed is read
 * from) with their original timestamps, and their created / updated dates are restored afterwards.
 * @returns {Promise<{ templates: number, projects: number }>}
 */
export async function ensureProjectSeed() {
  if (!seedingAllowed()) {
    console.log('[projects] starting set not inserted: MONGODB_URI points at a database that is not ours to seed');
    return { templates: 0, projects: 0 };
  }
  await Promise.all([Project.createIndexes(), ProjectTemplate.createIndexes()]);
  let templates = 0;
  if ((await ProjectTemplate.countDocuments()) === 0) {
    const ops = PROJECT_TEMPLATE_SEED.map((s, idx) => ({ updateOne: { filter: { key: s.id }, update: { $setOnInsert: templateSeedDoc(s, idx) }, upsert: true } }));
    const r = await ProjectTemplate.bulkWrite(ops, { ordered: false });
    templates = r.upsertedCount ?? 0;
  }

  let projects = 0;
  if ((await Project.countDocuments()) === 0) {
    const docs = await Project.insertMany(PROJECT_SEED.map(projectSeedDoc));
    projects = docs.length;
    /** @type {any[]} */
    const entries = [];
    for (let i = 0; i < docs.length; i += 1) {
      const doc = docs[i];
      const seed = PROJECT_SEED[i];
      // UTC midnight, so the date the screens print back is the date the prototype had, in any timezone.
      const createdAt = new Date(`${seed.createdAt}T00:00:00.000Z`);
      const updatedAt = new Date(`${seed.updatedAt}T00:00:00.000Z`);
      // `createdAt` is immutable once Mongoose has written it, so the sample dates go in through the driver.
      await Project.collection.updateOne({ _id: doc._id }, { $set: { createdAt, updatedAt } });
      for (const a of seed.activity ?? []) {
        entries.push({
          at: parseActivityAt(a.at) ?? createdAt,
          user: { id: null, name: a.user },
          action: /created the project/i.test(a.action) ? 'create' : 'update',
          module: PROJECT_MODULE,
          entity: doc.name,
          entityId: doc._id.toString(),
          details: a.action,
          ip: '',
        });
      }
    }
    if (entries.length) await AuditLog.insertMany(entries);
    if (projects) console.log(`[boot] seeded ${projects} projects and ${templates} project templates`);
  }
  return { templates, projects };
}

/** True once we know the portfolio has rows, so the per-request guard stops hitting the DB. */
let seeded = false;

/** Guard for the routes: makes sure the starting set exists before any projects request is served. */
export async function ensureProjectsSeeded() {
  if (seeded) return;
  await ensureProjectSeed();
  seeded = true;
}

/** Test helper: forget the "already seeded" flag. */
export const resetSeedFlag = () => {
  seeded = false;
};
