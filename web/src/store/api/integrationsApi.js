import { baseApi, cleanParams } from './baseApi';

const LIST = { type: 'Integration', id: 'LIST' };
const AUDIT = { type: 'Audit', id: 'LIST' };

/**
 * /api/integrations — the register of which third-party tools are switched on (admin-only module).
 *
 * Connecting and disconnecting only save this record (status, who, when): the API never talks to Google,
 * Slack, Teams, Zoom or anything else, so there is no OAuth round trip and no token to keep.
 *
 * `list` params: { page, limit, sort, search, category, status, connected, syncFrequency, fields, from, to }.
 */
export const integrationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listIntegrations: b.query({
      query: (params) => ({ url: '/integrations', params: cleanParams(params) }),
      providesTags: (r) => (r ? [LIST, ...r.items.map((i) => ({ type: 'Integration', id: i.id }))] : [LIST]),
    }),
    getIntegration: b.query({
      query: (id) => `/integrations/${id}`,
      transformResponse: (r) => r.integration,
      providesTags: (_r, _e, id) => [{ type: 'Integration', id }],
    }),
    /** Switch one on. `note` (optional) is kept with the record and in the Activity Log. */
    connectIntegration: b.mutation({
      query: ({ id, note }) => ({ url: `/integrations/${id}/connect`, method: 'POST', body: cleanParams({ note }) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
    /** Switch one off. */
    disconnectIntegration: b.mutation({
      query: ({ id, note }) => ({ url: `/integrations/${id}/disconnect`, method: 'POST', body: cleanParams({ note }) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
    /** Put one back into "mid-setup". */
    pauseIntegration: b.mutation({
      query: ({ id, note }) => ({ url: `/integrations/${id}/pending`, method: 'POST', body: cleanParams({ note }) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
    /** Stored preferences for one tool: { scope, syncFrequency, notes }. */
    saveIntegrationSettings: b.mutation({
      query: ({ id, ...settings }) => ({ url: `/integrations/${id}/settings`, method: 'PATCH', body: cleanParams(settings) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
    createIntegration: b.mutation({
      query: (body) => ({ url: '/integrations', method: 'POST', body: cleanParams(body) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: [LIST, AUDIT],
    }),
    updateIntegration: b.mutation({
      query: ({ id, ...body }) => ({ url: `/integrations/${id}`, method: 'PATCH', body: cleanParams(body) }),
      transformResponse: (r) => r.integration,
      invalidatesTags: (_r, _e, { id }) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
    removeIntegration: b.mutation({
      query: (id) => ({ url: `/integrations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [LIST, { type: 'Integration', id }, AUDIT],
    }),
  }),
});

export const {
  useListIntegrationsQuery,
  useGetIntegrationQuery,
  useConnectIntegrationMutation,
  useDisconnectIntegrationMutation,
  usePauseIntegrationMutation,
  useSaveIntegrationSettingsMutation,
  useCreateIntegrationMutation,
  useUpdateIntegrationMutation,
  useRemoveIntegrationMutation,
} = integrationsApi;
