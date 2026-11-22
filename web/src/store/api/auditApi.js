import { API_BASE, baseApi, cleanParams, getToken } from './baseApi';

const LIST = { type: 'Audit', id: 'LIST' };

/** Save a Blob through a temporary <a download>. */
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * /api/audit (admin only). `list` args: { page, limit, sort, search, action, module, user, from, to, entityId }.
 * `exportCsv` takes the same filters (no page/limit), fetches with the token and downloads the file.
 */
export const auditApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAudit: b.query({
      query: (params) => ({ url: '/audit', params: cleanParams(params) }),
      providesTags: [LIST],
    }),
    exportAuditCsv: b.mutation({
      async queryFn(params) {
        const { page: _p, limit: _l, ...rest } = params || {};
        const qs = new URLSearchParams(cleanParams(rest)).toString();
        const headers = {}; const token = getToken(); if (token) headers.authorization = `Bearer ${token}`;
        let res;
        try { res = await fetch(`${API_BASE}/audit/export.csv${qs ? `?${qs}` : ''}`, { headers }); } catch (e) { return { error: { status: 'FETCH_ERROR', error: String(e) } }; }
        if (!res.ok) {
          let data = null; try { data = await res.json(); } catch { data = null; }
          return { error: data ? { status: res.status, data } : { status: 'PARSING_ERROR', originalStatus: res.status } };
        }
        const blob = await res.blob();
        const cd = res.headers.get('content-disposition') || '';
        const filename = /filename="?([^";]+)"?/.exec(cd)?.[1] || `mydiary-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
        download(blob, filename);
        return { data: { filename, bytes: blob.size } };
      },
      invalidatesTags: [LIST],
    }),
  }),
});

export const { useListAuditQuery, useExportAuditCsvMutation } = auditApi;
