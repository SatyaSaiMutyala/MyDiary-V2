import mongoose from 'mongoose';
import { Visit } from '../models/Visit.js';
import { badRequest, notFound } from '../utils/errors.js';
import { html } from '../utils/html.js';
import { notify } from './notifications.js';
import { nowIso, short, todayStr } from './people.js';

/** @param {string} id */
export async function findVisitOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That visit observation does not exist.');
  const v = await Visit.findById(id);
  if (!v) throw notFound('That visit observation does not exist.');
  return v;
}

/** @param {any} me @param {string} action */
const historyRow = (me, action) => ({ user: me.name, action, at: nowIso() });

/** Fields a PATCH may change, for the Activity Log's "field: old → new" summary. */
export const VISIT_CHANGE_FIELDS = ['title', 'type', 'status', 'date', 'timeIn', 'timeOut', 'org', 'host', 'team', 'purpose', 'overallAssessment', 'followUpRequired', 'nextVisitDate', 'photos'];

/** @param {any} v */
export const visitSnapshot = (v) => ({
  title: v.title,
  type: v.type,
  status: v.status,
  date: v.date,
  timeIn: v.timeIn,
  timeOut: v.timeOut,
  org: v.org?.name ?? '',
  host: v.host?.name ?? '',
  team: [...(v.team ?? [])],
  purpose: v.purpose,
  overallAssessment: v.overallAssessment,
  followUpRequired: !!v.followUpRequired,
  nextVisitDate: v.nextVisitDate,
  photos: v.photos,
});

/**
 * What the web app checks before it lets someone submit a report (same three fields, same wording order).
 * @param {any} v
 */
export function assertSubmittable(v) {
  if (!String(v.title ?? '').trim()) throw badRequest('Please enter a visit title.');
  if (!String(v.org?.name ?? '').trim()) throw badRequest('Organisation name required to submit.');
  if (!String(v.purpose ?? '').trim()) throw badRequest('Purpose of visit required to submit.');
  if (!v.overallAssessment) throw badRequest('Overall Assessment required to submit.');
}

/**
 * Tells the people who own a follow-up action that the report they are named in is signed off — the API
 * side of the web app's "action items auto-synced to My To-Do of assigned owners" notice.
 * @param {any} v @param {any} me
 */
export async function notifyActionOwners(v, me) {
  const owners = [...new Set((v.actionItems ?? []).map((a) => String(a.owner ?? '').trim()).filter(Boolean))];
  if (!owners.length) return 0;
  const site = v.org?.name ? ` at ${v.org.name}` : '';
  return notify({
    userNames: owners,
    type: 'action',
    icon: '📝',
    text: html`<strong>${me.name}</strong> submitted the visit report <em>${short(v.title || 'Visit observation', 70)}</em>${site} — you have follow-up actions on it.`,
  });
}

/**
 * Creates one visit observation. Everything except the title and date has a default, so the web app can
 * save a half-filled draft. A visit created straight as `submitted` must pass the submit checks.
 * @param {Record<string, any>} input
 * @param {any} me
 */
export async function createVisit(input, me) {
  const status = input.status ?? 'draft';
  const owner = input.owner ?? me.name;
  const draft = {
    ...input,
    owner,
    ownerId: input.owner && input.owner !== me.name ? null : me._id,
    status,
    date: input.date ?? todayStr(),
    history: [historyRow(me, status === 'submitted' ? 'created and submitted the report' : 'created the draft')],
    createdBy: { id: me._id, name: me.name },
  };
  if (status === 'submitted') {
    assertSubmittable(draft);
    draft.submittedAt = new Date();
  }
  const v = await Visit.create(draft);
  if (status === 'submitted') await notifyActionOwners(v, me);
  return v;
}

/**
 * Applies a PATCH. Nested objects (`org`, `host`, `ratings`) are merged field by field so the web app can
 * send one field at a time. Switching `status` to submitted runs the submit checks and stamps `submittedAt`.
 * Returns the "before" snapshot for the Activity Log.
 * @param {any} v @param {Record<string, any>} patch @param {any} me
 */
