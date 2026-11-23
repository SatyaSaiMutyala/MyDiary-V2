import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DeviceToken } from '../models/DeviceToken.js';
import { cleanName } from './people.js';

/**
 * Pushes a notification to a person's phones through Firebase Cloud Messaging (HTTP v1).
 *
 * Ported from the v1 app's app/Support/Push.php. It needs the Firebase service-account key:
 * FCM_CREDENTIALS in .env points at the JSON file. **Without it nothing is sent and nothing
 * fails** — the in-app notification is still written, which is the whole point: push is an extra,
 * never a dependency.
 *
 * The key is signed here with node:crypto, so no Firebase package is needed on the server.
 */

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** The service-account key, or null when push is not set up on this server. */
let cachedCredentials;
function credentials() {
  if (cachedCredentials !== undefined) return cachedCredentials;
  cachedCredentials = null;
  try {
    const configured = (process.env.FCM_CREDENTIALS ?? '').trim();
    if (!configured) return null;
    const file = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
    if (!fs.existsSync(file)) {
      console.warn(`[push] FCM_CREDENTIALS points at ${file}, which does not exist — push is off`);
      return null;
    }
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!json.private_key || !json.client_email || !json.project_id) {
      console.warn('[push] the Firebase key is missing private_key / client_email / project_id — push is off');
      return null;
    }
    cachedCredentials = json;
    console.log(`[push] Firebase ready (project ${json.project_id})`);
  } catch (err) {
    console.warn(`[push] the Firebase key could not be read: ${err.message} — push is off`);
  }
  return cachedCredentials;
}

/** Whether this server can send pushes at all. */
export const pushEnabled = () => credentials() !== null;

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A short-lived Google access token, kept for 50 minutes. */
let accessCache = { token: null, until: 0 };
async function accessToken(cred) {
  if (accessCache.token && Date.now() < accessCache.until) return accessCache.token;

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
    `${b64url(JSON.stringify({ iss: cred.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(cred.private_key);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Google refused the Firebase key: ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  accessCache = { token: body.access_token, until: Date.now() + 50 * 60_000 };
  return accessCache.token;
}

/**
 * Sends one notification to every phone these people are signed in on.
 *
 * @param {{ userNames: (string | null | undefined)[], title: string, body?: string, data?: Record<string, unknown> }} opts
 * @returns {Promise<number>} how many phones were reached
 */
export async function push({ userNames, title, body, data = {} }) {
  try {
    const cred = credentials();
    if (!cred) return 0;

    const names = [...new Set((userNames ?? []).map(cleanName).filter(Boolean))];
    if (!names.length) return 0;

    // Names are matched the way the rest of v2 matches them: exactly, ignoring case.
    const devices = await DeviceToken.find({
      userName: { $in: names.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
    });
    if (!devices.length) return 0;

    const access = await accessToken(cred);
    // FCM data values must all be strings.
    const payload = Object.fromEntries(
      Object.entries(data)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]),
    );
    const url = `https://fcm.googleapis.com/v1/projects/${cred.project_id}/messages:send`;

    let sent = 0;
    for (const device of devices) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title, ...(body ? { body } : null) },
              data: payload,
              android: { priority: 'high', notification: { sound: 'default' } },
              apns: { payload: { aps: { sound: 'default' } } },
            },
          }),
        });
        if (res.ok) {
          sent += 1;
          continue;
        }
        const text = await res.text();
        // The app was removed from that phone, or the token expired.
        if (res.status === 404 || res.status === 410 || text.includes('UNREGISTERED')) {
          await device.deleteOne();
        } else {
          console.warn(`[push] not delivered (${res.status}): ${text.slice(0, 300)}`);
        }
      } catch (err) {
        console.warn(`[push] one phone failed: ${err.message}`);
      }
    }
    return sent;
  } catch (err) {
    // Push failing must never break the thing that triggered it.
    console.warn(`[push] skipped: ${err.message}`);
    return 0;
  }
}
