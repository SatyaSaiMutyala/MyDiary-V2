/**
 * My Diary — business rules for the person's own diary entries.
 *
 * Meetings are deliberately absent from this service: the calendar screen merges /api/diary with
 * /api/meetings in the browser, so a meeting is never copied into the diary collection.
 */
import mongoose from 'mongoose';
import { DiaryEntry, serializeDiaryEntry } from '../models/DiaryEntry.js';
import { User } from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { html } from '../utils/html.js';
import { runList } from '../utils/paginate.js';
import { notify } from './notifications.js';
import { cleanName, isValidDateStr, nameClause, sameName, short } from './people.js';

/**
 * Who may see or fill in whose diary — mirrors web/src/data/diary.js DELEGATIONS (the EA's access to
 * the CMD's diary). Delegation is a fixed matrix for now, like the roster itself; when it becomes a
 * real screen this constant is the one thing that has to move into the database.
 * @type {{ owner: string, delegate: string, permission: 'edit' | 'view' }[]}
 */
export const DELEGATIONS = [{ owner: 'Venkata Cherukuri', delegate: 'Pallavi Elisetti', permission: 'edit' }];

/** Longest entry we store; keeps `days` (and so the index) sane. */
export const MAX_SPAN_DAYS = 366;

const MS_DAY = 86_400_000;

/** @param {string} s a validated 'YYYY-MM-DD' */
const asDate = (s) => new Date(`${s}T00:00:00.000Z`);

/**
 * Every calendar day from `date` to `endDate` inclusive (just [date] when there is no end date).
 * @param {string} date @param {string | null | undefined} endDate
 */
