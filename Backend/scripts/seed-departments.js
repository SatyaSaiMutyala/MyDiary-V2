/**
 * Seeds Department Master with the 18 TDPL departments from src/data/departments.js — their positions, the
 * four task lanes, the review cadences and the roster's position assignments.
 *
 * Idempotent: a department whose code is already there is left untouched, and people are only filled in for
 * a department whose list is still empty.
 *
 *   cd Backend && MONGODB_URI= node scripts/seed-departments.js     # the embedded dev database
 */
import { connectDb } from '../src/db.js';
import { seedDepartments } from '../src/services/departments.js';

const db = await connectDb();
try {
  const { created, kept, people } = await seedDepartments();
  console.log(`[seed] departments: ${created} created, ${kept} already existed · ${people} people assigned`);
} finally {
  await db.close();
}
