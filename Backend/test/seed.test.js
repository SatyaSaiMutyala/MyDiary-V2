import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, login, startTestApp } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.stop());

describe('seed roster', () => {
  it('derives roles, emails and modules from the TDPL roster', async () => {
    const { rosterUsers, roleFor } = await import('../src/seed.js');
    const users = rosterUsers();
    expect(users.length).toBe(30);
    const byName = Object.fromEntries(users.map((u) => [u.name, u]));
    expect(byName['Venkata Cherukuri']).toMatchObject({ role: 'admin', email: 'venkata.cherukuri@trustlab.co.in', title: 'CMD', department: 'CMD Office' });
    expect(byName['Pallavi Elisetti'].role).toBe('admin');
    expect(byName['Dr. Anusha Singh']).toMatchObject({ role: 'manager', email: 'dr.anusha.singh@trustlab.co.in' });
    expect(byName['Dr. Bharath'].role).toBe('manager'); // HOD
    expect(byName['S. Iyer'].role).toBe('manager'); // MR
    expect(byName['Company Secretary'].role).toBe('employee'); // title is 'CS / Legal'; the rule looks at titles, not names
    expect(roleFor({ name: 'X', role: 'Secretary' })).toBe('manager');
    expect(byName['Pavan']).toMatchObject({ role: 'employee', email: 'pavan@trustlab.co.in', department: 'IT & Digital' });
    expect(byName['Madhavi'].role).toBe('employee');
    expect(byName['Pavan'].modules).not.toContain('departments');
    expect(byName['Dr. Bharath'].modules).toContain('departments');
    expect(byName['Dr. Bharath'].modules).not.toContain('settings');
    expect(roleFor({ name: 'Someone', role: 'Quality Manager' })).toBe('manager');
    // Every email is unique.
    expect(new Set(users.map((u) => u.email)).size).toBe(users.length);
  });

  it('is idempotent and never resets existing accounts', async () => {
    const { seedRoster } = await import('../src/seed.js');
    // The first admin already exists (same email as the roster's Venkata) → kept, not duplicated.
    const first = await seedRoster({ quiet: true, password: 'seedpass1' });
    expect(first).toEqual({ created: 29, updated: 1 });

    const { token } = await login(ctx.app);
    const users = await request(ctx.app).get('/api/users?limit=200').set(auth(token));
    expect(users.body.total).toBe(30);

    // Seeded account signs in with the seed password; the pre-existing admin keeps its own.
    await login(ctx.app, 'pavan@trustlab.co.in', 'seedpass1');
    const pavan = users.body.items.find((u) => u.email === 'pavan@trustlab.co.in');
    await request(ctx.app).patch(`/api/users/${pavan.id}`).set(auth(token)).send({ role: 'manager' }).expect(200);

    const second = await seedRoster({ quiet: true, password: 'otherpass1' });
    expect(second).toEqual({ created: 0, updated: 30 });
    const again = await request(ctx.app).get(`/api/users/${pavan.id}`).set(auth(token));
    expect(again.body.user.role).toBe('manager'); // admin's change survives a re-seed
    await login(ctx.app, 'pavan@trustlab.co.in', 'seedpass1'); // password untouched
  });
});
