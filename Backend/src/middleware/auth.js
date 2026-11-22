import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { NO_MODULE_MESSAGE, hasModule } from '../services/modules.js';
import { forbidden, unauthorized } from './errors.js';

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

/** Sets `req.user` from the Bearer token, or 401. @type {import('express').RequestHandler} */
export const requireAuth = async (req, _res, next) => {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
  const user = await userFromToken(match?.[1]);
  if (!user) throw unauthorized(match ? 'Your session has expired. Please sign in again.' : 'Please sign in.');
  /** @type {any} */ (req).user = user;
  next();
};

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
