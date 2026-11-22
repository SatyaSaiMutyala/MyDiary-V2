import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.stop());

describe('GET /api/health', () => {
  it('reports the app, node version and a connected database', async () => {
    const r = await request(ctx.app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, name: 'MyDiary V2 API', db: 'connected', env: 'test' });
    expect(r.body.node).toBe(process.version);
  });

  it('unknown endpoints return the standard error body', async () => {
    const r = await request(ctx.app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: { message: 'No such endpoint.', code: 'not_found' } });
  });
});
