import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Template', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * /api/templates — the Agenda Templates Library.
 * `listTemplates` params: { page, limit, sort, search, type, createdBy, from, to, fields,
 * min_usedCount, max_usedCount, min_agendaCount, max_agendaCount }. `type` takes a comma list.
 * A template is `{ id, name, type, ico, desc, agenda: [{ text, time }], agendaCount, usedCount, createdBy, createdAt, updatedAt }`.
 */
export const templatesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTemplates: b.query({
      query: (params) => ({ url: '/templates', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((t) => ({ type: 'Template', id: t.id }))] : [LIST]),
    }),
    getTemplate: b.query({
      query: (id) => `/templates/${id}`,
      transformResponse: (r) => r.template,
      providesTags: (_r, _e, id) => [{ type: 'Template', id }],
    }),
    createTemplate: b.mutation({
      query: (body) => ({ url: '/templates', method: 'POST', body }),
      transformResponse: (r) => r.template,
      invalidatesTags: [LIST, AUDIT],
    }),
    updateTemplate: b.mutation({
      query: ({ id, ...body }) => ({ url: `/templates/${id}`, method: 'PATCH', body }),
      transformResponse: (r) => r.template,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Template', id }, AUDIT],
    }),
    removeTemplate: b.mutation({
      query: (id) => ({ url: `/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'Template', id }, AUDIT],
    }),
    duplicateTemplate: b.mutation({
      query: (id) => ({ url: `/templates/${id}/duplicate`, method: 'POST' }),
      transformResponse: (r) => r.template,
      invalidatesTags: [LIST, AUDIT],
    }),
  }),
});

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useRemoveTemplateMutation,
  useDuplicateTemplateMutation,
} = templatesApi;
