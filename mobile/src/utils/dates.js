// Small date helpers. Dates are 'YYYY-MM-DD' strings throughout the app.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parse = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const pad = n => String(n).padStart(2, '0');

export const toIso = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Today on the phone's own calendar. Read once when the app starts.
export const TODAY_ISO = toIso(new Date());

export const addDays = (iso, days) => {
  const d = parse(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
};

export const addMonths = (iso, months) => {
  const d = parse(iso);
  return toIso(new Date(d.getFullYear(), d.getMonth() + months, 1));
};

export const dayName = iso => DAYS[parse(iso).getDay()];
export const dayNumber = iso => String(parse(iso).getDate());
export const monthTitle = iso => {
  const d = parse(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "Tue, 29 Sep 2026"
export const longDate = iso => {
  const d = parse(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(
    0,
    3,
  )} ${d.getFullYear()}`;
};

// "Tue, 29 Sep"
export const shortDate = iso => longDate(iso).replace(/ \d{4}$/, '');

/**
 * A deadline as a list row shows it: "29 Sep", and "1 Jan 2020" once it is not this year.
 *
 * The weekday is dropped — on a one-line row the day and month are what a person reads — but the
 * year is kept whenever it differs, so a long-overdue task cannot be mistaken for a recent one.
 */
export const dueDate = iso => {
  if (!iso) {
    return '';
  }
  const d = parse(iso);
  const year = d.getFullYear();
  const month = MONTHS[d.getMonth()].slice(0, 3);
  const suffix = year === new Date().getFullYear() ? '' : ` ${year}`;
  return `${d.getDate()} ${month}${suffix}`;
};

// The 7 days (Sunday first) of the week that holds the given day.
export const weekOf = iso => {
  const start = addDays(iso, -parse(iso).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

// Whole weeks covering the month of the given day.
export const monthGrid = iso => {
  const d = parse(iso);
  const first = toIso(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const weeks = [];
  let cursor = weekOf(first)[0];
  while (cursor <= last) {
    weeks.push(weekOf(cursor));
    cursor = addDays(cursor, 7);
  }
  return weeks;
};

export const sameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7);
export const weekDayNames = DAYS;

// The real calendar day on the phone, as opposed to TODAY_ISO which the
// dummy-data modules still use.
export const realToday = () => toIso(new Date());

const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// "Thursday, 1 October 2026"
export const fullDate = iso => {
  const d = parse(iso);
  return `${FULL_DAYS[d.getDay()]}, ${d.getDate()} ${
    MONTHS[d.getMonth()]
  } ${d.getFullYear()}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12
    ? 'Good morning,'
    : h < 17
    ? 'Good afternoon,'
    : 'Good evening,';
};

/**
 * "Just now" · "7 mins ago" · "3 hours ago" · "2 days ago", and a plain date once it is over a week
 * old. Ported from the website (web/src/utils/dates.js) so a notification reads the same in both.
 *
 * This one takes a full ISO timestamp, not a 'YYYY-MM-DD' day, because it is about a moment.
 */
export function relativeTime(iso) {
  if (!iso) {
    return '';
  }
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    return String(iso);
  }
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