export function daysOf(date, endDate) {
  if (!endDate || endDate === date) return [date];
  const out = [];
  for (let t = asDate(date).getTime(); t <= asDate(endDate).getTime(); t += MS_DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** 'HH:MM' → minutes since midnight. @param {string} t */
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * What the signed-in person may do with `ownerName`'s diary: 'edit', 'view' or null (nothing).
 * Admins can reach every diary, the same way they can reach every other record in this API.
 * @param {{ name: string, role: string }} me @param {string} ownerName
 */
export function diaryAccess(me, ownerName) {
  if (sameName(me.name, ownerName)) return 'edit';
  if (me.role === 'admin') return 'edit';
  const d = DELEGATIONS.find((x) => sameName(x.owner, ownerName) && sameName(x.delegate, me.name));
  return d ? d.permission : null;
}

/**
 * 403 with a sentence a non-technical person can act on, unless the access is there.
 * @param {{ name: string, role: string }} me @param {string} ownerName @param {'view' | 'edit'} need
 */
export function requireDiaryAccess(me, ownerName, need = 'view') {
  const level = diaryAccess(me, ownerName);
  if (!level) throw forbidden(`You do not have access to ${cleanName(ownerName)}'s diary. Ask them to share it with you.`);
  if (need === 'edit' && level !== 'edit') throw forbidden(`You have view-only access to ${cleanName(ownerName)}'s diary, so you cannot change it.`);
  return level;
}

/** The diaries this person may read: their own plus the ones delegated to them. @param {{ name: string }} me */
export const delegatedOwners = (me) => DELEGATIONS.filter((d) => sameName(d.delegate, me.name)).map((d) => d.owner);

/** `mine` (the default): entries on my own diary. @param {any} me a User document */
export const ownClause = (me) => ({ $or: [{ ownerId: me._id }, nameClause('owner', me.name)] });

/**
 * `mine=false`: everything this person may read — their own diary and the diaries delegated to them
 * (for an admin: every diary, i.e. no restriction at all).
 * @param {any} me a User document
 */
export function visibleClause(me) {
  if (me.role === 'admin') return {};
  const owners = delegatedOwners(me);
  if (!owners.length) return ownClause(me);
  return { $or: [{ ownerId: me._id }, nameClause('owner', me.name), ...owners.map((o) => nameClause('owner', o))] };
}

/** @param {string} id */
export async function findEntryOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('That diary entry does not exist.');
  const e = await DiaryEntry.findById(id);
  if (!e) throw notFound('That diary entry does not exist.');
  return e;
}

/** The account behind a people string, when there is one ("N. Sharma (CFO)" → that user). @param {string} name */
export const findUserByName = (name) => User.findOne(nameClause('name', name));

/**
 * The timing rules, checked on the finished entry (create) or on the merged entry (patch) so a
 * partial edit cannot leave an impossible pair behind. Messages are the ones shown to the person.
 * @param {{ date: string, endDate?: string | null, startTime?: string | null, endTime?: string | null, allDay?: boolean }} e
 */
export function validateTiming(e) {
  if (!isValidDateStr(e.date)) throw badRequest('That date does not exist. Write the date as YYYY-MM-DD, for example 2026-11-25.', [{ field: 'date', message: 'Not a real date.' }]);
  if (e.endDate) {
    if (!isValidDateStr(e.endDate)) throw badRequest('That end date does not exist. Write it as YYYY-MM-DD, for example 2026-11-30.', [{ field: 'endDate', message: 'Not a real date.' }]);
    if (e.endDate < e.date) throw badRequest('The entry ends before it starts. Pick an end date on or after the start date.', [{ field: 'endDate', message: 'Earlier than the start date.' }]);
    const span = (asDate(e.endDate).getTime() - asDate(e.date).getTime()) / MS_DAY + 1;
    if (span > MAX_SPAN_DAYS) throw badRequest(`One diary entry cannot run for more than ${MAX_SPAN_DAYS} days. Split it into shorter entries.`, [{ field: 'endDate', message: 'Too long.' }]);
  }
  if (e.allDay) return;
  if (!e.startTime) throw badRequest('Add a start time, or tick "All-day event".', [{ field: 'startTime', message: 'A timed entry needs a start time.' }]);
  // Times only compare inside one day; a multi-day entry's times belong to its first and last day.
  const oneDay = !e.endDate || e.endDate === e.date;
  if (oneDay && e.endTime && minutes(e.endTime) <= minutes(e.startTime)) {
    throw badRequest('The end time is not after the start time. Check the two times.', [{ field: 'endTime', message: 'Not after the start time.' }]);
  }
}

/**
 * Normalises one incoming external invitee list. Someone already on the entry keeps their RSVP
 * unless the request sets a new one, and a changed RSVP is stamped 'YYYY-MM-DDTHH:MM' like the web.
 * @param {any[]} incoming @param {any[]} [existing]
 */
function mergeExternal(incoming, existing = []) {
  return incoming.map((x) => {
    const prev = existing.find((p) => sameName(p.name, x.name));
    const rsvp = x.rsvp ?? prev?.rsvp ?? 'pending';
    const same = prev ? rsvp === prev.rsvp : false;
    return {
      name: x.name,
      email: x.email ?? prev?.email ?? '',
      rsvp,
      respondedAt: x.respondedAt !== undefined ? x.respondedAt : same ? (prev?.respondedAt ?? null) : rsvp === 'pending' ? null : new Date().toISOString().slice(0, 16),
      respondedNote: x.respondedNote ?? (same ? (prev?.respondedNote ?? '') : ''),
    };
  });
}

/** The fields an edit is described by in the Activity Log. */
export const DIARY_CHANGE_FIELDS = ['title', 'cat', 'date', 'endDate', 'startTime', 'endTime', 'allDay', 'loc', 'notes', 'reminder', 'attendees', 'external', 'owner'];
/** @param {any} e */
export const entrySnapshot = (e) => ({
  title: e.title,
  cat: e.cat,
  date: e.date,
  endDate: e.endDate ?? null,
  startTime: e.startTime ?? null,
  endTime: e.endTime ?? null,
  allDay: !!e.allDay,
  loc: e.loc ?? '',
  notes: e.notes ?? '',
  reminder: e.reminder,
  attendees: [...(e.attendees ?? [])],
  external: (e.external ?? []).map((x) => x.name),
  owner: e.owner,
});

/**
 * Creates an entry on `input.owner`'s diary (mine by default). Needs edit access to that diary; an
 * entry someone else fills in for me is stamped `addedBy: 'ea'`, which is the EA badge the calendar
 * paints on it.
 * @param {Record<string, any>} input validated body
 * @param {any} me the signed-in User document
 */
export async function createEntry(input, me) {
  const owner = input.owner ?? me.name;
  requireDiaryAccess(me, owner, 'edit');
  const allDay = input.allDay ?? false;
  const entry = {
    owner,
    title: input.title,
    cat: input.cat,
    date: input.date,
    endDate: input.endDate ?? null,
    startTime: allDay ? null : (input.startTime ?? null),
    endTime: allDay ? null : (input.endTime ?? null),
    allDay,
    loc: input.loc ?? '',
    notes: input.notes ?? '',
    reminder: input.reminder ?? '15 min before',
    attendees: input.attendees ?? [],
    external: mergeExternal(input.external ?? []),
  };
  validateTiming(entry);
  const ownerUser = sameName(owner, me.name) ? me : await findUserByName(owner);
  return DiaryEntry.create({
    ...entry,
    ownerId: ownerUser ? ownerUser._id : null,
    days: daysOf(entry.date, entry.endDate),
    addedBy: sameName(owner, me.name) ? 'self' : 'ea',
    createdBy: { id: me._id, name: me.name },
  });
}

/**
 * Applies a partial edit. Moving the entry re-derives `days`; handing it to another person needs
 * edit access to that person's diary too.
 * @param {any} e @param {Record<string, any>} patch @param {any} me
 */
export async function patchEntry(e, patch, me) {
  const before = entrySnapshot(e);
  if (patch.owner !== undefined && !sameName(patch.owner, e.owner)) {
    requireDiaryAccess(me, patch.owner, 'edit');
    const ownerUser = sameName(patch.owner, me.name) ? me : await findUserByName(patch.owner);
    e.owner = patch.owner;
    e.ownerId = ownerUser ? ownerUser._id : null;
    e.addedBy = sameName(patch.owner, me.name) ? 'self' : 'ea';
  }
  for (const f of ['title', 'cat', 'date', 'endDate', 'startTime', 'endTime', 'loc', 'notes', 'reminder', 'attendees']) {
    if (patch[f] !== undefined) e[f] = patch[f];
  }
  /** @type {{ name: string, rsvp: string, respondedNote: string }[]} */
  const answered = [];
  if (patch.external !== undefined) {
    const was = e.external.map((x) => ({ name: x.name, rsvp: x.rsvp }));
    e.external = mergeExternal(patch.external, e.external);
    for (const x of e.external) {
      const prev = was.find((p) => sameName(p.name, x.name));
      if (prev && prev.rsvp !== x.rsvp) answered.push({ name: x.name, rsvp: x.rsvp, respondedNote: x.respondedNote });
    }
  }
  if (patch.allDay !== undefined) e.allDay = patch.allDay;
  if (e.allDay) {
    e.startTime = null;
    e.endTime = null;
  }
  validateTiming({ date: e.date, endDate: e.endDate, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay });
  e.days = daysOf(e.date, e.endDate);
  await e.save();
  for (const a of answered) await notifyRsvp(e, a);
  return before;
}

/**
 * An external invitee's answer, told to whoever owns the diary (the same line the Meetings module
 * sends its chair). html`` escapes the name, the title and the note.
 * @param {any} e @param {{ name: string, rsvp: string, respondedNote: string }} a
 */
async function notifyRsvp(e, a) {
  const label = a.rsvp === 'accepted' ? 'accepted' : a.rsvp === 'declined' ? 'declined' : a.rsvp === 'tentative' ? 'tentatively accepted' : 'reset their response to';
  const icon = a.rsvp === 'accepted' ? '✓' : a.rsvp === 'declined' ? '✗' : '?';
  await notify({
    userName: e.owner,
    type: 'meeting',
    icon,
    text: html`<strong>${a.name}</strong> has <strong>${label}</strong> your invitation to <em>${e.title}</em>${a.respondedNote ? ` — "${short(a.respondedNote, 80)}"` : '.'}`,
  });
}

/** "on 25 Nov 2026, 09:00 – 11:00" style tail for notification text. @param {any} e */
function whenLabel(e) {
  const span = e.endDate && e.endDate !== e.date ? `${e.date} → ${e.endDate}` : e.date;
  if (e.allDay) return `${span} (all day)`;
  return `${span}, ${e.startTime}${e.endTime ? ` – ${e.endTime}` : ''}`;
}

/**
 * The in-app notifications a new entry raises, mirroring the web's saveEntry():
 * the internal invitees hear about the invitation, the owner hears when someone else filled their
 * diary in, and the person who added it gets the "Invites sent" line.
 * Every text is composed with html`` (utils/html.js) so a typed-in title can never become live HTML.
 * @param {any} e a saved DiaryEntry @param {any} me
 */
export async function notifyEntryCreated(e, me) {
  const withEmail = e.external.filter((x) => x.email);
  const others = e.attendees.filter((a) => !sameName(a, me.name) && !sameName(a, e.owner));
  const when = whenLabel(e);
  if (others.length) {
    await notify({
      userNames: others,
      type: 'meeting',
      icon: '📅',
      text: html`<strong>${me.name}</strong> invited you to <em>${e.title}</em> — ${when}${e.loc ? ` · ${short(e.loc, 60)}` : ''}.`,
    });
  }
  if (!sameName(e.owner, me.name)) {
    await notify({
      userName: e.owner,
      type: 'meeting',
      icon: '🗓',
      text: html`<strong>${me.name}</strong> added <em>${e.title}</em> to your diary — ${when}.`,
    });
  }
  if (e.attendees.length || withEmail.length) {
    await notify({
      userName: me.name,
      type: 'meeting',
      icon: '📧',
      text: html`<strong>Invites sent:</strong> <em>${e.title}</em> on ${e.date} — ${e.attendees.length} internal + ${withEmail.length} external.`,
    });
  }
}

/** GET /api/diary — the standard list response. @param {import('../utils/listQuery.js').ListQuery} lq */
export const listEntries = (lq) => runList(DiaryEntry, lq, serializeDiaryEntry);
