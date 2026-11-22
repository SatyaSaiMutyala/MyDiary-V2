import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Department', id: 'LIST' };
const ACTIVITY = { type: 'Department', id: 'ACTIVITY' };
const ASSIGNMENTS = { type: 'Department', id: 'ASSIGNMENTS' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/** Everything that edits one department refreshes that department, the grid and the Activity Log. */
const touches = (id, ...extra) => [LIST, { type: 'Department', id }, AUDIT, ...extra];
/** Every write under /departments answers `{ department }`. */
const unwrap = (r) => r.department;

/**
 * /api/departments — Department Master, plus the two reads My Activity and the Dashboard live on:
 * the org-wide assignment map and the day's shift ticks.
 *
 * `listDepartments` takes every list-contract param: { page, limit, sort, search, code, name, icon,
 * position, person, owner, system, reviewDay, min_order, max_order, from, to, dateField, fields }.
 */
export const departmentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listDepartments: b.query({
      query: (params) => ({ url: '/departments', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((d) => ({ type: 'Department', id: d.id }))] : [LIST]),
    }),
    getDepartment: b.query({
      query: (id) => `/departments/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Department', id }],
    }),
    createDepartment: b.mutation({
      query: (body) => ({ url: '/departments', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT, ASSIGNMENTS],
    }),
    updateDepartment: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeDepartment: b.mutation({
      query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id, ASSIGNMENTS, ACTIVITY),
    }),

    // ---- positions ----
    addPosition: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}/positions`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updatePosition: b.mutation({
      query: ({ id, positionId, ...body }) => ({ url: `/departments/${id}/positions/${positionId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removePosition: b.mutation({
      query: ({ id, positionId }) => ({ url: `/departments/${id}/positions/${positionId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, ASSIGNMENTS),
    }),

    // ---- the four task lanes: kind = opening | closing | weekly | monthly ----
    addTask: b.mutation({
      query: ({ id, kind, ...body }) => ({ url: `/departments/${id}/tasks/${kind}`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateTask: b.mutation({
      query: ({ id, kind, taskId, ...body }) => ({ url: `/departments/${id}/tasks/${kind}/${taskId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeTask: b.mutation({
      query: ({ id, kind, taskId }) => ({ url: `/departments/${id}/tasks/${kind}/${taskId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, ACTIVITY),
    }),

    // ---- review cadence ----
    putCadence: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}/cadence`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addAgendaSection: b.mutation({
      query: ({ id, tab, ...body }) => ({ url: `/departments/${id}/cadence/${tab}/sections`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateAgendaSection: b.mutation({
      query: ({ id, tab, sectionId, ...body }) => ({ url: `/departments/${id}/cadence/${tab}/sections/${sectionId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeAgendaSection: b.mutation({
      query: ({ id, tab, sectionId }) => ({ url: `/departments/${id}/cadence/${tab}/sections/${sectionId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addAgendaPoint: b.mutation({
      query: ({ id, tab, sectionId, ...body }) => ({ url: `/departments/${id}/cadence/${tab}/sections/${sectionId}/points`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateAgendaPoint: b.mutation({
      query: ({ id, tab, sectionId, pointId, ...body }) => ({ url: `/departments/${id}/cadence/${tab}/sections/${sectionId}/points/${pointId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeAgendaPoint: b.mutation({
      query: ({ id, tab, sectionId, pointId }) => ({ url: `/departments/${id}/cadence/${tab}/sections/${sectionId}/points/${pointId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- people ----
    /** `{ 'Dr. Anusha Singh': { departmentId, positionId, role } }` for the whole organisation. */
    listAssignments: b.query({
      query: () => '/departments/assignments',
      transformResponse: (r) => r.assignments,
      providesTags: [ASSIGNMENTS],
    }),
    putAssignments: b.mutation({
      query: ({ id, assignments }) => ({ url: `/departments/${id}/assignments`, method: 'PUT', body: { assignments } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, ASSIGNMENTS),
    }),

    // ---- the day's shift ticks (My Activity + the Dashboard rollups) ----
    /**
     * Resolves to the web app's own log shape: `{ [person]: { [date]: { opening: { [taskId]: 'done' }, … } } }`.
     * `scope` is 'me' (the default), 'person' (+ person), 'department' (+ departmentId) or 'org'.
     */
    getActivity: b.query({
      query: (params) => ({ url: '/departments/activity', params: cleanParams(params) }),
      transformResponse: (r) => r.log,
      providesTags: [ACTIVITY],
    }),
    setActivityTick: b.mutation({
      query: (body) => ({ url: '/departments/activity', method: 'PUT', body }),
      invalidatesTags: [ACTIVITY, AUDIT],
    }),
  }),
});

export const {
  useListDepartmentsQuery, useGetDepartmentQuery,
  useCreateDepartmentMutation, useUpdateDepartmentMutation, useRemoveDepartmentMutation,
  useAddPositionMutation, useUpdatePositionMutation, useRemovePositionMutation,
  useAddTaskMutation, useUpdateTaskMutation, useRemoveTaskMutation,
  usePutCadenceMutation,
  useAddAgendaSectionMutation, useUpdateAgendaSectionMutation, useRemoveAgendaSectionMutation,
  useAddAgendaPointMutation, useUpdateAgendaPointMutation, useRemoveAgendaPointMutation,
  useListAssignmentsQuery, usePutAssignmentsMutation,
  useGetActivityQuery, useSetActivityTickMutation,
} = departmentsApi;
