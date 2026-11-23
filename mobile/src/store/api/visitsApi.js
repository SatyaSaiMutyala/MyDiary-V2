import { baseApi } from './baseApi';

/**
 * My Visit Observations — the report itself, plus the parts the detail screen edits in place.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/visits.js. Observations and follow-up actions are addressed
 * by their position in the list, not by an id — that is the server's contract, so the index a
 * screen sends must be the index in `visit.observations` / `visit.actionItems`.
 *
 * Submitting is its own endpoint (`/status`), because the server does more than set a word: it
 * stamps `submittedAt`, writes the Activity Log line and notifies the follow-up owners.
 */

const LIST = { type: 'Visits', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const unwrap = r => r.visit;
const touches = id => [{ type: 'Visit', id }, LIST, 'Dashboard'];

/** The index travels in the URL, never in the body — the API is strict about unknown fields. */
const strip = ({ index: _i, ...body }) => body;

const write = (build, path, method = 'POST') =>
  build.mutation({
    query: ({ id, ...body }) => ({
      url: `visits/${id}/${path(body)}`,
      method,
      ...(method === 'DELETE' ? null : { body: strip(body) }),
    }),
    transformResponse: unwrap,
    invalidatesTags: (_r, _e, { id }) => touches(id),
  });

export const visitsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listVisits: build.query({
      query: params => ({ url: 'visits', params: clean(params) }),
      providesTags: r =>
        r ? [LIST, ...r.items.map(v => ({ type: 'Visit', id: v.id }))] : [LIST],
    }),
    getVisit: build.query({
      query: id => `visits/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Visit', id }],
    }),
    createVisit: build.mutation({
      query: body => ({ url: 'visits', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    updateVisit: build.mutation({
      query: ({ id, ...body }) => ({
        url: `visits/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeVisit: build.mutation({
      query: id => ({ url: `visits/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    /** Draft ⇄ submitted. The server stamps the time and notifies the action owners. */
    setVisitStatus: build.mutation({
      query: ({ id, status }) => ({
        url: `visits/${id}/status`,
        method: 'POST',
        body: { status },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [...touches(id), 'Actions'],
    }),

    addObservation: write(build, () => 'observations'),
    updateObservation: write(build, b => `observations/${b.index}`, 'PATCH'),
    removeObservation: write(build, b => `observations/${b.index}`, 'DELETE'),

    addVisitAction: write(build, () => 'action-items'),
    updateVisitAction: write(build, b => `action-items/${b.index}`, 'PATCH'),
    removeVisitAction: write(build, b => `action-items/${b.index}`, 'DELETE'),
  }),
});

export const {
  useListVisitsQuery,
  useGetVisitQuery,
  useCreateVisitMutation,
  useUpdateVisitMutation,
  useRemoveVisitMutation,
  useSetVisitStatusMutation,
  useAddObservationMutation,
  useUpdateObservationMutation,
  useRemoveObservationMutation,
  useAddVisitActionMutation,
  useUpdateVisitActionMutation,
  useRemoveVisitActionMutation,
} = visitsApi;
