import { randomBytes } from 'node:crypto';
import { User, serializeUser } from '../models/User.js';
import { badRequest, conflict } from '../utils/errors.js';
import { defaultModules } from './modules.js';
import { hashPassword, isDuplicateKey } from './users.js';

/**
 * Turning a PACE employee into a MyDiary user.
 *
 * PACE is the hub for every Trustlab app and sends all of them the same identity
 * payload; each app keeps whichever fields it happens to have. MyDiary has far
 * fewer columns than PACE sends, so most of that payload is read and dropped here
 * on purpose — emp_code, phone, gender, division, band, branch, date_of_joining
 * and the position code have nowhere to live in this schema.
 */

/** A bcrypt hash of any vintage: $2a$ (old), $2b$ (bcryptjs), $2y$ (what PHP/Laravel writes). */
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * The password to store for a newly provisioned account.
 *
 * PACE sends the employee's existing bcrypt hash, and bcryptjs verifies a PHP `$2y$`
 * hash as happily as one of its own — so copying it across means the person's PACE
 * password works here on their first sign-in, with the plaintext never travelling.
 *
 * The fallbacks matter more than they look:
 *   - `password` (plaintext) only arrives at create time, and only because apps that
 *     hash differently (Django/PBKDF2) cannot reuse a bcrypt hash. We can, so this is
 *     just a safety net.
 *   - with neither, we store a hash of random bytes. NOT config.seedPassword: that is
 *     one shared, documented password, and using it would leave a provisioned account
 *     standing open to anyone who has read the repo. A random hash locks the account
 *     until an admin resets it, which is the safe failure.
 *
 * @param {{ password_hash?: string, password?: string }} payload
 */
async function passwordHashFor(payload) {
  const hash = String(payload.password_hash ?? '').trim();
  if (BCRYPT.test(hash)) return hash;

  const plain = String(payload.password ?? '').trim();
  if (plain) return hashPassword(plain);

  return hashPassword(randomBytes(32).toString('hex'));
}

/**
 * PACE's field names onto MyDiary's. Only the four that have a home here.
 * @param {Record<string, any>} payload
 */
function profileFrom(payload) {
  return {
    name: String(payload.name ?? '').trim(),
    email: String(payload.email ?? '').trim().toLowerCase(),
    title: String(payload.designation ?? '').trim().slice(0, 120),
    department: String(payload.department ?? '').trim().slice(0, 80),
    position: String(payload.position_title ?? '').trim().slice(0, 120),
  };
}

/**
 * Find the person PACE means.
 *
 * The UUID is tried first and the email only after, because the UUID is the thing PACE
 * guarantees stable: an employee who changes their surname or their mail domain is the
 * same person, and matching on email alone would create a duplicate of them.
 *
 * @param {{ matchUuid?: string, email?: string }} key
 */
export async function findByKey({ matchUuid = '', email = '' }) {
  const uuid = matchUuid.trim();
  if (uuid) {
    const byUuid = await User.findOne({ matchUuid: uuid });
    if (byUuid) return byUuid;
  }
  const mail = email.trim().toLowerCase();
  if (mail) return User.findOne({ email: mail });
  return null;
}

/**
 * Create the account, or bring an existing one back into line with PACE.
 *
 * Deliberately idempotent. HR re-runs "provision" after fixing a detail, or after an app
 * was offline the first time, and a second call that answered 409 would make the status
 * grid show a permanent error for an account that is in fact fine. Re-sending the same
 * employee therefore updates and reports `created: false`.
 *
 * What it will NOT do is take over an account that already belongs to a different PACE
 * employee — same email, different UUID. That is two people, and silently rewriting one
 * into the other would hand somebody another person's diary.
 *
 * @param {Record<string, any>} payload
 * @returns {Promise<{ created: boolean, user: any }>}
 */
export async function createOrUpdate(payload) {
  const matchUuid = String(payload.match_uuid ?? '').trim();
  const profile = profileFrom(payload);
  const active = payload.active === undefined ? true : Boolean(payload.active);

  if (!profile.name) throw badRequest('name is required.', [{ field: 'name', message: 'Enter a name.' }]);
  if (!profile.email) {
    // PACE falls back from login email to office email, so a blank one here means the
    // employee has neither. Say so plainly: PACE surfaces this message to HR, who are
    // the only people who can fix it — in PACE, not here.
    throw badRequest('email is required — this employee has no login or office email in PACE.', [
      { field: 'email', message: 'Enter an email.' },
    ]);
  }

  const existing = await findByKey({ matchUuid, email: profile.email });

  if (existing) {
    if (matchUuid && existing.matchUuid && existing.matchUuid !== matchUuid) {
      throw conflict(`${profile.email} already belongs to a different employee here.`);
    }
    existing.name = profile.name;
    existing.email = profile.email;
    if (profile.title) existing.title = profile.title;
    if (profile.department) existing.department = profile.department;
    if (profile.position) existing.position = profile.position;
    existing.status = active ? 'active' : 'inactive';
    if (matchUuid && !existing.matchUuid) existing.matchUuid = matchUuid; // adopt on first contact
    await saveOr409(existing, profile.email);
    return { created: false, user: existing };
  }

  const doc = {
    name: profile.name,
    email: profile.email,
    passwordHash: await passwordHashFor(payload),
    // Everyone PACE sends arrives as an ordinary employee. Admin and manager are
    // decisions about MyDiary itself, not facts about the person's HR record, so an
    // admin here grants them — PACE must never be able to mint an admin remotely.
    role: 'employee',
    title: profile.title,
    department: profile.department,
    position: profile.position,
    status: active ? 'active' : 'inactive',
    modules: defaultModules('employee'),
  };
  if (matchUuid) doc.matchUuid = matchUuid;

  try {
    return { created: true, user: await User.create(doc) };
  } catch (e) {
    if (isDuplicateKey(e)) {
      // Lost a race with a concurrent provision of the same person: the row now exists,
      // so report it the way the idempotent path would have.
      const now = await findByKey({ matchUuid, email: profile.email });
      if (now) return { created: false, user: now };
      throw conflict(`An account with the email ${profile.email} already exists.`);
    }
    throw e;
  }
}

/**
 * Switch an account on or off. Returns null when there is nobody to switch.
 *
 * Disabling is the whole point of the hub: middleware/auth.js resolves a token to
 * `user.status === 'active'` and nothing else, so an inactive account's existing JWT
 * stops working on its very next request. There is no session to hunt down.
 *
 * @param {{ matchUuid?: string, email?: string }} key
 * @param {'active' | 'inactive'} status
 */
export async function setStatus(key, status) {
  const user = await findByKey(key);
  if (!user) return null;
  if (user.status !== status) {
    user.status = status;
    await user.save();
  }
  return user;
}

/** @param {any} user @param {string} email */
async function saveOr409(user, email) {
  try {
    await user.save();
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict(`An account with the email ${email} already exists.`);
    throw e;
  }
}

/**
 * What PACE gets back about a person. The full user DTO would leak this app's module
 * grants and role into the hub, which has no business knowing them.
 * @param {any} u
 */
export function serializeForHub(u) {
  const dto = serializeUser(u);
  return {
    id: dto.id,
    match_uuid: u.matchUuid ?? '',
    name: dto.name,
    email: dto.email,
    status: dto.status,
    active: dto.status === 'active',
    department: dto.department,
    title: dto.title,
    position: dto.position,
  };
}
