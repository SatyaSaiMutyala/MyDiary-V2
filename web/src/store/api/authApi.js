import { baseApi } from './baseApi';

/** /api/auth — login · me · logout · profile · change password. */
export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    me: b.query({ query: () => '/auth/me', transformResponse: (r) => r.user, providesTags: ['Me'] }),
    logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    updateMe: b.mutation({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      transformResponse: (r) => r.user,
      invalidatesTags: ['Me', { type: 'Audit', id: 'LIST' }],
    }),
    changePassword: b.mutation({
      query: ({ current, next }) => ({ url: '/auth/change-password', method: 'POST', body: { current, next } }),
      invalidatesTags: [{ type: 'Audit', id: 'LIST' }],
    }),
  }),
});

export const { useLoginMutation, useMeQuery, useLazyMeQuery, useLogoutMutation, useUpdateMeMutation, useChangePasswordMutation } = authApi;
