/**
 * ONE query contract for every list endpoint (README "API conventions").
 *
 *   page, limit, sort=field|-field[,field2]      paging & ordering
 *   search=                                      global case-insensitive text search over spec.searchFields
 *   <filter>=a,b                                 any spec.filterFields key; comma list → $in; booleans true/false
 *   from=&to=[&dateField=]                       inclusive date range on spec.defaultDateField (or dateField=)
 *   <date>_from= / <date>_to=                    range on any spec.dateFields entry
 *   min_<n>= / max_<n>=                          numeric range on any spec.numberFields entry
 *   fields=a,b                                   response projection (applied to the serialized item; id always kept)
 *
 * Unknown params → 400 naming the param. Values are validated with zod.
 */
import mongoose from 'mongoose';
import { z } from 'zod';
import { badRequest } from './errors.js';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 200;

/**
 * @typedef {'enum' | 'string' | 'boolean' | 'number' | 'id'} FilterKind
 *
 * @typedef {object} ListSpec
 * @property {string[]} searchFields                      fields `search=` matches (dot paths; array fields match any element)
 * @property {Record<string, FilterKind | ((values: string[]) => Record<string, unknown>)>} [filterFields]
 *   `?field=value` filters. A function receives the comma-split values and returns a Mongo clause.
 * @property {Record<string, readonly string[]>} [enums]  allowed values per 'enum' filter
 * @property {Record<string, string>} [filterPaths]       filter key → Mongo path when they differ (e.g. user → 'user.name')
 * @property {string[]} [dateFields]                      fields usable with from/to, <field>_from/_to
 * @property {string} [defaultDateField]                  field `from=` / `to=` apply to (default: dateFields[0])
 * @property {string[]} [stringDateFields]                dateFields stored as 'YYYY-MM-DD' strings: ranges compare as strings
 * @property {string[]} [numberFields]                    fields usable with min_/max_
 * @property {string[]} [sortFields]                      sortable fields (default: dateFields + filter keys + searchFields)
 * @property {string} defaultSort                         e.g. '-at' or 'name'
 * @property {string[]} [fields]                          keys allowed in `fields=` (default: any)
 * @property {number} [maxLimit]                          default 200
 * @property {number} [defaultLimit]                      default 25
 *
 * @typedef {object} ListQuery
 * @property {Record<string, unknown>} filter
 * @property {Record<string, 1 | -1>} sort
 * @property {number} skip
 * @property {number} limit
 * @property {number} page
 * @property {string[] | null} fields
 * @property {{ search: string | null, filters: Record<string, string | string[] | number | boolean>, sort: string,
 *   range: { field: string, from: string | null, to: string | null } | null }} applied
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string} s */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive substring match over `fields` (array fields match any element), or `{}` without search text.
 * @param {string | undefined | null} search
 * @param {readonly string[]} fields
 */
export function searchFilter(search, fields) {
  const q = (search ?? '').trim();
  if (!q) return {};
  const re = new RegExp(escapeRegex(q), 'i');
  return { $or: fields.map((f) => ({ [f]: re })) };
}

/** First string value of a query param, trimmed; undefined when absent or blank. @param {unknown} v */
function first(v) {
  if (Array.isArray(v)) v = v[0];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** @param {string} v */
const splitList = (v) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** @param {string} field @param {string} msg */
const intField = (field, msg) =>
  z
    .string()
    .regex(/^\d+$/, msg)
    .transform(Number)
    .pipe(z.number().int(msg).min(1, msg));

/** @param {string} key @param {boolean} endOfDay */
function dateField(key, endOfDay) {
  const msg = `${key} must be a date like 2026-11-22 or an ISO date-time.`;
  return z.string().transform((raw, ctx) => {
    const d = DATE_ONLY.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: msg });
      return z.NEVER;
    }
    if (endOfDay && DATE_ONLY.test(raw)) return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
    return d;
  });
}

/** @param {string} key */
const numberField = (key) => {
  const msg = `${key} must be a number.`;
  return z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, msg)
    .transform(Number);
};

