import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Action', id: 'LIST' };
const MEETINGS = { type: 'Meeting', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/** An action item belongs to a meeting, so editing one also refreshes that meeting. */
const touches = (id, meetingId) => [LIST, { type: 'Action', id }, MEETINGS, AUDIT, ...(meetingId ? [{ type: 'Meeting', id: meetingId }] : [])];
const unwrap = (r) => r.action;

/**
 * /api/action-items — the source for My To-Do (items are queried across every meeting).
 * `list` params: { page, limit, sort, search, status, priority, owner, ownerType, meetingId,
 * overdue, mine, deadline_from, deadline_to, from, to, dateField, fields }.
 */
export const actionItemsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listActionItems: b.query({
      query: (params) => ({ url: '/action-items', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((a) => ({ type: 'Action', id: a.id }))] : [LIST]),
    }),
    getActionItem: b.query({
      query: (id) => `/action-items/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Action', id }],
    }),
    updateActionItem: b.mutation({
      // `meetingId` is pulled out so it never reaches the body; it is only used for cache invalidation.
      query: ({ id, meetingId: _meetingId, ...body }) => ({ url: `/action-items/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    removeActionItem: b.mutation({
      query: ({ id }) => ({ url: `/action-items/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    addSubtask: b.mutation({
      query: ({ id, text }) => ({ url: `/action-items/${id}/subtasks`, method: 'POST', body: { text } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    setSubtask: b.mutation({
      query: ({ id, index, done }) => ({ url: `/action-items/${id}/subtasks/${index}`, method: 'PATCH', body: { done } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    addComment: b.mutation({
      query: ({ id, text }) => ({ url: `/action-items/${id}/comments`, method: 'POST', body: { text } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    addDependency: b.mutation({
      query: ({ id, dependsOn }) => ({ url: `/action-items/${id}/dependencies`, method: 'POST', body: { dependsOn } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
  }),
});

export const {
  useListActionItemsQuery, useLazyListActionItemsQuery, useGetActionItemQuery,
  useUpdateActionItemMutation, useRemoveActionItemMutation,
  useAddSubtaskMutation, useSetSubtaskMutation, useAddCommentMutation, useAddDependencyMutation,
} = actionItemsApi;
