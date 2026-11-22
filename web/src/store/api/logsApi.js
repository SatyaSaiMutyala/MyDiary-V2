import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Log', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * Anything that changes a log refreshes that log and every list built on it — the day list, the people
 * grid, the tag filter and the follow-up feed all come from the same `Log` tag.
 */
const touches = (id) => [LIST, { type: 'Log', id }, AUDIT, NOTIFS];
/** Every log endpoint answers `{ log }` (the follow-up ones add `{ followUp }`). */
const unwrap = (r) => r.log;

/**
 * /api/logs — My Discussion Logs.
 *
 * `listLogs` takes every list-contract param: { page, limit, sort, search, channel, person, personType,
 * tag, topic, owner, privacy, followUpStatus, hasFollowUps, mine, from, to, dateField, fields }.
 * `logPeople` (one row per person), `logTags` (the tags in use) and `logFollowUps` (one row per
 * follow-up, with `counts`) take the same filters — the grouping happens on the server so the browser
 * never has to page through every log to draw them.
 */
export const logsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listLogs: b.query({
      query: (params) => ({ url: '/logs', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((l) => ({ type: 'Log', id: l.id }))] : [LIST]),
    }),
    logPeople: b.query({
      query: (params) => ({ url: '/logs/people', params: cleanParams(params) }),
      providesTags: [LIST],
    }),
    logTags: b.query({
      query: (params) => ({ url: '/logs/tags', params: cleanParams(params) }),
      providesTags: [LIST],
    }),
    logFollowUps: b.query({
      query: (params) => ({ url: '/logs/followups', params: cleanParams(params) }),
      providesTags: [LIST],
    }),
    getLog: b.query({
      query: (id) => `/logs/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Log', id }],
    }),
    createLog: b.mutation({
      query: (body) => ({ url: '/logs', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT, NOTIFS],
    }),
    updateLog: b.mutation({
      query: ({ id, ...body }) => ({ url: `/logs/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeLog: b.mutation({
      query: (id) => ({ url: `/logs/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),

    // ---- follow-ups of one log ----
    addLogFollowUp: b.mutation({
      query: ({ id, ...body }) => ({ url: `/logs/${id}/followups`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateLogFollowUp: b.mutation({
      query: ({ id, fuId, ...body }) => ({ url: `/logs/${id}/followups/${fuId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    setLogFollowUpDone: b.mutation({
      query: ({ id, fuId, done }) => ({ url: `/logs/${id}/followups/${fuId}/status`, method: 'POST', body: { done } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    toggleLogFollowUp: b.mutation({
      query: ({ id, fuId }) => ({ url: `/logs/${id}/followups/${fuId}/toggle`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeLogFollowUp: b.mutation({
      query: ({ id, fuId }) => ({ url: `/logs/${id}/followups/${fuId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
  }),
});

export const {
  useListLogsQuery, useLogPeopleQuery, useLogTagsQuery, useLogFollowUpsQuery, useGetLogQuery,
  useCreateLogMutation, useUpdateLogMutation, useRemoveLogMutation,
  useAddLogFollowUpMutation, useUpdateLogFollowUpMutation, useSetLogFollowUpDoneMutation,
  useToggleLogFollowUpMutation, useRemoveLogFollowUpMutation,
} = logsApi;
