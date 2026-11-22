/**
 * In-app notifications (local table only; push/email are not wired). Mirrors the web's
 * `notify({ type, text, icon })`: `text` is a short HTML string with <strong>/<em>.
 *
 * Build that text with the html`` tagged template from utils/html.js — never a plain template
 * literal. The text carries meeting titles, notes and names that people type, and html`` escapes
 * every interpolated value so none of it can become live HTML in someone's notification panel:
 *
 *   await notify({ userName: 'N. Sharma (CFO)', type: 'action', icon: '✓', text: html`<strong>${who}</strong> …` });
 *   await notify({ userNames: meeting.attendees, type: 'minutes', icon: '📧', text: '…' });
 *   await notify({ all: true, type: 'meeting', text: '…' });
 */
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { cleanName } from './people.js';

/**
 * @param {{ userName?: string | null, userNames?: (string | null | undefined)[], all?: boolean, type?: string, text: string, icon?: string }} opts
 * @returns {Promise<number>} how many people were notified
 */
export async function notify({ userName, userNames, all, type = 'action', text, icon = '🔔' }) {
  let names;
  if (all) names = (await User.find({ status: 'active' }).select('name')).map((u) => u.name);
  else names = [userName, ...(userNames ?? [])];
  const unique = [...new Set(names.map(cleanName).filter(Boolean))];
  if (!unique.length) return 0;
  await Notification.insertMany(unique.map((n) => ({ userName: n, type, icon, text, unread: true })));
  return unique.length;
}

/** Marks one person's unread notifications read. @param {string} userName @returns {Promise<number>} */
export async function markAllRead(userName) {
  const r = await Notification.updateMany({ userName: cleanName(userName), unread: true }, { $set: { unread: false, readAt: new Date() } });
  return r.modifiedCount ?? 0;
}

/** @param {string} userName */
export const unreadCount = (userName) => Notification.countDocuments({ userName: cleanName(userName), unread: true });
