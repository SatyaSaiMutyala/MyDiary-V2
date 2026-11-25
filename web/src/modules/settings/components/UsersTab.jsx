import { useEffect, useMemo, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Tooltip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Btn, EmptyState, FilterSelect, Pill, SearchBox, SummaryCard } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { useAppStore } from '../../../store/AppStore';
import { tokens, fonts } from '../../../theme/tokens';
import { MODULES, ROLES, ROLE_LABEL } from '../../../data/users';
import { useDebounced } from '../../../utils/useDebounced';
import { useGetUserQuery, useListUsersQuery, useRemoveUserMutation, useResetPasswordMutation, useUpdateUserMutation, useUserModulesQuery } from '../../../store/api/usersApi';
import { useListDepartmentsQuery } from '../../../store/api/departmentsApi';
import UserDialog from './UserDialog';
import { ApiError, Fetching, PAGE_SIZE, Pager, SortCell, useToast } from './listUi';
import { useDialog } from '../../../components/Dialogs';

const ROLE_STYLE = { admin: { bg: tokens.tealSoft, color: tokens.teal }, manager: { bg: tokens.infoSoft, color: tokens.info }, employee: { bg: tokens.greySoft, color: tokens.grey } };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Users & Permissions — every row, filter, sort and page comes from GET /api/users. */
export default function UsersTab() {
  const dlg = useDialog();
  const { user: me } = useAuth();
  const { setViewer } = useAppStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast, show } = useToast();
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [dept, setDept] = useState('');
  const [sort, setSort] = useState('name');
  const [editing, setEditing] = useState(null); // user object | 'new' | null
  // Filters / sort / search always start again from page 1 (page is tied to the filter signature).
  const sig = JSON.stringify([search, role, status, dept, sort]);
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const args = { page, limit: PAGE_SIZE, sort, search, role, status, department: dept };
  const { data, error, isLoading, isFetching, refetch } = useListUsersQuery(args);
  const { data: allUsers } = useListUsersQuery({ limit: 1 });
  const { data: admins } = useListUsersQuery({ role: 'admin', limit: 1 });
  const { data: inactive } = useListUsersQuery({ status: 'inactive', limit: 1 });
  const { data: deptPage } = useListUsersQuery({ limit: 200, fields: 'department', sort: 'department' });
  // The real Department Master list — so a new person is filed under a department that exists, which is
  // what My Activity reads to decide whose shift checklist they get.
  // `labReadiness` comes too: a department that runs a readiness board has units, and the one a
  // person works in is chosen here beside their department and position.
  const { data: deptMaster } = useListDepartmentsQuery({ limit: 200, sort: 'order', fields: 'name,positions,labReadiness' });
  const { data: registry } = useUserModulesQuery();
  const modules = registry?.modules?.length ? registry.modules : MODULES;
  /** The real departments, each with its positions — the dialog needs both. */
  const deptRecords = useMemo(() => deptMaster?.items || [], [deptMaster]);
  /** Department Master first, then any older free-text department still sitting on a user record. */
  const depts = useMemo(() => {
    const master = (deptMaster?.items || []).map(d => d.name);
    const inUse = (deptPage?.items || []).map(u => u.department).filter(Boolean);
    const extra = [...new Set(inUse.filter(n => !master.includes(n)))].sort();
    return [...master, ...extra];
  }, [deptMaster, deptPage]);

  // `/settings?user=<id>` (from the ⌘K server search) opens that person's editor.
  const linkedId = params.get('user');
  const { data: linked } = useGetUserQuery(linkedId, { skip: !linkedId });
  useEffect(() => { if (linkedId && linked) { setEditing(linked); const next = new URLSearchParams(params); next.delete('user'); setParams(next, { replace: true }); } }, [linked, linkedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [update, { isLoading: updating }] = useUpdateUserMutation();
  const [remove, { isLoading: removing }] = useRemoveUserMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();
  const busy = updating || removing || resetting;

  const toggleStatus = async (u) => {
    const next = u.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !await dlg.confirm(`Deactivate ${u.name}? They will lose access to every module until reactivated.`)) return;
    try { await update({ id: u.id, status: next }).unwrap(); show(`✓ ${u.name} is now ${next}.`); } catch (err) { show(err, 'error'); }
  };
  const removeUser = async (u) => {
    if (!await dlg.confirm(`Remove ${u.name} from MyDiary? This cannot be undone.`)) return;
    try { await remove(u.id).unwrap(); show(`✓ ${u.name} removed.`); } catch (err) { show(err, 'error'); }
  };
  const reset = async (u) => {
    const password = await dlg.prompt(`New password for ${u.name} (at least 8 characters):`);
    if (password === null) return;
    try { await resetPassword({ id: u.id, password }).unwrap(); show(`✓ Password reset for ${u.name}. Tell them the new password.`); } catch (err) { show(err, 'error'); }
  };

  /** Click a person → the whole app switches to their view, starting at the dashboard. */
  const viewAs = (u) => { setViewer(u.name, u.title || u.role, u); navigate('/'); };

  const rows = data?.items || [];
  const hasFilters = !!(search || role || status || dept);

  return (
    <>
      <Grid container spacing="12px" sx={{ mb: '16px' }}>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Users" value={allUsers?.total ?? '…'} sub="Accounts on the server" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Admins" value={admins?.total ?? '…'} sub="Full access incl. Settings" accent="amber" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Modules" value={modules.length} sub="Grantable per user" accent="blue" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><SummaryCard label="Inactive" value={inactive?.total ?? '…'} sub="No access" accent={inactive?.total ? 'red' : 'slate'} /></Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1.25, mb: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox placeholder="Search users by name, email, title, department…" value={q} onChange={e => setQ(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 280 } }} />
        <FilterSelect value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</FilterSelect>
        <FilterSelect value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></FilterSelect>
        <FilterSelect value={dept} onChange={e => setDept(e.target.value)}><option value="">All departments</option>{depts.map(d => <option key={d} value={d}>{d}</option>)}</FilterSelect>
        {hasFilters && <Btn size="sm" variant="ghost" onClick={() => { setQ(''); setRole(''); setStatus(''); setDept(''); }}>Clear filters</Btn>}
        <Btn variant="primary" onClick={() => setEditing('new')} sx={{ ml: { sm: 'auto' } }}>+ Add user</Btn>
      </Box>

      <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />

      {!error && !isLoading && rows.length === 0 ? (
        <EmptyState icon="👥" title={hasFilters ? 'No users match' : 'No users yet'} desc={hasFilters ? 'Try a different search or clear the filters.' : 'Add the first user with “+ Add user”.'} />
      ) : !error && (
        <TableContainer sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', boxShadow: tokens.shadowSm }}>
          <Fetching on={isFetching} />
          <Table sx={{ minWidth: 860 }}>
            <TableHead><TableRow>
              <SortCell field="name" sort={sort} onSort={setSort}>User</SortCell>
              <SortCell field="department" sort={sort} onSort={setSort} sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Department</SortCell>
              <SortCell field="role" sort={sort} onSort={setSort}>Role</SortCell>
              <TableCell>Module access</TableCell>
              <SortCell field="status" sort={sort} onSort={setSort}>Status</SortCell>
              <SortCell field="createdAt" sort={sort} onSort={setSort} sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Added</SortCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {isLoading && !rows.length ? <TableRow><TableCell colSpan={7} sx={{ color: tokens.faint, fontSize: 13, py: 3, textAlign: 'center' }}>Loading users…</TableCell></TableRow> : null}
              {rows.map(u => {
                const all = u.role === 'admin';
                const mods = all ? modules : modules.filter(m => (u.modules || []).includes(m.key));
                const self = me?.id === u.id;
                return (
                  <TableRow key={u.id} hover sx={{ opacity: u.status === 'inactive' ? 0.6 : 1 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar name={u.name} size={32} />
                        <Box sx={{ minWidth: 0 }}>
                          {self || u.status !== 'active' ? (
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{u.name}{self ? <Box component="span" sx={{ ml: 0.75, fontFamily: fonts.mono, fontSize: 10, color: tokens.teal }}>YOU</Box> : null}</Typography>
                          ) : (
                            <Typography component="button" type="button" onClick={() => viewAs(u)} title={`See MyDiary as ${u.name}`}
                              sx={{ fontSize: 13, fontWeight: 600, p: 0, border: 'none', bgcolor: 'transparent', fontFamily: 'inherit', color: tokens.ink, cursor: 'pointer', textAlign: 'left', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { color: tokens.teal, textDecoration: 'underline' } }}>
                              {u.name}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: 11.5, color: tokens.faint, fontFamily: fonts.mono }} noWrap>{[u.title, u.email].filter(Boolean).join(' · ')}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{u.department || '—'}</TableCell>
                    <TableCell><Pill bg={(ROLE_STYLE[u.role] || ROLE_STYLE.employee).bg} color={(ROLE_STYLE[u.role] || ROLE_STYLE.employee).color}>{ROLE_LABEL[u.role] || u.role}</Pill></TableCell>
                    <TableCell>
                      <Tooltip title={mods.map(m => m.label).join(' · ')} arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, cursor: 'default' }}>
                          <Pill bg={all ? tokens.tealSoft : tokens.greySoft} color={all ? tokens.teal : tokens.grey}>{all ? 'All modules' : `${mods.length} / ${modules.length}`}</Pill>
                          {!all && <Typography sx={{ fontSize: 11.5, color: tokens.faint, display: { xs: 'none', xl: 'block' } }} noWrap>{mods.slice(0, 2).map(m => m.label).join(', ')}{mods.length > 2 ? ` +${mods.length - 2}` : ''}</Typography>}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell><Pill bg={u.status === 'active' ? tokens.okSoft : tokens.badSoft} color={u.status === 'active' ? tokens.ok : tokens.bad}>{u.status === 'active' ? '● Active' : '○ Inactive'}</Pill></TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontFamily: fonts.mono, fontSize: 12, color: tokens.muted, whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                        {!self && u.status === 'active' && <Btn size="sm" onClick={() => viewAs(u)} title={`See MyDiary as ${u.name}`}>👁 View as</Btn>}
                        <Btn size="sm" onClick={() => setEditing(u)}>✎ Edit</Btn>
                        <Btn size="sm" onClick={() => reset(u)} disabled={busy} title="Reset password">🔑</Btn>
                        {!self && <Btn size="sm" onClick={() => toggleStatus(u)} disabled={busy} title={u.status === 'active' ? 'Deactivate' : 'Activate'}>{u.status === 'active' ? '⏸' : '▶'}</Btn>}
                        {!self && <Btn size="sm" variant="danger" onClick={() => removeUser(u)} disabled={busy} title="Remove user">🗑</Btn>}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pager data={data} page={page} onPage={setPage} loading={isFetching} />
        </TableContainer>
      )}
      <Typography sx={{ fontSize: 12, color: tokens.faint, mt: 1.5 }}>Permissions apply immediately: a user without a module does not see it in the menu and cannot open its pages. Use the “View as” switch in the top bar to check what someone sees.</Typography>

      {editing && <UserDialog user={editing === 'new' ? null : editing} departments={depts} deptRecords={deptRecords} onClose={() => setEditing(null)} onSaved={(msg) => show(msg)} />}
      {toast}
    </>
  );
}
