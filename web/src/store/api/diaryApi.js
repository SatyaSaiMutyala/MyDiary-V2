import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'DiaryEntry', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/** Everything that changes one entry refreshes that entry, the list and the Activity Log. */
const touches = (id, ...extra) => [LIST, { type: 'DiaryEntry', id }, AUDIT, ...extra];
const unwrap = (r) => r.entry;

/**
 * /api/diary — My Diary's own entries (focus blocks, travel, reminders, personal time, OOO).
 *
 * Meetings are NOT here: the calendar reads them from /api/meetings (meetingsApi) and merges the two
 * lists in the browser, so a meeting has exactly one home.
 *
 * `list` takes every list-contract param: { page, limit, sort, search, cat, addedBy, reminder, allDay,
 * owner, attendee, mine, from, to, dateField, fields }. `from` / `to` run against every day an entry
 * occupies, so one month / week / day can be asked for and a multi-day entry (a trip, a week out of
 * office) still comes back from any day it covers. Without `owner` the list is the signed-in person's
 * own diary; `owner=<name>` reads a diary shared with them and `mine=false` widens it to every diary
 * they may read.
 */
export const diaryApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listDiary: b.query({
      query: (params) => ({ url: '/diary', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((e) => ({ type: 'DiaryEntry', id: e.id }))] : [LIST]),
    }),
    getDiaryEntry: b.query({
      query: (id) => `/diary/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'DiaryEntry', id }],
    }),
    createDiaryEntry: b.mutation({
      query: (body) => ({ url: '/diary', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT, NOTIFS],
    }),
    updateDiaryEntry: b.mutation({
      query: ({ id, ...body }) => ({ url: `/diary/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    removeDiaryEntry: b.mutation({
      query: (id) => ({ url: `/diary/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
  }),
});

export const {
  useListDiaryQuery, useLazyListDiaryQuery, useGetDiaryEntryQuery,
  useCreateDiaryEntryMutation, useUpdateDiaryEntryMutation, useRemoveDiaryEntryMutation,
} = diaryApi;
