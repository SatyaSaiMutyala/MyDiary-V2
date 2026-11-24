import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ADMIN, auth, createAndLogin, login, startTestApp } from './helpers.js';

/**
 * Lab Readiness — the clinical department's daily board.
 *
 * Covers the two halves: Department Master configures the checklist, and the board records a day against
 * it. The rules that matter to an assessor are the ones asserted hardest — a record cannot be signed with
 * an activity left blank, a deviation without a remark, or a photo-required activity with no photograph;
 * a signed record is read-only; reopening leaves a reason on the record.
 */
describe('Lab Readiness', () => {
  /** @type {import('express').Express} */
  let app;
  /** @type {() => Promise<void>} */
  let stop;
  let token = '';
  let deptId = '';
  let uploads = '';
  const UNIT = 'nrl-biochemistry';
  const DATE = '2026-11-24';

  beforeAll(async () => {
    // Keep the evidence files out of the project: the local driver writes under UPLOAD_DIR.
    uploads = await mkdtemp(path.join(tmpdir(), 'mydiary-lab-'));
    process.env.UPLOAD_DIR = uploads;
    ({ app, stop } = await startTestApp());
    token = (await login(app, ADMIN.email, ADMIN.password)).token;

    const r = await request(app).post('/api/departments').set(auth(token)).send({
      code: 'TDPL-CLIN-001',
      name: 'Clinical Laboratory',
      icon: '🔬',
    });
    expect(r.status).toBe(201);
    deptId = r.body.department.id;

    // Fill the master checklist from the standard sheet, the way the seed does.
    const restored = await request(app).post(`/api/departments/${deptId}/lab-readiness/restore`).set(auth(token));
    expect(restored.status).toBe(200);
    expect(restored.body.added.units).toBe(14);
    expect(restored.body.added.activities).toBe(52);

    const on = await request(app).put(`/api/departments/${deptId}/lab-readiness`).set(auth(token)).send({ enabled: true });
    expect(on.status).toBe(200);
    expect(on.body.department.labReadiness.enabled).toBe(true);
  });

  afterAll(async () => { await stop(); });

  const jpeg = (byte = 0x01) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64, byte)]);
  const at = (phase) => `/api/lab-readiness/${UNIT}/${DATE}/${phase}`;
  const getBoard = (phase = 'opening') => request(app).get(at(phase)).set(auth(token));

  describe('the configuration', () => {
    it('restoring again adds nothing', async () => {
      const r = await request(app).post(`/api/departments/${deptId}/lab-readiness/restore`).set(auth(token));
      expect(r.status).toBe(200);
      expect(r.body.added).toEqual({ units: 0, activities: 0 });
    });

    it('serves the checklist on the department', async () => {
      const r = await request(app).get(`/api/departments/${deptId}`).set(auth(token));
      const lr = r.body.department.labReadiness;
      expect(lr.units).toHaveLength(14);
      expect(lr.activities).toHaveLength(52);
      expect(lr.activities.filter((a) => a.photoRequired)).toHaveLength(16);
      expect(lr.openingCutoff).toBe('09:30');
      expect(lr.closingCutoff).toBe('22:30');
    });

    it('adds, edits and removes a unit of its own', async () => {
      const add = await request(app).post(`/api/departments/${deptId}/lab-readiness/units`).set(auth(token))
        .send({ name: 'Collection Centre — Kukatpally', kind: 'satellite' });
      expect(add.status).toBe(201);
      const unit = add.body.department.labReadiness.units.find((u) => u.key === 'collection-centre-kukatpally');
      expect(unit).toBeTruthy();

      const edit = await request(app).patch(`/api/departments/${deptId}/lab-readiness/units/${unit.id}`).set(auth(token))
        .send({ name: 'Collection Centre — KPHB' });
      expect(edit.body.department.labReadiness.units.find((u) => u.id === unit.id).name).toBe('Collection Centre — KPHB');

      const del = await request(app).delete(`/api/departments/${deptId}/lab-readiness/units/${unit.id}`).set(auth(token));
      expect(del.body.deleted).toBe(true);
      expect(del.body.department.labReadiness.units.some((u) => u.id === unit.id)).toBe(false);
    });

    it('refuses a duplicate unit key and a bad cut-off', async () => {
      const dup = await request(app).post(`/api/departments/${deptId}/lab-readiness/units`).set(auth(token))
        .send({ name: 'Clinical Biochemistry', key: UNIT });
      expect(dup.status).toBe(409);
      expect(dup.body.error.message).toContain('already has a unit');

      const bad = await request(app).put(`/api/departments/${deptId}/lab-readiness`).set(auth(token)).send({ openingCutoff: '9:30 am' });
      expect(bad.status).toBe(400);
      expect(bad.body.error.message).toContain('24-hour clock');
    });

    it('the seed never overwrites a checklist that is already there', async () => {
      const { seedLabReadiness } = await import('../src/services/departments.js');
      const r = await seedLabReadiness({ quiet: true });
      expect(r).toMatchObject({ department: 'Clinical Laboratory', kept: true });
      expect(r.activities).toBeGreaterThanOrEqual(52);
    });

    it('logs a checklist change in the Activity Log, under Department Master', async () => {
      // The configuration is part of a department, so it is logged where every other department edit is.
      const r = await request(app).get('/api/audit?module=Department Master&limit=50').set(auth(token));
      expect(r.status).toBe(200);
      expect(r.body.items.some((e) => e.details.includes('Lab Readiness · standard checklist restored'))).toBe(true);
      expect(r.body.items.some((e) => e.details.includes('Lab Readiness · unit + "Collection Centre — Kukatpally"'))).toBe(true);
    });
  });

  describe('the daily board', () => {
    it('lists every unit and where its two phases stand', async () => {
      const r = await request(app).get(`/api/lab-readiness?date=${DATE}`).set(auth(token));
      expect(r.status).toBe(200);
      expect(r.body.department.name).toBe('Clinical Laboratory');
      expect(r.body.units).toHaveLength(14);
      const bio = r.body.units.find((u) => u.key === UNIT);
      expect(bio.phases.opening.status).toBe('not-started');
      expect(bio.phases.opening.total).toBeGreaterThan(0);
    });

    it('shows only the activities that apply to the unit', async () => {
      const r = await getBoard('opening');
      expect(r.status).toBe(200);
      expect(r.body.unit.name).toBe('Clinical Biochemistry');
      expect(r.body.declaration).toContain('fit to accept and examine patient samples');
      // An NRL unit never sees a field-lab-only activity.
      expect(r.body.activities.every((a) => a.key.startsWith('o'))).toBe(true);
      expect(r.body.run).toBeNull();
      expect(r.body.progress.done).toBe(0);
    });

    it('ticks an activity and remembers who and when', async () => {
      const key = (await getBoard()).body.activities[0].key;
      const r = await request(app).put(`${at('opening')}/items/${key}`).set(auth(token)).send({ status: 'done' });
      expect(r.status).toBe(200);
      const item = r.body.run.items.find((i) => i.taskKey === key);
      expect(item.status).toBe('done');
      expect(item.actionedBy).toBe('Venkata Cherukuri');
      expect(item.actionedAt).toBeTruthy();
      expect(r.body.run.startedAt).toBeTruthy();
      expect(r.body.progress.done).toBe(1);
    });

    it('refuses an activity that is not on this board', async () => {
      const r = await request(app).put(`${at('opening')}/items/c01`).set(auth(token)).send({ status: 'done' });
      expect(r.status).toBe(400);
      expect(r.body.error.message).toContain('does not apply');
    });

    it('takes a photograph as a raw image body and gives it back', async () => {
      const needsPhoto = (await getBoard()).body.activities.find((a) => a.photoRequired);
      const up = await request(app)
        .post(`${at('opening')}/items/${needsPhoto.key}/photos?name=fridge.jpg`)
        .set(auth(token))
        .set('content-type', 'image/jpeg')
        .send(jpeg(0x7f));
      expect(up.status).toBe(201);
      const photo = up.body.run.photos.find((p) => p.taskKey === needsPhoto.key);
      expect(photo.name).toBe('fridge.jpg');
      expect(photo.sizeBytes).toBe(67);
      expect(photo.uploadedBy).toBe('Venkata Cherukuri');

      const back = await request(app).get(`${at('opening')}/photos/${photo.id}`).set(auth(token));
      expect(back.status).toBe(200);
      expect(back.headers['content-type']).toContain('image/jpeg');
      expect(back.body.length).toBe(67);

      // And it is laid out the way v1 lays it out.
      expect(await readdir(path.join(uploads, 'lab-openeings', UNIT, DATE))).toContain(needsPhoto.key);
    });

    it('takes the same photograph as base64 JSON, the way the phone sends it', async () => {
      const board = (await getBoard()).body;
      const target = board.activities.find((a) => a.photoRequired);
      const r = await request(app)
        .post(`${at('opening')}/items/${target.key}/photos`)
        .set(auth(token))
        .send({ data: jpeg(0x33).toString('base64'), mimeType: 'image/jpeg', name: 'phone.jpg' });
      expect(r.status).toBe(201);
      const photo = r.body.run.photos.find((p) => p.name === 'phone.jpg');
      expect(photo.sizeBytes).toBe(67);
      expect(photo.mimeType).toBe('image/jpeg');

      const back = await request(app).get(`${at('opening')}/photos/${photo.id}`).set(auth(token));
      expect(back.body.length).toBe(67);

      // And it is cleaned up again, so the sign-off test still decides its own state.
      expect((await request(app).delete(`${at('opening')}/photos/${photo.id}`).set(auth(token))).status).toBe(200);
    });

    it('refuses a JSON body that carries no image', async () => {
      const key = (await getBoard()).body.activities[0].key;
      const r = await request(app).post(`${at('opening')}/items/${key}/photos`).set(auth(token)).send({ name: 'nothing.jpg' });
      expect(r.status).toBe(400);
      expect(r.body.error.message).toContain('Attach a photograph');
    });

    it('says so when no image was attached', async () => {
      const key = (await getBoard()).body.activities[0].key;
      const r = await request(app).post(`${at('opening')}/items/${key}/photos`).set(auth(token)).set('content-type', 'image/jpeg').send(Buffer.alloc(0));
      expect(r.status).toBe(400);
      expect(r.body.error.message).toContain('Attach a photograph');
    });

    it('asks for a remark on an N/A, and a photograph only where the work was done as written', async () => {
      const board = (await getBoard()).body;
      const needsPhoto = board.activities.find((a) => a.photoRequired && !board.run.photos.some((p) => p.taskKey === a.key));

      // Done, evidence asked for, none filed → outstanding.
      await request(app).put(`${at('opening')}/items/${needsPhoto.key}`).set(auth(token)).send({ status: 'done' });
      expect((await getBoard()).body.progress.missing).toContain(`${needsPhoto.key} — needs a photograph`);

      // The same activity marked N/A asks for a reason instead of a photograph.
      await request(app).put(`${at('opening')}/items/${needsPhoto.key}`).set(auth(token)).send({ status: 'na' });
      const na = (await getBoard()).body.progress;
      expect(na.missing).toContain(`${needsPhoto.key} — an N/A needs a remark`);
      expect(na.missing).not.toContain(`${needsPhoto.key} — needs a photograph`);

      await request(app).put(`${at('opening')}/items/${needsPhoto.key}/remark`).set(auth(token)).send({ remark: 'Analyser is off for service today.' });
      expect((await getBoard()).body.progress.missing).not.toContain(`${needsPhoto.key} — an N/A needs a remark`);

      // And the counts split the answers the way the sheet does.
      const p = (await getBoard()).body.progress;
      expect(p.completed + p.deviations + p.na).toBe(p.done);
      expect(p.na).toBeGreaterThan(0);

      await request(app).put(`${at('opening')}/items/${needsPhoto.key}`).set(auth(token)).send({ status: null });
    });

    it('will not sign off while anything is outstanding', async () => {
      const r = await request(app).post(`${at('opening')}/signoff`).set(auth(token)).set('content-type', 'image/jpeg').send(jpeg());
      expect(r.status).toBe(400);
      expect(r.body.error.message).toContain('Every activity needs a status');
      expect(r.body.error.details.length).toBeGreaterThan(0);
    });

    it('signs off once every rule is met, and locks the record', async () => {
      const board = (await getBoard()).body;

      // Everything done, except one deviation with its remark and one photo-required line marked N/A.
      const [deviation, ...rest] = board.activities;
      await request(app).put(`${at('opening')}/items/${deviation.key}`).set(auth(token)).send({ status: 'deviation' });

      const noRemark = await request(app).post(`${at('opening')}/signoff`).set(auth(token)).set('content-type', 'image/jpeg').send(jpeg());
      expect(noRemark.status).toBe(400);
      expect(noRemark.body.error.details.some((d) => d.message.includes('deviation needs a remark'))).toBe(true);

      await request(app).put(`${at('opening')}/items/${deviation.key}/remark`).set(auth(token))
        .send({ remark: 'Analyser QC failed on channel 2; escalated to the service engineer at 07:40.' });

      for (const a of rest) {
        const needsPhoto = a.photoRequired;
        const hasPhoto = board.run?.photos?.some((p) => p.taskKey === a.key);
        // An activity that asks for a photograph and has none is marked N/A — which, like a
        // deviation, has to say why.
        const na = needsPhoto && !hasPhoto;
        await request(app).put(`${at('opening')}/items/${a.key}`).set(auth(token))
          .send(na ? { status: 'na', remark: 'Not in use today — unit running on the standby analyser.' } : { status: 'done' });
      }

      const ready = await getBoard();
      expect(ready.body.progress.complete).toBe(true);

      const noSelfie = await request(app).post(`${at('opening')}/signoff`).set(auth(token)).set('content-type', 'image/jpeg').send(Buffer.alloc(0));
      expect(noSelfie.status).toBe(400);

      const signed = await request(app).post(`${at('opening')}/signoff?role=Quality Manager`).set(auth(token)).set('content-type', 'image/jpeg').send(jpeg(0x2a));
      expect(signed.status).toBe(200);
      expect(signed.body.run.signedBy).toEqual({ name: 'Venkata Cherukuri', role: 'Quality Manager' });
      expect(signed.body.run.declaration).toContain('fit to accept and examine patient samples');
      expect(signed.body.run.hasSelfie).toBe(true);
      expect(signed.body.run.late).toBe(true); // signed now, long past 09:30 on 2026-11-24

      const selfie = await request(app).get(`${at('opening')}/selfie`).set(auth(token));
      expect(selfie.status).toBe(200);
      expect(selfie.body.length).toBe(67);

      // Read-only from here.
      const after = await request(app).put(`${at('opening')}/items/${deviation.key}`).set(auth(token)).send({ status: 'done' });
      expect(after.status).toBe(409);
      expect(after.body.error.message).toContain('signed off');

      const twice = await request(app).post(`${at('opening')}/signoff`).set(auth(token)).set('content-type', 'image/jpeg').send(jpeg());
      expect(twice.status).toBe(409);
    });

    it('reopens a signed record, with the reason on the record', async () => {
      const blank = await request(app).post(`${at('opening')}/reopen`).set(auth(token)).send({ reason: '' });
      expect(blank.status).toBe(400);

      const r = await request(app).post(`${at('opening')}/reopen`).set(auth(token)).send({ reason: 'Centrifuge check was ticked against the wrong line.' });
      expect(r.status).toBe(200);
      expect(r.body.run.signedAt).toBeNull();
      expect(r.body.run.hasSelfie).toBe(false);
      expect(r.body.run.reopenLog).toHaveLength(1);
      expect(r.body.run.reopenLog[0]).toMatchObject({ by: 'Venkata Cherukuri', reason: 'Centrifuge check was ticked against the wrong line.' });

      // And it can be changed again.
      const key = r.body.activities[1].key;
      expect((await request(app).put(`${at('opening')}/items/${key}`).set(auth(token)).send({ status: 'done' })).status).toBe(200);
    });

    it('keeps one record per unit, day and phase', async () => {
      const opening = await getBoard('opening');
      const closing = await getBoard('closing');
      expect(opening.body.run.id).not.toBe(closing.body.run?.id ?? null);
      expect(closing.body.activities.every((a) => a.key.startsWith('c'))).toBe(true);
      expect(closing.body.declaration).toContain('secured');
    });

    it('lists the day and the history', async () => {
      const day = await request(app).get(`/api/lab-readiness?date=${DATE}`).set(auth(token));
      const bio = day.body.units.find((u) => u.key === UNIT);
      expect(bio.phases.opening.status).toBe('in-progress');
      expect(bio.phases.opening.deviations).toBe(1);
      expect(bio.phases.opening.photos).toBe(1);

      const hist = await request(app).get(`/api/lab-readiness/history?unitKey=${UNIT}`).set(auth(token));
      expect(hist.status).toBe(200);
      expect(hist.body.records.length).toBeGreaterThan(0);
      expect(hist.body.records[0]).toMatchObject({ date: DATE, unitName: 'Clinical Biochemistry', reopened: 1 });

      const one = await request(app).get(`/api/lab-readiness/records/${hist.body.records[0].id}`).set(auth(token));
      expect(one.status).toBe(200);
      expect(one.body.run.date).toBe(DATE);
    });

    it('rejects a bad date, a bad phase and an unknown unit', async () => {
      expect((await request(app).get(`/api/lab-readiness/${UNIT}/24-11-2026/opening`).set(auth(token))).status).toBe(400);
      expect((await request(app).get(`/api/lab-readiness/${UNIT}/${DATE}/midday`).set(auth(token))).status).toBe(404);
      expect((await request(app).get(`/api/lab-readiness/nrl-nowhere/${DATE}/opening`).set(auth(token))).status).toBe(404);
    });

    it('keeps the wording a record was signed with, even after the checklist is reworded', async () => {
      const dept = await request(app).get(`/api/departments/${deptId}`).set(auth(token));
      const activity = dept.body.department.labReadiness.activities.find((a) => a.key === 'o02');
      const before = (await getBoard()).body.run.items.find((i) => i.taskKey === 'o02').text;

      await request(app).patch(`/api/departments/${deptId}/lab-readiness/activities/${activity.id}`).set(auth(token))
        .send({ text: 'Check that the laboratory is secure, and that CCTV and access control are both working' });

      const after = (await getBoard()).body;
      expect(after.activities.find((a) => a.key === 'o02').text).toContain('are both working');
      expect(after.run.items.find((i) => i.taskKey === 'o02').text).toBe(before);
    });

    it('switches off an activity that has been recorded rather than deleting it', async () => {
      const dept = await request(app).get(`/api/departments/${deptId}`).set(auth(token));
      const used = dept.body.department.labReadiness.activities.find((a) => a.key === 'o02');
      const r = await request(app).delete(`/api/departments/${deptId}/lab-readiness/activities/${used.id}`).set(auth(token));
      expect(r.status).toBe(200);
      expect(r.body.deleted).toBe(false);
      expect(r.body.message).toContain('switched off');
      expect(r.body.department.labReadiness.activities.find((a) => a.key === 'o02').active).toBe(false);
      // And it drops off the board.
      expect((await getBoard()).body.activities.some((a) => a.key === 'o02')).toBe(false);
    });
  });

  describe('who can use it', () => {
    it('refuses somebody from another department, and anyone without the module', async () => {
      const outsider = await createAndLogin(app, token, {
        name: 'Ramesh Babu', email: 'ramesh.labtest@trustlab.co.in', role: 'employee', department: 'Logistics', modules: ['labReadiness'],
      });
      const r = await request(app).get(at('opening')).set(auth(outsider.token));
      expect(r.status).toBe(403);
      expect(r.body.error.message).toContain('Clinical Laboratory staff');

      const insider = await createAndLogin(app, token, {
        name: 'Sunita Rao', email: 'sunita.labtest@trustlab.co.in', role: 'employee', department: 'Clinical Laboratory', modules: ['labReadiness'],
      });
      expect((await request(app).get(at('opening')).set(auth(insider.token))).status).toBe(200);

      const noModule = await createAndLogin(app, token, {
        name: 'Imran Shaikh', email: 'imran.labtest@trustlab.co.in', role: 'employee', department: 'Clinical Laboratory', modules: ['diary'],
      });
      expect((await request(app).get(at('opening')).set(auth(noModule.token))).status).toBe(403);
    });

    it('only the departments module can change the checklist', async () => {
      const staff = await createAndLogin(app, token, {
        name: 'Latha Menon', email: 'latha.labtest@trustlab.co.in', role: 'employee', department: 'Clinical Laboratory', modules: ['labReadiness'],
      });
      const r = await request(app).put(`/api/departments/${deptId}/lab-readiness`).set(auth(staff.token)).send({ enabled: false });
      expect(r.status).toBe(403);
    });
  });

  it('a department without the board says so, clearly', async () => {
    const other = await request(app).post('/api/departments').set(auth(token)).send({ code: 'TDPL-LOG-009', name: 'Logistics Test' });
    const r = await request(app).get(`/api/lab-readiness?departmentId=${other.body.department.id}`).set(auth(token));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toContain('not switched on');
  });
});
