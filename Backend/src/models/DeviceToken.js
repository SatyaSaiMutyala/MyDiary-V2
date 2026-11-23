import crypto from 'node:crypto';
import { Schema, model } from 'mongoose';

/**
 * One phone a person is signed in on, and its push address.
 *
 * Keyed by name, like everything else people-shaped in v2 (notifications, attendees, owners), so a
 * push goes to the same person the in-app notification does without a second lookup.
 *
 * The token is stored as given — Firebase needs it back verbatim — and also hashed, because the
 * token can be longer than an index key allows and the hash is what uniqueness is enforced on.
 */
export const DEVICE_PLATFORMS = /** @type {const} */ (['android', 'ios']);

const deviceTokenSchema = new Schema(
  {
    userName: { type: String, required: true, trim: true },
    token: { type: String, required: true },
    tokenHash: { type: String, required: true },
    platform: { type: String, enum: DEVICE_PLATFORMS, required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One row per phone. A phone that signs in as somebody else replaces the old row.
deviceTokenSchema.index({ tokenHash: 1 }, { unique: true });
deviceTokenSchema.index({ userName: 1 });

export const DeviceToken = model('DeviceToken', deviceTokenSchema);

/** @param {string} token */
export const hashOf = (token) => crypto.createHash('sha256').update(token).digest('hex');
