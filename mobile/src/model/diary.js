/**
 * One calendar line as the screens draw it.
 *
 * My Diary shows two kinds of thing side by side: the person's own diary entries
 * (Backend/src/models/DiaryEntry.js) and the meetings they are part of
 * (Backend/src/models/Meeting.js). Both are turned into this one shape so the day, week and month
 * views do not care which is which.
 */

/**
 * Whether a colleague who was invited has answered.
 * @typedef {'pending'|'accepted'|'declined'|'tentative'} InviteResponse
 */

/**
 * @typedef {object} Attendee
 * @property {string} id
 * @property {string} name
 * @property {InviteResponse} status
 */

/**
 * The kinds of line a day can hold. Drives the colour and the pill on the left.
 * @typedef {'appointment'|'focus'|'reminder'|'event'|'meeting'|'task'} DiaryKind
 */

/**
 * @typedef {object} DiaryLine
 * @property {string}  id
 * @property {string}  date       YYYY-MM-DD
 * @property {string}  time       '09:40', or 'All day'
 * @property {string} [end]
 * @property {DiaryKind} kind
 * @property {string}  title
 * @property {string}  body
 * @property {string}  owner      Who the entry belongs to.
 * @property {boolean} mine       True when it is the signed-in person's own.
 * @property {string} [place]
 * @property {Attendee[]} attendees
 * @property {string} [source]    The module it came from — 'meetings' for a meeting, absent for a
 *                                diary entry. A line with a source is changed where it was made.
 * @property {boolean} canEdit
 * @property {InviteResponse} [invite] My own answer, when a colleague put me on the entry.
 * @property {{ title: string, owner: string, duration: number, notes: string }[]} agenda
 */

/**
 * An invitation waiting for my answer, as the card on Home draws it.
 * Raised when a colleague puts me on their diary entry or meeting.
 *
 * @typedef {object} Invite
 * @property {string} id
 * @property {string} title
 * @property {string} by      Who invited me.
 * @property {string} date    YYYY-MM-DD
 * @property {string} time
 * @property {string} [place]
 * @property {InviteResponse} status
 */

export {};
