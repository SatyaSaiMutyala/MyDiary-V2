/**
 * The PACE identity hub contract (src/routes/provisioning.js).
 *
 * These tests stand in for PACE: same paths, same header, same payload shape its
 * AppConnector sends. If one of them fails, HR will see a red row on the PACE
 * provisioning screen.
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppSetting } from '../src/models/AppSetting.js';
import { auth, login, startTestApp } from './helpers.js';

const TOKEN = 'test-provisioning-token';
process.env.PROVISIONING_TOKEN = TOKEN;

let ctx;
let config;

/** PACE's own header. */
const hub = (token = TOKEN) => ({ 'X-Provisioning-Token': token });

const post = (p, b, token) => request(ctx.app).post(p).set(hub(token)).send(b);
const get = (p, token) => request(ctx.app).get(p).set(hub(token));

/** The password the employee already uses in PACE. */
const PLAIN = 'pace-password-123';
/** What PACE actually sends: a PHP/Laravel bcrypt hash, which uses the $2y$ prefix. */
let laravelHash = '';

/** One employee, in the exact shape ProvisioningService::payload() builds. */
const employee = (over = {}) => ({
  match_uuid: '11111111-2222-4333-8444-555555555555',
  name: 'Ravi Kumar',
  email: 'ravi.kumar@trustlab.co.in',
  password_hash: laravelHash,
  emp_code: 'TL-0042',
  active: true,
  phone: '9876543210',
  gender: 'male',
  department: 'Operations',
  division: 'NRL',
  designation: 'Lab Head',
  date_of_joining: '2024-04-01',
  position_code: 'POS-LAB-01',
  position_title: 'Lab Technician',
  band: 'B3',
  branch: 'Hyderabad',
  ...over,
});

beforeAll(async () => {
  ctx = await startTestApp();
  ({ config } = await import('../src/config.js'));
  laravelHash = `$2y$${(await bcrypt.hash(PLAIN, 10)).slice(4)}`;
});
afterAll(() => ctx.stop());

describe('the door', () => {
  it('answers ping when the token matches', async () => {
    const r = await get('/api/provisioning/ping');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, app: 'mydiary' });
  });

  it('refuses a wrong token', async () => {
    const r = await get('/api/provisioning/ping', 'not-the-token');
    expect(r.status).toBe(401);
  });

  it('refuses a missing token', async () => {
    const r = await request(ctx.app).get('/api/provisioning/ping');
    expect(r.status).toBe(401);
  });

  it('answers 503 — not 401 — when no token is configured at all', async () => {
    // PACE renders 503 as "Not set up for provisioning yet" and 401 as a token
    // problem. Sending the wrong one of those sends HR to fix the wrong thing.
    const saved = config.provisioningToken;
    config.provisioningToken = '';
    await AppSetting.deleteMany({}); // and nothing pushed through rotate-token either
    try {
      const r = await get('/api/provisioning/ping');
      expect(r.status).toBe(503);
      expect(r.body.error.code).toBe('not_configured');
    } finally {
      config.provisioningToken = saved;
    }
  });

  it('is not reachable with a normal user session', async () => {
    const { token } = await login(ctx.app);
    const r = await request(ctx.app).get('/api/provisioning/ping').set(auth(token));
    expect(r.status).toBe(401);
  });
});

describe('creating an employee', () => {
  it('creates the account from PACE’s payload', async () => {
    const r = await post('/api/provisioning/users', employee());
    expect(r.status).toBe(201);
    expect(r.body.created).toBe(true);
    expect(r.body.user).toMatchObject({
      match_uuid: '11111111-2222-4333-8444-555555555555',
      name: 'Ravi Kumar',
      email: 'ravi.kumar@trustlab.co.in',
      status: 'active',
      active: true,
      department: 'Operations',
      title: 'Lab Head',        // PACE's `designation`
      position: 'Lab Technician', // PACE's `position_title`
    });
  });

  it('lets the employee sign in with their existing PACE password', async () => {
    // The whole point of copying the bcrypt hash across rather than inventing a
    // password: no reset email, nothing to tell them.
    const r = await request(ctx.app).post('/api/auth/login').send({ email: 'ravi.kumar@trustlab.co.in', password: PLAIN });
    expect(r.status).toBe(200);
    expect(r.body.user.name).toBe('Ravi Kumar');
  });

  it('does not leak this app’s role or module grants back to the hub', async () => {
    const r = await get('/api/provisioning/users/lookup?email=ravi.kumar@trustlab.co.in');
    expect(r.body.user).not.toHaveProperty('role');
    expect(r.body.user).not.toHaveProperty('modules');
  });

  it('is idempotent — re-provisioning updates instead of failing', async () => {
    const r = await post('/api/provisioning/users', employee({ designation: 'Senior Lab Head' }));
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(false);
    expect(r.body.user.title).toBe('Senior Lab Head');
  });

  it('ignores fields MyDiary has no column for', async () => {
    // PACE sends one payload to 23 apps and will add fields over time. Rejecting
    // unknown ones would break this app every time another app gains a feature.
    const r = await post('/api/provisioning/users', employee({ some_future_field: 'x', band: 'B9' }));
    expect(r.status).toBe(200);
  });

  it('refuses an employee with no email, and says why', async () => {
    const r = await post('/api/provisioning/users', employee({ match_uuid: 'no-email-uuid', email: '' }));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/no login or office email in PACE/);
  });

  it('will not hand one person’s account to a different employee', async () => {
    const r = await post('/api/provisioning/users', employee({ match_uuid: 'a-different-employee' }));
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/already belongs to a different employee/);
  });
});

