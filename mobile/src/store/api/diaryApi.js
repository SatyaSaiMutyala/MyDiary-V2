import { baseApi } from './baseApi';

/**
 * My Diary — the person's own entries.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/diary.js. The calendar asks for a window of days at a time
 * (`from` / `to`), and the server matches against every day an entry occupies, so a trip that spans
 * a week comes back for each day of it, not only the day it starts.
 *
 * Meetings are NOT fetched here — they are their own thing (meetingsApi) and the screen merges them
 * in, which is exactly what the website does.
 */

const LIST = { type: 'Diary', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const unwrap = r => r.entry;
const touches = id => [{ type: 'DiaryEntry', id }, LIST, 'Dashboard'];

export const diaryApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listDiary: build.query({
      query: params => ({ url: 'diary', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(e => ({ type: 'DiaryEntry', id: e.id }))]
          : [LIST],
    }),
    getDiaryEntry: build.query({
      query: id => `diary/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'DiaryEntry', id }],
    }),
    createDiaryEntry: build.mutation({
      query: body => ({ url: 'diary', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    updateDiaryEntry: build.mutation({
      query: ({ id, ...body }) => ({
        url: `diary/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeDiaryEntry: build.mutation({
      query: id => ({ url: `diary/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
  }),
});

export const {
  useListDiaryQuery,
  useLazyListDiaryQuery,
  useGetDiaryEntryQuery,
  useCreateDiaryEntryMutation,
  useUpdateDiaryEntryMutation,
  useRemoveDiaryEntryMutation,
} = diaryApi;
