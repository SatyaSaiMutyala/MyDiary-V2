import { baseApi, cleanParams } from './baseApi';

/**
 * /api/lab-readiness — the laboratory's daily opening and closing board, and the Department Master
 * side that configures it (those routes live under /api/departments/:id/lab-readiness).
 *
 * A board is three things: which unit, which day, which round. That triple is the cache key, so two
 * units open at once never overwrite each other.
 *
 * Photographs go up as the raw image, not a form: `body` is the File itself and the content-type is
 * the file's own, which is exactly what the API's express.raw parser expects. Reading one back needs
 * the Authorization header, so an <img src> cannot do it — see modules/labreadiness/useEvidenceUrl.js.
 */

const DAY = (date) => ({ type: 'LabRun', id: `DAY:${date}` });
const HISTORY = { type: 'LabRun', id: 'HISTORY' };
const AUDIT = { type: 'Audit', id: 'LIST' };
const board = ({ unitKey, date, phase }) => ({ type: 'LabRun', id: `${unitKey}|${date}|${phase}` });
/** Every write to a board refreshes that board, the day it belongs to and the history. */
const touches = (arg) => [board(arg), DAY(arg.date), HISTORY, AUDIT];

/** The three path parts, plus `?departmentId=` when the caller is looking at a specific department. */
const at = ({ unitKey, date, phase }) => `/lab-readiness/${encodeURIComponent(unitKey)}/${date}/${phase}`;
const scope = (departmentId) => (departmentId ? { departmentId } : undefined);

export const labReadinessApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // ---- the board ----

    /** Every unit with where its opening and closing rounds stand on one date. */
    getLabDay: b.query({
      query: ({ date, departmentId } = {}) => ({ url: '/lab-readiness', params: cleanParams({ date, departmentId }) }),
      providesTags: (_r, _e, a = {}) => [DAY(a.date)],
    }),

    /** One unit's round: the activities that apply, what has been recorded, and what is still missing. */
    getLabBoard: b.query({
      query: ({ unitKey, date, phase, departmentId }) => ({ url: at({ unitKey, date, phase }), params: cleanParams(scope(departmentId)) }),
      providesTags: (_r, _e, a) => [board(a)],
    }),

    getLabHistory: b.query({
      query: (params = {}) => ({ url: '/lab-readiness/history', params: cleanParams(params) }),
      transformResponse: (r) => r.records,
      providesTags: [HISTORY],
    }),

    /** One past record in full, for the history drawer. */
    getLabRecord: b.query({
      query: ({ id, departmentId }) => ({ url: `/lab-readiness/records/${id}`, params: cleanParams(scope(departmentId)) }),
      providesTags: (_r, _e, a) => [{ type: 'LabRun', id: `RECORD:${a.id}` }],
    }),

    /** done · deviation · na — or null to clear it. `remark` may ride along. */
    setLabItem: b.mutation({
      query: ({ unitKey, date, phase, taskKey, departmentId, ...body }) => ({
        url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(taskKey)}`,
        method: 'PUT', body, params: cleanParams(scope(departmentId)),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    setLabRemark: b.mutation({
      query: ({ unitKey, date, phase, taskKey, departmentId, remark }) => ({
        url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(taskKey)}/remark`,
        method: 'PUT', body: { remark }, params: cleanParams(scope(departmentId)),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    /** `file` is a File or Blob; it is sent as the request body exactly as it is. */
    addLabPhoto: b.mutation({
      query: ({ unitKey, date, phase, taskKey, file, departmentId }) => ({
        url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(taskKey)}/photos`,
        method: 'POST',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
        params: cleanParams({ name: file.name, ...scope(departmentId) }),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    removeLabPhoto: b.mutation({
      query: ({ unitKey, date, phase, photoId, departmentId }) => ({
        url: `${at({ unitKey, date, phase })}/photos/${photoId}`,
        method: 'DELETE', params: cleanParams(scope(departmentId)),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    /** The sign-off photograph is the body; `role` is the designation that prints beside the name. */
    signOffLab: b.mutation({
      query: ({ unitKey, date, phase, file, role, departmentId }) => ({
        url: `${at({ unitKey, date, phase })}/signoff`,
        method: 'POST',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
        params: cleanParams({ role, ...scope(departmentId) }),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    reopenLab: b.mutation({
      query: ({ unitKey, date, phase, reason, departmentId }) => ({
        url: `${at({ unitKey, date, phase })}/reopen`,
        method: 'POST', body: { reason }, params: cleanParams(scope(departmentId)),
      }),
      invalidatesTags: (_r, _e, a) => touches(a),
    }),

    // ---- Department Master: the configuration ----
    // Each of these answers `{ department }`, so they invalidate that department exactly like the
    // rest of Department Master does.

    putLabConfig: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}/lab-readiness`, method: 'PUT', body }),
      transformResponse: (r) => r.department,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, { type: 'Department', id: 'LIST' }, AUDIT, HISTORY],
    }),
    restoreLabChecklist: b.mutation({
      query: (id) => ({ url: `/departments/${id}/lab-readiness/restore`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Department', id }, AUDIT],
    }),
    addLabUnit: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}/lab-readiness/units`, method: 'POST', body }),
      transformResponse: (r) => r.department,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
    updateLabUnit: b.mutation({
      query: ({ id, unitId, ...body }) => ({ url: `/departments/${id}/lab-readiness/units/${unitId}`, method: 'PATCH', body }),
      transformResponse: (r) => r.department,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
    removeLabUnit: b.mutation({
      query: ({ id, unitId }) => ({ url: `/departments/${id}/lab-readiness/units/${unitId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
    addLabActivity: b.mutation({
      query: ({ id, ...body }) => ({ url: `/departments/${id}/lab-readiness/activities`, method: 'POST', body }),
      transformResponse: (r) => r.department,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
    updateLabActivity: b.mutation({
      query: ({ id, activityId, ...body }) => ({ url: `/departments/${id}/lab-readiness/activities/${activityId}`, method: 'PATCH', body }),
      transformResponse: (r) => r.department,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
    removeLabActivity: b.mutation({
      query: ({ id, activityId }) => ({ url: `/departments/${id}/lab-readiness/activities/${activityId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, AUDIT],
    }),
  }),
});

export const {
  useGetLabDayQuery, useGetLabBoardQuery, useGetLabHistoryQuery, useGetLabRecordQuery,
  useSetLabItemMutation, useSetLabRemarkMutation,
  useAddLabPhotoMutation, useRemoveLabPhotoMutation,
  useSignOffLabMutation, useReopenLabMutation,
  usePutLabConfigMutation, useRestoreLabChecklistMutation,
  useAddLabUnitMutation, useUpdateLabUnitMutation, useRemoveLabUnitMutation,
  useAddLabActivityMutation, useUpdateLabActivityMutation, useRemoveLabActivityMutation,
} = labReadinessApi;
