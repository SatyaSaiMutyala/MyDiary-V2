/**
 * My Discussion Logs — business rules.
 *
 * A log belongs to one person. It is `private` by default, which here means exactly what the prototype
 * promises on screen ("🔒 Private to you"): nobody else can read it, list it, or see it in the per-person
 * grouping. `visibleTo(me)` is the clause every read goes through; `assertOwner` guards every write.
 */
import mongoose from 'mongoose';
import { DiscussionLog, isFollowUpOverdue } from '../models/DiscussionLog.js';
import { forbidden, notFound } from '../utils/errors.js';
import { html } from '../utils/html.js';
import { escapeRegex } from '../utils/listQuery.js';
import { notify } from './notifications.js';
import { cleanName, initials, nowIso, sameName, short, todayStr } from './people.js';

/** Mongo clause for the logs `me` may read: the ones they own, plus anything explicitly shared. @param {any} me */
export function visibleTo(me) {
  return { $or: [ownerClause(me.name), { privacy: 'shared' }] };
}

/** `owner` matches this person, with or without a "(role)" suffix, case-insensitive. @param {string} name */
export function ownerClause(name) {
  return { owner: new RegExp(`^${escapeRegex(cleanName(name))}(\\s*\\(.*\\))?$`, 'i') };
}

/**
 * One log the signed-in person is allowed to read, or 404. A private log of somebody else is reported as
 * missing rather than refused, so the API never confirms that it exists.
 * @param {string} id @param {any} me
 */
export async function findLogOr404(id, me) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That discussion log does not exist.');
  const l = await DiscussionLog.findById(id);
  if (!l || (!sameName(l.owner, me.name) && l.privacy !== 'shared')) throw notFound('That discussion log does not exist.');
  return l;
}

/** 403 unless the log is the signed-in person's own. @param {any} l @param {any} me */
export function assertOwner(l, me) {
  if (!sameName(l.owner, me.name)) throw forbidden(`This discussion log belongs to ${l.owner || 'someone else'}. Only they can change it.`);
  return l;
}

/** @param {any} me @param {string} action */
const historyRow = (me, action) => ({ user: me.name, action, at: nowIso() });

/** Tells a follow-up's owner that they picked something up in somebody's conversation. @param {any} l @param {any} f @param {any} me */
async function notifyFollowUpOwner(l, f, me) {
  const owner = cleanName(f.owner);
  if (!owner || sameName(owner, me.name)) return 0;
  const due = f.deadline ? html` — due <strong>${f.deadline}</strong>` : '';
  return notify({
    userName: owner,
    type: 'action',
    icon: '⚡',
    text: html`<strong>${me.name}</strong> logged a follow-up for you: "${short(f.text || 'a follow-up', 60)}" from the discussion <em>${l.topic || 'an untitled discussion'}</em>.` + due,
  });
}

/** @param {any} l @param {any} me */
async function notifyNewFollowUps(l, me) {
  for (const f of l.followUps) await notifyFollowUpOwner(l, f, me);
}

/**
 * Creates one log for the signed-in person. `owner` is always the signed-in person: a log is a private note,
 * so it cannot be filed on somebody else's behalf.
 * @param {Record<string, any>} input @param {any} me
 */
export async function createLog(input, me) {
  const l = await DiscussionLog.create({
    owner: me.name,
    ownerId: me._id,
    date: input.date,
    time: input.time ?? '',
    duration: input.duration ?? '',
    channel: input.channel ?? 'phone',
    with: input.with ?? [],
    topic: input.topic ?? '',
    summary: input.summary ?? '',
    decisions: input.decisions ?? '',
    tags: input.tags ?? [],
    followUps: (input.followUps ?? []).map(followUpDoc),
    privacy: input.privacy ?? 'private',
    history: [historyRow(me, 'captured the log')],
    createdBy: { id: me._id, name: me.name },
  });
  await notifyNewFollowUps(l, me);
  return l;
}

/** Fills the stored shape of one follow-up from a validated body. @param {Record<string, any>} f */
export function followUpDoc(f) {
  return {
    text: f.text ?? '',
    owner: f.owner ?? '',
    ownerType: f.ownerType ?? 'internal',
    deadline: f.deadline ?? '',
    done: !!f.done,
    doneAt: f.done ? nowIso() : '',
    doneBy: '',
  };
}

export const LOG_CHANGE_FIELDS = ['date', 'time', 'duration', 'channel', 'with', 'topic', 'summary', 'decisions', 'tags', 'privacy', 'followUps'];

/** @param {any} l */
export const logSnapshot = (l) => ({
  date: l.date,
  time: l.time,
  duration: l.duration,
  channel: l.channel,
  with: (l.with ?? []).map((p) => p.name),
  topic: l.topic,
  summary: l.summary,
  decisions: l.decisions,
  tags: [...(l.tags ?? [])],
  privacy: l.privacy,
  followUps: (l.followUps ?? []).length,
});

