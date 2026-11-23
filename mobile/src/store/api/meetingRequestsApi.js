import { baseApi } from './baseApi';

/**
 * Meeting requests — asking a colleague for time.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/meetingRequests.js. A request for the CMD is routed to
 * their EA by the server; the phone does not decide that, it only shows who it ended up with
 * (`routedTo`). `box=inbox` is what is waiting on me, `box=sent` is what I asked for.
 */

const LIST = { type: 'Requests', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const touches = id => [{ type: 'Requests', id }, LIST, 'Meetings', 'Notifications'];

export const meetingRequestsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listRequests: build.query({
      query: params => ({ url: 'meeting-requests', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(x => ({ type: 'Requests', id: x.id }))]
          : [LIST],
    }),
    getRequest: build.query({
      query: id => `meeting-requests/${id}`,
      transformResponse: r => r.request,
      providesTags: (_r, _e, id) => [{ type: 'Requests', id }],
    }),
    createRequest: build.mutation({
      query: body => ({ url: 'meeting-requests', method: 'POST', body }),
      transformResponse: r => r.request,
      invalidatesTags: [LIST, 'Notifications'],
    }),
    /** Accepting creates the meeting; the reply carries it. */
    acceptRequest: build.mutation({
      query: ({ id, note }) => ({
        url: `meeting-requests/${id}/accept`,
        method: 'POST',
        body: clean({ note }),
      }),
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    declineRequest: build.mutation({
      query: ({ id, note }) => ({
        url: `meeting-requests/${id}/decline`,
        method: 'POST',
        body: { note },
      }),
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    /** Offer a different time instead of saying no. */
    counterRequest: build.mutation({
      query: ({ id, proposedDate, proposedTime, note }) => ({
        url: `meeting-requests/${id}/counter`,
        method: 'POST',
        body: clean({ proposedDate, proposedTime, note }),
      }),
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
  }),
});

export const {
  useListRequestsQuery,
  useGetRequestQuery,
  useCreateRequestMutation,
  useAcceptRequestMutation,
  useDeclineRequestMutation,
  useCounterRequestMutation,
} = meetingRequestsApi;
