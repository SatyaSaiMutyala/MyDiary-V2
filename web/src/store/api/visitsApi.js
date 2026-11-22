import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Visit', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };
const NOTIFICATIONS = { type: 'Notification', id: 'LIST' };

/** Every write touches the one visit, the list and the Activity Log; submitting also raises notifications. */
const touches = (id) => [LIST, { type: 'Visit', id }, AUDIT, NOTIFICATIONS];
const unwrap = (r) => r.visit;

/**
 * /api/visits — My Visit Observations.
 *
 * `list` params (the shared list contract): { page, limit, sort, search, status, type, owner, site, city,
 * overallAssessment, severity, followUpRequired, tag, category, mine, from, to, dateField,
 * date_from, date_to, nextVisitDate_from, …, min_photos, max_photos, fields }.
 * `severity=` is the overall assessment (excellent … unsatisfactory); `site=` is a contains match on the
 * organisation or branch visited.
 */
export const visitsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listVisits: b.query({
      query: (params) => ({ url: '/visits', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((v) => ({ type: 'Visit', id: v.id }))] : [LIST]),
    }),
    getVisit: b.query({
      query: (id) => `/visits/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Visit', id }],
    }),
    createVisit: b.mutation({
      query: (body) => ({ url: '/visits', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT, NOTIFICATIONS],
    }),
    updateVisit: b.mutation({
      query: ({ id, ...body }) => ({ url: `/visits/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeVisit: b.mutation({
      query: (id) => ({ url: `/visits/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    /** draft ⇄ submitted. Submitting refuses an incomplete report with the message the web app shows as-is. */
    setVisitStatus: b.mutation({
      query: ({ id, status }) => ({ url: `/visits/${id}/status`, method: 'POST', body: { status } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addVisitObservation: b.mutation({
      query: ({ id, ...body }) => ({ url: `/visits/${id}/observations`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateVisitObservation: b.mutation({
      query: ({ id, index, ...body }) => ({ url: `/visits/${id}/observations/${index}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeVisitObservation: b.mutation({
      query: ({ id, index }) => ({ url: `/visits/${id}/observations/${index}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addVisitAction: b.mutation({
      query: ({ id, ...body }) => ({ url: `/visits/${id}/action-items`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateVisitAction: b.mutation({
      query: ({ id, index, ...body }) => ({ url: `/visits/${id}/action-items/${index}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeVisitAction: b.mutation({
      query: ({ id, index }) => ({ url: `/visits/${id}/action-items/${index}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
  }),
});

export const {
  useListVisitsQuery, useLazyListVisitsQuery, useGetVisitQuery,
  useCreateVisitMutation, useUpdateVisitMutation, useRemoveVisitMutation, useSetVisitStatusMutation,
  useAddVisitObservationMutation, useUpdateVisitObservationMutation, useRemoveVisitObservationMutation,
  useAddVisitActionMutation, useUpdateVisitActionMutation, useRemoveVisitActionMutation,
} = visitsApi;