/**
 * Applies a PATCH. Sending `followUps` replaces the whole list (how the Edit modal saves) and notifies any
 * owner who is new to it. Returns the "before" snapshot for the Activity Log.
 * @param {any} l @param {Record<string, any>} patch @param {any} me
 */
export async function patchLog(l, patch, me) {
  const before = logSnapshot(l);
  for (const key of ['date', 'time', 'duration', 'channel', 'topic', 'summary', 'decisions', 'privacy']) {
    if (patch[key] !== undefined) l[key] = patch[key];
  }
  if (patch.with !== undefined) l.with = patch.with;
  if (patch.tags !== undefined) l.tags = patch.tags;
  /** Follow-ups the edit introduced (or handed to someone else): their owners are told about them. */
  let fresh = [];
  if (patch.followUps !== undefined) {
    const had = new Set(l.followUps.map((f) => `${cleanName(f.owner)}|${f.text}`));
    l.followUps = patch.followUps.map(followUpDoc);
    fresh = l.followUps.filter((f) => !had.has(`${cleanName(f.owner)}|${f.text}`));
  }
  l.history.push(historyRow(me, 'edited the log'));
  await l.save();
  for (const f of fresh) await notifyFollowUpOwner(l, f, me);
  return before;
}

// ---------- follow-ups ----------

/** @param {any} l @param {string} fuId */
export function findFollowUpOr404(l, fuId) {
  const f = mongoose.isValidObjectId(fuId) ? l.followUps.id(fuId) : null;
  if (!f) throw notFound('That follow-up does not exist.');
  return f;
}

/** @param {any} l @param {Record<string, any>} input @param {any} me */
export async function addFollowUp(l, input, me) {
  l.followUps.push(followUpDoc(input));
  const f = l.followUps[l.followUps.length - 1];
  l.history.push(historyRow(me, `added follow-up "${short(f.text || '(blank)', 60)}"`));
  await l.save();
  await notifyFollowUpOwner(l, f, me);
  return f;
}

/** @param {any} l @param {string} fuId @param {Record<string, any>} patch @param {any} me */
export async function patchFollowUp(l, fuId, patch, me) {
  const f = findFollowUpOr404(l, fuId);
  const ownerBefore = f.owner;
  if (patch.text !== undefined) f.text = patch.text;
  if (patch.owner !== undefined) f.owner = patch.owner;
  if (patch.ownerType !== undefined) f.ownerType = patch.ownerType;
  if (patch.deadline !== undefined) f.deadline = patch.deadline;
  if (patch.done !== undefined) applyDone(f, patch.done, me);
  l.history.push(historyRow(me, `edited follow-up "${short(f.text || '(blank)', 60)}"`));
  await l.save();
  if (patch.owner !== undefined && !sameName(ownerBefore, f.owner)) await notifyFollowUpOwner(l, f, me);
  return f;
}

/** @param {any} f @param {boolean} done @param {any} me */
function applyDone(f, done, me) {
  if (!!f.done === done) return f;
  f.done = done;
  f.doneAt = done ? nowIso() : '';
  f.doneBy = done ? me.name : '';
  return f;
}

/** Ticks or un-ticks one follow-up (the checkbox in the detail modal and the Follow-ups view). */
export async function setFollowUpDone(l, fuId, done, me) {
  const f = findFollowUpOr404(l, fuId);
  if (!!f.done !== done) {
    applyDone(f, done, me);
    l.history.push(historyRow(me, `${done ? 'completed' : 'reopened'} follow-up "${short(f.text || '(blank)', 60)}"`));
    await l.save();
  }
  return f;
}

/** Flips one follow-up (the web's toggleLogFU). */
export const toggleFollowUp = (l, fuId, me) => setFollowUpDone(l, fuId, !findFollowUpOr404(l, fuId).done, me);

/** @param {any} l @param {string} fuId @param {any} me */
export async function removeFollowUp(l, fuId, me) {
  const f = findFollowUpOr404(l, fuId);
  const gone = { text: f.text, owner: f.owner, deadline: f.deadline, done: !!f.done };
  f.deleteOne();
  l.history.push(historyRow(me, `removed follow-up "${short(gone.text || '(blank)', 60)}"`));
  await l.save();
  return gone;
}

// ---------- groupings (the server does them so the browser never pages through everything) ----------

/**
 * One row per person the matching logs were with — what the "By Person" grid shows: how many conversations,
 * when the last one was, and how many of their logs still have an open follow-up.
 * `email` takes any non-blank address seen for that person (a blank sorts below every real one).
 * @param {Record<string, unknown>} filter @param {{ skip?: number, limit?: number }} [paging]
 */
