/**
 * Runs a list query built by utils/listQuery.js → the standard list response
 * `{ items, page, limit, total, pages, hasMore, applied }`.
 */

/**
 * Keeps only `fields` (plus `id`) of a serialized item.
 * @template {Record<string, unknown>} T
 * @param {T} item
 * @param {string[] | null} fields
 */
export function pickFields(item, fields) {
  if (!fields || !fields.length) return item;
  /** @type {Record<string, unknown>} */
  const out = {};
  if ('id' in item) out.id = item.id;
  for (const f of fields) if (f in item) out[f] = item[f];
  return out;
}

/**
 * @template T
 * @param {import('mongoose').Model<any>} model
 * @param {import('./listQuery.js').ListQuery} lq
 * @param {(doc: any) => T} serialize
 */
export async function runList(model, lq, serialize) {
  const [docs, total] = await Promise.all([
    model.find(lq.filter).sort(lq.sort).skip(lq.skip).limit(lq.limit),
    model.countDocuments(lq.filter),
  ]);
  const items = docs.map((d) => pickFields(/** @type {any} */ (serialize(d)), lq.fields));
  return listResponse(items, total, lq);
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} total
 * @param {import('./listQuery.js').ListQuery} lq
 */
export function listResponse(items, total, lq) {
  const pages = total === 0 ? 0 : Math.ceil(total / lq.limit);
  return { items, page: lq.page, limit: lq.limit, total, pages, hasMore: lq.page * lq.limit < total, applied: lq.applied };
}
