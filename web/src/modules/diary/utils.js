// MY DIARY helpers — ported 1:1 from the prototype (JS 9565–9730 + computeDateLabel)
import { DELEGATIONS } from '../../data/diary';
import { TYPES } from '../../data/meetings';
import { TODAY, toISO, parseDuration, addMinutes, startOfWeek, MONTHS, MONTHS_FULL, DAYS_LONG } from '../../utils/dates';
import { tokens, fonts } from '../../theme/tokens';

/** Local-date → 'YYYY-MM-DD' (toISOString() would shift the day in IST). */
export { toISO };
export const TODAY_ISO = toISO(TODAY);

export const START_HOUR = 7, END_HOUR = 22;       // 7am – 10pm
export const PX_PER_MIN = 48 / 60;                // 48px per hour
export const NOW_MINS = 11 * 60 + 30;             // demo "now" = 11:30 AM

export function canEditDiary(viewer, owner) {
  if (viewer === owner) return true;
  return DELEGATIONS.some(d => d.owner === owner && d.delegate === viewer && d.permission === 'edit');
}

// ---- GET /api/diary ⇄ the shape the calendar views render ----

/**
 * One entry from GET /api/diary as the views expect it. The API's `addedBy` ('self' | 'ea') is the
 * prototype's `createdBy`, which is what paints the yellow EA badge.
 */
export function apiToEntry(e) {
  return {
    id: e.id,
    owner: e.owner,
    title: e.title,
    cat: e.cat,
    date: e.date,
    endDate: e.endDate || undefined,
    startTime: e.startTime || undefined,
    endTime: e.endTime || undefined,
    allDay: !!e.allDay,
    loc: e.loc || '',
    notes: e.notes || '',
    reminder: e.reminder,
    attendees: e.attendees || [],
    external: e.external || [],
    createdBy: e.addedBy === 'ea' ? 'ea' : 'self',
  };
}

/** A saved entry from EntryModal as the POST /api/diary body (the API is strict: no unknown keys). */
export function entryToApiBody(entry, { owner, me }) {
  const body = {
    title: entry.title,
    cat: entry.cat,
    date: entry.date,
    allDay: !!entry.allDay,
    loc: entry.loc || '',
    notes: entry.notes || '',
    reminder: entry.reminder,
    attendees: entry.attendees || [],
    external: (entry.external || []).map(x => ({ name: x.name, email: x.email || '' })),
  };
  if (!entry.allDay) {
    body.startTime = entry.startTime;
    if (entry.endTime) body.endTime = entry.endTime;
  }
  if (owner && me && owner !== me) body.owner = owner;   // the EA filling in someone else's diary
  return body;
}

/**
 * The window of days one GET /api/diary (and GET /api/meetings) call must cover for the whole
 * screen: the displayed month, the mini-calendar's month, the month grid's leading / trailing days,
 * the week the cursor sits in, and the agenda's next 21 days. One query per month, so moving inside
 * a month is answered from the cache.
 */
export function calendarWindow(date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  to.setDate(to.getDate() + 28);
  return { from: toISO(from), to: toISO(to) };
}

// Derive meeting-based entries from MEETINGS
export function meetingToEntry(m, forOwner) {
  const mins = parseDuration(m.dur);
  return {
    id: 'mtg-' + m.id + (forOwner ? '-' + forOwner.replace(/\s/g, '-') : ''),
    owner: forOwner || 'Venkata Cherukuri',
    title: m.title,
    cat: 'meeting',
    date: m.date,
    startTime: m.time,
    endTime: addMinutes(m.time, mins),
    loc: m.loc,
    notes: '',
    attendees: m.attendees,
    external: m.external,
    sourceMeetingId: m.id,
    createdBy: 'system',
    typeBadge: (TYPES[m.type] || TYPES.other).name.replace(' Meeting', ''),
  };
}

// Convert a pending meeting request into a tentative diary entry
export function requestToEntry(r, forOwner) {
  const mins = r.durationMin || 30;
  const addMin = (t, m) => {
    const [h, mm] = t.split(':').map(Number);
    const total = h * 60 + mm + m;
    return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  };
  return {
    id: 'req-' + r.id + '-' + forOwner.replace(/\s/g, '-'),
    owner: forOwner,
    title: '📨 ' + r.topic,
    cat: 'tentative',
    date: r.proposedDate,
    startTime: r.proposedTime,
    endTime: addMin(r.proposedTime, mins),
    loc: 'TBD · pending response',
    notes: (r.notes || '') + '\n\nRequested by: ' + r.from + (r.onBehalfOf ? ' (for ' + r.onBehalfOf + ', routed via ' + r.routedTo + ')' : ''),
    attendees: [r.from, r.to].filter(Boolean),
    external: [],
    sourceRequestId: r.id,
    createdBy: 'request',
    typeBadge: 'Pending request',
    isTentative: true,
  };
}

// Get all entries visible for a diary owner (own entries + meetings + pending requests as tentative)
export function getDiaryEntries(forOwner, { diaryEntries = [], meetings = [], meetingRequests = [] }) {
  const own = diaryEntries.filter(e => e.owner === forOwner);
  // Meetings — every meeting where this owner is the chair or an attendee shows in their diary
  const mtgs = meetings.filter(m =>
    (m.status === 'upcoming' || m.status === 'completed') &&
    (forOwner === 'Venkata Cherukuri'  // CMD sees all (legacy demo behaviour)
      || m.chair === forOwner
      || (m.attendees || []).includes(forOwner)
      || (m.attendees || []).some(a => typeof a === 'string' && a.toLowerCase().includes(forOwner.toLowerCase().split(' ')[0])))
  ).map(m => meetingToEntry(m, forOwner));
  // Pending meeting requests involving this owner — show as tentative blocks
  const myRequests = meetingRequests.filter(r => r.status === 'pending' && (
    r.from === forOwner || r.to === forOwner || r.routedTo === forOwner || r.onBehalfOf === forOwner
  )).map(r => requestToEntry(r, forOwner));
  // Dedup
  const all = [...own];
  mtgs.forEach(me => { if (!all.find(x => x.id === me.id)) all.push(me); });
  myRequests.forEach(re => { if (!all.find(x => x.id === re.id)) all.push(re); });
  return all;
}

