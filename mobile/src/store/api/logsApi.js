import { baseApi } from './baseApi';

/**
 * My Discussion Logs — the informal record, and the two groupings the screens read it through.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/logs.js. Every read goes out with `mine=true`: a log
 * belongs to whoever wrote it and is private by default, so the server scopes the list and the
 * phone never asks whose.
 *
 * `/people` and `/followups` are the server's own groupings — one row per person spoken with, one
 * row per follow-up — so the phone never has to fold the list itself and can never disagree with
 * the website about the counts.
 */

const LIST = { type: 'Logs', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const unwrap = r => r.log;
const touches = id => [{ type: 'Log', id }, LIST, 'Dashboard'];

/** The follow-up id travels in the URL, never in the body — the API refuses unknown fields. */
const strip = ({ fuId: _f, ...body }) => body;

const write = (build, path, method = 'POST') =>
  build.mutation({
    query: ({ id, ...body }) => ({
      url: `logs/${id}/${path(body)}`,
      method,
      ...(method === 'DELETE' ? null : { body: strip(body) }),
    }),
    transformResponse: unwrap,
    invalidatesTags: (_r, _e, { id }) => touches(id),
  });

export const logsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listLogs: build.query({
      query: params => ({ url: 'logs', params: clean(params) }),
      providesTags: r =>
        r ? [LIST, ...r.items.map(l => ({ type: 'Log', id: l.id }))] : [LIST],
    }),
    getLog: build.query({
      query: id => `logs/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Log', id }],
    }),
    /** One row per person spoken with, with when they were last spoken to. */
    listLogPeople: build.query({
      query: params => ({ url: 'logs/people', params: clean(params) }),
      providesTags: [LIST],
    }),
    /** Every follow-up across every log, with open / overdue / done counts. */
    listLogFollowUps: build.query({
      query: params => ({ url: 'logs/followups', params: clean(params) }),
      providesTags: [LIST],
    }),
    listLogTags: build.query({
      query: params => ({ url: 'logs/tags', params: clean(params) }),
      providesTags: [LIST],
    }),
    createLog: build.mutation({
      query: body => ({ url: 'logs', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    updateLog: build.mutation({
      query: ({ id, ...body }) => ({ url: `logs/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeLog: build.mutation({
      query: id => ({ url: `logs/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),

    addFollowUp: write(build, () => 'followups'),
    updateFollowUp: write(build, b => `followups/${b.fuId}`, 'PATCH'),
    removeFollowUp: write(build, b => `followups/${b.fuId}`, 'DELETE'),
    /** Flip one follow-up done ⇄ open without having to know which way round it is. */
    toggleFollowUp: build.mutation({
      query: ({ id, fuId }) => ({
        url: `logs/${id}/followups/${fuId}/toggle`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
  }),
});

export const {
  useListLogsQuery,
  useGetLogQuery,
  useListLogPeopleQuery,
  useListLogFollowUpsQuery,
  useListLogTagsQuery,
  useCreateLogMutation,
  useUpdateLogMutation,
  useRemoveLogMutation,
  useAddFollowUpMutation,
  useUpdateFollowUpMutation,
  useRemoveFollowUpMutation,
  useToggleFollowUpMutation,
} = logsApi;
