/**
 * Seeds Department Master with the 18 TDPL departments from src/data/departments.js — their positions, the
 * four task lanes, the review cadences and the roster's position assignments — and fills in the Clinical
 * Laboratory's Lab Readiness checklist (src/data/labReadiness.js).
 *
 * Idempotent, and that is the whole point: a department whose code is already there is left untouched,
 * people are only filled in for a department whose list is still empty, and a readiness checklist that
 * already has anything in it is never rewritten. Nothing is ever deleted. Running it twice changes nothing
 * the second time.
 *
 *   cd Backend && MONGODB_URI= node scripts/seed-departments.js     # the embedded dev database
 */
import { connectDb } from '../src/db.js';
import { seedDepartments } from '../src/services/departments.js';

const db = await connectDb();
try {
  const { created, kept, people, lab } = await seedDepartments();
  console.log(`[seed] departments: ${created} created, ${kept} already existed · ${people} people assigned`);
  console.log(
    lab?.department
      ? `[seed] lab readiness: ${lab.department} · ${lab.units} units · ${lab.activities} activities${lab.kept ? ' (already configured, left as it was)' : ' (switched on)'}`
      : '[seed] lab readiness: skipped — no Clinical Laboratory department to attach it to',
  );
} finally {
  await db.close();
}
