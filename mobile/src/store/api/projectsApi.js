import { baseApi } from './baseApi';

/**
 * My Projects — the portfolio, one project with everything hanging off it, and the template library.
 *
 * Mirrors MyDiary-V2/Backend/src/routes/projects.js. Every sub-resource (milestones and their
 * acceptance criteria, tasks, risks, KPIs, the team) is its own endpoint, and each one answers with
 * the whole project, so a single `Project` tag keeps every pane in step after any edit.
 *
 * Acceptance criteria are addressed by position, not by id — that is the server's contract, so the
 * index a screen sends must be the index in `milestone.acceptanceCriteria`.
 */

const LIST = { type: 'Projects', id: 'LIST' };
const TEMPLATES = { type: 'Projects', id: 'TEMPLATES' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

const unwrap = r => r.project;

/** Any edit inside a project refreshes that project, the portfolio row and Home's counts. */
const touches = id => [{ type: 'Project', id }, LIST, 'Dashboard'];

/** POST/PATCH/DELETE on a sub-resource: same body shape, same invalidation, every time. */
const write = (build, path, method = 'POST') =>
  build.mutation({
    query: ({ id, ...body }) => ({
      url: `projects/${id}/${path(body)}`,
      method,
      ...(method === 'DELETE' ? null : { body: strip(body) }),
    }),
    transformResponse: unwrap,
    invalidatesTags: (_r, _e, { id }) => touches(id),
  });

/** The ids that address the sub-resource travel in the URL, never in the body (the API is strict). */
const strip = ({
  milestoneId: _m,
  taskId: _t,
  riskId: _r,
  kpiId: _k,
  memberId: _mem,
  index: _i,
  ...body
}) => body;

export const projectsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    // ---------------------------------------------------------------- the portfolio
    listProjects: build.query({
      query: params => ({ url: 'projects', params: clean(params) }),
      providesTags: r =>
        r
          ? [LIST, ...r.items.map(p => ({ type: 'Project', id: p.id }))]
          : [LIST],
    }),
    getProject: build.query({
      query: id => `projects/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Project', id }],
    }),
    createProject: build.mutation({
      query: body => ({ url: 'projects', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    updateProject: build.mutation({
      query: ({ id, ...body }) => ({
        url: `projects/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => touches(id),
    }),
    removeProject: build.mutation({
      query: id => ({ url: `projects/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => touches(id),
    }),
    duplicateProject: build.mutation({
      query: id => ({ url: `projects/${id}/duplicate`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, 'Dashboard'],
    }),
    addProjectComment: write(build, () => 'comments'),

    // ---------------------------------------------------------------- milestones
    addMilestone: write(build, () => 'milestones'),
    updateMilestone: write(build, b => `milestones/${b.milestoneId}`, 'PATCH'),
    removeMilestone: write(build, b => `milestones/${b.milestoneId}`, 'DELETE'),
    addCriterion: write(build, b => `milestones/${b.milestoneId}/criteria`),
    updateCriterion: write(
      build,
      b => `milestones/${b.milestoneId}/criteria/${b.index}`,
      'PATCH',
    ),
    removeCriterion: write(
      build,
      b => `milestones/${b.milestoneId}/criteria/${b.index}`,
      'DELETE',
    ),

    // ---------------------------------------------------------------- tasks
    addProjectTask: write(build, () => 'tasks'),
    updateProjectTask: write(build, b => `tasks/${b.taskId}`, 'PATCH'),
    removeProjectTask: write(build, b => `tasks/${b.taskId}`, 'DELETE'),

    // ---------------------------------------------------------------- risks
    addProjectRisk: write(build, () => 'risks'),
    updateProjectRisk: write(build, b => `risks/${b.riskId}`, 'PATCH'),
    removeProjectRisk: write(build, b => `risks/${b.riskId}`, 'DELETE'),

    // ---------------------------------------------------------------- KPIs
    addKpi: write(build, () => 'kpis'),
    updateKpi: write(build, b => `kpis/${b.kpiId}`, 'PATCH'),
    removeKpi: write(build, b => `kpis/${b.kpiId}`, 'DELETE'),

    // ---------------------------------------------------------------- the team
    addMember: write(build, () => 'team'),
    updateMember: write(build, b => `team/${b.memberId}`, 'PATCH'),
    removeMember: write(build, b => `team/${b.memberId}`, 'DELETE'),
    addExternal: write(build, () => 'external'),
    updateExternal: write(build, b => `external/${b.memberId}`, 'PATCH'),
    removeExternal: write(build, b => `external/${b.memberId}`, 'DELETE'),

    // ---------------------------------------------------------------- the template library
    listProjectTemplates: build.query({
      query: params => ({ url: 'projects/templates', params: clean(params) }),
      providesTags: [TEMPLATES],
    }),
    getProjectTemplate: build.query({
      query: id => `projects/templates/${id}`,
      transformResponse: r => r.template,
      providesTags: [TEMPLATES],
    }),
    /** Starts a real project from a template — the server copies the milestones, tasks, KPIs and risks. */
    startProjectFromTemplate: build.mutation({
      query: ({ id, ...body }) => ({
        url: `projects/templates/${id}/use`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: [LIST, TEMPLATES, 'Dashboard'],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useRemoveProjectMutation,
  useDuplicateProjectMutation,
  useAddProjectCommentMutation,
  useAddMilestoneMutation,
  useUpdateMilestoneMutation,
  useRemoveMilestoneMutation,
  useAddCriterionMutation,
  useUpdateCriterionMutation,
  useRemoveCriterionMutation,
  useAddProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useRemoveProjectTaskMutation,
  useAddProjectRiskMutation,
  useUpdateProjectRiskMutation,
  useRemoveProjectRiskMutation,
  useAddKpiMutation,
  useUpdateKpiMutation,
  useRemoveKpiMutation,
  useAddMemberMutation,
  useUpdateMemberMutation,
  useRemoveMemberMutation,
  useAddExternalMutation,
  useUpdateExternalMutation,
  useRemoveExternalMutation,
  useListProjectTemplatesQuery,
  useGetProjectTemplateQuery,
  useStartProjectFromTemplateMutation,
} = projectsApi;
