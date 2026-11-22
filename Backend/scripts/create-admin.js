/**
 * Creates the first administrator, by hand, on a database that has none.
 *
 *   cd Backend && node scripts/create-admin.js
 *
 * Why a script and not a public endpoint: every route in this API already requires a signed-in admin,
 * so a brand-new database has no way in. A one-off sign-up route would be a hole left open forever;
 * this runs on the server, as the person who owns it, and refuses once an account exists.
 *
 * It asks for the name, email and password at the prompt — nothing is read from ADMIN_* in .env, so a
 * published example password can never become a real account. The password is never echoed, never
 * logged, and never stored in shell history. Pass --force to add another admin to a database that
 * already has users (it will say what is there first and ask you to confirm).
 */
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { User } from '../src/models/User.js';
import { defaultModules } from '../src/services/modules.js';
import { hashPassword } from '../src/services/users.js';

const force = process.argv.includes('--force');

/** A stdout that can be told to stop echoing, so the password never appears on screen. */
const mutable = new Writable({
  write(chunk, _enc, cb) {
    if (!mutable.muted) process.stdout.write(chunk);
    cb();
  },
});
const rl = readline.createInterface({ input: process.stdin, output: mutable, terminal: true });

/** @param {string} q */
const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

/** @param {string} q */
async function askSecret(q) {
  process.stdout.write(q);
  mutable.muted = true;
  const answer = await new Promise((res) => rl.question('', (a) => res(a)));
  mutable.muted = false;
  process.stdout.write('\n');
  return answer;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Rejects the obvious: too short, or a password shipped in an example file. */
function passwordProblem(pw) {
  if (pw.length < 12) return 'Use at least 12 characters.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Use upper case, lower case and a digit.';
  const banned = ['mydiary123', 'password', 'admin123', 'changeme', config.admin?.password].filter(Boolean);
  if (banned.some((b) => pw.toLowerCase() === String(b).toLowerCase())) return 'That password appears in the example configuration — choose another.';
  return null;
}

async function main() {
  if (!config.mongodbUri) {
    console.error('[create-admin] MONGODB_URI is not set. Refusing to create an administrator on the throwaway embedded database.');
    process.exit(1);
  }
  const db = await connectDb();
  console.log(`[create-admin] connected to ${config.mongodbUri.replace(/\/\/[^@]*@/, '//***@')}`);

  const existing = await User.countDocuments();
  if (existing > 0) {
    const admins = await User.find({ role: 'admin' }).select('name email status').lean();
    console.log(`\nThis database already has ${existing} user account(s).`);
    for (const a of admins) console.log(`  admin: ${a.name} <${a.email}> (${a.status})`);
    if (!force) {
      console.log('\nNothing created. Re-run with --force if you really want to add another administrator.');
      rl.close();
      await db.close();
      process.exit(1);
    }
    const go = await ask('\nAdd ANOTHER administrator to this database? Type yes to continue: ');
    if (go.toLowerCase() !== 'yes') {
      console.log('Nothing created.');
      rl.close();
      await db.close();
      process.exit(1);
    }
  }

  const name = await ask('Full name       : ');
  if (!name) throw new Error('A name is required.');
  const email = (await ask('Email address   : ')).toLowerCase();
  if (!EMAIL.test(email)) throw new Error('That does not look like an email address.');
  if (await User.findOne({ email })) throw new Error('An account with that email already exists.');

  const password = await askSecret('Password        : ');
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const again = await askSecret('Repeat password : ');
  if (again !== password) throw new Error('The two passwords are not the same.');

  const title = (await ask('Job title       [Super Admin] : ')) || 'Super Admin';
  const department = (await ask('Department      [Administration] : ')) || 'Administration';

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    title,
    department,
    status: 'active',
    modules: defaultModules('admin'),
  });

  console.log(`\n✓ Administrator created: ${user.name} <${user.email}>`);
  console.log(`  role: admin · modules: ${user.modules.length} · status: ${user.status}`);
  console.log('  Sign in at the web app with this email and the password you just typed.');
  rl.close();
  await db.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(`\n[create-admin] ${err.message}`);
  rl.close();
  process.exit(1);
});