export async function peopleSummary(filter, paging = {}) {
  const page = [
    { $match: filter },
    { $unwind: '$with' },
    { $sort: { date: 1, time: 1, _id: 1 } },
    {
      $group: {
        _id: { $toLower: '$with.name' },
        name: { $last: '$with.name' },
        type: { $last: '$with.type' },
        email: { $max: '$with.email' },
        count: { $sum: 1 },
        lastDate: { $last: '$date' },
        lastTime: { $last: '$time' },
        lastTopic: { $last: '$topic' },
        lastLogId: { $last: '$_id' },
        openFollowUps: { $sum: { $size: { $filter: { input: { $ifNull: ['$followUps', []] }, as: 'f', cond: { $ne: ['$$f.done', true] } } } } },
      },
    },
    { $sort: { lastDate: -1, lastTime: -1, name: 1 } },
  ];
  const [out] = await DiscussionLog.aggregate([
    ...page,
    { $facet: { items: [{ $skip: paging.skip ?? 0 }, { $limit: paging.limit ?? 200 }], total: [{ $count: 'n' }] } },
  ]);
  const items = (out?.items ?? []).map((p) => ({
    name: p.name,
    type: p.type ?? 'internal',
    email: p.email ?? '',
    count: p.count,
    lastDate: p.lastDate ?? '',
    lastTime: p.lastTime ?? '',
    lastTopic: p.lastTopic ?? '',
    lastLogId: p.lastLogId ? p.lastLogId.toString() : null,
    openFollowUps: p.openFollowUps ?? 0,
  }));
  return { items, total: out?.total?.[0]?.n ?? 0 };
}

/** Every tag used by the matching logs, most used first — the "All tags" filter list. @param {Record<string, unknown>} filter */
export async function tagSummary(filter) {
  const rows = await DiscussionLog.aggregate([
    { $match: filter },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 500 },
  ]);
  return rows.map((r) => ({ tag: r._id, count: r.count }));
}

/** Mongo expression for a follow-up's state, used by the follow-up feed. @param {string} status */
function followUpStatusMatch(status) {
  const today = todayStr();
  if (status === 'done') return { 'followUps.done': true };
  if (status === 'overdue') return { 'followUps.done': { $ne: true }, 'followUps.deadline': { $gt: '', $lt: today } };
  // open = not done (overdue ones are open too, the way the web counts them)
  return { 'followUps.done': { $ne: true } };
}

/**
 * Every follow-up of the matching logs as its own row, each carrying the log it came from — the Open
 * Follow-ups view, which otherwise needs every log in the browser.
 * @param {Record<string, unknown>} filter @param {{ status?: string, skip?: number, limit?: number }} [opts]
 */
export async function followUpFeed(filter, opts = {}) {
  const pipeline = [
    { $match: filter },
    { $unwind: '$followUps' },
    ...(opts.status ? [{ $match: followUpStatusMatch(opts.status) }] : []),
    { $addFields: { _dl: { $cond: [{ $in: ['$followUps.deadline', ['', null]] }, '9999-99-99', '$followUps.deadline'] } } },
    { $sort: { 'followUps.done': 1, _dl: 1, date: -1, _id: 1 } },
  ];
  const [out] = await DiscussionLog.aggregate([
    ...pipeline,
    { $facet: { items: [{ $skip: opts.skip ?? 0 }, { $limit: opts.limit ?? 200 }], total: [{ $count: 'n' }] } },
  ]);
  const items = (out?.items ?? []).map((r) => {
    const f = r.followUps;
    const overdue = isFollowUpOverdue(f);
    return {
      id: f._id.toString(),
      logId: r._id.toString(),
      text: f.text ?? '',
      owner: f.owner ?? '',
      ownerType: f.ownerType ?? 'internal',
      ownerShort: initials(f.owner),
      deadline: f.deadline ?? '',
      done: !!f.done,
      doneAt: f.doneAt ?? '',
      doneBy: f.doneBy ?? '',
      isOverdue: overdue,
      status: f.done ? 'done' : overdue ? 'overdue' : 'open',
      log: { id: r._id.toString(), topic: r.topic ?? '', date: r.date, time: r.time ?? '', channel: r.channel ?? 'phone', owner: r.owner ?? '' },
    };
  });
  return { items, total: out?.total?.[0]?.n ?? 0 };
}

/** open / overdue / done / total counts over every follow-up of the matching logs. @param {Record<string, unknown>} filter */
export async function followUpCounts(filter) {
  const today = todayStr();
  const [row] = await DiscussionLog.aggregate([
    { $match: filter },
    { $unwind: '$followUps' },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$followUps.done', true] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$followUps.done', true] }, { $gt: ['$followUps.deadline', ''] }, { $lt: ['$followUps.deadline', today] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const total = row?.total ?? 0;
  const done = row?.done ?? 0;
  return { total, done, open: total - done, overdue: row?.overdue ?? 0 };
}
