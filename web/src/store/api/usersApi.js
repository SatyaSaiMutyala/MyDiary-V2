import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'User', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * /api/users (admin only). `list` takes every list-contract param as query args:
 *   { page, limit, sort, search, role, status, department, from, to, dateField, fields }
 */
export const usersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    /**
     * Who there is to pick from — names, titles and departments, nothing private. Unlike the rest
     * of this slice it is not admin-only, because any screen that offers a list of colleagues
     * (allocating a task, naming an owner) has to work for an ordinary employee too.
     */
    listPeople: b.query({
      query: () => '/users/directory',
      transformResponse: (r) => r.items ?? [],
      providesTags: [{ type: 'User', id: 'DIRECTORY' }],
    }),
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
    // One password onto many accounts, each of them then made to replace it.
    bulkResetPasswords: b.mutation({
      query: ({ userIds, password }) => ({ url: '/users/reset-passwords', method: 'POST', body: { userIds, password } }),
      invalidatesTags: [LIST, AUDIT],
    }),
  }),
});

export const {
  useListUsersQuery, useListPeopleQuery, useGetUserQuery, useUserModulesQuery,
  useCreateUserMutation, useUpdateUserMutation, useRemoveUserMutation, useResetPasswordMutation,
  useBulkResetPasswordsMutation,
} = usersApi;
