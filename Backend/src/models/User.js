import { Schema, model } from 'mongoose';
import { ROLES, effectiveModules } from '../services/modules.js';

/** @typedef {'active' | 'inactive'} UserStatus */
export const USER_STATUSES = /** @type {const} */ (['active', 'inactive']);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: 'employee' },
    /** Job title, e.g. "CMD", "Lab Head". */
    title: { type: String, default: '' },
    /** Department / group, e.g. "Operations". */
    department: { type: String, default: '' },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'active' },
    /** Modules this person can open (services/modules.js). Ignored for admins (always all). */
    modules: { type: [String], default: [] },
  },
  { timestamps: true },
);
userSchema.index({ name: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ department: 1 });

export const User = model('User', userSchema);

/**
 * @typedef {object} UserDto  the session / user shape the web app expects
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} title
 * @property {string} department
 * @property {string[]} modules
 * @property {UserStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @param {any} u a User document @returns {UserDto} */
export function serializeUser(u) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title ?? '',
    department: u.department ?? '',
    modules: effectiveModules(u),
    status: u.status ?? 'active',
    createdAt: (u.createdAt ?? new Date()).toISOString(),
    updatedAt: (u.updatedAt ?? u.createdAt ?? new Date()).toISOString(),
  };
}
