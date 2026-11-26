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
    /**
     * The person's position inside that department, by name ("Lab Technician"), matching one of the
     * department's positions. Blank means "no particular position", which in My Activity shows only
     * the tasks the whole department shares.
     */
    position: { type: String, default: '' },
    /**
     * Which unit of that department they work in — the key of one of its Lab Readiness units
     * ("nrl-biochemistry"). Only a department that runs a readiness board has units, so this is
     * blank for everybody else. It is what My Activity reads to know whose board is whose.
     */
    labUnit: { type: String, default: '' },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'active' },
    /** Modules this person can open (services/modules.js). Ignored for admins (always all). */
    modules: { type: [String], default: [] },
    /**
     * The identity PACE knows this person by, across every Trustlab app.
     *
     * PACE is the hub: it generates one UUID per employee and stores it in each app it
     * provisions, so the same person can always be found again without matching on an
     * email or a name that somebody may since have changed. Blank for anyone created
     * here by hand.
     *
     * No `default`, deliberately: `sparse` excludes documents where the field is ABSENT,
     * not ones where it is an empty string. A `default: ''` would therefore put every
     * hand-created user into the unique index under the same '' key, and the second one
     * would be rejected. Leaving it undefined keeps them out of the index entirely.
     */
    matchUuid: { type: String, trim: true, index: { unique: true, sparse: true } },
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
 * @property {string} position
 * @property {string} labUnit
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
    position: u.position ?? '',
    labUnit: u.labUnit ?? '',
    modules: effectiveModules(u),
    status: u.status ?? 'active',
    createdAt: (u.createdAt ?? new Date()).toISOString(),
    updatedAt: (u.updatedAt ?? u.createdAt ?? new Date()).toISOString(),
  };
}
