/**
 * Notification text is the one place the API composes HTML. It is built from things people type, so
 * these tests prove a meeting title or an action description can never become live HTML in anyone's
 * notification panel. The web app parses the same text instead of injecting it
 * (web/src/utils/richText.jsx), so both sides are independently safe.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { escapeHtml, html } from '../src/utils/html.js';
import { auth, createAndLogin, login, startTestApp } from './helpers.js';

const ATTACK = '<img src=x onerror="alert(1)">';

let ctx;
let token = '';
let ownerToken = '';

const post = (p, b, t = token) => request(ctx.app).post(p).set(auth(t)).send(b);
const get = (p, t = token) => request(ctx.app).get(p).set(auth(t));

beforeAll(async () => {
  ctx = await startTestApp();
  token = (await login(ctx.app)).token;
  ownerToken = (await createAndLogin(ctx.app, token, { name: 'Mohammed Fayazuddin', email: 'mohammed.fayazuddin@trustlab.co.in', role: 'manager', title: 'Quality Manager', department: 'Quality' })).token;
});
afterAll(() => ctx.stop());

describe('the html`` template', () => {
  it('escapes interpolated values and keeps the literal tags', () => {
    expect(html`<strong>${ATTACK}</strong> hi`).toBe('<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong> hi');
  });

  it('escapes every dangerous character, and treats null as empty', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('notifications built from what people type', () => {
  it('neutralises a script in a meeting title and an action description', async () => {
    const m = await post('/api/meetings', { title: ATTACK, type: 'internal', date: '2026-11-30', time: '10:00', dur: '30m', attendees: ['Mohammed Fayazuddin'] });
    expect(m.status).toBe(201);

    const a = await post(`/api/meetings/${m.body.meeting.id}/action-items`, { desc: ATTACK, owner: 'Mohammed Fayazuddin', deadline: '2026-12-05' });
    expect(a.status).toBe(201);

    const list = await get('/api/notifications', ownerToken);
    const texts = list.body.items.map((n) => n.text);
    const mine = texts.filter((t) => t.includes('img'));
    expect(mine.length).toBeGreaterThan(0);
    for (const t of mine) {
      expect(t).not.toContain('<img');
      expect(t).not.toContain('onerror="');
      expect(t).toContain('&lt;img');
    }
  });

  it('still emphasises the parts the API means to emphasise', async () => {
    const list = await get('/api/notifications', ownerToken);
    expect(list.body.items.some((n) => n.text.includes('<strong>'))).toBe(true);
  });
});
