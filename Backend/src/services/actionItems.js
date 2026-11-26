import mongoose from 'mongoose';
import { ActionItem } from '../models/ActionItem.js';
import { badRequest, notFound } from '../utils/errors.js';
import { notify } from './notifications.js';
import { cleanName, initials, nowIso, plusDays, short } from './people.js';
import { html } from '../utils/html.js';

/** @param {string} id */
export async function findActionOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That action item does not exist.');
  const a = await ActionItem.findById(id);
  if (!a) throw notFound('That action item does not exist.');
  return a;
}

/** @param {any} me @param {string} action */
const historyRow = (me, action) => ({ user: me.name, action, at: nowIso() });

/** @param {any} me @param {any} a */
const notifyOwner = (me, a) =>
  notify({
    userName: a.owner,
    type: 'action',
    icon: '✓',
    text: html`<strong>${me.name}</strong> assigned you "${short(a.desc || 'an action item', 60)}" in <em>${a.meetingTitle}</em> — due <strong>${a.deadline}</strong>.`,
  });

/**
 * Allocates one task that came from no meeting — the "+ New Task" composer in My To-Do.
 *
 * Leaving the owner out means the person is giving it to themselves, which is the common case and
 * the reason the field is not required: most tasks somebody types into their own inbox are their
 * own. Naming somebody else notifies them, on screen and on their phone.
 *
 * @param {{ desc?: string, owner?: string, ownerType?: string, deadline?: string, priority?: string, status?: string }} input
 * @param {any} me
 */
export async function createStandalone(input, me) {
  const owner = (input.owner ?? '').trim() || me.name;
  const a = await ActionItem.create({
    meetingId: null,
    meetingTitle: '',
    source: 'standalone',
    desc: input.desc ?? '',
    owner,
    ownerShort: initials(owner),
    ownerType: input.ownerType ?? 'internal',
    deadline: input.deadline ?? plusDays(7),
    priority: input.priority ?? 'medium',
    status: input.status ?? 'open',
    history: [historyRow(me, 'created the task')],
    createdBy: { id: me._id, name: me.name },
  });
  // Nobody needs telling about a task they just wrote for themselves.
  if (cleanName(owner).toLowerCase() !== cleanName(me.name).toLowerCase()) {
    await notify({
      userName: owner,
      type: 'action',
      icon: '⚡',
      text: html`<strong>${me.name}</strong> allocated you "${short(a.desc || 'a task', 60)}" — due <strong>${a.deadline}</strong>.`,
    });
  }
  return a;
}

/**
 * Creates one action item for a meeting (defaults mirror the web's newAction(): deadline +7 days, priority medium,
 * status open). Notifies the owner when one is set.
 * @param {any} meeting
 * @param {{ desc?: string, owner?: string, ownerType?: string, deadline?: string, priority?: string, status?: string }} input
 * @param {any} me
 * @param {string} [createdVia]  history wording, default "created the action"
 */
export async function createAction(meeting, input, me, createdVia = 'created the action') {
  const owner = input.owner ?? '';
  const a = await ActionItem.create({
    meetingId: meeting._id,
    meetingTitle: meeting.title,
    desc: input.desc ?? '',
    owner,
    ownerShort: initials(owner),
    ownerType: input.ownerType ?? 'internal',
    deadline: input.deadline ?? plusDays(7),
    priority: input.priority ?? 'medium',
    status: input.status ?? 'open',
    history: [historyRow(me, createdVia)],
    createdBy: { id: me._id, name: me.name },
  });
  if (owner) await notifyOwner(me, a);
  return a;
}

export const ACTION_CHANGE_FIELDS = ['desc', 'owner', 'ownerType', 'deadline', 'priority', 'status'];
/** @param {any} a */
export const actionSnapshot = (a) => ({ desc: a.desc, owner: a.owner, ownerType: a.ownerType, deadline: a.deadline, priority: a.priority, status: a.status });

