import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { ApiError, unauthorized } from '../utils/errors.js';

export const PROVISIONING_TOKEN_HEADER = 'x-provisioning-token';

/**
 * Guards /api/provisioning — the machine-to-machine door PACE comes through.
 *
 * This is NOT the JWT the web app uses. PACE has no account here; it authenticates
 * with one shared secret (PROVISIONING_TOKEN) that an administrator sets on both
 * sides. So this middleware stands in for requireAuth on these routes, and nothing
 * behind it ever reads `req.user`.
 *
 * Unset token = 503, not 401. "Nobody has wired this app to the hub yet" is a
 * different fact from "you presented the wrong secret", and PACE renders the two
 * differently for HR: 503 becomes "Not set up for provisioning yet", 401 becomes
 * "Rejected the request (token)". Collapsing them would send HR to re-check a
 * token that was never the problem.
 *
 * @type {import('express').RequestHandler}
 */
export const requireProvisioningToken = (req, _res, next) => {
  const expected = config.provisioningToken;
  if (!expected) {
    throw new ApiError(503, 'not_configured', 'Provisioning is not configured on this app yet.');
  }

  const got = req.headers[PROVISIONING_TOKEN_HEADER];
  if (typeof got !== 'string' || !safeEqual(got, expected)) {
    throw unauthorized('Invalid provisioning token.');
  }

  next();
};

/**
 * Constant-time string compare, so the time this takes cannot reveal how much of
 * the token a caller guessed correctly. Lengths are compared first and separately
 * because timingSafeEqual throws on a length mismatch — that leaks the length, and
 * only the length, which is not worth defending.
 *
 * @param {string} a
 * @param {string} b
 */
function safeEqual(a, b) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
