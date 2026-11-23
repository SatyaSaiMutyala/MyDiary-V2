/**
 * A meeting as the screens draw it, and the choices its form offers.
 *
 * The keys are the v2 API's own words (Backend/src/models/Meeting.js), so what the phone sends is
 * what the website stores. The labels are the ones the website prints.
 */

export const meetingTypes = [
  { id: 'internal', label: 'Internal Meeting' },
  { id: 'customer', label: 'Customer Meeting' },
  { id: 'supplier', label: 'Supplier Meeting' },
  { id: 'consultants', label: 'Consultants Meeting' },
  { id: 'board', label: 'Board Meeting' },
  { id: 'other', label: 'Other Meeting' },
];

export const meetingStatuses = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const durations = [
  { id: '30m', label: '30 minutes' },
  { id: '45m', label: '45 minutes' },
  { id: '1h', label: '1 hour' },
  { id: '1h 30m', label: '1 hour 30 minutes' },
  { id: '2h', label: '2 hours' },
  { id: '4h', label: 'Half day' },
  { id: '8h', label: 'Full day' },
];

/**
 * How a meeting is held. `id` is what the website stores (emoji and all, so the two agree); `label`
 * is what the phone prints. The emoji never reaches the screen: AppText pins the Poppins family,
 * which carries no emoji glyphs, so one would draw as an empty box.
 */
export const modes = [
  { id: '📍 In-person', label: 'In-person' },
  { id: '💻 Virtual', label: 'Virtual' },
  { id: '🔀 Hybrid', label: 'Hybrid' },
];

/** How each attendee turned up. */
export const presenceStates = [
  { id: 'tbd', label: 'To be confirmed' },
  { id: 'present', label: 'Present' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
];

/** The pill colour for each status. */
export const statusTone = {
  upcoming: 'teal',
  completed: 'good',
  cancelled: 'critical',
};

export const labelOf = (list, id) => list.find(x => x.id === id)?.label ?? id;

/** '12 Nov 2026 · 10:00' — the one line every card prints for when a meeting is. */
export function whenLabel(m) {
  if (!m?.date) {
    return '';
  }
  const d = new Date(`${m.date}T00:00:00`);
  const day = Number.isNaN(d.getTime())
    ? m.date
    : d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
  return m.time ? `${day} · ${m.time}` : day;
}

/** How many people are expected, counting the ones from outside TrustLab. */
export const attendeeCount = m =>
  (m?.attendees?.length ?? 0) + (m?.external?.length ?? 0);

/**
 * One meeting, flattened for the screens.
 *
 * @typedef {object} Meeting
 * @property {string}  id
 * @property {string}  title
 * @property {'internal'|'customer'|'supplier'|'consultants'|'board'|'other'} type
 * @property {'upcoming'|'completed'|'cancelled'} status
 * @property {string}  date        YYYY-MM-DD
 * @property {string}  time        HH:mm
 * @property {string}  dur         '1h', '30m', …
 * @property {string}  chair       Who runs it.
 * @property {string} [loc]        Where it is.
 * @property {string} [mode]       In-person, Virtual or Hybrid.
 * @property {string[]} attendees  TrustLab colleagues, by name.
 * @property {{ name: string, email?: string, rsvp?: string }[]} external
 * @property {string[]} agenda
 * @property {string[]} agendaTimes
 * @property {Record<string, { disc?: string, dec?: string }>} minutes
 * @property {Record<string, 'tbd'|'present'|'late'|'absent'>} presence
 * @property {string[]} parkingLot
 * @property {{ name: string, opened: boolean }[]} preRead
 * @property {string} [subBadge]   The sub-kind, e.g. 'Ops Review'.
 * @property {string} [clientName]
 * @property {string} [cancelReason]
 * @property {boolean} minutesFinalised
 * @property {{ id: string, desc: string, owner: string, deadline: string, status: string, done: boolean }[]} actions
 *           The action items raised in this meeting.
 */

export {};