/**
 * Applies a PATCH: a status change appends "set status → x" to the history (and refreshes the snapshot stored
 * in other items' `dependencies`), an owner change recomputes `ownerShort`, logs the reassignment and notifies
 * the new owner. Returns the "before" snapshot for the Activity Log.
 * @param {any} a @param {Partial<Record<'desc'|'owner'|'ownerType'|'deadline'|'priority'|'status', string>>} patch @param {any} me
 */
export async function patchAction(a, patch, me) {
  const before = actionSnapshot(a);
  if (patch.desc !== undefined) a.desc = patch.desc;
  if (patch.ownerType !== undefined) a.ownerType = patch.ownerType;
  if (patch.deadline !== undefined) a.deadline = patch.deadline;
  if (patch.priority !== undefined) a.priority = patch.priority;
  const ownerChanged = patch.owner !== undefined && patch.owner !== a.owner;
  if (ownerChanged) {
    a.owner = patch.owner;
    a.ownerShort = initials(patch.owner);
    a.history.push(historyRow(me, patch.owner ? `reassigned to ${patch.owner}` : 'cleared the owner'));
  }
  const statusChanged = patch.status !== undefined && patch.status !== a.status;
  if (statusChanged) {
    a.status = patch.status;
    a.history.push(historyRow(me, `set status → ${patch.status}`));
  }
  await a.save();
  if (statusChanged || before.desc !== a.desc) await syncDependents(a);
  if (ownerChanged && a.owner) await notifyOwner(me, a);
  return before;
}

/** Refreshes the { id, desc, status } snapshot other items keep of this one. @param {any} a */
export function syncDependents(a) {
  const id = a._id.toString();
  return ActionItem.updateMany({ 'dependencies.id': id }, { $set: { 'dependencies.$[d].status': a.status, 'dependencies.$[d].desc': a.desc } }, { arrayFilters: [{ 'd.id': id }] });
}

/** @param {any} a @param {string} text @param {any} me */
export async function addSubtask(a, text, me) {
  a.subtasks.push({ text, done: false });
  a.history.push(historyRow(me, 'added sub-task'));
  await a.save();
  return a;
}

/** @param {any} a @param {number} index @param {boolean} done @param {any} me */
export async function setSubtask(a, index, done, me) {
  const s = a.subtasks[index];
  if (!s) throw notFound('That sub-task does not exist.');
  if (!!s.done !== done) {
    s.done = done;
    a.history.push(historyRow(me, `${done ? 'completed' : 'reopened'} sub-task`));
    await a.save();
  }
  return a;
}

/** @param {any} a @param {string} text @param {any} me */
export async function addComment(a, text, me) {
  a.comments.push({ user: me.name, ini: initials(me.name), text, at: nowIso() });
  a.history.push(historyRow(me, 'added a comment'));
  await a.save();
  return a;
}

/** @param {any} a @param {string} dependsOn id of the action this one waits for @param {any} me */
export async function addDependency(a, dependsOn, me) {
  if (dependsOn === a._id.toString()) throw badRequest('An action item cannot depend on itself.');
  const dep = await findActionOr404(dependsOn);
  if (a.dependencies.some((d) => d.id === dependsOn)) throw badRequest('That dependency is already listed.');
  a.dependencies.push({ id: dependsOn, desc: dep.desc, status: dep.status });
  a.history.push(historyRow(me, 'added dependency'));
  await a.save();
  return a;
}

/**
 * The web's extractActionsFromMinutes(): sentences of the Decisions text that contain commitment language.
 * @param {Record<string, { disc?: string, dec?: string }> | null | undefined} minutes
 */
export function extractCandidates(minutes) {
  const candidates = [];
  for (const mins of Object.values(minutes ?? {})) {
    if (!mins || typeof mins.dec !== 'string' || !mins.dec) continue;
    const sentences = mins.dec.split(/[.!?](\s|$)/).filter((s) => s && s.trim().length > 10);
    for (const s of sentences) {
      const txt = s.trim();
      if (/\b(to |will |should |must |by |owner|deadline|follow[- ]up)\b/i.test(txt)) candidates.push(txt);
    }
  }
  return candidates;
}

export const NO_CANDIDATES_MESSAGE = 'No commitment-language sentences found in Decisions text. Try writing more explicit commitments (e.g. "CFO to send report by Friday").';
