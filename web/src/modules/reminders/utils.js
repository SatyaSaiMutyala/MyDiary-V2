// Reminder helpers — the same wording the v1 mobile app used, so a reminder reads the same
// everywhere. Recipients are names here, as they are throughout v2.
import { TODAY, parseDate, formatDate, todayStr } from '../../utils/dates';

export const STATUS_PILL = {
  scheduled: { bg: 'rgba(37,99,235,0.10)', color: '#2563EB' },
  sent: { bg: 'rgba(15,143,118,0.12)', color: '#0A6B59' },
  cancelled: { bg: 'rgba(107,107,107,0.12)', color: '#6B6B6B' },
};

/** "Today · 16:00", "Tomorrow · 09:30", "Tue 14 Oct · 09:30" */
export function whenLabel(r) {
  if (!r?.date) return '';
  const today = todayStr();
  const tomorrow = new Date(TODAY.getTime() + 86400000).toISOString().slice(0, 10);
  const day = r.date === today ? 'Today' : r.date === tomorrow ? 'Tomorrow' : formatDate(parseDate(r.date));
  return `${day} · ${r.time}`;
}

/** "For you", "For Deepak", "For you and Deepak", "For 4 people" */
export function forLabel(r) {
  const names = (r?.recipients || []).map((p) => p.name);
  if (r?.mine && r?.forMe) {
    const rest = names.filter((n) => n !== r.creator);
    if (!rest.length) return 'For you';
    return rest.length === 1 ? `For you and ${rest[0]}` : `For you and ${rest.length} others`;
  }
  if (names.length <= 2) return `For ${names.join(' and ')}`;
  return `For ${names.length} people`;
}

/** A fresh draft for the New Reminder dialog. */
export const newReminderDraft = () => ({
  id: null,
  title: '',
  note: '',
  date: todayStr(),
  time: '',
  recipients: [],
  remindMe: true,
});

/** An existing reminder as the dialog edits it: whoever set it stands behind "remind me too". */
export const draftFrom = (r, me) => ({
  id: r.id,
  title: r.title,
  note: r.note || '',
  date: r.date,
  time: r.time,
  recipients: (r.recipients || []).map((p) => p.name).filter((n) => n !== me),
  remindMe: r.forMe,
});

/** The body POST / PATCH /api/reminders accepts. */
export const toReminderBody = (d) => ({
  title: (d.title || '').trim(),
  note: (d.note || '').trim(),
  date: d.date,
  time: d.time,
  recipients: [...(d.recipients || [])],
  remindMe: !!d.remindMe,
});

/** What a reminder needs before it can be saved, in the server's own words. */
export function whyNotSavable(d) {
  if (!(d.title || '').trim()) return 'Give the reminder a title.';
  if (!d.date || !d.time) return 'Pick a date and a time.';
  if (!d.remindMe && !(d.recipients || []).length) return 'Choose at least one person to remind, or remind yourself.';
  return '';
}
