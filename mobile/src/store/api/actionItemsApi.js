import { baseApi } from './baseApi';

/**
 * Action items — what people committed to, wherever it was committed.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/actionItems.js. They are created against a meeting
 * (see meetingsApi `createActionItem`); everything after that happens here.
 */

const LIST = { type: 'Actions', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

/** A write to one action also changes its meeting's open count and the dashboard. */
const touches = (id, meetingId) => [
  { type: 'Action', id },
  LIST,
  'Dashboard',
  ...(meetingId ? [{ type: 'Meeting', id: meetingId }] : []),
];

const unwrap = r => r.action;

export const actionItemsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listActionItems: build.query({
      query: params => ({ url: 'action-items', params: clean(params) }),
      providesTags: r =>
        r ? [LIST, ...r.items.map(a => ({ type: 'Action', id: a.id }))] : [LIST],
    }),
    getActionItem: build.query({
      query: id => `action-items/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Action', id }],
    }),
    updateActionItem: build.mutation({
      query: ({ id, meetingId, ...body }) => ({
        url: `action-items/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    removeActionItem: build.mutation({
      query: ({ id }) => ({ url: `action-items/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    addSubtask: build.mutation({
      query: ({ id, text }) => ({
        url: `action-items/${id}/subtasks`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    setSubtask: build.mutation({
      query: ({ id, index, done }) => ({
        url: `action-items/${id}/subtasks/${index}`,
        method: 'PATCH',
        body: { done },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
    addComment: build.mutation({
      query: ({ id, text }) => ({
        url: `action-items/${id}/comments`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id, meetingId }) => touches(id, meetingId),
    }),
  }),
});

export const {
  useListActionItemsQuery,
  useGetActionItemQuery,
  useUpdateActionItemMutation,
  useRemoveActionItemMutation,
  useAddSubtaskMutation,
  useSetSubtaskMutation,
  useAddCommentMutation,
} = actionItemsApi;
