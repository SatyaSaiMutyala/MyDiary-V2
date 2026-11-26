import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Request', id: 'LIST' };
const MEETINGS = { type: 'Meeting', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };
const unwrap = (r) => r.request;

/**
 * /api/meeting-requests — peer-to-peer "can we meet?". A request for the CMD from anyone else is
 * routed to the EA by the server (`routedTo` / `onBehalfOf`).
 * `list` params: { page, limit, sort, search, status, routedTo, box: 'inbox'|'sent', from, to }.
 */
export const meetingRequestsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listRequests: b.query({
      query: (params) => ({ url: '/meeting-requests', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((x) => ({ type: 'Request', id: x.id }))] : [LIST]),
    }),
    createRequest: b.mutation({
      query: (body) => ({ url: '/meeting-requests', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, NOTIFS, AUDIT],
    }),
    /** Resolves to `{ request, meeting }` — accepting creates the meeting. */
    acceptRequest: b.mutation({
      query: ({ id, note }) => ({ url: `/meeting-requests/${id}/accept`, method: 'POST', body: cleanParams({ note }) }),
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Request', id }, MEETINGS, NOTIFS, AUDIT],
    }),
    declineRequest: b.mutation({
      query: ({ id, note }) => ({ url: `/meeting-requests/${id}/decline`, method: 'POST', body: { note } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Request', id }, NOTIFS, AUDIT],
    }),
    /** Swaps the two people and puts the request back to pending with the new time. */
    counterRequest: b.mutation({
      query: ({ id, ...body }) => ({ url: `/meeting-requests/${id}/counter`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Request', id }, NOTIFS, AUDIT],
    }),
  }),
});

export const {
  useListRequestsQuery, useLazyListRequestsQuery, useCreateRequestMutation,
  useAcceptRequestMutation, useDeclineRequestMutation, useCounterRequestMutation,
} = meetingRequestsApi;
