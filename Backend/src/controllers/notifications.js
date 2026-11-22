import mongoose from 'mongoose';
import { currentUser } from '../middleware/auth.js';
import { Notification, serializeNotification } from '../models/Notification.js';
import { markAllRead, unreadCount } from '../services/notifications.js';
import { cleanName } from '../services/people.js';
import { notFound } from '../utils/errors.js';
import { andClause, buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';

/** List contract for GET /api/notifications (always scoped to the signed-in user). @type {import('../utils/listQuery.js').ListSpec} */
export const NOTIFICATIONS_LIST = {
  searchFields: ['text'],
  filterFields: { unread: 'boolean', type: 'string' },
  dateFields: ['createdAt'],
  defaultDateField: 'createdAt',
  sortFields: ['createdAt', 'type', 'unread'],
  defaultSort: '-createdAt',
  fields: ['type', 'unread', 'text', 'icon', 'time', 'createdAt', 'readAt'],
};

/** GET /api/notifications — mine, newest first, plus `unreadTotal`. @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const lq = andClause(buildListQuery(req.query, NOTIFICATIONS_LIST), { userName: cleanName(me.name) }, 'mine', true);
  const [page, unreadTotal] = await Promise.all([runList(Notification, lq, serializeNotification), unreadCount(me.name)]);
  res.json({ ...page, unreadTotal });
};

/** POST /api/notifications/read-all @type {import('express').RequestHandler} */
export const readAll = async (req, res) => {
  const me = currentUser(req);
  const updated = await markAllRead(me.name);
  res.locals.audit = false; // the user's own read state is not Activity Log material
  res.json({ ok: true, updated });
};

/** PATCH /api/notifications/:id/read @type {import('express').RequestHandler} */
export const markRead = async (req, res) => {
  const me = currentUser(req);
  const { id } = req.params;
  const n = mongoose.isValidObjectId(id) ? await Notification.findOne({ _id: id, userName: cleanName(me.name) }) : null;
  if (!n) throw notFound('That notification does not exist.');
  if (n.unread) {
    n.unread = false;
    n.readAt = new Date();
    await n.save();
  }
  res.locals.audit = false;
  res.json({ notification: serializeNotification(n) });
};
