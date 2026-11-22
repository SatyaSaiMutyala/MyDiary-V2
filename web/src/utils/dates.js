// ============ DATE UTILITIES (verbatim from the prototype) ============
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const TODAY = new Date(2026, 10, 21); // Sat 21 Nov 2026 — the prototype's simulated "today"

// Local-time YYYY-MM-DD (toISOString would shift the day in IST)
export function toISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export const todayStr = () => toISO(TODAY);
export function parseDate(s) { const [y,m,d] = s.split('-').map(n => parseInt(n,10)); return new Date(y, m-1, d); }
export function formatDate(dt) { return DAYS[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear(); }
export function formatDateLong(dt) { return DAYS_LONG[dt.getDay()] + ', ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear(); }
export function formatTime(s) { const [h,m] = s.split(':').map(n => parseInt(n,10)); const am = h < 12; const h12 = h % 12 === 0 ? 12 : h % 12; return h12 + ':' + String(m).padStart(2,'0') + ' ' + (am ? 'AM' : 'PM'); }
export function daysUntil(dateStr) { const d = parseDate(dateStr); return Math.round((d - TODAY) / (1000*60*60*24)); }
export function isToday(dateStr) { return daysUntil(dateStr) === 0; }
export function isOverdue(dateStr) { return daysUntil(dateStr) < 0; }
export function addDaysISO(n, from = TODAY) { return toISO(new Date(from.getTime() + n * 86400000)); }
export function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
export function parseDuration(s) { if (!s) return 60; let total = 0; const h = s.match(/(\d+)\s*h/); if (h) total += +h[1] * 60; const mm = s.match(/(\d+)\s*m/); if (mm) total += +mm[1]; if (!total) total = 60; return total; }
export function addMinutes(timeStr, mins) { const [h, m] = timeStr.split(':').map(n => +n); const total = h * 60 + m + mins; return String(Math.floor(total / 60)).padStart(2,'0') + ':' + String(total % 60).padStart(2,'0'); }
export function timeToMinutes(t) { const [h, m] = t.split(':').map(n => +n); return h * 60 + m; }
export function nowStamp() { return new Date().toISOString().slice(0,16).replace('T',' '); }

/**
 * API timestamps ("2026-11-22T12:48:03.091Z") as the prototype's relative labels. Anything that is not a
 * date (the demo data's "Just now") is returned unchanged.
 */
export function relativeTime(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