describe('finding an employee', () => {
  it('finds by uuid', async () => {
    const r = await get('/api/provisioning/users/lookup?match_uuid=11111111-2222-4333-8444-555555555555');
    expect(r.body).toMatchObject({ ok: true, found: true });
    expect(r.body.user.email).toBe('ravi.kumar@trustlab.co.in');
  });

  it('finds by email', async () => {
    const r = await get('/api/provisioning/users/lookup?email=ravi.kumar@trustlab.co.in');
    expect(r.body.found).toBe(true);
  });

  it('prefers the uuid over the email, so a changed email still matches', async () => {
    const r = await get('/api/provisioning/users/lookup?match_uuid=11111111-2222-4333-8444-555555555555&email=changed@trustlab.co.in');
    expect(r.body.found).toBe(true);
    expect(r.body.user.email).toBe('ravi.kumar@trustlab.co.in');
  });

  it('reports a stranger as not found rather than erroring', async () => {
    const r = await get('/api/provisioning/users/lookup?email=nobody@trustlab.co.in');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ found: false, user: null });
  });

  it('needs at least one way to name the person', async () => {
    const r = await get('/api/provisioning/users/lookup');
    expect(r.status).toBe(400);
  });
});

describe('switching an employee off and on', () => {
  it('disables, and the signed-in session dies on the next request', async () => {
    const before = await request(ctx.app).post('/api/auth/login').send({ email: 'ravi.kumar@trustlab.co.in', password: PLAIN });
    const token = before.body.token;
    expect((await request(ctx.app).get('/api/auth/me').set(auth(token))).status).toBe(200);

    const r = await post('/api/provisioning/users/disable', { match_uuid: '11111111-2222-4333-8444-555555555555' });
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ status: 'inactive', active: false });

    // The token itself is still perfectly valid; the account behind it is not.
    expect((await request(ctx.app).get('/api/auth/me').set(auth(token))).status).toBe(401);
  });

  it('refuses the password too, while disabled', async () => {
    const r = await request(ctx.app).post('/api/auth/login').send({ email: 'ravi.kumar@trustlab.co.in', password: PLAIN });
    expect(r.status).not.toBe(200);
  });

  it('enables again by email', async () => {
    const r = await post('/api/provisioning/users/enable', { email: 'ravi.kumar@trustlab.co.in' });
    expect(r.status).toBe(200);
    expect(r.body.user.active).toBe(true);
    const back = await request(ctx.app).post('/api/auth/login').send({ email: 'ravi.kumar@trustlab.co.in', password: PLAIN });
    expect(back.status).toBe(200);
  });

  it('404s for somebody who was never provisioned here', async () => {
    const r = await post('/api/provisioning/users/disable', { email: 'nobody@trustlab.co.in' });
    expect(r.status).toBe(404);
  });

  it('needs a uuid or an email', async () => {
    const r = await post('/api/provisioning/users/disable', {});
    expect(r.status).toBe(400);
  });
});

describe('the Activity Log', () => {
  it('records what the hub did, attributed to PACE', async () => {
    const { token } = await login(ctx.app);
    const r = await request(ctx.app).get('/api/audit?limit=50').set(auth(token));
    const mine = r.body.items.filter((e) => e.user?.name === 'PACE (provisioning)');
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.map((e) => e.details)).toContain('account created by PACE');
  });
});

/**
 * Last on purpose: a successful rotation changes the secret for everything after it, so
 * running these earlier would pull the token out from under the tests above.
 */
describe('rotating the token', () => {
  const NEXT = 'a-replacement-token-of-sufficient-length';

  it('refuses a token short enough to be guessable', async () => {
    const r = await post('/api/provisioning/rotate-token', { new_token: 'tiny' });
    expect(r.status).toBe(400);
  });

  it('refuses to rotate for a caller who does not hold the current token', async () => {
    const r = await post('/api/provisioning/rotate-token', { new_token: NEXT }, 'not-the-token');
    expect(r.status).toBe(401);
  });

  it('accepts the new token, and never echoes it back', async () => {
    const r = await post('/api/provisioning/rotate-token', { new_token: NEXT });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, rotated: true });
    expect(JSON.stringify(r.body)).not.toContain(NEXT);
  });

  it('retires the old token immediately', async () => {
    // If the previous secret still worked, rotating would achieve nothing.
    expect((await get('/api/provisioning/ping', TOKEN)).status).toBe(401);
  });

  it('opens the door to the new one', async () => {
    expect((await get('/api/provisioning/ping', NEXT)).status).toBe(200);
  });

  it('stores only a hash, never the token itself', async () => {
    const rows = await AppSetting.find({}).lean();
    const blob = JSON.stringify(rows);
    expect(blob).not.toContain(NEXT);
    expect(blob).toMatch(/[0-9a-f]{64}/); // a sha-256 digest
  });

  it('beats the .env fallback, so a rotation cannot be undone by the old env value', async () => {
    const saved = config.provisioningToken;
    config.provisioningToken = TOKEN;
    try {
      expect((await get('/api/provisioning/ping', TOKEN)).status).toBe(401);
      expect((await get('/api/provisioning/ping', NEXT)).status).toBe(200);
    } finally {
      config.provisioningToken = saved;
    }
  });
});
