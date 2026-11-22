/**
 * The single rule deciding whether this process may write DEMO rows nobody asked for.
 *
 * Two kinds of starting data are not the same thing:
 *   - LIBRARY data — the 12 agenda templates and the 12 project templates. The pickers in the UI are
 *     empty without them and no business record is invented, so these are always written, production
 *     included. They are reference data, not somebody's work.
 *   - DEMO data — sample projects, the integration register, the employee roster, a default admin.
 *     These look like real records the business never created. Nothing writes them automatically any
 *     more; a script or a test has to ask, and this rule still refuses in production.
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
