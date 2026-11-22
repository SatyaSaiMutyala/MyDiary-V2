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
    apiErr = err.type === 'entity.too.large' ? badRequest('Request body is too large (max 1 MB).') : badRequest('Malformed request body.');
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
