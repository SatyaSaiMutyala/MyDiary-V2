/**
 * A discussion log — the informal stuff: a phone call, a corridor chat, a WhatsApp exchange.
 *
 * Keys are the v2 API's own words (Backend/src/models/DiscussionLog.js). A log belongs to the
 * person who wrote it and is private unless they share it, which is why every read goes out with
 * `mine=true`.
 */
import { realToday } from '../utils/dates';

export const channels = [
  { id: 'phone', label: 'Phone' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'in-person', label: 'In-person' },
  { id: 'video', label: 'Video' },
  { id: 'email', label: 'Email' },
  { id: 'chat', label: 'Chat' },
  { id: 'sms', label: 'SMS' },
];

export const personTypes = [
  { id: 'internal', label: 'TrustLab' },
  { id: 'external', label: 'Outside' },
];

export const privacies = [
  { id: 'private', label: 'Private — only me' },
  { id: 'shared', label: 'Shared' },
];

const labelFrom = (list, id) => list.find(x => x.id === id)?.label ?? id ?? '';

export const channelLabel = id => labelFrom(channels, id);
export const privacyLabel = id => labelFrom(privacies, id);

/** Follow-up state, decided the same way the server decides it. */
export const followUpTone = { open: 'teal', overdue: 'critical', done: 'good' };
export const followUpLabel = { open: 'Open', overdue: 'Overdue', done: 'Done' };

/** Who a log was with, in one line. */
export const withLine = l => (l?.with ?? []).map(p => p.name).join(', ');

export const openFollowUps = l => (l?.followUps ?? []).filter(f => !f.done).length;

/** "Today" · "Yesterday" · "3 days ago" · the date itself, as the website's day headings read. */
export function relativeDay(iso) {
  if (!iso) {
    return '';
  }
  const days = Math.round(
    (new Date(`${realToday()}T00:00:00`) - new Date(`${iso}T00:00:00`)) /
      86400000,
  );
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days > 1 && days <= 7) {
    return `${days} days ago`;
  }
  return '';
}

/** Newest first, then grouped under one heading per day — the website's groupLogsByDay(). */
export function groupByDay(logs) {
  const sorted = [...logs].sort((a, b) =>
    `${b.date}${b.time ?? ''}`.localeCompare(`${a.date}${a.time ?? ''}`),
  );
  const days = [];
  sorted.forEach(l => {
    const last = days[days.length - 1];
    if (last && last.date === l.date) {
      last.items.push(l);
    } else {
      days.push({ date: l.date, items: [l] });
    }
  });
  return days;
}

/** The blank log a new one starts from. */
export const blankLog = () => {
  const now = new Date();
  return {
    channel: 'phone',
    date: realToday(),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    duration: '',
    with: [],
    topic: '',
    summary: '',
    decisions: '',
    tags: [],
    followUps: [],
    privacy: 'private',
  };
};

/**
 * The draft as POST / PATCH /logs wants it.
 *
 * A follow-up with no text is dropped, as the website drops it, and the blank-able fields go out as
 * '' rather than being left off — the API accepts an empty time, duration, deadline and decisions.
 */
export function logBody(d) {
  return {
    date: d.date,
    time: d.time ?? '',
    duration: (d.duration ?? '').trim(),
    channel: d.channel,
    with: (d.with ?? []).map(p => ({
      name: p.name,
      type: p.type || 'internal',
      email: p.email ?? '',
    })),
    topic: (d.topic ?? '').trim(),
    summary: (d.summary ?? '').trim(),
    decisions: (d.decisions ?? '').trim(),
    tags: [...(d.tags ?? [])],
    followUps: (d.followUps ?? [])
      .filter(f => (f.text ?? '').trim())
      .map(f => ({
        text: f.text.trim(),
        owner: (f.owner ?? '').trim(),
        ownerType: f.ownerType || 'internal',
        deadline: f.deadline ?? '',
        done: Boolean(f.done),
      })),
    privacy: d.privacy || 'private',
  };
}

/** What a log must carry before it can be saved, in the website's own words and order. */
export function whyNotSavable(d) {
  if (!(d.topic ?? '').trim()) {
    return 'Please enter a topic (short title for the log).';
  }
  if (!(d.with ?? []).length) {
    return 'Please add at least one person you spoke with.';
  }
  if (!(d.summary ?? '').trim()) {
    return 'Please capture what was discussed.';
  }
  return '';
}
