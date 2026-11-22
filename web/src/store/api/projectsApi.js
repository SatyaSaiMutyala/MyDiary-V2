import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Project', id: 'LIST' };
/** The template library is cached under the Project tag type (the one registered for this module). */
const TEMPLATES = { type: 'Project', id: 'TEMPLATES' };
const AUDIT = { type: 'Audit', id: 'LIST' };
const NOTIFS = { type: 'Notification', id: 'LIST' };

/** Everything that changes one project refreshes that project, the portfolio and the Activity Log. */
const touches = (id, ...extra) => [LIST, { type: 'Project', id }, AUDIT, ...extra];
/** Every write on /projects answers `{ project }`. */
const unwrap = (r) => r.project;

/**
 * /api/projects — see Backend/README.md "Projects".
 *
 * `listProjects` takes every list-contract param: { page, limit, sort, search, status, category, priority,
 * owner, member, health, phase, code, template, mine, overdue, from, to, dateField, min_progress,
 * max_progress, fields }. A project read one at a time (`getProject`) also carries its `activity` feed,
 * which the API derives from the Activity Log — lists leave it out.
 */
export const projectsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listProjects: b.query({
      query: (params) => ({ url: '/projects', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((p) => ({ type: 'Project', id: p.id }))] : [LIST]),
    }),
    getProject: b.query({
      query: (id) => `/projects/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Project', id }],
    }),
    createProject: b.mutation({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, TEMPLATES, AUDIT, NOTIFS],
    }),
    updateProject: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeProject: b.mutation({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    duplicateProject: b.mutation({
      query: (id) => ({ url: `/projects/${id}/duplicate`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, AUDIT],
    }),
    /** A note on the project's activity feed (the feed itself is never written by the client). */
    addProjectComment: b.mutation({
      query: ({ id, text }) => ({ url: `/projects/${id}/comments`, method: 'POST', body: { text } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- milestones and their acceptance criteria ----
    addMilestone: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/milestones`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    updateMilestone: b.mutation({
      query: ({ id, milestoneId, ...body }) => ({ url: `/projects/${id}/milestones/${milestoneId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeMilestone: b.mutation({
      query: ({ id, milestoneId }) => ({ url: `/projects/${id}/milestones/${milestoneId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addCriterion: b.mutation({
      query: ({ id, milestoneId, text }) => ({ url: `/projects/${id}/milestones/${milestoneId}/criteria`, method: 'POST', body: { text } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    /** Ticking the last open criterion closes the milestone server-side. */
    updateCriterion: b.mutation({
      query: ({ id, milestoneId, index, ...body }) => ({ url: `/projects/${id}/milestones/${milestoneId}/criteria/${index}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeCriterion: b.mutation({
      query: ({ id, milestoneId, index }) => ({ url: `/projects/${id}/milestones/${milestoneId}/criteria/${index}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- tasks ----
    addProjectTask: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/tasks`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    updateProjectTask: b.mutation({
      query: ({ id, taskId, ...body }) => ({ url: `/projects/${id}/tasks/${taskId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    removeProjectTask: b.mutation({
      query: ({ id, taskId }) => ({ url: `/projects/${id}/tasks/${taskId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- risks ----
    addProjectRisk: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/risks`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    updateProjectRisk: b.mutation({
      query: ({ id, riskId, ...body }) => ({ url: `/projects/${id}/risks/${riskId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeProjectRisk: b.mutation({
      query: ({ id, riskId }) => ({ url: `/projects/${id}/risks/${riskId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- KPIs ----
    addKpi: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/kpis`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateKpi: b.mutation({
      query: ({ id, kpiId, ...body }) => ({ url: `/projects/${id}/kpis/${kpiId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeKpi: b.mutation({
      query: ({ id, kpiId }) => ({ url: `/projects/${id}/kpis/${kpiId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- the team ----
    addMember: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/team`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id, NOTIFS),
    }),
    updateMember: b.mutation({
      query: ({ id, memberId, ...body }) => ({ url: `/projects/${id}/team/${memberId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeMember: b.mutation({
      query: ({ id, memberId }) => ({ url: `/projects/${id}/team/${memberId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    addExternal: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/external`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    updateExternal: b.mutation({
      query: ({ id, memberId, ...body }) => ({ url: `/projects/${id}/external/${memberId}`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeExternal: b.mutation({
      query: ({ id, memberId }) => ({ url: `/projects/${id}/external/${memberId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),

    // ---- the template library ----
    listProjectTemplates: b.query({
      query: (params) => ({ url: '/projects/templates', params: cleanParams(params) }),
      providesTags: [TEMPLATES],
    }),
    getProjectTemplate: b.query({
      query: (id) => `/projects/templates/${id}`,
      transformResponse: (r) => r.template,
      providesTags: [TEMPLATES],
    }),
    /** Builds a whole project from a kit server-side (day offsets → dates) and counts the use. */
    useProjectTemplate: b.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/templates/${id}/use`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, TEMPLATES, AUDIT, NOTIFS],
    }),
  }),
});

export const {
  useListProjectsQuery, useLazyListProjectsQuery, useGetProjectQuery,
  useCreateProjectMutation, useUpdateProjectMutation, useRemoveProjectMutation, useDuplicateProjectMutation,
  useAddProjectCommentMutation,
  useAddMilestoneMutation, useUpdateMilestoneMutation, useRemoveMilestoneMutation,
  useAddCriterionMutation, useUpdateCriterionMutation, useRemoveCriterionMutation,
  useAddProjectTaskMutation, useUpdateProjectTaskMutation, useRemoveProjectTaskMutation,
  useAddProjectRiskMutation, useUpdateProjectRiskMutation, useRemoveProjectRiskMutation,
  useAddKpiMutation, useUpdateKpiMutation, useRemoveKpiMutation,
  useAddMemberMutation, useUpdateMemberMutation, useRemoveMemberMutation,
  useAddExternalMutation, useUpdateExternalMutation, useRemoveExternalMutation,
  useListProjectTemplatesQuery, useGetProjectTemplateQuery, useUseProjectTemplateMutation,
} = projectsApi;
