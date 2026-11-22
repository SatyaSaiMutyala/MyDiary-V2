import { baseApi } from './baseApi';

/** GET /api/search?q=&limit= → { q, groups: [{ key, label, items: [{ id, title, subtitle, route }] }] } */
export const searchApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    search: b.query({
      query: ({ q, limit = 5 }) => ({ url: '/search', params: { q, limit } }),
      providesTags: ['Search'],
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useSearchQuery, useLazySearchQuery } = searchApi;
