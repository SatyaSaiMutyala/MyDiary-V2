import { baseApi } from './baseApi';

/**
 * Departments and the shift checklist behind My Activity.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/departments.js. The phone only needs the reading side plus
 * the one tick: who I am in which department (`assignments`), that department's four lanes of tasks
 * (`departments/:id`), and today's ticks (`departments/activity`). Editing departments is a desk
 * job and stays on the website.
 */

const LIST = { type: 'Departments', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

export const departmentsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listDepartments: build.query({
      query: params => ({ url: 'departments', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(d => ({ type: 'Department', id: d.id }))]
          : [LIST],
    }),
    getDepartment: build.query({
      query: id => `departments/${id}`,
      transformResponse: r => r.department ?? r,
      providesTags: (_r, _e, id) => [{ type: 'Department', id }],
    }),
    /** Everybody's department / position / role, keyed by name. */
    listAssignments: build.query({
      query: () => 'departments/assignments',
      transformResponse: r => r.assignments ?? {},
      providesTags: [LIST],
    }),
    /** Today's ticks: person → date → lane → taskId. */
    getActivity: build.query({
      query: params => ({ url: 'departments/activity', params: clean(params) }),
      providesTags: ['Activity'],
    }),
    setActivityTick: build.mutation({
      query: body => ({ url: 'departments/activity', method: 'PUT', body }),
      invalidatesTags: ['Activity', 'Dashboard'],
    }),
  }),
});

export const {
  useListDepartmentsQuery,
  useGetDepartmentQuery,
  useListAssignmentsQuery,
  useGetActivityQuery,
  useSetActivityTickMutation,
} = departmentsApi;