/** Builds the zod schema for a spec (strict: unknown params are rejected). @param {ListSpec} spec */
function schemaFor(spec) {
  const maxLimit = spec.maxLimit ?? MAX_LIMIT;
  const dateFields = spec.dateFields ?? [];
  const numberFields = spec.numberFields ?? [];
  /** @type {Record<string, z.ZodType>} */
  const shape = {
    page: intField('page', 'page must be a whole number of 1 or more.').optional(),
    limit: z
      .string()
      .regex(/^\d+$/, `limit must be a whole number from 1 to ${maxLimit}.`)
      .transform(Number)
      .pipe(z.number().int().min(1, `limit must be a whole number from 1 to ${maxLimit}.`).max(maxLimit, `limit must be a whole number from 1 to ${maxLimit}.`))
      .optional(),
    sort: z.string().max(200).optional(),
    search: z.string().max(200, 'search is too long (max 200 characters).').optional(),
    fields: z.string().max(500).optional(),
  };
  if (dateFields.length) {
    shape.from = dateField('from', false).optional();
    shape.to = dateField('to', true).optional();
    shape.dateField = z.enum(/** @type {[string, ...string[]]} */ (dateFields), { error: `dateField must be one of: ${dateFields.join(', ')}.` }).optional();
    for (const f of dateFields) {
      shape[`${f}_from`] = dateField(`${f}_from`, false).optional();
      shape[`${f}_to`] = dateField(`${f}_to`, true).optional();
    }
  }
  for (const f of numberFields) {
    shape[`min_${f}`] = numberField(`min_${f}`).optional();
    shape[`max_${f}`] = numberField(`max_${f}`).optional();
  }
  for (const [key, kind] of Object.entries(spec.filterFields ?? {})) {
    if (kind === 'boolean') {
      shape[key] = z.enum(['true', 'false'], { error: `${key} must be true or false.` }).optional();
    } else if (kind === 'number') {
      shape[key] = numberField(key).optional();
    } else {
      shape[key] = z.string().max(500).optional();
    }
  }
  return z.object(shape).strict();
}

/**
 * Pulls viewer-relative flags (`mine=true`, `box=inbox`) out of a raw query before buildListQuery sees it, because
 * their Mongo clause needs the signed-in user. Each flag's allowed values are validated here.
 * @param {Record<string, unknown>} rawQuery
 * @param {Record<string, readonly string[]>} flags  key → allowed values
 * @returns {{ query: Record<string, unknown>, flags: Record<string, string | undefined> }}
 */
export function extractFlags(rawQuery, flags) {
  /** @type {Record<string, unknown>} */
  const query = { ...(rawQuery ?? {}) };
  /** @type {Record<string, string | undefined>} */
  const out = {};
  for (const [key, allowed] of Object.entries(flags)) {
    const v = first(query[key]);
    delete query[key];
    if (v === undefined) continue;
    if (!allowed.includes(v)) throw badRequest(`${key} must be one of: ${allowed.join(', ')}.`, [{ field: key, message: `Unknown value "${v}".` }]);
    out[key] = v;
  }
  return { query, flags: out };
}

/**
 * Adds a clause (e.g. the `mine=true` scope) to a built ListQuery and records it under `applied.filters`.
 * @param {ListQuery} lq @param {Record<string, unknown>} clause @param {string} key @param {string | boolean} value
 */
export function andClause(lq, clause, key, value) {
  lq.filter = Object.keys(lq.filter).length ? { $and: [lq.filter, clause] } : clause;
  lq.applied.filters[key] = value;
  return lq;
}

/**
 * Parses `req.query` against the spec → filter / sort / paging / applied summary.
 * @param {Record<string, unknown>} rawQuery
 * @param {ListSpec} spec
 * @returns {ListQuery}
 */
