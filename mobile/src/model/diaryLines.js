import { whenLabel } from './meeting';

/**
 * Turning what the API returns into the one shape the calendar draws.
 *
 * My Diary shows two different records side by side — the person's own diary entries and the
 * meetings they are part of. Rather than make every view handle both, both are mapped to a
 * `DiaryLine` here (see model/diary.js), so a day is just a list.
 */

export const DIARY_CATS = [
  { id: 'meeting', label: 'Meeting' },
  { id: 'focus', label: 'Focus time' },
  { id: 'personal', label: 'Personal' },
  { id: 'travel', label: 'Travel' },
  { id: 'ooo', label: 'Out of office' },
  { id: 'reminder', label: 'Reminder' },
];

export const REMINDERS = [
  { id: 'None', label: 'No reminder' },
  { id: '15 min before', label: '15 minutes before' },
  { id: '30 min before', label: '30 minutes before' },
  { id: '1 hour before', label: '1 hour before' },
  { id: '1 day before', label: '1 day before' },
];

/** The entry category a DiaryItem's colour comes from. */
const KIND_OF = {
  meeting: 'meeting',
  focus: 'focus',
  personal: 'appointment',
  travel: 'event',
  ooo: 'event',
  reminder: 'reminder',
};

/** One of my diary entries, as a calendar line. */
export const entryToLine = (e, me) => ({
  id: e.id,
  date: e.date,
  time: e.allDay ? 'All day' : e.startTime || '',
  end: e.endTime || undefined,
  kind: KIND_OF[e.cat] ?? 'appointment',
  title: e.title,
  body: e.notes ?? '',
  owner: e.owner,
  mine: !me || e.owner === me,
  place: e.loc || undefined,
  attendees: (e.attendees ?? []).map((name, i) => ({
    id: `${e.id}-${i}`,
    name,
    status: 'pending',
  })),
  canEdit: true,
  agenda: [],
  // Kept so the detail screen can show the rest without fetching again.
  entry: e,
});

/** A meeting I am part of, as a calendar line. It is changed on the meeting screen, not here. */
export const meetingToLine = (m, me) => ({
  id: `meeting:${m.id}`,
  meetingId: m.id,
  date: m.date,
  time: m.time || '',
  kind: 'meeting',
  title: m.title,
  body: m.subBadge || whenLabel(m),
  owner: m.chair,
  mine: !me || m.chair === me,
  place: m.loc || undefined,
  attendees: (m.attendees ?? []).map((name, i) => ({
    id: `${m.id}-${i}`,
    name,
    status: 'pending',
  })),
  source: 'meetings',
  canEdit: false,
  agenda: [],
});

/** Earliest first; all-day entries lead the day. */
export const byTime = (a, b) => {
  const at = a.time === 'All day' ? '' : a.time;
  const bt = b.time === 'All day' ? '' : b.time;
  return at.localeCompare(bt);
};

/** How many lines fall on each day — the dots under the month grid. */
export function countsByDay(lines) {
  const out = {};
  for (const l of lines) {
    out[l.date] = (out[l.date] ?? 0) + 1;
  }
  return out;
}
