import { useMemo, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSearchParams } from 'react-router-dom';
import { Avatar, Btn, EmptyState, FilterSelect, Pill, SearchBox, SummaryCard, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { ACTION_LABEL } from '../../../store/audit';
import { useDebounced } from '../../../utils/useDebounced';
import { useExportAuditCsvMutation, useListAuditQuery } from '../../../store/api/auditApi';
import { useListUsersQuery } from '../../../store/api/usersApi';
import { ApiError, DateInput, Fetching, PAGE_SIZE, Pager, SortCell, useToast } from './listUi';

const ACTION_STYLE = {
  create: { bg: tokens.okSoft, color: tokens.ok }, update: { bg: tokens.infoSoft, color: tokens.info }, delete: { bg: tokens.badSoft, color: tokens.bad },
  auth: { bg: tokens.purpleSoft, color: tokens.purple }, export: { bg: tokens.greySoft, color: tokens.grey },
};
const ACTIONS = ['create', 'update', 'delete', 'auth', 'export'];
const KNOWN_MODULES = ['Session', 'Profile', 'Settings · Users', 'Settings · Activity Log'];
const fmt = (iso) => { const d = new Date(iso); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); };

/** Activity Log — the server's audit trail (GET /api/audit): filters, sort, paging and CSV export all via the API. */
export default function ActivityLogTab() {
  const [params] = useSearchParams();
  const { toast, show } = useToast();
  const [q, setQ] = useState(() => params.get('search') || '');
  const search = useDebounced(q.trim(), 300);
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('-at');
  // Filters / sort / search always start again from page 1 (page is tied to the filter signature).
  const sig = JSON.stringify([search, action, module, user, from, to, sort]);
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const filters = { search, action, module, user, from, to };
  const { data, error, isLoading, isFetching, refetch } = useListAuditQuery({ ...filters, page, limit: PAGE_SIZE, sort });
  const { data: all } = useListAuditQuery({ limit: 1 });
  const { data: created } = useListAuditQuery({ action: 'create', limit: 1 });
  const { data: updated } = useListAuditQuery({ action: 'update', limit: 1 });
  const { data: deleted } = useListAuditQuery({ action: 'delete', limit: 1 });
  const { data: people } = useListUsersQuery({ limit: 200, fields: 'name', sort: 'name' });
  const [exportCsv, { isLoading: exporting }] = useExportAuditCsvMutation();

  const rows = data?.items || [];
  const modules = useMemo(() => [...new Set([...KNOWN_MODULES, ...(data?.items || []).map(e => e.module)])].sort(), [data]);
  const hasFilters = !!(search || action || module || user || from || to);

  const doExport = async () => {
    try { const r = await exportCsv({ ...filters, sort }).unwrap(); show(`✓ Downloaded ${r.filename}.`); } catch (err) { show(err, 'error'); }
  };

  return (
    <>
      <Grid container spacing="12px" sx={{ mb: '16px' }}>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Entries" value={all?.total ?? '…'} sub="On the server · newest first" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Created" value={created?.total ?? '…'} sub="New records" accent="teal" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Updated" value={updated?.total ?? '…'} sub="Edits & status changes" accent="blue" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Deleted" value={deleted?.total ?? '…'} sub="Removed records" accent={deleted?.total ? 'red' : 'slate'} /></Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1.25, mb: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox placeholder="Search items, details, module, user…" value={q} onChange={e => setQ(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 220 }, maxWidth: { lg: 300 } }} />
        <FilterSelect value={action} onChange={e => setAction(e.target.value)}><option value="">All actions</option>{ACTIONS.map(k => <option key={k} value={k}>{ACTION_LABEL[k] || k}</option>)}</FilterSelect>
        <FilterSelect value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{modules.map(m => <option key={m} value={m}>{m}</option>)}</FilterSelect>
        <FilterSelect value={user} onChange={e => setUser(e.target.value)}><option value="">All users</option>{(people?.items || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</FilterSelect>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <DateInput value={from} onChange={e => setFrom(e.target.value)} title="From" />
          <Typography sx={{ fontSize: 12, color: tokens.faint }}>to</Typography>
          <DateInput value={to} onChange={e => setTo(e.target.value)} title="To" />
        </Box>
        {hasFilters && <Btn size="sm" variant="ghost" onClick={() => { setQ(''); setAction(''); setModule(''); setUser(''); setFrom(''); setTo(''); }}>Clear filters</Btn>}
        <Box sx={{ display: 'flex', gap: 1, ml: { sm: 'auto' } }}>
          <Btn onClick={doExport} disabled={exporting || !data?.total}>{exporting ? 'Exporting…' : 'Export CSV'}</Btn>
        </Box>
      </Box>

      <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />

      {!error && !isLoading && rows.length === 0 ? (
        <EmptyState icon={<Icon name="receipt" />} title={hasFilters ? 'Nothing matches these filters' : 'No activity yet'} desc={hasFilters ? 'Try a broader search or clear a filter.' : 'Every sign-in, user change, password change and export is recorded here by the server.'} />
      ) : !error && (
        <TableContainer sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', boxShadow: tokens.shadowSm }}>
          <Fetching on={isFetching} />
          <Table sx={{ minWidth: 900 }}>
            <TableHead><TableRow>
              <SortCell field="at" sort={sort} onSort={setSort}>Time</SortCell>
              <SortCell field="user.name" sort={sort} onSort={setSort}>User</SortCell>
              <SortCell field="action" sort={sort} onSort={setSort}>Action</SortCell>
              <SortCell field="module" sort={sort} onSort={setSort}>Module</SortCell>
              <SortCell field="entity" sort={sort} onSort={setSort}>Item</SortCell>
              <TableCell>Details</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {isLoading && !rows.length ? <TableRow><TableCell colSpan={6} sx={{ color: tokens.faint, fontSize: 13, py: 3, textAlign: 'center' }}>Loading activity…</TableCell></TableRow> : null}
              {rows.map(e => {
                const s = ACTION_STYLE[e.action] || ACTION_STYLE.update;
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontFamily: fonts.mono, fontSize: 12, whiteSpace: 'nowrap', color: tokens.muted }}>{fmt(e.at)}</TableCell>
                    <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar name={e.user?.name || '?'} size={24} /><Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>{e.user?.name || '—'}</Typography></Box></TableCell>
                    <TableCell><Pill bg={s.bg} color={s.color}>{ACTION_LABEL[e.action] || e.action}</Pill></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.module}</TableCell>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 260 }}><Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap title={e.entity}>{e.entity || '—'}</Typography></TableCell>
                    <TableCell sx={{ color: tokens.muted, fontSize: 12.5, maxWidth: 420 }}><Typography sx={{ fontSize: 12.5 }} noWrap title={e.details}>{e.details}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pager data={data} page={page} onPage={setPage} loading={isFetching} />
        </TableContainer>
      )}
      {toast}
    </>
  );
}
