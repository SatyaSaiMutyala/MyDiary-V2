import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { serializeMeeting } from '../models/Meeting.js';
import { MeetingRequest, REQUEST_STATUSES, serializeRequest } from '../models/MeetingRequest.js';
import * as requests from '../services/meetingRequests.js';
import { andClause, buildListQuery, extractFlags } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { dateField, text, timeField } from './meetings.js';

export const createSchema = z
  .object({
    to: text('Recipient', 120).min(1, 'Choose who the request is for.'),
    proposedDate: dateField,
    proposedTime: timeField,
    durationMin: z.number({ error: 'durationMin must be a number of minutes.' }).int('durationMin must be whole minutes.').min(5, 'durationMin must be at least 5.').max(480, 'durationMin must be at most 480.').optional(),
    topic: text('Topic', 200).min(1, 'Enter a topic.'),
    notes: text('Notes', 2000).optional(),
  })
  .strict();
export const acceptSchema = z.object({ note: text('Note', 500).optional() }).strict();
export const declineSchema = z.object({ note: text('Note', 500) }).strict();
export const counterSchema = z.object({ proposedDate: dateField, proposedTime: timeField, note: text('Note', 500).optional() }).strict();

/**
 * List contract for GET /api/meeting-requests. `from` / `to` are the date-range params, so the people filters are
 * `requester=` and `recipient=`; `box=inbox|sent` is relative to the signed-in user.
 * @type {import('../utils/listQuery.js').ListSpec}
 */
export const REQUESTS_LIST = {
  searchFields: ['topic', 'notes', 'from', 'to', 'routedTo'],
  filterFields: { status: 'enum', requester: 'string', recipient: 'string', routedTo: 'string', meetingId: 'id' },
  filterPaths: { requester: 'from', recipient: 'to' },
  enums: { status: REQUEST_STATUSES },
  dateFields: ['proposedDate', 'createdAt'],
  defaultDateField: 'proposedDate',
  stringDateFields: ['proposedDate'],
  sortFields: ['proposedDate', 'proposedTime', 'createdAt', 'status', 'from', 'to', 'respondedAt'],
  defaultSort: '-createdAt',
  fields: ['from', 'to', 'onBehalfOf', 'routedTo', 'proposedDate', 'proposedTime', 'durationMin', 'topic', 'notes', 'status', 'createdAt', 'respondedAt', 'responseNote', 'meetingId', 'history', 'updatedAt'],
};

/** GET /api/meeting-requests @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  const me = currentUser(req);
  const { query, flags } = extractFlags(req.query, { box: ['inbox', 'sent'] });
  const lq = buildListQuery(query, REQUESTS_LIST);
  if (flags.box === 'inbox') andClause(lq, requests.inboxClause(me.name), 'box', 'inbox');
  if (flags.box === 'sent') andClause(lq, requests.sentClause(me.name), 'box', 'sent');
  res.json(await runList(MeetingRequest, lq, serializeRequest));
};

/** POST /api/meeting-requests @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const me = currentUser(req);
  const r = await requests.createRequest(req.body, me);
  res.locals.audit = {
    entity: r.topic,
    entityId: r._id.toString(),
    details: `Requested ${r.durationMin} min with ${r.to} on ${r.proposedDate} ${r.proposedTime}${r.routedTo ? ` · routed to ${r.routedTo} (EA) on behalf of ${r.onBehalfOf}` : ''}`,
  };
  res.status(201).json({ request: serializeRequest(r) });
};

/** GET /api/meeting-requests/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ request: serializeRequest(await requests.findRequestOr404(req.params.id)) });
};

/** POST /api/meeting-requests/:id/accept { note? } → creates the meeting. @type {import('express').RequestHandler} */
export const accept = async (req, res) => {
  const me = currentUser(req);
  const r = await requests.findRequestOr404(req.params.id);
  const meeting = await requests.acceptRequest(r, me, req.body.note ?? '');
  res.locals.audit = { action: 'update', entity: r.topic, entityId: r._id.toString(), details: `Accepted request from ${r.from} · meeting scheduled ${meeting.date} ${meeting.time}${r.responseNote ? ` · note: "${r.responseNote}"` : ''}` };
  res.json({ request: serializeRequest(r), meeting: serializeMeeting(meeting, []) });
};

/** POST /api/meeting-requests/:id/decline { note } @type {import('express').RequestHandler} */
export const decline = async (req, res) => {
  const me = currentUser(req);
  const r = await requests.declineRequest(await requests.findRequestOr404(req.params.id), me, req.body.note);
  res.locals.audit = { action: 'update', entity: r.topic, entityId: r._id.toString(), details: `Declined request from ${r.from}${r.responseNote ? ` · reason: "${r.responseNote}"` : ''}` };
  res.json({ request: serializeRequest(r) });
};

/** POST /api/meeting-requests/:id/counter { proposedDate, proposedTime, note? } @type {import('express').RequestHandler} */
export const counter = async (req, res) => {
  const me = currentUser(req);
  const { request: r, origFrom } = await requests.counterRequest(await requests.findRequestOr404(req.params.id), me, req.body);
  res.locals.audit = { action: 'update', entity: r.topic, entityId: r._id.toString(), details: `Counter-proposed ${r.proposedDate} ${r.proposedTime} to ${origFrom}${r.responseNote ? ` · "${r.responseNote}"` : ''}` };
  res.json({ request: serializeRequest(r) });
};
