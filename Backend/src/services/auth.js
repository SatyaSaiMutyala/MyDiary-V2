import { badRequest, forbidden, unauthorized } from '../utils/errors.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { cleanName } from './people.js';
import { checkPassword, hashPassword } from './users.js';

/**
 * Email + password → the active user, or 401 / 403 with the messages the web app shows as-is.
 * @param {string} email @param {string} password
 */
export async function authenticate(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const ok = user ? await checkPassword(password, user.passwordHash) : false;
  if (!user || !ok) throw unauthorized('Email or password is incorrect.');
  if (user.status !== 'active') throw forbidden('Your account is inactive. Ask an admin to reactivate it.');
  return user;
}

/**
 * Updates the signed-in user's own profile. Returns "field: old → new" strings for the Activity Log.
 * @param {any} user @param {{ name?: string, title?: string }} patch
 */
export async function updateProfile(user, patch) {
  const changes = [];
  if (patch.name !== undefined && patch.name !== user.name) {
    changes.push(`name: ${user.name} → ${patch.name}`);
    user.name = patch.name;
  }
  if (patch.title !== undefined && patch.title !== user.title) {
    changes.push(`title: ${user.title || '—'} → ${patch.title || '—'}`);
    user.title = patch.title;
  }
  /**
   * Their own unit, which only they reliably know.
   *
   * It is checked against their own department's units, so this cannot be used to put themselves
   * in another department's board, and a unit that no longer exists is refused rather than saved
   * and quietly ignored.
   */
  if (patch.labUnit !== undefined && patch.labUnit !== user.labUnit) {
    const wanted = patch.labUnit.trim();
    if (wanted) {
      const dept = await Department.findOne({
        name: new RegExp(`^${cleanName(user.department ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        'labReadiness.enabled': true,
      });
      const unit = (dept?.labReadiness?.units ?? []).find((u) => u.key === wanted && u.active !== false);
      if (!unit) throw badRequest('That is not a unit of your department.', [{ field: 'labUnit', message: 'Choose one of your department’s units.' }]);
    }
    changes.push(`unit: ${user.labUnit || '—'} → ${wanted || '—'}`);
    user.labUnit = wanted;
  }
  if (changes.length) await user.save();
  return changes;
}

/** @param {any} user @param {string} current @param {string} next */
export async function changePassword(user, current, next) {
  if (!(await checkPassword(current, user.passwordHash))) throw badRequest('Your current password is incorrect.', { current: 'Your current password is incorrect.' });
  user.passwordHash = await hashPassword(next);
  await user.save();
}
