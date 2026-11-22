import { fromZod } from './errors.js';

/**
 * Validates `req.body` with a zod schema; the parsed (trimmed, typed) value replaces `req.body`.
 * Zod errors become 400 `{ error: { message, code: 'validation', details } }`.
 * @param {import('zod').ZodType} schema
 * @returns {import('express').RequestHandler}
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const r = schema.safeParse(req.body ?? {});
    if (!r.success) return next(fromZod(r.error));
    req.body = r.data;
    next();
  };
}

/**
 * Validates `req.query` with a zod schema. Express 5's `req.query` is read-only, so the parsed
 * value is stored at `req.validQuery`.
 * @param {import('zod').ZodType} schema
 * @returns {import('express').RequestHandler}
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const r = schema.safeParse(req.query ?? {});
    if (!r.success) return next(fromZod(r.error));
    /** @type {any} */ (req).validQuery = r.data;
    next();
  };
}
