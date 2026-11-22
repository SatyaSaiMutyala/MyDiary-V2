import mongoose from 'mongoose';
import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { AUDIT_ACTIONS, AuditLog, serializeAudit } from '../models/AuditLog.js';
import { log } from '../services/audit.js';
import { toCsv } from '../utils/csv.js';
import { badRequest } from '../utils/errors.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';

const isObjectId = (v) => mongoose.isValidObjectId(v) && /^[0-9a-f]{24}$/i.test(v);

/** List contract for GET /api/audit. `user=` accepts ids or exact names (comma list of either). */
export const AUDIT_LIST = /** @type {import('../utils/listQuery.js').ListSpec} */ ({
  searchFields: ['entity', 'details', 'module', 'user.name', 'entityId'],
  filterFields: {
    action: 'enum',
    module: 'string',
    entityId: 'string',
    user: (values) => {
      const ids = values.filter(isObjectId).map((v) => new mongoose.Types.ObjectId(v));
      const names = values.filter((v) => !isObjectId(v));
      const or = [];
      if (ids.length) or.push({ 'user.id': ids.length === 1 ? ids[0] : { $in: ids } });
      if (names.length) or.push({ 'user.name': names.length === 1 ? names[0] : { $in: names } });
      return or.length === 1 ? or[0] : { $or: or };
    },
  },
  enums: { action: AUDIT_ACTIONS },
  dateFields: ['at'],
  defaultDateField: 'at',
  sortFields: ['at', 'action', 'module', 'entity', 'user.name'],
  defaultSort: '-at',
  fields: ['at', 'user', 'action', 'module', 'entity', 'entityId', 'details', 'ip'],
});

/** GET /api/audit — newest first. @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await runList(AuditLog, buildListQuery(req.query, AUDIT_LIST), serializeAudit));
};

/** GET /api/audit/modules — distinct module labels seen in the log, A→Z. @type {import('express').RequestHandler} */
export const modules = async (_req, res) => {
  const list = await AuditLog.distinct('module');
  res.json({ modules: list.filter(Boolean).sort((a, b) => a.localeCompare(b)) });
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const statsDate = (key, endOfDay) =>
  z
    .string()
    .regex(DATE_ONLY, `${key} must be a date like 2026-11-22.`)
    .transform((s) => new Date(`${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`))
    .optional();
export const statsQuerySchema = z.object({ from: statsDate('from', false), to: statsDate('to', true) }).strict();

/** GET /api/audit/stats?from&to → counts by action (and by module) in the range. @type {import('express').RequestHandler} */
export const stats = async (req, res) => {
  const { from, to } = /** @type {any} */ (req).validQuery;
  if (from && to && from > to) throw badRequest('from must be before to.', [{ field: 'from', message: 'from is after to.' }]);
  const match = from || to ? { at: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {};
  const [byAction, byModule] = await Promise.all([
    AuditLog.aggregate([{ $match: match }, { $group: { _id: '$action', n: { $sum: 1 } } }]),
    AuditLog.aggregate([{ $match: match }, { $group: { _id: '$module', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }]),
  ]);
  const actions = Object.fromEntries(AUDIT_ACTIONS.map((a) => [a, 0]));
  for (const row of byAction) actions[row._id] = row.n;
  res.json({
    range: { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null },
    total: byAction.reduce((s, r) => s + r.n, 0),
    byAction: actions,
    byModule: Object.fromEntries(byModule.map((r) => [r._id, r.n])),
  });
};

const CSV_HEADERS = ['Time', 'User', 'Action', 'Module', 'Item', 'Item ID', 'Details', 'IP'];
export const CSV_MAX_ROWS = 10_000;

/** "search=priya, action=auth, from=…" for the export's Activity Log line. @param {import('../utils/listQuery.js').ListQuery['applied']} a */
function describeApplied(a) {
  const parts = [];
  if (a.search) parts.push(`search=${a.search}`);
  for (const [k, v] of Object.entries(a.filters)) parts.push(`${k}=${Array.isArray(v) ? v.join(',') : v}`);
  if (a.range?.from) parts.push(`from=${a.range.from.slice(0, 10)}`);
  if (a.range?.to) parts.push(`to=${a.range.to.slice(0, 10)}`);
  return parts.join(', ');
}

/** GET /api/audit/export.csv — same filters, no paging (newest 10,000 rows). Logs an `export` entry. @type {import('express').RequestHandler} */
export const exportCsv = async (req, res) => {
  const { page: _p, limit: _l, ...query } = req.query;
  const lq = buildListQuery(query, { ...AUDIT_LIST, defaultLimit: CSV_MAX_ROWS, maxLimit: CSV_MAX_ROWS });
  const docs = await AuditLog.find(lq.filter).sort(lq.sort).limit(CSV_MAX_ROWS);
  const rows = docs.map((d) => {
    const e = serializeAudit(d);
    return [e.at, e.user.name, e.action, e.module, e.entity, e.entityId, e.details, e.ip];
  });
  const filters = describeApplied(lq.applied);
  await log({
    user: currentUser(req),
    action: 'export',
    module: 'Settings · Activity Log',
    entity: 'CSV export',
    details: `${rows.length} rows${filters ? ` (filters: ${filters})` : ''}`,
    ip: req.ip,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mydiary-activity-log-${stamp}.csv"`);
  res.send(toCsv(CSV_HEADERS, rows));
};
