/**
 * The single rule deciding whether this process may write a "starting set" of rows nobody asked for.
 *
 * Seeding is a convenience for development: it fills an empty database so the screens are not blank.
 * In production it is the opposite of helpful — it invents records the business never created. One rule
 * lives here so there is exactly one place to read, rather than a slightly different test in each module.
 *
 *   NODE_ENV=production  → never, whatever else is set. No escape hatch.
 *   NODE_ENV=test        → always: the suite builds and tears down its own database.
 *   no MONGODB_URI       → yes: that is the embedded dev database, ours to fill.
 *   a real MONGODB_URI   → only with SEED_DEMO_DATA=true, and never in production.
 *
 * Note the localhost address is deliberately NOT treated as safe: a production server running MongoDB on
 * the same machine connects to mongodb://localhost, and that database is as real as any other.
 */
import { config } from '../config.js';

/** @returns {boolean} */
export function seedingAllowed() {
  if (config.isProd) return false;
  if (config.isTest) return true;
  if (!config.mongodbUri) return true;
  return process.env.SEED_DEMO_DATA === 'true';
}

/** One line explaining a refusal, for the log. @param {string} what */
export const seedSkipped = (what) =>
  `[seed] ${what} not inserted: ${config.isProd ? 'NODE_ENV=production' : 'MONGODB_URI points at a real database (set SEED_DEMO_DATA=true to override outside production)'}`;
