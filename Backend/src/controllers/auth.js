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
export const meSchema = z
  .object({
    name: nameField.optional(),
    title: titleField.optional(),
    /** The unit of their own department they work in — they choose it once, themselves. */
    labUnit: z.string({ error: 'Unit must be text.' }).trim().max(60, 'Unit is too long (max 60).').optional(),
  })
  .strict();
/**
 * Changing your own password.
 *
 * `current` is optional: the phone does not ask for it, so somebody already signed in can set a new
 * password straight away. It is still checked when it IS sent, which is what the website does — but
 * be clear that this is a convenience, not a defence. Anything calling the API can leave the field
 * out, so an unlocked phone or a borrowed browser session is now enough to take an account over.
 * Who changed it and when is recorded either way (services/audit.js).
 */
export const changePasswordSchema = z.object({
  current: z.string({ error: 'Your current password must be text.' }).max(200).optional(),
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
  // Strictly "my own department runs a board", whatever this person's role is. An admin sets the
  // board up in Department Master but does not run it, so they get their own department's shift
  // checklist instead — v1 gave admins both; here they are kept apart on purpose.
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
  const confirmed = await authService.changePassword(user, req.body.current, req.body.next);
  // The trail says whether the old password was re-entered, so a change made without it is not
  // indistinguishable from one made with it.
  await log({ user, action: 'auth', module: 'Session', entity: 'Password', entityId: user._id.toString(), details: `${user.name} changed their password${confirmed ? '' : ' without re-entering the old one'}`, ip: req.ip });
  res.locals.audit = false;
  res.json({ ok: true });
};