export function buildListQuery(rawQuery, spec) {
  // Repeated params (?status=a&status=b) are joined like a comma list.
  /** @type {Record<string, string>} */
  const query = {};
  for (const [k, v] of Object.entries(rawQuery ?? {})) {
    const s = Array.isArray(v) ? v.map(first).filter(Boolean).join(',') : first(v);
    if (s !== undefined && s !== '') query[k] = s;
  }

  const parsed = schemaFor(spec).safeParse(query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.code === 'unrecognized_keys') {
      const keys = /** @type {any} */ (issue).keys ?? [];
      const allowed = Object.keys(schemaFor(spec).shape).sort();
      throw badRequest(`Unknown query parameter${keys.length > 1 ? 's' : ''}: ${keys.join(', ')}. Allowed: ${allowed.join(', ')}.`, [{ field: keys[0], message: 'Unknown query parameter.' }]);
    }
    const field = issue.path.map(String).join('.') || undefined;
    throw badRequest(issue.message, [{ field, message: issue.message }]);
  }
  const q = /** @type {Record<string, any>} */ (parsed.data);

  const page = q.page ?? 1;
  const limit = q.limit ?? spec.defaultLimit ?? DEFAULT_LIMIT;
  /** @type {Record<string, unknown>[]} */
  const clauses = [];
  /** @type {ListQuery['applied']} */
  const applied = { search: null, filters: {}, sort: '', range: null };

  // search=
  const search = (q.search ?? '').trim();
  if (search) {
    clauses.push(searchFilter(search, spec.searchFields));
    applied.search = search;
  }

  // filters
  for (const [key, kind] of Object.entries(spec.filterFields ?? {})) {
    const raw = q[key];
    if (raw === undefined) continue;
    const path = spec.filterPaths?.[key] ?? key;
    if (typeof kind === 'function') {
      const values = splitList(String(raw));
      if (!values.length) continue;
      clauses.push(kind(values));
      applied.filters[key] = values.length === 1 ? values[0] : values;
    } else if (kind === 'boolean') {
      clauses.push({ [path]: raw === 'true' });
      applied.filters[key] = raw === 'true';
    } else if (kind === 'number') {
      clauses.push({ [path]: raw });
      applied.filters[key] = raw;
    } else {
      const values = splitList(String(raw));
      if (!values.length) continue;
      if (kind === 'enum') {
        const allowed = spec.enums?.[key] ?? [];
        const bad = values.filter((v) => !allowed.includes(v));
        if (bad.length) throw badRequest(`${key} must be one of: ${allowed.join(', ')}.`, [{ field: key, message: `Unknown value "${bad[0]}".` }]);
      }
      if (kind === 'id') {
        const bad = values.find((v) => !mongoose.isValidObjectId(v) || !/^[0-9a-f]{24}$/i.test(v));
        if (bad) throw badRequest(`${key} must be a valid id.`, [{ field: key, message: `"${bad}" is not an id.` }]);
      }
      const cast = kind === 'id' ? values.map((v) => new mongoose.Types.ObjectId(v)) : values;
      clauses.push({ [path]: cast.length === 1 ? cast[0] : { $in: cast } });
      applied.filters[key] = values.length === 1 ? values[0] : values;
    }
  }

  // date ranges
  const dateFields = spec.dateFields ?? [];
  if (dateFields.length) {
    const mainField = q.dateField ?? spec.defaultDateField ?? dateFields[0];
    /** @type {Record<string, { from?: Date, to?: Date }>} */
    const ranges = {};
    const add = (field, side, d) => {
      if (d === undefined) return;
      ranges[field] = { ...(ranges[field] ?? {}), [side]: d };
    };
    add(mainField, 'from', q.from);
    add(mainField, 'to', q.to);
    for (const f of dateFields) {
      add(f, 'from', q[`${f}_from`]);
      add(f, 'to', q[`${f}_to`]);
    }
    const stringDates = spec.stringDateFields ?? [];
    for (const [field, r] of Object.entries(ranges)) {
      if (r.from && r.to && r.from > r.to) throw badRequest(`${field === mainField ? 'from' : `${field}_from`} must be before ${field === mainField ? 'to' : `${field}_to`}.`, [{ field: 'from', message: 'from is after to.' }]);
      // Fields stored as 'YYYY-MM-DD' strings (meeting date, deadlines) compare as strings: ISO dates sort lexically.
      const bound = (d) => (stringDates.includes(field) ? d.toISOString().slice(0, 10) : d);
      clauses.push({ [field]: { ...(r.from ? { $gte: bound(r.from) } : {}), ...(r.to ? { $lte: bound(r.to) } : {}) } });
      const entry = { field, from: r.from ? r.from.toISOString() : null, to: r.to ? r.to.toISOString() : null };
      if (!applied.range || field === mainField) applied.range = entry;
    }
  }

  // numeric ranges
  for (const f of spec.numberFields ?? []) {
    const min = q[`min_${f}`];
    const max = q[`max_${f}`];
    if (min === undefined && max === undefined) continue;
    if (min !== undefined && max !== undefined && min > max) throw badRequest(`min_${f} must not be greater than max_${f}.`, [{ field: `min_${f}`, message: 'min is greater than max.' }]);
    clauses.push({ [f]: { ...(min !== undefined ? { $gte: min } : {}), ...(max !== undefined ? { $lte: max } : {}) } });
    if (min !== undefined) applied.filters[`min_${f}`] = min;
    if (max !== undefined) applied.filters[`max_${f}`] = max;
  }

  // sort
  const sortFields = spec.sortFields ?? [...new Set([...dateFields, ...Object.keys(spec.filterFields ?? {}), ...spec.searchFields])];
  const sortRaw = (q.sort ?? spec.defaultSort).trim() || spec.defaultSort;
  /** @type {Record<string, 1 | -1>} */
  const sort = {};
  for (const part of splitList(sortRaw)) {
    const desc = part.startsWith('-');
    const field = desc ? part.slice(1) : part.replace(/^\+/, '');
    if (!sortFields.includes(field)) {
      throw badRequest(`sort must be one of: ${sortFields.join(', ')} (prefix "-" for descending, comma-separate several).`, [{ field: 'sort', message: `Cannot sort by "${field}".` }]);
    }
    sort[field] = desc ? -1 : 1;
  }
  if (!('_id' in sort)) sort._id = Object.values(sort)[0] ?? 1; // stable tie-breaker
  applied.sort = splitList(sortRaw).join(',');

  // fields=
  let fields = null;
  if (q.fields) {
    fields = splitList(q.fields);
    if (spec.fields) {
      const bad = fields.filter((f) => !spec.fields.includes(f));
      if (bad.length) throw badRequest(`fields can only include: ${spec.fields.join(', ')}.`, [{ field: 'fields', message: `Unknown field "${bad[0]}".` }]);
    }
  }

  const filter = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
  return { filter, sort, skip: (page - 1) * limit, limit, page, fields, applied };
}
