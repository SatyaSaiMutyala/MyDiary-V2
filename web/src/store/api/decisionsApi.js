import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Decision', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * /api/decisions — the Decisions Registry. Decisions are created on a meeting
 * (`meetingsApi.createDecision`) and read here.
 * `list` params: { page, limit, sort, search, meetingId, department, tag, decidedBy, from, to }.
 */
export const decisionsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listDecisions: b.query({
      query: (params) => ({ url: '/decisions', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((d) => ({ type: 'Decision', id: d.id }))] : [LIST]),
    }),
    getDecision: b.query({
      query: (id) => `/decisions/${id}`,
      transformResponse: (r) => r.decision,
      providesTags: (_r, _e, id) => [{ type: 'Decision', id }],
    }),
    removeDecision: b.mutation({
      query: (id) => ({ url: `/decisions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'Decision', id }, AUDIT],
    }),
  }),
});

export const { useListDecisionsQuery, useGetDecisionQuery, useRemoveDecisionMutation } = decisionsApi;
