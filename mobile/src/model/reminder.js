/**
 * A reminder: a note that fires at a chosen minute, for chosen people.
 *
 * Ported from the v1 app (src/reminders/model.ts), with recipients addressed by name rather than
 * by user id — v2 names people everywhere, and the API follows suit.
 */
import { addDays, longDate, realToday, shortDate } from '../utils/dates';

export const statusTone = {
  scheduled: 'info',
  sent: 'good',
  cancelled: 'low',
};

export const boxes = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'sent', label: 'Sent' },
  { id: 'all', label: 'All' },
];

/** "Today · 16:00", "Tomorrow · 09:30", "Tue, 14 Oct · 09:30". */
export const whenLabel = r => {
  if (!r?.date) {
    return '';
  }
  const today = realToday();
  const day =
    r.date === today
      ? 'Today'
      : r.date === addDays(today, 1)
      ? 'Tomorrow'
      : r.date.slice(0, 4) === today.slice(0, 4)
      ? shortDate(r.date)
      : longDate(r.date);
  return `${day} · ${r.time}`;
};

/** "For you", "For Deepak", "For you and Deepak", "For 4 people". */
export const forLabel = r => {
  const names = (r?.recipients ?? []).map(p => p.name);
  if (r?.mine && r?.forMe) {
    const rest = names.filter(n => n !== r.creator);
    if (!rest.length) {
      return 'For you';
    }
    return rest.length === 1
      ? `For you and ${rest[0]}`
      : `For you and ${rest.length} others`;
  }
  if (names.length <= 2) {
    return `For ${names.join(' and ')}`;
  }
  return `For ${names.length} people`;
};

/** The blank reminder a new one starts from. */
export const blankReminder = () => ({
  title: '',
  note: '',
  date: realToday(),
  time: '',
  recipients: [],
  remindMe: true,
});

/** What a reminder must carry before it can be saved. */
export function whyNotSavable(d) {
  if (!(d.title ?? '').trim()) {
    return 'Give the reminder a title.';
  }
  if (!d.date || !d.time) {
    return 'Pick a date and a time.';
  }
  if (!d.remindMe && !(d.recipients ?? []).length) {
    return 'Choose at least one person to remind, or remind yourself.';
  }
  return '';
}
