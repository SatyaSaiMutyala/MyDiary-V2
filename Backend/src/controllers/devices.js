import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { DEVICE_PLATFORMS, DeviceToken, hashOf } from '../models/DeviceToken.js';
import { cleanName } from '../services/people.js';

/**
 * The phones a person is signed in on.
 *
 * A phone registers its push address when someone signs in and gives it back when they sign out,
 * so a push only ever reaches a phone that person is still using.
 */

export const registerSchema = z
  .object({
    token: z.string({ error: 'The push token must be text.' }).trim().min(1, 'Send the push token.').max(4096),
    platform: z.enum(DEVICE_PLATFORMS, { error: `Platform must be one of: ${DEVICE_PLATFORMS.join(', ')}.` }),
  })
  .strict();

export const unregisterSchema = z
  .object({ token: z.string({ error: 'The push token must be text.' }).trim().min(1, 'Send the push token.').max(4096) })
  .strict();

/**
 * POST /api/devices — this phone will receive pushes for the signed-in person.
 *
 * Idempotent: the same phone signing in again just moves the row to whoever is signed in now, so a
 * shared phone never pushes the previous person's notifications.
 *
 * @type {import('express').RequestHandler}
 */
export const register = async (req, res) => {
  const me = currentUser(req);
  const { token, platform } = req.body;
  await DeviceToken.findOneAndUpdate(
    { tokenHash: hashOf(token) },
    { $set: { userName: cleanName(me.name), token, platform, lastSeenAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // Registering a phone is not Activity Log material.
  res.locals.audit = false;
  res.json({ ok: true });
};

/** DELETE /api/devices — stop pushing to this phone (sign-out). @type {import('express').RequestHandler} */
export const unregister = async (req, res) => {
  await DeviceToken.deleteOne({ tokenHash: hashOf(req.body.token) });
  res.locals.audit = false;
  res.json({ ok: true });
};
