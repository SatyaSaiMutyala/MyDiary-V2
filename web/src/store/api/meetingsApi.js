import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Meeting', id: 'LIST' };
const ACTIONS = { type: 'Action', id: 'LIST' };
const DECISIONS = { type: 'Decision', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/** Everything that changes one meeting refreshes that meeting, the list and the Activity Log. */
const touches = (id, ...extra) => [LIST, { type: 'Meeting', id }, AUDIT, ...extra];
/** POST/PATCH/PUT on /meetings/:id all answer `{ meeting }`. */
const unwrap = (r) => r.meeting;

/**
 * /api/meetings — see Backend/README.md "Meetings".
 * `list` takes every list-contract param: { page, limit, sort, search, type, status, chair, mode,
 * clientCode, organiser, attendee, mine, from, to, dateField, fields }.
 */
export const meetingsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listMeetings: b.query({
      query: (params) => ({ url: '/meetings', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((m) => ({ type: 'Meeting', id: m.id }))] : [LIST]),
    }),
    getMeeting: b.query({
      query: (id) => `/meetings/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Meeting', id }],
    }),
    createMeeting: b.mutation({
      query: (body) => ({ url: '/meetings', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT],
    }),
    updateMeeting: b.mutation({
      query: ({ id, ...body }) => ({ url: `/meetings/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeMeeting: b.mutation({
      query: (id) => ({ url: `/meetings/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id, ACTIONS),
    }),
    setMeetingStatus: b.mutation({
      query: ({ id, status, cancelReason }) => ({ url: `/meetings/${id}/status`, method: 'POST', body: { status, ...(cancelReason ? { cancelReason } : {}) } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    duplicateMeeting: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/duplicate`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT],
    }),

    // ---- minutes ----
    putMinutes: b.mutation({
      query: ({ id, minutes }) => ({ url: `/meetings/${id}/minutes`, method: 'PUT', body: { minutes } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    finaliseMinutes: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/minutes/finalise`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    reopenMinutes: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/minutes/reopen`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    /** Resolves to `{ meeting, recipients: { total, internal, externalWithEmail[], externalWithoutEmail[] } }`. */
    circulateMinutes: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/minutes/circulate`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id, NOTIFS),
    }),

    // ---- attendees, presence, parking lot ----
    patchPresence: b.mutation({
      query: ({ id, name, status }) => ({ url: `/meetings/${id}/presence`, method: 'PATCH', body: { name, status } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    cyclePresence: b.mutation({
      query: ({ id, name }) => ({ url: `/meetings/${id}/presence/cycle`, method: 'POST', body: { name } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addParking: b.mutation({
      query: ({ id, text }) => ({ url: `/meetings/${id}/parking`, method: 'POST', body: { text } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeParking: b.mutation({
      query: ({ id, index }) => ({ url: `/meetings/${id}/parking/${index}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    patchExternal: b.mutation({
      query: ({ id, index, ...body }) => ({ url: `/meetings/${id}/external/${index}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    /** The invitee's own reply — also notifies the chair. */
    rsvp: b.mutation({
      query: ({ id, index, rsvp, note }) => ({ url: `/meetings/${id}/rsvp`, method: 'POST', body: cleanParams({ index, rsvp, note }) }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),

    // ---- live transcription & AI summary ----
    appendTranscript: b.mutation({
      query: ({ id, lines }) => ({ url: `/meetings/${id}/transcript/append`, method: 'POST', body: { lines } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),
    clearTranscript: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/transcript`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, id) => [{ type: 'Meeting', id }],
    }),
    putAiSummary: b.mutation({
      query: ({ id, aiSummary }) => ({ url: `/meetings/${id}/ai-summary`, method: 'PUT', body: { aiSummary } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Meeting', id }],
    }),
    /** Turns the summary's actions into real action items. Resolves to `{ created, count }`. */
    applyAiActions: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/ai-summary/apply-actions`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id, ACTIONS),
    }),
    /** Logs the summary's decisions to the registry. Resolves to `{ created, count }`. */
    logAiDecisions: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/ai-summary/log-decisions`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id, DECISIONS),
    }),

    // ---- things created on a meeting ----
    createActionItem: b.mutation({
      query: ({ id, ...body }) => ({ url: `/meetings/${id}/action-items`, method: 'POST', body }),
      transformResponse: (r) => r.action,
      invalidatesTags: (_r, _e, { id }) => touches(id, ACTIONS, NOTIFS),
    }),
    /** Scans the minutes for commitments. Resolves to `{ created, count }` or `{ count: 0, message }`. */
    extractActions: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/action-items/extract`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => touches(id, ACTIONS),
    }),
    remindOwners: b.mutation({
      query: (id) => ({ url: `/meetings/${id}/remind-owners`, method: 'POST' }),
      invalidatesTags: [AUDIT, NOTIFS],
    }),
    createDecision: b.mutation({
      query: ({ id, ...body }) => ({ url: `/meetings/${id}/decisions`, method: 'POST', body }),
      transformResponse: (r) => r.decision,
      invalidatesTags: (_r, _e, { id }) => touches(id, DECISIONS),
    }),
  }),
});

export const {
  useListMeetingsQuery, useLazyListMeetingsQuery, useGetMeetingQuery,
  useCreateMeetingMutation, useUpdateMeetingMutation, useRemoveMeetingMutation,
  useSetMeetingStatusMutation, useDuplicateMeetingMutation,
  usePutMinutesMutation, useFinaliseMinutesMutation, useReopenMinutesMutation, useCirculateMinutesMutation,
  usePatchPresenceMutation, useCyclePresenceMutation, useAddParkingMutation, useRemoveParkingMutation,
  usePatchExternalMutation, useRsvpMutation,
  useAppendTranscriptMutation, useClearTranscriptMutation, usePutAiSummaryMutation,
  useApplyAiActionsMutation, useLogAiDecisionsMutation,
  useCreateActionItemMutation, useExtractActionsMutation, useRemindOwnersMutation, useCreateDecisionMutation,
} = meetingsApi;
