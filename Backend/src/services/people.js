/**
 * People / date helpers shared by the Meetings module. People are plain name strings for now (the roster is
 * not fully in the DB), often with a role suffix: "Venkata Cherukuri (CMD)". Mirrors web/src/utils/people.js
 * and web/src/utils/dates.js so the API produces exactly what the web app renders.
 */
import { escapeRegex } from '../utils/listQuery.js';

/** "Dr. Anusha Singh" → "AS", "N. Sharma (CFO)" → "NS", "" → "??" (verbatim web logic). @param {string | undefined | null} name */
export function initials(name) {
  if (!name) return '??';
  const cleaned = name.replace(/\(.*?\)/g, '').replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Adv\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '??').slice(0, 2).toUpperCase();
}

/** Strips the "(role)" suffix and extra spaces: "Venkata Cherukuri (CMD)" → "Venkata Cherukuri". @param {unknown} s */
export function cleanName(s) {
  return String(s ?? '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when two people strings name the same person, ignoring the "(role)" suffix and case. @param {unknown} a @param {unknown} b */
export const sameName = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();

/**
 * Mongo clause matching `name` in a people field, with or without a "(role)" suffix, case-insensitive.
 * Works on array fields too (matches any element).
 * @param {string} field @param {string} name
 */
export function nameClause(field, name) {
  return { [field]: new RegExp(`^${escapeRegex(cleanName(name))}(\\s*\\(.*\\))?$`, 'i') };
}

/** @param {string} s @param {number} n */
export const short = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

/** Local calendar date as 'YYYY-MM-DD'. @param {Date} d */
export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today (server local date) as 'YYYY-MM-DD'. */
export const todayStr = () => toISODate(new Date());

/** Today + n days as 'YYYY-MM-DD'. @param {number} n @param {Date} [from] */
export const plusDays = (n, from = new Date()) => toISODate(new Date(from.getTime() + n * 86_400_000));

/** ISO timestamp for "at" fields. */
export const nowIso = () => new Date().toISOString();

/** 30 → "30m", 60 → "1h", 90 → "1h 30m" (the web's acceptMeetingRequest formula, with whole hours). @param {number} min */
export function durLabel(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m ? ` ${m}m` : ''}`;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True for a real calendar date written as 'YYYY-MM-DD'. @param {string} s */
export function isValidDateStr(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
