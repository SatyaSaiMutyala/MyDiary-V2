/**
 * @typedef {'unauthorized'|'forbidden'|'not_found'|'validation'|'conflict'|'internal'} ErrorCode
 */

/** An error that maps to the API's `{ error: { message, code, details? } }` body. */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {ErrorCode} code
   * @param {string} message  shown to the user as-is by the web app
   * @param {unknown} [details]  e.g. `[{ field, message }]` for validation errors
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** @param {string} message @param {unknown} [details] */
export const badRequest = (message, details) => new ApiError(400, 'validation', message, details);
export const notFound = (message = 'Not found.') => new ApiError(404, 'not_found', message);
export const forbidden = (message = 'You do not have permission to do this.') => new ApiError(403, 'forbidden', message);
export const unauthorized = (message = 'Please sign in again.') => new ApiError(401, 'unauthorized', message);
/** @param {string} message @param {unknown} [details] */
export const conflict = (message, details) => new ApiError(409, 'conflict', message, details);

/** Converts a ZodError into our validation error: first issue is the message, all issues go in `details`. @param {import('zod').ZodError} err */
export function fromZod(err) {
  const issues = err.issues.map((i) => ({ field: i.path.map(String).join('.') || undefined, message: i.message }));
  return badRequest(issues[0]?.message ?? 'Invalid input.', issues);
}
