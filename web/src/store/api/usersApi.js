import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'User', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * /api/users (admin only). `list` takes every list-contract param as query args:
 *   { page, limit, sort, search, role, status, department, from, to, dateField, fields }
 */
export const usersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listUsers: b.query({
      query: (params) => ({ url: '/users', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((u) => ({ type: 'User', id: u.id }))] : [LIST]),
    }),
    getUser: b.query({ query: (id) => `/users/${id}`, transformResponse: (r) => r.user, providesTags: (_r, _e, id) => [{ type: 'User', id }] }),
    userModules: b.query({ query: () => '/users/modules', providesTags: ['Modules'] }),
    createUser: b.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      transformResponse: (r) => r.user,
      invalidatesTags: [LIST, AUDIT],
    }),
    updateUser: b.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      transformResponse: (r) => r.user,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'User', id }, AUDIT, 'Me'],
    }),
    removeUser: b.mutation({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'User', id }, AUDIT],
    }),
    resetPassword: b.mutation({
      query: ({ id, password }) => ({ url: `/users/${id}/reset-password`, method: 'POST', body: { password } }),
      invalidatesTags: [AUDIT],
    }),
  }),
});

export const {
  useListUsersQuery, useGetUserQuery, useUserModulesQuery,
  useCreateUserMutation, useUpdateUserMutation, useRemoveUserMutation, useResetPasswordMutation,
} = usersApi;
