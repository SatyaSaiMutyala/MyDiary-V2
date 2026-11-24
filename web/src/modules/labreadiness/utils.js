import { tokens } from '../../theme/tokens';

/** The two rounds of a readiness day, as the board labels them. */
export const PHASES = [
  { key: 'opening', label: '🌅 Opening round', short: 'Opening' },
  { key: 'closing', label: '🌙 Closing round', short: 'Closing' },
];

/** What a person can say about an activity, and how each answer looks. */
export const STATUSES = [
  { key: 'done', label: 'Done', icon: '✓', color: tokens.ok, soft: tokens.okSoft, hint: 'Done as written' },
  { key: 'deviation', label: 'Deviation', icon: '⚠', color: tokens.warn, soft: tokens.warnSoft, hint: 'Not as written — say what happened' },
  { key: 'na', label: 'N/A', icon: '–', color: tokens.grey, soft: tokens.greySoft, hint: 'Does not apply today' },
];
export const statusStyle = (key) => STATUSES.find((s) => s.key === key) ?? null;

/** What kind of place a unit is, for the chip beside its name. */
export const UNIT_KINDS = {
  nrl: { label: 'NRL', color: tokens.tealDark, soft: tokens.tealSoft },
  regional: { label: 'Regional', color: tokens.blue, soft: tokens.blueSoft },
  satellite: { label: 'Satellite', color: tokens.purple, soft: tokens.purpleSoft },
};

/** How a unit's round is going, as one word plus its colour. */
export function phaseLook(p) {
  if (!p) return { label: 'Not started', color: tokens.slateSoft, soft: tokens.greySoft };
  if (p.signedAt) return { label: p.late ? 'Signed · late' : 'Signed off', color: p.late ? tokens.warn : tokens.ok, soft: p.late ? tokens.warnSoft : tokens.okSoft };
  if (p.done > 0) return { label: `${p.done}/${p.total} done`, color: tokens.blue, soft: tokens.blueSoft };
  return { label: 'Not started', color: tokens.slateSoft, soft: tokens.greySoft };
}

/**
 * The board's activities grouped under their section heading.
 *
 * The sheet itself runs in time order, so one heading can come round several times — "Facility, safety
 * & housekeeping" at 07:00 and again at 07:10. Each heading gets one block here, in the order it is
 * first reached, and every row keeps its own scheduled time, so the sequence is still readable without
 * the same heading appearing three times down the page.
 * @returns {{ heading: string, items: object[] }[]}
 */
export function bySection(activities = []) {
  /** @type {Map<string, { heading: string, items: object[] }>} */
  const groups = new Map();
  for (const a of activities) {
    const heading = a.section || 'Other checks';
    if (!groups.has(heading)) groups.set(heading, { heading, items: [] });
    groups.get(heading).items.push(a);
  }
  return [...groups.values()];
}

/** The recorded line for one activity, or an empty one. */
export const itemOf = (run, key) => (run?.items ?? []).find((i) => i.taskKey === key) ?? null;
/** The photographs filed against one activity. */
export const photosOf = (run, key) => (run?.photos ?? []).filter((p) => p.taskKey === key);

/**
 * Why this activity is not finished yet, in a few words — or '' when it is.
 * The same three rules the API applies at sign-off (Backend/src/services/labReadiness.js).
 */
export function whatIsMissing(activity, item, photos) {
  const status = item?.status ?? null;
  if (!status) return '';
  if ((status === 'deviation' || status === 'na') && !(item.remark ?? '').trim()) {
    return status === 'na' ? 'An N/A needs a remark' : 'A deviation needs a remark';
  }
  if (status === 'done' && activity.photoRequired && photos.length === 0) return 'Needs a photograph';
  return '';
}

/**
 * Today, from the clock on this machine.
 *
 * Deliberately NOT utils/dates.js's todayStr(), which returns the prototype's frozen 21 Nov 2026 so the
 * demo data always looks current. A readiness record is a real laboratory record on a real date, so it
 * has to be stamped with the real one.
 */
export function realToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "16 Nov 2026" from "2026-11-16". */
export function prettyDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

/** "09:42" from an ISO timestamp. */
export const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

/** "2026-11-24" shifted by n days. */
export function shiftDate(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** 8 MB, the same ceiling the API enforces — checked here so a big photo fails before it is sent. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** '' when the file can be sent, otherwise why it cannot. */
export function checkPhoto(file) {
  if (!file) return 'Choose a photograph first.';
  if (!PHOTO_TYPES.includes((file.type || '').toLowerCase())) return 'The photograph has to be a JPEG, PNG or WebP image.';
  if (file.size > MAX_PHOTO_BYTES) return `That photograph is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB — take it again at a smaller size.`;
  return '';
}
