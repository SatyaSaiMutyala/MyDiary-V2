import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { getSetting, setSetting } from '../models/AppSetting.js';

export const PROVISIONING_TOKEN_KEY = 'provisioning.token_sha256';

/** The shortest token we will accept on a rotation. */
export const MIN_TOKEN_LENGTH = 24;

/**
 * The secret PACE authenticates with, and how it is kept.
 *
 * Only a SHA-256 of the token is ever stored. A provisioning token is 32 random bytes
 * from `openssl rand -hex 32`, so there is no dictionary to run against it and no need
 * for a slow KDF like bcrypt — a plain digest is enough to make a database dump useless
 * to whoever reads it, while costing microseconds on a request.
 *
 * Two places it can come from, and the order matters:
 *
 *   1. the database, once PACE has pushed a token through rotate-token;
 *   2. PROVISIONING_TOKEN in .env, which is how the link is established in the first
 *      place and the only way to recover if a rotation goes wrong.
 *
 * The database wins, deliberately. If .env kept working after a rotation then rotating
 * would not retire the old secret, which is the entire point of rotating. The escape
 * hatch is to drop the row — see the note on rotate() below.
 */

/** @param {string} token */
const sha256 = (token) => createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * The hash we should be checking against right now, or null when this app has not been
 * wired to the hub at all (which the middleware turns into a 503, not a 401).
 * @returns {Promise<string | null>}
 */
export async function effectiveTokenHash() {
  const stored = await getSetting(PROVISIONING_TOKEN_KEY);
  if (stored) return stored;

  const fromEnv = config.provisioningToken;
  return fromEnv ? sha256(fromEnv) : null;
}

/**
 * Does this token match? Constant-time, so the comparison cannot be timed to learn how
 * much of the secret a caller guessed. Both sides are fixed-length hex digests here, so
 * unlike a raw token compare there is not even a length to leak.
 *
 * @param {string} presented
 * @param {string} expectedHash
 */
export function tokenMatches(presented, expectedHash) {
  const a = Buffer.from(sha256(presented), 'utf8');
  const b = Buffer.from(expectedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Replace the token with the one PACE just pushed.
 *
 * Takes effect on the very next request: PACE authenticated this call with the OLD
 * token and will use the new one from here on, which is the handover.
 *
 * If a rotation ever leaves the two sides out of step — PACE recorded a token this app
 * did not store, or the reverse — the recovery is to delete the
 * `provisioning.token_sha256` row from the `appsettings` collection. This app then
 * falls back to PROVISIONING_TOKEN in .env, and PACE can be set to the same value by
 * hand. That is why the .env fallback exists at all.
 *
 * @param {string} newToken
 */
export async function rotate(newToken) {
  await setSetting(PROVISIONING_TOKEN_KEY, sha256(newToken));
}