export async function patchVisit(v, patch, me) {
  const before = visitSnapshot(v);
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'status') continue;
    if (key === 'org' || key === 'host' || key === 'ratings') Object.assign(v[key], value);
    else v[key] = value;
  }
  const statusChanged = patch.status !== undefined && patch.status !== v.status;
  if (statusChanged) await applyStatus(v, patch.status, me, { save: false });
  // A signed-off report must stay complete, so an edit that empties a required field is refused.
  else if (v.status === 'submitted') assertSubmittable(v);
  await v.save();
  if (statusChanged && v.status === 'submitted') await notifyActionOwners(v, me);
  return before;
}

/**
 * draft ⇄ submitted. Submitting runs the same checks the web app does, stamps `submittedAt` and tells the
 * follow-up owners; reopening clears nothing (the stamp stays as the record of the first sign-off).
 * @param {any} v @param {'draft' | 'submitted'} status @param {any} me @param {{ save?: boolean }} [opts]
 */
export async function applyStatus(v, status, me, opts = {}) {
  const { save = true } = opts;
  if (status === v.status) throw badRequest(status === 'submitted' ? 'This report is already submitted.' : 'This report is already a draft.');
  if (status === 'submitted') {
    assertSubmittable(v);
    v.submittedAt = new Date();
  }
  v.status = status;
  v.history.push(historyRow(me, status === 'submitted' ? 'submitted the report' : 'reopened the report as a draft'));
  if (save) {
    await v.save();
    if (status === 'submitted') await notifyActionOwners(v, me);
  }
  return v;
}

/** @param {any[]} list @param {number} index @param {string} what */
function itemAt(list, index, what) {
  const item = list[index];
  if (!item) throw notFound(`That ${what} does not exist.`);
  return item;
}

/** @param {any} v @param {{ category?: string, observation?: string, evidence?: string }} input @param {any} me */
export async function addObservation(v, input, me) {
  v.observations.push({ category: input.category ?? 'Other', observation: input.observation ?? '', evidence: input.evidence ?? '' });
  v.history.push(historyRow(me, 'added an observation'));
  await v.save();
  return v;
}

/** @param {any} v @param {number} index @param {Record<string, string>} patch @param {any} me */
export async function patchObservation(v, index, patch, me) {
  const o = itemAt(v.observations, index, 'observation');
  Object.assign(o, patch);
  v.history.push(historyRow(me, 'edited an observation'));
  await v.save();
  return v;
}

/** @param {any} v @param {number} index @param {any} me */
export async function removeObservation(v, index, me) {
  const o = itemAt(v.observations, index, 'observation');
  v.observations.splice(index, 1);
  v.history.push(historyRow(me, 'removed an observation'));
  await v.save();
  return o;
}

/** @param {any} v @param {{ text?: string, owner?: string, deadline?: string }} input @param {any} me */
export async function addAction(v, input, me) {
  v.actionItems.push({ text: input.text ?? '', owner: input.owner ?? '', deadline: input.deadline ?? '' });
  v.history.push(historyRow(me, 'added a follow-up action'));
  await v.save();
  const a = v.actionItems[v.actionItems.length - 1];
  // On a signed-off report a new action needs its owner told right away. The two html`` pieces are joined
  // AFTER each one is built, because interpolating one into the other would escape its tags.
  if (v.status === 'submitted' && a.owner) {
    const line = html`<strong>${me.name}</strong> gave you a follow-up action from the visit <em>${short(v.title || 'Visit observation', 70)}</em>: "${short(a.text || 'an action', 60)}"`;
    const due = a.deadline ? html` — due <strong>${a.deadline}</strong>` : '';
    await notify({ userName: a.owner, type: 'action', icon: '⚡', text: `${line}${due}.` });
  }
  return v;
}

/** @param {any} v @param {number} index @param {Record<string, string>} patch @param {any} me */
export async function patchAction(v, index, patch, me) {
  const a = itemAt(v.actionItems, index, 'follow-up action');
  Object.assign(a, patch);
  v.history.push(historyRow(me, 'edited a follow-up action'));
  await v.save();
  return v;
}

/** @param {any} v @param {number} index @param {any} me */
export async function removeAction(v, index, me) {
  const a = itemAt(v.actionItems, index, 'follow-up action');
  v.actionItems.splice(index, 1);
  v.history.push(historyRow(me, 'removed a follow-up action'));
  await v.save();
  return a;
}

