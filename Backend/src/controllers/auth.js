import { z } from 'zod';
import { currentUser, signToken } from '../middleware/auth.js';
import { Department } from '../models/Department.js';
import { serializeUser } from '../models/User.js';
import { log } from '../services/audit.js';
import * as authService from '../services/auth.js';

export const nameField = z.string({ error: 'Enter a name.' }).trim().min(1, 'Enter a name.').max(100, 'Name is too long (max 100).');
export const titleField = z.string({ error: 'Title must be text.' }).trim().max(80, 'Title is too long (max 80).');
export const passwordField = z
  .string({ error: 'Enter a password.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password is too long.');

export const loginSchema = z.object({
  email: z.string({ error: 'Enter your email.' }).trim().min(1, 'Enter your email.').max(200),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
});
export const meSchema = z.object({ name: nameField.optional(), title: titleField.optional() }).strict();
export const changePasswordSchema = z.object({
  current: z.string({ error: 'Enter your current password.' }).min(1, 'Enter your current password.').max(200),
  next: passwordField,
});

/**
 * The person, plus the one thing the apps need to lay themselves out: whether they work somewhere
 * that runs a readiness board.
 *
 * The phone swaps its fourth tab on this — a laboratory person gets the board itself there, as v1
 * does, rather than a shift checklist their department no longer keeps. Admins get both, because
 * they have to be able to look at either.
 * @param {any} user
 */
async function withLab(user) {
  const name = (user.department ?? '').trim();
  const lab = name
    ? Boolean(await Department.exists({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), 'labReadiness.enabled': true }))
    : false;
  return { ...serializeUser(user), lab, seesAll: user.role === 'admin' };
}

/** POST /api/auth/login → { token, user } @type {import('express').RequestHandler} */
export const login = async (req, res) => {
  const user = await authService.authenticate(req.body.email, req.body.password);
  await log({ user, action: 'auth', module: 'Session', entity: 'Sign in', details: `${user.name} signed in`, ip: req.ip });
  res.locals.audit = false;
  res.json({ token: signToken(user._id.toString()), user: await withLab(user) });
};

/** POST /api/auth/logout — JWTs are stateless; this only records the sign-out. @type {import('express').RequestHandler} */
export const logout = async (req, res) => {
  const user = currentUser(req);
  await log({ user, action: 'auth', module: 'Session', entity: 'Sign out', details: `${user.name} signed out`, ip: req.ip });
  res.locals.audit = false;
  res.json({ ok: true });
};

/** GET /api/auth/me @type {import('express').RequestHandler} */
export const me = async (req, res) => {
  res.json({ user: await withLab(currentUser(req)) });
};

/** PATCH /api/auth/me { name?, title? } @type {import('express').RequestHandler} */
export const updateMe = async (req, res) => {
  const user = currentUser(req);
  const changes = await authService.updateProfile(user, req.body);
  res.locals.audit = changes.length ? { module: 'Profile', entity: user.name, entityId: user._id.toString(), details: changes.join(' · ') } : false;
  res.json({ user: await withLab(user) });
};

/** POST /api/auth/change-password { current, next } @type {import('express').RequestHandler} */
export const changePassword = async (req, res) => {
  const user = currentUser(req);
  await authService.changePassword(user, req.body.current, req.body.next);
  await log({ user, action: 'auth', module: 'Session', entity: 'Password', entityId: user._id.toString(), details: `${user.name} changed their password`, ip: req.ip });
  res.locals.audit = false;
  res.json({ ok: true });
};
