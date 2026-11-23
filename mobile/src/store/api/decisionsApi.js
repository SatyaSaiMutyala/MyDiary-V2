import { baseApi } from './baseApi';

/**
 * The decisions register — every decision on record, and the meeting it came from.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/decisions.js. Decisions are *created* against a meeting
 * (meetingsApi `createDecision`); this slice reads and removes them.
 */

const LIST = { type: 'Decisions', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

export const decisionsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listDecisions: build.query({
      query: params => ({ url: 'decisions', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(d => ({ type: 'Decision', id: d.id }))]
          : [LIST],
    }),
    getDecision: build.query({
      query: id => `decisions/${id}`,
      transformResponse: r => r.decision,
      providesTags: (_r, _e, id) => [{ type: 'Decision', id }],
    }),
    removeDecision: build.mutation({
      query: id => ({ url: `decisions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Decision', id }, LIST, 'Meetings'],
    }),
  }),
});

export const {
  useListDecisionsQuery,
  useGetDecisionQuery,
  useRemoveDecisionMutation,
} = decisionsApi;
