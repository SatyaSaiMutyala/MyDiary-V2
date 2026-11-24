import { ZodError } from 'zod';
import { ApiError, badRequest, fromZod, notFound } from '../utils/errors.js';

export { ApiError, badRequest, conflict, forbidden, fromZod, notFound, unauthorized } from '../utils/errors.js';

/** @type {import('express').RequestHandler} */
export const notFoundHandler = (_req, _res, next) => {
  next(notFound('No such endpoint.'));
};

/** Last middleware: every error becomes `{ error: { message, code, details? } }`. @type {import('express').ErrorRequestHandler} */
export const errorHandler = (err, _req, res, _next) => {
  /** @type {ApiError} */
  let apiErr;
  if (err instanceof ApiError) {
    apiErr = err;
  } else if (err instanceof ZodError) {
    apiErr = fromZod(err);
  } else if (err && typeof err.type === 'string' && err.status >= 400 && err.status < 500) {
    // body-parser errors (malformed JSON, too large, ...)
    // `limit` is the ceiling the parser that rejected it was given — 1 MB for JSON, 8 MB for a
    // photograph — so the message always names the limit the person actually ran into.
    const mb = typeof err.limit === 'number' ? `${Math.round(err.limit / 1024 / 1024)} MB` : '1 MB';
    apiErr = err.type === 'entity.too.large' ? badRequest(`That is too large (the limit is ${mb}).`) : badRequest('Malformed request body.');
  } else if (err && err.name === 'CastError') {
    apiErr = notFound('That record does not exist.');
  } else {
    console.error('[error]', err);
    apiErr = new ApiError(500, 'internal', 'Something went wrong on the server. Try again.');
  }
  if (res.headersSent) return;
  /** @type {Record<string, unknown>} */
  const error = { message: apiErr.message, code: apiErr.code };
  if (apiErr.details !== undefined) error.details = apiErr.details;
  res.status(apiErr.status).json({ error });
};
