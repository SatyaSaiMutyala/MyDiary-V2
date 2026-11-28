import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { User } from '../models/User.js';
import { cleanModules, defaultModules, unknownModules } from './modules.js';

const BCRYPT_ROUNDS = 10;

/** @param {string} password */
export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

/** @param {string} password @param {string} hash */
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);

/** @param {unknown} e */
export const isDuplicateKey = (e) => typeof e === 'object' && e !== null && /** @type {any} */ (e).code === 11000;

/** 404 with a clear message when the id is malformed or unknown. @param {string} id */
export async function findUserOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That user does not exist.');
  const user = await User.findById(id);
  if (!user) throw notFound('That user does not exist.');
  return user;
}

/**
 * Module list to store for a role: admins always all (stored as []), others validated against the registry and
 * limited to what the role may have. `undefined` = the role's defaults.
 * @param {string[] | undefined} modules
 * @param {string} role
 */
export function modulesFor(modules, role) {
  if (role === 'admin') return defaultModules('admin');
  if (modules === undefined) return defaultModules(role);
  const unknown = unknownModules(modules);
  if (unknown.length) throw badRequest(`Unknown module${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.`, [{ field: 'modules', message: 'Unknown module.' }]);
  return cleanModules(modules, role);
}

/**
 * Creates a user. Throws 409 when the email is taken.
 * @param {{ name: string, email: string, title?: string, department?: string, role: string, status?: string,
 *   modules?: string[], password?: string }} input
 */
export async function createUser(input) {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) throw conflict(`An account with the email ${email} already exists.`);
  try {
    return await User.create({
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password || config.seedPassword),
      role: input.role,
      title: input.title ?? '',
      department: input.department ?? '',
      position: input.position ?? '',
      labUnit: input.labUnit ?? '',
      status: input.status ?? 'active',
      modules: modulesFor(input.modules, input.role),
    });
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict(`An account with the email ${email} already exists.`);
    throw e;
  }
}

/**
 * Applies a PATCH to a user document and saves it. Returns the fields that changed.
 * @param {import('mongoose').Document & Record<string, any>} user
 * @param {Partial<{ name: string, email: string, title: string, department: string, role: string, status: string,
 *   modules: string[] }>} patch
 */
/** The accounts behind a list of ids, skipping any that are gone. @param {string[]} ids */
export async function findUsersByIds(ids) {
  return User.find({ _id: { $in: ids } });
}

/**
 * Puts one password onto many accounts, and makes every one of them replace it.
 *
 * The hash is computed once by the caller and reused: hashing is deliberately slow, and doing it
 * per person would turn a 200-account reset into a minute of held connection for no benefit —
 * the password is the same for all of them by definition.
 *
 * @param {any[]} users @param {string} hash
 * @returns the names changed, in the order they were stored
 */
export async function setPasswordForAll(users, hash) {
  await User.updateMany(
    { _id: { $in: users.map((u) => u._id) } },
    { $set: { passwordHash: hash, mustChangePassword: true } },
  );
  return users.map((u) => u.name);
}

export async function updateUser(user, patch) {
  const before = { name: user.name, email: user.email, title: user.title, department: user.department, position: user.position, labUnit: user.labUnit, role: user.role, status: user.status, modules: [...user.modules], mustChangePassword: user.mustChangePassword === true };
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.email !== undefined) {
    const email = patch.email.toLowerCase();
    if (email !== user.email && (await User.exists({ email }))) throw conflict(`An account with the email ${email} already exists.`);
    user.email = email;
  }
  if (patch.mustChangePassword !== undefined) user.mustChangePassword = patch.mustChangePassword;
  if (patch.title !== undefined) user.title = patch.title;
  if (patch.department !== undefined) user.department = patch.department;
  if (patch.position !== undefined) user.position = patch.position;
  if (patch.labUnit !== undefined) user.labUnit = patch.labUnit;
  if (patch.status !== undefined) user.status = patch.status;
  const roleChanged = patch.role !== undefined && patch.role !== user.role;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.modules !== undefined || roleChanged) {
    // Role change without an explicit module list: fall back to the new role's defaults.
    user.modules = modulesFor(patch.modules !== undefined ? patch.modules : roleChanged ? undefined : user.modules, user.role);
  }
  try {
    await user.save();
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict(`An account with the email ${user.email} already exists.`);
    throw e;
  }
  return before;
}

/** Creates the first admin from ADMIN_* when the users collection is empty (idempotent). */
export async function ensureDefaultAdmin() {
  await User.createIndexes();
  if ((await User.estimatedDocumentCount()) > 0) return null;
  const admin = await User.create({
    name: config.admin.name,
    email: config.admin.email,
    passwordHash: await hashPassword(config.admin.password),
    role: 'admin',
    title: 'CMD',
    department: 'CMD Office',
    status: 'active',
    modules: defaultModules('admin'),
  });
  console.log(`[boot] created first admin ${admin.email}`);
  return admin;
}
