import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Notification', id: 'LIST' };

/**
 * /api/notifications — the signed-in person's own bell list. The list answer carries `unreadTotal`
 * alongside the usual list-contract fields.
 * `list` params: { page, limit, sort, search, unread, type, from, to }.
 */
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listNotifications: b.query({
      query: (params) => ({ url: '/notifications', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((n) => ({ type: 'Notification', id: n.id }))] : [LIST]),
    }),
    markNotificationRead: b.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      transformResponse: (r) => r.notification,
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'Notification', id }],
    }),
    readAllNotifications: b.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: [LIST],
    }),
  }),
});

export const { useListNotificationsQuery, useMarkNotificationReadMutation, useReadAllNotificationsMutation } = notificationsApi;
