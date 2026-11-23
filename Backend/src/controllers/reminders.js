import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { REMINDER_STATUSES, Reminder, serializeReminder } from '../models/Reminder.js';
import { notify } from '../services/notifications.js';
import { TIME_RE, cleanName, isValidDateStr, sameName, short } from '../services/people.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';

// ---------- zod pieces (every message is shown to the person word for word) ----------
/** @param {string} label @param {number} max */
const text = (label, max) => z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (max ${max} characters).`);

const reminderShape = {
  title: text('Title', 200).min(1, 'Give the reminder a title.'),
  note: text('Note', 2000).optional(),
  date: z
    .string({ error: 'Pick a date and a time.' })
    .trim()
    .refine(isValidDateStr, 'Date must be a real date written as YYYY-MM-DD, for example 2026-11-25.'),
  time: z
    .string({ error: 'Pick a date and a time.' })
    .trim()
    .regex(TIME_RE, 'Time must be on the 24-hour clock written as HH:MM, for example 09:00 or 16:30.'),
  recipients: z
    .array(text('Name', 200).min(1, 'A name cannot be empty.'), { error: 'The people to remind must be a list of names.' })
    .max(50, 'Too many people on one reminder (max 50).')
    .optional(),
  /** Also remind the person setting it. Defaults to true when nobody else is named. */
  remindMe: z.boolean({ error: 'remindMe must be true or false.' }).optional(),
};

export const createSchema = z.object(reminderShape).strict();
export const patchSchema = z
  .object({
    ...reminderShape,
    title: reminderShape.title.optional(),
    date: reminderShape.date.optional(),
    time: reminderShape.time.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change.');

// ---------- list contract ----------

/** @type {import('../utils/listQuery.js').ListSpec} */
export const REMINDERS_LIST = {
  searchFields: ['title', 'note', 'recipients', 'creator'],
  filterFields: { status: 'enum', creator: 'string' },
  enums: { status: REMINDER_STATUSES },
  dateFields: ['remindAt', 'createdAt'],
  defaultDateField: 'remindAt',
  stringDateFields: ['date'],
  sortFields: ['remindAt', 'date', 'title', 'status', 'createdAt'],
  defaultSort: 'remindAt',
  fields: ['title', 'note', 'date', 'time', 'remindAt', 'status', 'sentAt', 'creator', 'recipients', 'createdAt', 'updatedAt'],
};

// ---------- helpers ----------

/**
 * What this person is allowed to see: the reminders they set, and the ones set for them. An admin
 * sees all of them, as "can see all data" did in v1.
 * @param {any} me
 */
function visibleTo(me) {
  if (me.role === 'admin') return {};
  const name = cleanName(me.name);
  const asName = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return { $or: [{ creator: asName }, { recipients: asName }] };
}

const andVisible = (me, filter) => {
  const mine = visibleTo(me);
  return Object.keys(mine).length ? { $and: [mine, filter] } : filter;
};

/** The moment the reminder fires, on the server's clock. */
const momentOf = (date, time) => new Date(`${date}T${time}:00`);

/**
 * Who to remind. Blank names are dropped, duplicates collapse, and the person setting it is added
 * when they asked for it — or when they named nobody else, since a reminder for no one is useless.
 * @param {any} me
 */
function recipientsFrom(body, me, existing) {
  const named = (body.recipients ?? existing?.recipients ?? []).map((n) => String(n).trim()).filter(Boolean);
  const wantsSelf = body.remindMe ?? (existing ? existing.recipients.some((n) => sameName(n, me.name)) : named.length === 0);
  const all = wantsSelf ? [...named, me.name] : named;

  const seen = new Set();
  const unique = [];
  all.forEach((n) => {
    const key = cleanName(n).toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(n);
    }
  });
  if (!unique.length) throw badRequest('Choose at least one person to remind, or remind yourself.');
  return unique;
}

/** The line each recipient sees when a reminder is set, changed or called off. */
const announce = (r, lead) =>
  notify({
    userNames: r.recipients,
    type: 'reminder',
    icon: '⏰',
    text: `${lead} <strong>${short(r.title, 80)}</strong> · ${r.date} at ${r.time}`,
  });

async function findOr404(id) {
  const r = await Reminder.findById(id).catch(() => null);
  if (!r) throw notFound('That reminder could not be found.');
  return r;
}

// ---------- handlers ----------

/**
 * GET /api/reminders — the person's own reminders, newest minute first.
 *
 * `box` is the v1 mobile app's three tabs: upcoming (still scheduled), sent, or all. The counts
 * come back with the page so the tabs and the summary read from one answer.
 *
 * @type {import('express').RequestHandler}
 */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { box = 'upcoming', ...rest } = req.query;
  if (!['upcoming', 'sent', 'all'].includes(box)) {
    throw badRequest('box must be one of: upcoming, sent, all.');
  }

  const lq = buildListQuery(rest, REMINDERS_LIST);
  const byBox = box === 'upcoming' ? { status: 'scheduled' } : box === 'sent' ? { status: 'sent' } : {};
  lq.filter = andVisible(me, { $and: [lq.filter, byBox] });
  if (box === 'sent') lq.sort = { remindAt: -1 };

  const mineRe = new RegExp(`^${cleanName(me.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const [page, upcoming, sent, forMe] = await Promise.all([
    runList(Reminder, lq, (r) => serializeReminder(r, me.name)),
    Reminder.countDocuments(andVisible(me, { status: 'scheduled' })),
    Reminder.countDocuments(andVisible(me, { status: 'sent' })),
    Reminder.countDocuments(andVisible(me, { status: 'scheduled', recipients: mineRe })),
  ]);

  res.json({ ...page, counts: { upcoming, sent, forMe } });
};

/** GET /api/reminders/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  const me = currentUser(req);
  const r = await findOr404(req.params.id);
  const seen = await Reminder.countDocuments(andVisible(me, { _id: r._id }));
  if (!seen) throw forbidden('This reminder is not yours.');
  res.json({ reminder: serializeReminder(r, me.name) });
};

/** POST /api/reminders @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const { title, note = '', date, time } = req.body;
  const remindAt = momentOf(date, time);
  if (remindAt.getTime() < Date.now() - 60_000) {
    throw badRequest('The reminder time has already passed. Pick a time in the future.');
  }
  const recipients = recipientsFrom(req.body, me);

  const r = await Reminder.create({
    creator: me.name,
    creatorId: me._id ?? null,
    title,
    note,
    date,
    time,
    remindAt,
    status: 'scheduled',
    recipients,
  });

  await announce(r, `${short(me.name, 40)} set a reminder:`);
  res.locals.audit = {
    entity: r.title,
    entityId: r._id.toString(),
    details: `Set a reminder for ${r.date} at ${r.time} · ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}`,
  };
  res.status(201).json({ reminder: serializeReminder(r, me.name) });
};

/** PATCH /api/reminders/:id — the person who set it, and only before it fires. @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const r = await findOr404(req.params.id);
  if (!sameName(r.creator, me.name)) {
    throw forbidden('Only the person who set this reminder can change it.');
  }
  if (r.status !== 'scheduled') {
    throw badRequest('This reminder has already been sent and cannot be changed.');
  }

  const date = req.body.date ?? r.date;
  const time = req.body.time ?? r.time;
  const remindAt = momentOf(date, time);
  if (remindAt.getTime() < Date.now() - 60_000) {
    throw badRequest('The reminder time has already passed. Pick a time in the future.');
  }

  const recipients =
    req.body.recipients !== undefined || req.body.remindMe !== undefined
      ? recipientsFrom(req.body, me, r)
      : r.recipients;

  Object.assign(r, {
    title: req.body.title ?? r.title,
    note: req.body.note ?? r.note,
    date,
    time,
    remindAt,
    recipients,
  });
  await r.save();

  await announce(r, `${short(me.name, 40)} changed a reminder:`);
  res.locals.audit = {
    action: 'update',
    entity: r.title,
    entityId: r._id.toString(),
    details: `Moved to ${r.date} at ${r.time} · ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}`,
  };
  res.json({ reminder: serializeReminder(r, me.name) });
};

/** DELETE /api/reminders/:id — the person who set it. @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const r = await findOr404(req.params.id);
  if (!sameName(r.creator, me.name)) {
    throw forbidden('Only the person who set this reminder can change it.');
  }
  if (r.status === 'scheduled') {
    await announce(r, `${short(me.name, 40)} called off a reminder:`);
  }
  await r.deleteOne();
  res.locals.audit = { action: 'delete', entity: r.title, entityId: r._id.toString(), details: `Deleted the reminder set for ${r.date} at ${r.time}` };
  res.json({ ok: true });
};
