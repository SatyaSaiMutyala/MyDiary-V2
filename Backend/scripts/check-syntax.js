// Minimal "lint": parses every .js file under src/ and test/ with node --check (no ESLint dependency).
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
}
for (const d of ['src', 'test', 'scripts']) walk(path.join(root, d));
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(String(e.stderr));
  }
}
console.log(`${files.length - failed}/${files.length} files parsed OK`);
process.exit(failed ? 1 : 0);
