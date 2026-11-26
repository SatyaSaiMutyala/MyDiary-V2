import { z } from 'zod';
import { config } from '../config.js';
import * as provisioning from '../services/provisioning.js';
import { MIN_TOKEN_LENGTH, rotate } from '../services/provisioningToken.js';
import { log } from '../services/audit.js';
import { notFound } from '../utils/errors.js';

/**
 * The hub-facing endpoints. PACE calls these; no human ever does.
 *
 * Two things are different from the rest of this folder, both on purpose:
 *
 *   1. The schemas are NOT `.strict()`. Every other schema here is, because a typo in a
 *      field name from our own web app should be a loud 400. But PACE sends one payload
 *      to twenty-three apps at once and will add fields over time for apps that want
 *      them; rejecting the whole account because MyDiary has no column for `band` would
 *      make this app the one that breaks every time another app gains a feature.
 *
 *   2. Entries go in the Activity Log by hand. middleware/audit.js only logs requests
 *      that have a signed-in `req.user`, and these have none — so without this, an
 *      account could appear or be switched off with nothing to show who did it.
 */

/** The actor shown in the Activity Log for anything the hub did. */
const HUB_ACTOR = { name: 'PACE (provisioning)' };

const uuidField = z.string().trim().max(64).optional();
const emailField = z.string().trim().toLowerCase().max(190).optional();

/** Create / re-sync. Loose by design — see the note above. */
export const createSchema = z.object({
  match_uuid: uuidField,
  name: z.string().trim().min(1, 'Enter a name.').max(190),
  email: z.string().trim().toLowerCase().max(190),
  password_hash: z.string().trim().max(255).optional(),
  password: z.string().max(255).optional(),
  active: z.boolean().optional(),
  designation: z.string().trim().max(190).optional(),
  department: z.string().trim().max(190).optional(),
  position_title: z.string().trim().max(190).optional(),
});

/** How enable / disable name a person: UUID, email, or both. */
export const keySchema = z
  .object({ match_uuid: uuidField, email: emailField })
  .refine((v) => Boolean(v.match_uuid || v.email), {
    message: 'Provide match_uuid or email.',
    path: ['match_uuid'],
  });

/** The same, from the query string, for the lookup. */
export const lookupQuerySchema = keySchema;

/** @param {Record<string, any>} v */
const keyOf = (v) => ({ matchUuid: v.match_uuid ?? '', email: v.email ?? '' });

/**
 * GET /api/provisioning/ping — "are you there, and is my token right?"
 *
 * PACE's settings screen shows this as the green/red light per app, so it answers with
 * enough to tell a working link from a merely reachable one.
 * @type {import('express').RequestHandler}
 */
export const ping = (_req, res) => {
  res.json({ ok: true, app: 'mydiary', name: config.appName, version: 2 });
};

/** GET /api/provisioning/users/lookup?email=&uuid= @type {import('express').RequestHandler} */
export const lookup = async (req, res) => {
  const q = /** @type {any} */ (req).validQuery;
  const user = await provisioning.findByKey(keyOf(q));
  res.json({ ok: true, found: Boolean(user), user: user ? provisioning.serializeForHub(user) : null });
};

/** POST /api/provisioning/users @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const { created, user } = await provisioning.createOrUpdate(req.body);
  await log({
    user: HUB_ACTOR,
    action: created ? 'create' : 'update',
    module: 'Settings · Users',
    entity: user.name,
    entityId: user._id.toString(),
    details: created ? 'account created by PACE' : 're-synced from PACE',
    ip: req.ip ?? '',
  });
  res.status(created ? 201 : 200).json({ ok: true, created, user: provisioning.serializeForHub(user) });
};

/** POST /api/provisioning/users/enable @type {import('express').RequestHandler} */
export const enable = (req, res) => setStatus(req, res, 'active');

/** POST /api/provisioning/users/disable @type {import('express').RequestHandler} */
export const disable = (req, res) => setStatus(req, res, 'inactive');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {'active' | 'inactive'} status
 */
async function setStatus(req, res, status) {
  const user = await provisioning.setStatus(keyOf(req.body), status);
  if (!user) throw notFound('No such account here.');
  await log({
    user: HUB_ACTOR,
    action: 'update',
    module: 'Settings · Users',
    entity: user.name,
    entityId: user._id.toString(),
    details: `${status === 'active' ? 'enabled' : 'disabled'} by PACE`,
    ip: req.ip ?? '',
  });
  res.json({ ok: true, user: provisioning.serializeForHub(user) });
}

/**
 * The replacement secret. A minimum length is enforced because this endpoint is the one
 * way the token can be set remotely, and a short one would quietly weaken the only lock
 * on the door — PACE generates 64 hex characters, so the floor costs nothing.
 */
export const rotateSchema = z
  .object({ new_token: z.string().trim().min(MIN_TOKEN_LENGTH, `Token must be at least ${MIN_TOKEN_LENGTH} characters.`).max(255) })
  .strict();

/**
 * POST /api/provisioning/rotate-token — PACE's "Push token" button.
 *
 * Authenticated with the CURRENT token by the middleware above, then stores the new one;
 * that is the handover. From the next request on, only the new token opens the door.
 * @type {import('express').RequestHandler}
 */
export const rotateToken = async (req, res) => {
  await rotate(req.body.new_token);
  await log({
    user: HUB_ACTOR,
    action: 'update',
    module: 'Settings',
    entity: 'Provisioning token',
    details: 'rotated by PACE',
    ip: req.ip ?? '',
  });
  // The token itself is never echoed back, logged, or stored in the clear.
  res.json({ ok: true, rotated: true });
};