export function entryOnDate(e, dateStr) {
  if (e.endDate) return dateStr >= e.date && dateStr <= e.endDate;
  return e.date === dateStr;
}
export function entriesForDate(entries, dateStr) { return entries.filter(e => entryOnDate(e, dateStr)); }
export function entriesForDateRange(entries, startDate, endDate) {
  const result = {};
  const s = new Date(startDate), e = new Date(endDate);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const k = toISO(d);
    result[k] = entriesForDate(entries, k);
  }
  return result;
}

// VISIBLE_CALS filter used by every calendar view
export function filterVisible(entries, visibleCals) {
  return entries.filter(e => (visibleCals.meetings || e.cat !== 'meeting') && (visibleCals.own || e.cat === 'meeting'));
}

export function computeDateLabel(d, view) {
  if (view === 'day') return DAYS_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  if (view === 'week') {
    const start = startOfWeek(d);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    if (start.getMonth() === end.getMonth()) return start.getDate() + ' – ' + end.getDate() + ' ' + MONTHS[start.getMonth()] + ' ' + start.getFullYear();
    return start.getDate() + ' ' + MONTHS[start.getMonth()] + ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()] + ' ' + start.getFullYear();
  }
  if (view === 'month') return MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear();
  return 'Agenda · from ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}

export const hourLabel = (h) => (h > 12 ? h - 12 : h) + (h >= 12 ? ' PM' : ' AM');

// .diary-event.cat-* colours (tentative has no class in the prototype → base .diary-event look)
export const EVENT_STYLE = {
  meeting:  { bg: tokens.tealSofter, border: tokens.teal, color: tokens.tealDark },
  focus:    { bg: tokens.purpleSoft, border: tokens.purple, color: tokens.purple },
  personal: { bg: tokens.pinkSoft, border: tokens.pink, color: tokens.pink },
  travel:   { bg: tokens.orangeSoft, border: tokens.orange, color: tokens.orange },
  ooo:      { bg: 'rgba(107,107,107,0.12)', border: tokens.slateSoft, color: tokens.slate },
  reminder: { bg: tokens.yellowSoft, border: tokens.yellow, color: tokens.amber },
  tentative:{ bg: tokens.tealSoft, border: tokens.teal, color: tokens.ink },
};
export const eventStyle = (cat) => EVENT_STYLE[cat] || { bg: tokens.tealSoft, border: tokens.teal, color: tokens.ink };

// .agenda-main.cat-* border colours
export const AGENDA_BORDER = {
  meeting: tokens.teal, focus: tokens.purple, personal: tokens.pink, travel: tokens.orange, ooo: tokens.slateSoft, reminder: tokens.yellow,
};

// .entry-detail-head.cat-* gradients (tentative has none in the prototype — orange used so the head is readable)
export const DETAIL_HEAD = {
  meeting:  { bg: `linear-gradient(135deg, ${tokens.tealDark}, ${tokens.teal})`, color: '#fff' },
  focus:    { bg: `linear-gradient(135deg, #5B21B6, ${tokens.purple})`, color: '#fff' },
  personal: { bg: `linear-gradient(135deg, #BE185D, ${tokens.pink})`, color: '#fff' },
  travel:   { bg: `linear-gradient(135deg, #9A3412, ${tokens.orange})`, color: '#fff' },
  ooo:      { bg: `linear-gradient(135deg, #52525B, ${tokens.slate})`, color: '#fff' },
  reminder: { bg: `linear-gradient(135deg, #92400E, ${tokens.yellow})`, color: tokens.greenDeep },
  tentative:{ bg: `linear-gradient(135deg, #9A3412, ${tokens.orange})`, color: '#fff' },
};

// .entry-cat-btn[data-cat=*].selected
export const CAT_BTN_SELECTED = {
  meeting:  { bg: tokens.tealSoft, border: tokens.teal, color: tokens.tealDark },
  focus:    { bg: tokens.purpleSoft, border: tokens.purple, color: tokens.purple },
  personal: { bg: tokens.pinkSoft, border: tokens.pink, color: tokens.pink },
  travel:   { bg: tokens.orangeSoft, border: tokens.orange, color: tokens.orange },
  ooo:      { bg: 'rgba(107,107,107,0.15)', border: tokens.slateSoft, color: tokens.slate },
  reminder: { bg: tokens.yellowSoft, border: tokens.yellow, color: tokens.amber },
  tentative:{ bg: tokens.tealSoft, border: tokens.teal, color: tokens.tealDark },
};

// Inline "EA" badge used in banners / agenda (yellow pill, mono)
export const eaBadgeSx = (size = 10, padding = '1px 6px') => ({
  fontFamily: fonts.mono, bgcolor: tokens.yellow, color: tokens.greenDeep, p: padding, borderRadius: '8px', fontWeight: 700, fontSize: size, letterSpacing: '0.04em', display: 'inline-block', lineHeight: 1.4,
});
