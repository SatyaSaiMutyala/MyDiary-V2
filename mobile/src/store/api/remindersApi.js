import { baseApi } from './baseApi';

/**
 * Reminders — a note that fires at a chosen minute, for chosen people.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/reminders.js. The server scopes every read to what this
 * person set or will receive, and only the person who set a reminder can change it — and only
 * before it fires, which is why the API sends `mineToEdit` rather than making the app work it out.
 *
 * The list answers with `counts` (upcoming / sent / for me) alongside the page, so the summary and
 * the chips read from one answer and cannot disagree.
 */

const LIST = { type: 'Reminders', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const unwrap = r => r.reminder;
const touches = id => [{ type: 'Reminder', id }, LIST, 'Notifications', 'Dashboard'];

export const remindersApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listReminders: build.query({
      query: params => ({ url: 'reminders', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(x => ({ type: 'Reminder', id: x.id }))]
          : [LIST],
    }),
    getReminder: build.query({
      query: id => `reminders/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Reminder', id }],
    }),
    createReminder: build.mutation({
      query: body => ({ url: 'reminders', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Notifications', 'Dashboard'],
    }),
    updateReminder: build.mutation({
      query: ({ id, ...body }) => ({
        url: `reminders/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeReminder: build.mutation({
      query: id => ({ url: `reminders/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
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
