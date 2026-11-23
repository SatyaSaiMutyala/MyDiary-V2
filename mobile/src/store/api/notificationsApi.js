import { baseApi } from './baseApi';

/**
 * In-app notifications — what is waiting for this person.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/notifications.js. The list is already scoped to the
 * signed-in person by the server, so the phone never asks "whose".
 */

const LIST = { type: 'Notifications', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listNotifications: build.query({
      query: params => ({ url: 'notifications', params: clean(params) }),
      providesTags: [LIST],
    }),
    markNotificationRead: build.mutation({
      query: id => ({ url: `notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [LIST],
    }),
    readAllNotifications: build.mutation({
      query: () => ({ url: 'notifications/read-all', method: 'POST' }),
      invalidatesTags: [LIST],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useReadAllNotificationsMutation,
} = notificationsApi;
