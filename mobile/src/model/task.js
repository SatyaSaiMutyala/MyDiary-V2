/**
 * One line in My To-Do, as the screens draw it.
 *
 * The v2 API calls these "action items" (Backend/src/models/ActionItem.js): a commitment made in a
 * meeting, on a visit, or typed in on its own. The shape below is what the row components want —
 * the deadline already turned into the words to print, and the flags worked out once here rather
 * than in every screen.
 *
 * @typedef {object} Task
 * @property {string}  id
 * @property {string}  title        What was committed to.
 * @property {string} [description]
 * @property {string}  owner        The person who owes it.
 * @property {'low'|'medium'|'high'|'critical'} priority
 * @property {'open'|'in-progress'|'blocked'|'done'|'deviation'} status
 * @property {boolean} done
 * @property {string}  due          What to print, e.g. "17:30", "Fri, 2 Oct", "3 days late".
 * @property {string} [dueDate]     The raw deadline, YYYY-MM-DD.
 * @property {boolean} overdue
 * @property {boolean} hard         A deadline that cannot move — shown with the red clock.
 * @property {string} [from]        Where it came from: the meeting title, the visit, or 'Standalone'.
 * @property {string} [area]        The department or area it belongs to.
 * @property {string} [escalatedTo] Who it was passed to, when it was escalated.
 * @property {{ by: string, on: string, action: string, reason?: string, note?: string, expectedBy?: string }} [escalation]
 * @property {{ by: string, on: string, action: string, note?: string }} [returned]
 *           Set when a task you escalated came back to you.
 * @property {string} [repeat]      Short label of how it repeats, e.g. 'Weekly'.
 * @property {{ name: string, uri?: string }[]} attachments
 * @property {boolean} canEdit
 * @property {boolean} canDelete
 */

/**
 * The three lists the To-Do screen splits work into.
 * @typedef {'mine'|'delegated'|'done'} TaskBox
 */

export {};
