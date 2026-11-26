import { Schema, model } from 'mongoose';

/**
 * One stored setting, by key.
 *
 * Deliberately tiny and generic. The only thing in it today is the hash of the
 * provisioning token PACE last pushed (services/provisioningToken.js), which has to
 * outlive a restart and therefore cannot live in .env — PACE rotates it over HTTP,
 * and an API that rewrote its own .env file would be a worse idea than a row here.
 *
 * Nothing in this collection is served to the web app, and secrets are stored hashed,
 * never in the clear.
 */
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: '' },
  },
  { timestamps: true },
);

export const AppSetting = model('AppSetting', appSettingSchema);

/** @param {string} key @returns {Promise<string>} '' when unset. */
export async function getSetting(key) {
  const row = await AppSetting.findOne({ key }, { value: 1 }).lean();
  return row?.value ?? '';
}

/** @param {string} key @param {string} value */
export async function setSetting(key, value) {
  await AppSetting.updateOne({ key }, { $set: { value } }, { upsert: true });
}
