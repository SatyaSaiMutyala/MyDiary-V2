import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { NO_MODULE_MESSAGE, hasModule } from '../services/modules.js';
import { forbidden, notFound, unauthorized } from './errors.js';

/** @param {string} userId */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/**
 * Verifies a JWT and returns the active user it belongs to, or null.
 * @param {string | undefined | null} token
 */
export async function userFromToken(token) {
  if (!token) return null;
  let sub;
  try {
    sub = /** @type {jwt.JwtPayload} */ (jwt.verify(token, config.jwtSecret)).sub;
  } catch {
    return null;
  }
  if (typeof sub !== 'string' || !mongoose.isValidObjectId(sub)) return null;
  const user = await User.findById(sub);
  // Deactivated accounts: existing tokens stop working.
  return user && user.status === 'active' ? user : null;
}

/**
 * Spectator mode: the header an admin sends to read the app as one of their people.
 *
 * `X-View-As: <full name>` makes every GET answer with that person's data — their meetings, to-do,
 * diary, logs, visits, projects, notifications — because each handler reads `req.user`, and this is
 * the one place that is set. Nothing else in the API had to change.
 *
 * Three rules keep it honest:
 *  - admins only;
 *  - reads only, so nothing can ever be written, deleted or notified in someone else's name;
 *  - the real admin stays on `req.spectator`, so the audit trail can never be forged.
 */
export const VIEW_AS_HEADER = 'x-view-as';
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/**
 * Routes that always answer as the signed-in admin, whatever the header says: who am I, my
 * password, the people list the switcher itself reads, and the activity log. Enforced here rather
 * than trusted to the client, so no caller can make `/auth/me` report the wrong person.
 */
const NEVER_SPECTATED = /^\/api\/(auth|users|audit)(\/|$|\?)/;

/** Sets `req.user` from the Bearer token, or 401. @type {import('express').RequestHandler} */
export const requireAuth = async (req, _res, next) => {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
  const user = await userFromToken(match?.[1]);
  if (!user) throw unauthorized(match ? 'Your session has expired. Please sign in again.' : 'Please sign in.');
  /** @type {any} */ (req).user = user;

  const viewAs = String(req.headers[VIEW_AS_HEADER] ?? '').trim();
  if (viewAs && viewAs !== user.name && !NEVER_SPECTATED.test(req.originalUrl || '')) {
    if (user.role !== 'admin') throw forbidden('Only admins can look at MyDiary as someone else.');
    if (!READ_ONLY_METHODS.has(req.method)) {
      throw forbidden('You are viewing MyDiary as someone else, which is read-only. Switch back to yourself to make changes.');
    }
    // Exact name, ignoring case — names are how V2 identifies people everywhere.
    const target = await User.findOne({ name: new RegExp(`^${escapeRegExp(viewAs)}$`, 'i'), status: 'active' });
    if (!target) throw notFound(`No active user called "${viewAs}".`);
    /** @type {any} */ (req).spectator = user;
    /** @type {any} */ (req).user = target;
  }
  next();
};

/** @param {string} s */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The admin behind a spectated request, when there is one. @param {import('express').Request} req */
export const spectatorOf = (req) => /** @type {any} */ (req).spectator ?? null;

/** The signed-in user (for handlers mounted behind requireAuth). @param {import('express').Request} req */
export function currentUser(req) {
  const user = /** @type {any} */ (req).user;
  if (!user) throw unauthorized();
  return user;
}

/**
 * 403 unless the signed-in user has one of the roles.
 * @param {...import('../services/modules.js').Role} roles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    const user = currentUser(req);
    if (!roles.includes(user.role)) {
      throw forbidden(roles.length === 1 && roles[0] === 'admin' ? 'Only admins can do this.' : `Only ${roles.join(' or ')} accounts can do this.`);
    }
    next();
  };
}

/**
 * 403 unless the signed-in user has one of the modules (services/modules.js). Admins always pass.
 * @param {...string} keys
 * @returns {import('express').RequestHandler}
 */
export function requireModule(...keys) {
  return (req, _res, next) => {
    const user = currentUser(req);
    if (!keys.some((k) => hasModule(user, k))) throw forbidden(NO_MODULE_MESSAGE);
    next();
  };
}
