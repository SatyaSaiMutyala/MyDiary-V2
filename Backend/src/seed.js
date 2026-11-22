/**
 * Seeds the TDPL roster (src/data/roster.js) as user accounts. Idempotent: upsert by email.
 *  - new person: created with the derived role, the role's default modules and the SEED_PASSWORD
 *  - existing person: only title and department are refreshed (role, modules, status and password are the
 *    admin's to manage, so a re-seed never undoes their changes)
 * Usage: npm run seed
 */
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { connectDb } from './db.js';
import { EMPLOYEES, tdplEmail } from './data/roster.js';
import { User } from './models/User.js';
import { defaultModules } from './services/modules.js';
import { hashPassword } from './services/users.js';

const ADMIN_NAMES = ['Venkata Cherukuri', 'Pallavi Elisetti'];
const MANAGER_TITLE = /CMD|CFO|COO|CGO|Head|Director|Manager|MR|Lab Head|Secretary|HOD/i;

/** Account role for a roster entry. @param {{ name: string, role: string }} p */
export function roleFor(p) {
  if (ADMIN_NAMES.includes(p.name)) return 'admin';
  return MANAGER_TITLE.test(p.role) ? 'manager' : 'employee';
}

/** The roster as flat user inputs. */
export function rosterUsers() {
  const list = [];
  for (const g of EMPLOYEES) {
    for (const p of g.people) {
      const role = roleFor(p);
      list.push({ name: p.name, email: tdplEmail(p.name), title: p.role, department: g.group, role, modules: defaultModules(role) });
    }
  }
  return list;
}

/**
 * Upserts every roster user. @param {{ password?: string, quiet?: boolean }} [opts]
 * @returns {Promise<{ created: number, updated: number }>}
 */
export async function seedRoster(opts = {}) {
  const passwordHash = await hashPassword(opts.password ?? config.seedPassword);
  let created = 0;
  let updated = 0;
  for (const u of rosterUsers()) {
    const r = await User.updateOne(
      { email: u.email },
      {
        $set: { title: u.title, department: u.department },
        $setOnInsert: { name: u.name, email: u.email, passwordHash, role: u.role, status: 'active', modules: u.modules },
      },
      { upsert: true },
    );
    if (r.upsertedCount) created++;
    else updated++;
    if (!opts.quiet) console.log(`[seed] ${r.upsertedCount ? 'created' : 'kept   '} ${u.role.padEnd(8)} ${u.email}`);
  }
  return { created, updated };
}

async function main() {
  const db = await connectDb();
  const { created, updated } = await seedRoster();
  console.log(`[seed] done: ${created} created, ${updated} already existed (title/department refreshed)`);
  console.log(`[seed] new accounts sign in with the SEED_PASSWORD${process.env.SEED_PASSWORD ? ' from .env' : ' default (see .env.example)'}`);
  await db.close();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  });
}
