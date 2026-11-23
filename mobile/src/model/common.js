// Shared shapes every v2 module uses. The web app's API returns these exact words
// (see MyDiary-V2/Backend/src/models), so the phone speaks the same language as the website.

/**
 * How urgent a piece of work is.
 * @typedef {'low'|'medium'|'high'|'critical'} Priority
 */
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Where a task, action item or checklist line has got to.
 * 'deviation' is a line that was done, but not as it should have been — it carries a note.
 * @typedef {'open'|'in-progress'|'blocked'|'done'|'deviation'} ItemStatus
 */
export const ITEM_STATUSES = [
  'open',
  'in-progress',
  'blocked',
  'done',
  'deviation',
];

/**
 * The kinds of meeting the web app offers.
 * @typedef {'internal'|'customer'|'supplier'|'consultants'|'board'|'other'} MeetingType
 */
export const MEETING_TYPES = [
  'internal',
  'customer',
  'supplier',
  'consultants',
  'board',
  'other',
];

/**
 * A person, as every picker and avatar needs them.
 * @typedef {object} Person
 * @property {string} id
 * @property {string} name
 * @property {string} [title]
 * @property {string} [department]
 */

/**
 * The one page shape every list endpoint returns (Backend/src/utils/paginate.js).
 * @typedef {object} Page
 * @property {any[]}   items
 * @property {number}  page
 * @property {number}  limit
 * @property {number}  total
 * @property {number}  pages
 * @property {boolean} hasMore
 */

export {};
