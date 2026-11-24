import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { LAB_PHASES, LAB_SCOPES, LAB_UNIT_KINDS, serializeDepartment } from '../models/Department.js';
import { LabRun, isSigned, serializeRun } from '../models/LabRun.js';
import * as departments from '../services/departments.js';
import * as lab from '../services/labReadiness.js';
import { getEvidence } from '../services/storage.js';
import { DATE_RE, short, todayStr } from '../services/people.js';
import { badRequest, notFound } from '../utils/errors.js';

/**
 * Lab Readiness — the daily opening and closing board (TDPL-LAB-SOP-014).
 *
 * The board is keyed by three things, so every route carries them: which unit, which day, which phase.
 * Photographs go up as a raw image body rather than a multipart form — the apps have exactly one file to
 * send per request, and raw bytes keep both ends simple (see routes/labReadiness.js).
 */

// ---------------------------------------------------------------- body schemas

const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max} characters).`);

export const itemSchema = z
  .object({
    status: z.union([z.enum(['done', 'deviation', 'na']), z.null()], {
      error: 'A status must be one of: done, deviation, na — or empty to clear it.',
    }),
    remark: text('Remark', 2000).optional(),
  })
  .strict();

export const remarkSchema = z.object({ remark: text('Remark', 2000) }).strict();

export const reopenSchema = z
  .object({ reason: text('Reason', 1000).min(1, 'Say why the record is being reopened — it goes on the record.') })
  .strict();

// Department Master: the configuration
const timeOfDay = z
  .string({ error: 'A cut-off time must be text.' })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'A cut-off must be written as HH:MM on the 24-hour clock, for example 09:30.');

export const configSchema = z
  .object({
    enabled: z.boolean({ error: 'Lab Readiness is either on or off.' }).optional(),
    openingCutoff: timeOfDay.optional(),
    closingCutoff: timeOfDay.optional(),
  })
  .strict();

export const unitSchema = z
  .object({
    key: text('Unit key', 60).optional(),
    name: text('Unit name', 200).min(1, 'Enter a name for the unit.'),
    kind: z.enum(LAB_UNIT_KINDS, { error: `A unit must be one of: ${LAB_UNIT_KINDS.join(', ')}.` }).optional(),
    active: z.boolean().optional(),
    order: z.number().int().min(1).max(999).optional(),
  })
  .strict();

export const unitPatchSchema = unitSchema.partial().omit({ key: true }).strict();

export const activitySchema = z
  .object({
    key: text('Activity key', 60).optional(),
    phase: z.enum(LAB_PHASES, { error: 'An activity belongs to either the opening or the closing round.' }),
    section: text('Section', 200).optional(),
    text: text('Activity', 1000).min(1, 'Enter what has to be done.'),
    scheduledTime: z.union([timeOfDay, z.literal('')]).optional(),
    scope: z.enum(LAB_SCOPES, { error: `Scope must be one of: ${LAB_SCOPES.join(', ')}.` }).optional(),
    photoRequired: z.boolean().optional(),
    active: z.boolean().optional(),
    order: z.number().int().min(1).max(999).optional(),
  })
  .strict();

export const activityPatchSchema = activitySchema.partial().omit({ key: true, phase: true }).strict();

// ---------------------------------------------------------------- shared route plumbing

/** The department, unit, date and phase a board route is about — validated, with clear messages. */
async function target(req) {
  const dept = await lab.readinessDepartment(req.query.departmentId);
  const user = currentUser(req);
  lab.assertCanRecord(dept, user);
  const unit = lab.unitOr404(dept, req.params.unitKey);
  const date = lab.requireDate(req.params.date);
  const phase = req.params.phase;
  if (!LAB_PHASES.includes(phase)) throw notFound(`"${phase}" is not a round — it is either opening or closing.`);
  return { dept, unit, date, phase, user };
}

/** Writes the board back the way the screen reads it, so one request is enough to redraw. */
const respond = (res, dept, unit, date, phase, run) => res.json(lab.boardState(dept, unit, date, phase, run));

/** The Activity Log line for a board change. */
const audit = (res, dept, unit, date, phase, details) => {
  res.locals.audit = {
    module: 'Lab Readiness',
    entity: `${unit.name} · ${phase === 'opening' ? 'Opening' : 'Closing'} · ${date}`,
    entityId: dept._id.toString(),
    details,
  };
};

// ---------------------------------------------------------------- the day

/** GET /api/lab-readiness — the configuration, the units, and where each one stands today. */
export const overview = async (req, res) => {
  const dept = await lab.readinessDepartment(req.query.departmentId);
  const user = currentUser(req);
  lab.assertCanRecord(dept, user);
  const date = req.query.date ? lab.requireDate(String(req.query.date)) : todayStr();
  res.json({
    department: { id: dept._id.toString(), name: dept.name, code: dept.code },
    date,
    openingCutoff: dept.labReadiness?.openingCutoff ?? '09:30',
    closingCutoff: dept.labReadiness?.closingCutoff ?? '22:30',
    units: await lab.dayOverview(dept, date),
  });
};

/** GET /api/lab-readiness/history */
export const history = async (req, res) => {
  const dept = await lab.readinessDepartment(req.query.departmentId);
  const user = currentUser(req);
  lab.assertCanRecord(dept, user);
  for (const f of ['from', 'to']) {
    if (req.query[f] && !DATE_RE.test(String(req.query[f]))) throw badRequest(`"${f}" must be a date written as YYYY-MM-DD.`);
  }
  res.json({
    records: await lab.history(dept, {
      unitKey: req.query.unitKey ? String(req.query.unitKey) : '',
      phase: req.query.phase ? String(req.query.phase) : '',
      from: req.query.from ? String(req.query.from) : '',
      to: req.query.to ? String(req.query.to) : '',
      limit: req.query.limit,
    }),
  });
};

// ---------------------------------------------------------------- one board

/** GET /api/lab-readiness/:unitKey/:date/:phase */
export const board = async (req, res) => {
  const { dept, unit, date, phase } = await target(req);
  respond(res, dept, unit, date, phase, await lab.findRun(dept, unit.key, date, phase));
};

/** PUT /api/lab-readiness/:unitKey/:date/:phase/items/:taskKey */
export const putItem = async (req, res) => {
  const { dept, unit, date, phase, user } = await target(req);
  const { taskKey } = req.params;
  let run = await lab.setItemStatus({ dept, unit, date, phase, taskKey, status: req.body.status, by: user });
  if (req.body.remark !== undefined) {
    run = await lab.setItemRemark({ dept, unit, date, phase, taskKey, remark: req.body.remark, by: user });
  }
  audit(res, dept, unit, date, phase, `${taskKey} → ${req.body.status ?? 'cleared'}`);
  respond(res, dept, unit, date, phase, run);
};

/** PUT /api/lab-readiness/:unitKey/:date/:phase/items/:taskKey/remark */
export const putRemark = async (req, res) => {
  const { dept, unit, date, phase, user } = await target(req);
  const run = await lab.setItemRemark({ dept, unit, date, phase, taskKey: req.params.taskKey, remark: req.body.remark, by: user });
  audit(res, dept, unit, date, phase, `${req.params.taskKey} · remark noted`);
  respond(res, dept, unit, date, phase, run);
};

/**
 * POST /api/lab-readiness/:unitKey/:date/:phase/items/:taskKey/photos
 * The body is the image itself; `?name=` carries the original file name for the record.
 */
export const addPhoto = async (req, res) => {
  const { dept, unit, date, phase, user } = await target(req);
  const { body, contentType, name } = imageBody(req);
  const run = await lab.addPhoto({
    dept, unit, date, phase,
    taskKey: req.params.taskKey,
    body,
    contentType,
    name: (req.query.name ? String(req.query.name) : name).slice(0, 200),
    by: user,
  });
  audit(res, dept, unit, date, phase, `${req.params.taskKey} · photograph added (${Math.round(body.length / 1024)} KB)`);
  res.status(201);
  respond(res, dept, unit, date, phase, run);
};

/** DELETE /api/lab-readiness/:unitKey/:date/:phase/photos/:photoId */
export const removePhoto = async (req, res) => {
  const { dept, unit, date, phase } = await target(req);
  const run = await lab.removePhoto({ dept, unitKey: unit.key, date, phase, photoId: req.params.photoId });
  audit(res, dept, unit, date, phase, 'photograph removed');
  respond(res, dept, unit, date, phase, run);
};

/** GET /api/lab-readiness/:unitKey/:date/:phase/photos/:photoId — the image itself. */
export const getPhoto = async (req, res) => {
  const { dept, unit, date, phase } = await target(req);
  const run = await lab.findRun(dept, unit.key, date, phase);
  const photo = run?.photos?.id(req.params.photoId);
  if (!photo) throw notFound('That photograph is not on this record.');
  await sendImage(res, photo.path, photo.disk, photo.mimeType, photo.name);
};

/**
 * POST /api/lab-readiness/:unitKey/:date/:phase/signoff
 * The body is the photograph of the person signing; `?role=` their designation (their own by default).
 */
export const signoff = async (req, res) => {
  const { dept, unit, date, phase, user } = await target(req);
  const selfie = imageBody(req);
  const role = req.query.role ?? (typeof req.body?.role === 'string' ? req.body.role : '');
  const run = await lab.signOff({
    dept, unit, date, phase,
    selfie: selfie.body,
    contentType: selfie.contentType,
    by: user,
    role: role ? String(role).slice(0, 120) : (user.position ?? ''),
  });
  audit(res, dept, unit, date, phase, `signed off by ${user.name}${run.late ? ' (late)' : ''}`);
  respond(res, dept, unit, date, phase, run);
};

/** GET /api/lab-readiness/:unitKey/:date/:phase/selfie — the sign-off photograph. */
export const getSelfie = async (req, res) => {
  const { dept, unit, date, phase } = await target(req);
  const run = await lab.findRun(dept, unit.key, date, phase);
  if (!run || !isSigned(run) || !run.selfiePath) throw notFound('This record has no sign-off photograph.');
  await sendImage(res, run.selfiePath, run.selfieDisk, 'image/jpeg', `signoff-${unit.key}-${date}-${phase}.jpg`);
};

/** POST /api/lab-readiness/:unitKey/:date/:phase/reopen */
export const reopen = async (req, res) => {
  const { dept, unit, date, phase, user } = await target(req);
  const run = await lab.reopen({ dept, unitKey: unit.key, date, phase, reason: req.body.reason, by: user });
  audit(res, dept, unit, date, phase, `reopened — ${req.body.reason}`);
  respond(res, dept, unit, date, phase, run);
};

/** One run on its own, for a history row. GET /api/lab-readiness/records/:id */
export const record = async (req, res) => {
  const dept = await lab.readinessDepartment(req.query.departmentId);
  lab.assertCanRecord(dept, currentUser(req));
  if (!/^[0-9a-f]{24}$/i.test(req.params.id)) throw notFound('That record does not exist.');
  const run = await LabRun.findOne({ _id: req.params.id, department: dept._id });
  if (!run) throw notFound('That record does not exist.');
  const unit = lab.unitOr404(dept, run.unitKey);
  res.json({ ...lab.boardState(dept, unit, run.date, run.phase, run), run: serializeRun(run) });
};

// ---------------------------------------------------------------- helpers

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * The photograph as bytes, however it was sent (see routes/labReadiness.js), with a message rather
 * than a stack trace when it is missing or is not an image.
 * @returns {{ body: Buffer, contentType: string, name: string }}
 */
function imageBody(req) {
  const sentType = (req.get('content-type') ?? '').split(';')[0].trim().toLowerCase();

  if (Buffer.isBuffer(req.body) && req.body.length) {
    return { body: req.body, contentType: IMAGE_TYPES.has(sentType) ? sentType : 'image/jpeg', name: '' };
  }

  const json = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : null;
  const base64 = typeof json?.data === 'string' ? json.data : typeof json?.base64 === 'string' ? json.base64 : '';
  if (base64) {
    // A data: URL pasted in whole is accepted too — the prefix is simply dropped.
    const clean = base64.includes(',') && base64.startsWith('data:') ? base64.slice(base64.indexOf(',') + 1) : base64;
    const bytes = Buffer.from(clean, 'base64');
    if (!bytes.length) throw badRequest('The photograph could not be read. Take it again.');
    if (bytes.length > 8 * 1024 * 1024) throw badRequest(`That photograph is ${(bytes.length / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB — take it again at a smaller size.`);
    const type = String(json.mimeType ?? json.type ?? 'image/jpeg').toLowerCase();
    return { body: bytes, contentType: IMAGE_TYPES.has(type) ? type : 'image/jpeg', name: typeof json.name === 'string' ? json.name : '' };
  }

  throw badRequest('Attach a photograph. Send the image as the request body with an image content-type, or as JSON: { "data": "<base64>", "mimeType": "image/jpeg" }.');
}

/** Streams an evidence file back, or 404s when the bytes are no longer in storage. */
async function sendImage(res, path, disk, mimeType, name) {
  const bytes = await getEvidence(path, disk);
  if (!bytes) throw notFound('That photograph is no longer in storage.');
  res.set('content-type', mimeType || 'image/jpeg');
  res.set('cache-control', 'private, max-age=86400');
  if (name) res.set('content-disposition', `inline; filename="${name.replace(/[^\w.-]+/g, '_')}"`);
  res.send(bytes);
}

// ---------------------------------------------------------------- Department Master: the configuration
//
// These hang off /api/departments/:id/lab-readiness (routes/departments.js) and are the admin side:
// switching the board on, the cut-off times, the units, and the master checklist itself. Each one
// answers with the whole department, the same as the rest of Department Master, so one request is
// enough to redraw the screen.

/** @param {import('express').Request} req */
const dept4 = (req) => departments.findDepartmentOr404(req.params.id);
const sendDept = (res, d) => res.json({ department: serializeDepartment(d) });
/** @param {any} res @param {any} d @param {string} details */
const deptAudit = (res, d, details) => {
  res.locals.audit = details ? { action: 'update', entity: d.name, entityId: d._id.toString(), details: `Lab Readiness · ${details}` } : false;
};
/** The fields a patch actually changed, as "field: was → now". */
const changes = (body, before, after) =>
  Object.keys(body)
    .filter((k) => String(before[k]) !== String(after[k]))
    .map((k) => `${k}: ${before[k] === '' ? '(blank)' : before[k]} → ${after[k] === '' ? '(blank)' : after[k]}`);

/** PUT /api/departments/:id/lab-readiness @type {import('express').RequestHandler} */
export const putConfig = async (req, res) => {
  const d = await dept4(req);
  const before = await lab.setConfig(d, req.body);
  deptAudit(res, d, changes(req.body, before, d.labReadiness).join(', '));
  sendDept(res, d);
};

/** POST /api/departments/:id/lab-readiness/units @type {import('express').RequestHandler} */
export const addUnit = async (req, res) => {
  const d = await dept4(req);
  const u = await lab.addUnit(d, req.body);
  deptAudit(res, d, `unit + "${u.name}" (${u.key})`);
  res.status(201);
  sendDept(res, d);
};

/** PATCH /api/departments/:id/lab-readiness/units/:unitId @type {import('express').RequestHandler} */
export const patchUnit = async (req, res) => {
  const d = await dept4(req);
  const { unit, before } = await lab.patchUnit(d, req.params.unitId, req.body);
  const bits = changes(req.body, before, unit);
  deptAudit(res, d, bits.length ? `unit "${unit.name}" · ${bits.join(', ')}` : '');
  sendDept(res, d);
};

/**
 * DELETE /api/departments/:id/lab-readiness/units/:unitId
 * A unit that has ever been recorded is switched off instead, and the answer says so.
 * @type {import('express').RequestHandler}
 */
export const removeUnit = async (req, res) => {
  const d = await dept4(req);
  const r = await lab.removeUnit(d, req.params.unitId);
  deptAudit(res, d, r.deleted ? `unit − "${r.name}"` : `unit "${r.name}" switched off — ${r.runs} record${r.runs === 1 ? '' : 's'} kept`);
  res.json({
    department: serializeDepartment(d),
    deleted: r.deleted,
    message: r.deleted
      ? `${r.name} removed.`
      : `${r.name} has ${r.runs} completed record${r.runs === 1 ? '' : 's'}, so it has been switched off instead of deleted — the records stay as evidence.`,
  });
};

/** POST /api/departments/:id/lab-readiness/activities @type {import('express').RequestHandler} */
export const addActivity = async (req, res) => {
  const d = await dept4(req);
  const a = await lab.addActivity(d, req.body);
  deptAudit(res, d, `${a.phase} activity + "${a.key}"`);
  res.status(201);
  sendDept(res, d);
};

/** PATCH /api/departments/:id/lab-readiness/activities/:activityId @type {import('express').RequestHandler} */
export const patchActivity = async (req, res) => {
  const d = await dept4(req);
  const { activity, before } = await lab.patchActivity(d, req.params.activityId, req.body);
  const bits = changes(req.body, before, activity);
  deptAudit(res, d, bits.length ? `activity "${activity.key}" · ${bits.join(', ')}` : '');
  sendDept(res, d);
};

/** DELETE /api/departments/:id/lab-readiness/activities/:activityId @type {import('express').RequestHandler} */
export const removeActivity = async (req, res) => {
  const d = await dept4(req);
  const r = await lab.removeActivity(d, req.params.activityId);
  deptAudit(res, d, r.deleted ? `activity − "${r.key}"` : `activity "${r.key}" switched off — ${r.runs} record${r.runs === 1 ? '' : 's'} kept`);
  res.json({
    department: serializeDepartment(d),
    deleted: r.deleted,
    message: r.deleted
      ? `"${short(r.text, 60)}" removed from the checklist.`
      : `"${short(r.text, 60)}" is on ${r.runs} completed record${r.runs === 1 ? '' : 's'}, so it has been switched off instead of deleted.`,
  });
};

/** POST /api/departments/:id/lab-readiness/restore @type {import('express').RequestHandler} */
export const restoreStandard = async (req, res) => {
  const d = await dept4(req);
  const r = await lab.restoreStandard(d);
  deptAudit(res, d, `standard checklist restored (+${r.units} unit${r.units === 1 ? '' : 's'}, +${r.activities} activit${r.activities === 1 ? 'y' : 'ies'})`);
  res.json({
    department: serializeDepartment(d),
    added: r,
    message: r.units + r.activities === 0
      ? 'The standard checklist is already complete — nothing to put back.'
      : `Put back ${r.units} unit${r.units === 1 ? '' : 's'} and ${r.activities} activit${r.activities === 1 ? 'y' : 'ies'}.`,
  });
};
