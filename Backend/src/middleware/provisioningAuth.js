import { effectiveTokenHash, tokenMatches } from '../services/provisioningToken.js';
import { ApiError, unauthorized } from '../utils/errors.js';

export const PROVISIONING_TOKEN_HEADER = 'x-provisioning-token';

/**
 * Guards /api/provisioning — the machine-to-machine door PACE comes through.
 *
 * This is NOT the JWT the web app uses. PACE has no account here; it authenticates
 * with one shared secret that an administrator sets on both sides. So this middleware
 * stands in for requireAuth on these routes, and nothing behind it ever reads
 * `req.user`.
 *
 * Unset token = 503, not 401. "Nobody has wired this app to the hub yet" is a
 * different fact from "you presented the wrong secret", and PACE renders the two
 * differently for HR: 503 becomes "Not set up for provisioning yet", 401 becomes
 * "Rejected the request (token)". Collapsing them would send HR to re-check a
 * token that was never the problem.
 *
 * The expected value is read per request rather than cached. Provisioning traffic is
 * rare (HR creating or disabling somebody, and PACE's status ping), so one indexed
 * lookup costs nothing — while a cache would keep a rotated-away token working until
 * restart, and would do so differently in each process behind a load balancer.
 *
 * @type {import('express').RequestHandler}
 */
export const requireProvisioningToken = async (req, _res, next) => {
  const expected = await effectiveTokenHash();
  if (!expected) {
    return next(new ApiError(503, 'not_configured', 'Provisioning is not configured on this app yet.'));
  }

  const got = req.headers[PROVISIONING_TOKEN_HEADER];
  if (typeof got !== 'string' || !tokenMatches(got, expected)) {
    return next(unauthorized('Invalid provisioning token.'));
  }

  next();
};
