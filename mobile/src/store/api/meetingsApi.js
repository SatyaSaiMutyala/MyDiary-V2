import { baseApi } from './baseApi';

/**
 * Meetings, and the action items and decisions they raise.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/meetings.js. Lists follow the shared contract — `page`,
 * `limit`, a global `search`, every filter as its own parameter — so what the phone asks for is
 * what the website asks for.
 */

const LIST = { type: 'Meetings', id: 'LIST' };
const ACTIONS = { type: 'Actions', id: 'LIST' };

/** Drops empty values so the URL carries only what was actually asked for. */
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

/** Everything a write to one meeting can affect. */
const touches = (id, ...extra) => [
  { type: 'Meeting', id },
  LIST,
  ACTIONS,
  'Dashboard',
  ...extra,
];

const unwrapMeeting = r => r.meeting;

export const meetingsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    // ---------------------------------------------------------------- meetings
    listMeetings: build.query({
      query: params => ({ url: 'meetings', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(m => ({ type: 'Meeting', id: m.id }))]
          : [LIST],
    }),
    getMeeting: build.query({
      query: id => `meetings/${id}`,
      transformResponse: unwrapMeeting,
      providesTags: (_r, _e, id) => [{ type: 'Meeting', id }],
    }),
    createMeeting: build.mutation({
      query: body => ({ url: 'meetings', method: 'POST', body }),
      transformResponse: unwrapMeeting,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    updateMeeting: build.mutation({
      query: ({ id, ...body }) => ({
        url: `meetings/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeMeeting: build.mutation({
      query: id => ({ url: `meetings/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    setMeetingStatus: build.mutation({
      query: ({ id, status, cancelReason }) => ({
        url: `meetings/${id}/status`,
        method: 'POST',
        body: clean({ status, cancelReason }),
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---------------------------------------------------------------- minutes
    putMinutes: build.mutation({
      query: ({ id, minutes }) => ({
        url: `meetings/${id}/minutes`,
        method: 'PUT',
        body: { minutes },
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    finaliseMinutes: build.mutation({
      query: id => ({ url: `meetings/${id}/minutes/finalise`, method: 'POST' }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    reopenMinutes: build.mutation({
      query: id => ({ url: `meetings/${id}/minutes/reopen`, method: 'POST' }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    circulateMinutes: build.mutation({
      query: id => ({ url: `meetings/${id}/minutes/circulate`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id, 'Notifications'),
    }),

    // ---------------------------------------------------------------- the room
    cyclePresence: build.mutation({
      query: ({ id, name }) => ({
        url: `meetings/${id}/presence/cycle`,
        method: 'POST',
        body: { name },
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),
    setPresence: build.mutation({
      query: ({ id, name, status }) => ({
        url: `meetings/${id}/presence`,
        method: 'PATCH',
        body: { name, status },
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),
    addParking: build.mutation({
      query: ({ id, text }) => ({
        url: `meetings/${id}/parking`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),
    removeParking: build.mutation({
      query: ({ id, index }) => ({
        url: `meetings/${id}/parking/${index}`,
        method: 'DELETE',
      }),
      transformResponse: unwrapMeeting,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),

    // ---------------------------------------------------------------- what came out of it
    createActionItem: build.mutation({
      query: ({ id, ...body }) => ({
        url: `meetings/${id}/action-items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => touches(id, 'Notifications'),
    }),
    extractActions: build.mutation({
      query: id => ({ url: `meetings/${id}/action-items/extract`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    remindOwners: build.mutation({
      query: id => ({ url: `meetings/${id}/remind-owners`, method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    createDecision: build.mutation({
      query: ({ id, ...body }) => ({
        url: `meetings/${id}/decisions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => touches(id, 'Decisions'),
    }),
  }),
});

export const {
  useListMeetingsQuery,
  useGetMeetingQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useRemoveMeetingMutation,
  useSetMeetingStatusMutation,
  usePutMinutesMutation,
  useFinaliseMinutesMutation,
  useReopenMinutesMutation,
  useCirculateMinutesMutation,
  useCyclePresenceMutation,
  useSetPresenceMutation,
  useAddParkingMutation,
  useRemoveParkingMutation,
  useCreateActionItemMutation,
  useExtractActionsMutation,
  useRemindOwnersMutation,
  useCreateDecisionMutation,
} = meetingsApi;
