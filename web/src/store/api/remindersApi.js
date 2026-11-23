import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Reminder', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };

/**
 * /api/reminders — a note that fires at a chosen minute, for chosen people.
 *
 * The server scopes every read to what this person set or will receive, and sends `counts`
 * (upcoming / sent / for me) alongside the page. Only the person who set a reminder can change it,
 * and only before it fires — the payload says so in `mineToEdit`, so the page needs no rule of
 * its own.
 *
 * `list` params: { box: 'upcoming'|'sent'|'all', page, limit, sort, search, status, creator }.
 */
export const remindersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listReminders: b.query({
      query: (params) => ({ url: '/reminders', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((x) => ({ type: 'Reminder', id: x.id }))] : [LIST]),
    }),
    getReminder: b.query({
      query: (id) => `/reminders/${id}`,
      transformResponse: (r) => r.reminder,
      providesTags: (_r, _e, id) => [{ type: 'Reminder', id }],
    }),
    createReminder: b.mutation({
      query: (body) => ({ url: '/reminders', method: 'POST', body }),
      transformResponse: (r) => r.reminder,
      invalidatesTags: [LIST, AUDIT, NOTIFS],
    }),
    updateReminder: b.mutation({
      query: ({ id, ...body }) => ({ url: `/reminders/${id}`, method: 'PATCH', body }),
      transformResponse: (r) => r.reminder,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Reminder', id }, AUDIT, NOTIFS],
    }),
    removeReminder: b.mutation({
      query: (id) => ({ url: `/reminders/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'Reminder', id }, AUDIT, NOTIFS],
    }),
  }),
});

export const {
  useListRemindersQuery,
  useGetReminderQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useRemoveReminderMutation,
} = remindersApi;
