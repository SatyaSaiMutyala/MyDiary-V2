import { API_BASE_URL } from '../config';
import { store } from '../store';

// The shapes the Lab screens draw from, built from what the API sends
// (Backend/src/services/labReadiness.js).

export const MAX_PHOTOS = 12;

// The rules a record must satisfy before it can be signed, exactly as the API applies them:
// every activity answered, a deviation or an N/A explained, and a photograph where the sheet
// asks for evidence of work done as written.
export const needsRemark = item =>
  (item.status === 'deviation' || item.status === 'na') && !item.remark.trim();

export const needsPhoto = (activity, item) =>
  item.status === 'done' && activity.photoRequired && item.photos.length === 0;

export const isComplete = (activity, item) =>
  item.status !== null && !needsRemark(item) && !needsPhoto(activity, item);

export const unitKinds = {
  nrl: { tag: 'NRL', detail: 'NRL Hyderabad · by department' },
  regional: { tag: 'Regional', detail: 'Regional laboratory' },
  satellite: { tag: 'Satellite', detail: 'Satellite laboratory' },
};

export const phaseName = phase => (phase === 'opening' ? 'Opening' : 'Closing');

export const emptyItem = { status: null, remark: '', photos: [] };

/** "2026-11-24T09:42:10.000Z" → "09:42" on this phone's clock. */
export const clock = iso => {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * A photograph the API holds, as an <Image source>. The image routes need the session's
 * Authorization header, which a bare URL cannot carry, so it rides along here.
 */
export const photoSource = (target, photoId) => ({
  uri: `${API_BASE_URL}/lab-readiness/${encodeURIComponent(target.unitKey)}/${
    target.date
  }/${target.phase}/photos/${photoId}`,
  headers: authHeader(),
});

/** The sign-off photograph of a signed record. */
export const selfieSource = target => ({
  uri: `${API_BASE_URL}/lab-readiness/${encodeURIComponent(target.unitKey)}/${
    target.date
  }/${target.phase}/selfie`,
  headers: authHeader(),
});

function authHeader() {
  const token = store.getState().session.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The board's activities and what has been recorded against each one, grouped into the sections
 * the sheet uses. The API sends the activities in running order; one heading can come round more
 * than once in that order, and each heading gets one block.
 */
export function groupBoard(board) {
  if (!board) {
    return { activities: [], items: {}, sections: [] };
  }
  const target = {
    unitKey: board.unit.key,
    date: board.date,
    phase: board.phase,
  };
  const recorded = Object.fromEntries(
    (board.run?.items ?? []).map(i => [i.taskKey, i]),
  );
  const photos = {};
  for (const p of board.run?.photos ?? []) {
    // A photograph still on its way to the server is shown from the phone's own copy, marked as
    // sending, until the stored one takes its place.
    (photos[p.taskKey] ??= []).push({
      id: p.id,
      name: p.name,
      pending: !!p.pendingUri,
      source: p.pendingUri ? { uri: p.pendingUri } : photoSource(target, p.id),
      // The copy on this phone, kept behind the stored one so the square is never empty while
      // the stored one is being fetched.
      localUri: p.pendingUri ?? p.localUri ?? '',
    });
  }

  const activities = board.activities.map(a => ({
    key: a.key,
    section: a.section || 'Other checks',
    text: a.text,
    time: a.scheduledTime ?? '',
    photoRequired: !!a.photoRequired,
    // Whose line it is. None means everyone's, as an untagged shift task has always meant.
    positions: a.positions ?? [],
    mine: a.mine !== false,
  }));

  const items = {};
  for (const a of activities) {
    const it = recorded[a.key];
    items[a.key] = {
      status: it?.status ?? null,
      remark: it?.remark ?? '',
      photos: photos[a.key] ?? [],
      actionedAt: clock(it?.actionedAt),
      actionedBy: it?.actionedBy ?? '',
    };
  }
  return { activities, items, sections: toSections(activities, items) };
}

/**
 * A past record, read-only: it lists what was actually recorded, with the wording it was signed
 * with — which is why the lines come from the record and not from today's checklist.
 */
export function groupRecord(payload) {
  if (!payload?.run) {
    return { activities: [], items: {}, sections: [] };
  }
  const run = payload.run;
  const target = { unitKey: run.unitKey, date: run.date, phase: run.phase };
  const photos = {};
  for (const p of run.photos ?? []) {
    (photos[p.taskKey] ??= []).push({
      id: p.id,
      name: p.name,
      source: photoSource(target, p.id),
    });
  }
  const needsEvidence = new Set(
    (payload.activities ?? []).filter(a => a.photoRequired).map(a => a.key),
  );

  const activities = (run.items ?? []).map(i => ({
    key: i.taskKey,
    section: i.section || 'Other checks',
    text: i.text,
    time: i.scheduledTime ?? '',
    photoRequired: needsEvidence.has(i.taskKey),
  }));
  const items = {};
  for (const i of run.items ?? []) {
    items[i.taskKey] = {
      status: i.status ?? null,
      remark: i.remark ?? '',
      photos: photos[i.taskKey] ?? [],
      actionedAt: clock(i.actionedAt),
      actionedBy: i.actionedBy ?? '',
    };
  }
  return { activities, items, sections: toSections(activities, items) };
}

export function toSections(activities, items) {
  const order = [];
  const bySection = {};
  for (const a of activities) {
    if (!bySection[a.section]) {
      bySection[a.section] = [];
      order.push(a.section);
    }
    bySection[a.section].push(a);
  }
  return order.map(title => {
    const rows = bySection[title];
    return {
      title,
      rows,
      complete: rows.filter(a => isComplete(a, items[a.key] ?? emptyItem))
        .length,
    };
  });
}
