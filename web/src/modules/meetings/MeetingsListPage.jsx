import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokens } from '../../theme/tokens';
import { PageHeader, Btn, SummaryCard, TabBar, SearchBox, FilterSelect, EmptyState, Icon } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { useAppStore } from '../../store/AppStore';
import { useCrumbs } from '../../store/CrumbsContext';
import { useDebounced } from '../../utils/useDebounced';
import { useListMeetingsQuery } from '../../store/api/meetingsApi';
import { useListActionItemsQuery } from '../../store/api/actionItemsApi';
import { useListRequestsQuery } from '../../store/api/meetingRequestsApi';
import { ApiError, Fetching, PAGE_SIZE, Pager } from '../settings/components/listUi';
import ListMeetingCard from './components/listMeetingCard';
import ListRequestsTab from './components/listRequestsTab';
import RequestMeetingModal from './modals/RequestMeetingModal';

const EMPTY = {
  upcoming: { icon: '', desc: 'Click + New Meeting to schedule one.' },
  completed: { icon: '✓', desc: 'Completed meetings with minutes will appear here.' },
  cancelled: { icon: '⊘', desc: 'Cancelled meetings are archived here.' },
};
const OPEN_STATUSES = 'open,in-progress,blocked';
const TABS = ['upcoming', 'completed', 'cancelled', 'requests'];

/** First and last day of the current month as YYYY-MM-DD (for the "This Month" card). */
function monthRange() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const first = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`;
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  return { from: first, to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}` };
}

/** #view-list — My Meetings. Every row, count and page comes from GET /api/meetings. */
export default function MeetingsListPage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  useCrumbs([]); // fall back to the Topbar's route default ("Meetings › My Meetings")
  const me = user?.name || state.viewer.name;

  const tabParam = params.get('tab');
  const tab = TABS.includes(tabParam) ? tabParam : 'upcoming';
  const setTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'upcoming') next.delete('tab'); else next.set('tab', t);
    setParams(next, { replace: true });
  };

  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const [typeFilter, setTypeFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All owners');
  const [reqOpen, setReqOpen] = useState(false);

  // The owner select maps onto the server's viewer-relative filters.
  const ownerArgs = ownerFilter === 'My meetings' ? { mine: 'true' } : ownerFilter === 'Delegated to me' ? { attendee: me } : {};

  // Filters / search always start again from page 1 (page is tied to the filter signature).
  const sig = JSON.stringify([tab, search, typeFilter, ownerFilter]);
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const listArgs = {
    page, limit: PAGE_SIZE, status: tab === 'requests' ? 'upcoming' : tab, search, type: typeFilter,
    sort: tab === 'upcoming' ? 'date,time' : '-date,-time', ...ownerArgs,
  };
  const { data, error, isLoading, isFetching, refetch } = useListMeetingsQuery(listArgs, { skip: tab === 'requests' });

  // Counts / summary cards — one `limit=1` call each, so only the totals travel.
  const month = monthRange();
  const { data: upcomingCt } = useListMeetingsQuery({ status: 'upcoming', limit: 1, fields: 'title' });
  const { data: completedCt } = useListMeetingsQuery({ status: 'completed', limit: 1, fields: 'title' });
  const { data: cancelledCt } = useListMeetingsQuery({ status: 'cancelled', limit: 1, fields: 'title' });
  const { data: monthCt } = useListMeetingsQuery({ status: 'completed', limit: 1, fields: 'title', from: month.from, to: month.to });
  const { data: openCt } = useListActionItemsQuery({ status: OPEN_STATUSES, limit: 1, fields: 'desc' });
  const { data: overdueCt } = useListActionItemsQuery({ overdue: 'true', limit: 1, fields: 'desc' });
  const { data: pendingIn } = useListRequestsQuery({ box: 'inbox', status: 'pending', limit: 1, fields: 'topic' });

  const counts = {
    up: upcomingCt?.total ?? 0, comp: completedCt?.total ?? 0, canc: cancelledCt?.total ?? 0,
    openActions: openCt?.total ?? 0, pastDue: overdueCt?.total ?? 0, month: monthCt?.total ?? 0,
  };
  const rows = data?.items || [];
  const hasFilters = !!(search || typeFilter || ownerFilter !== 'All owners');

  const tabs = [
    { key: 'upcoming', icon: '⌛', label: 'Upcoming', count: counts.up },
    { key: 'completed', icon: '✓', label: 'Completed', count: counts.comp },
    { key: 'cancelled', icon: '⊘', label: 'Cancelled', count: counts.canc },
    { key: 'requests', icon: '', label: 'Requests', count: pendingIn?.total ?? 0, countSx: { bgcolor: tokens.amber, color: '#fff' } },
  ];

  return (
    <Box>
      <PageHeader parts={['Meeting Management']} icon={<Icon name="people" />} title="My Meetings"
        sub="All your meetings in one place — schedule new ones, capture minutes, track action items through to closure."
        actions={<>
          <Btn size="lg" onClick={() => setReqOpen(true)}><Icon name="request" />Request Meeting</Btn>
          <Btn variant="primary" size="lg" onClick={() => navigate('/meetings/new')}>+ New Meeting</Btn>
        </>} />

      {/* .summary-row */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard label="Upcoming" value={upcomingCt ? counts.up : '…'} sub="Next 30 days" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard label="Open Action Items" value={openCt ? counts.openActions : '…'} sub="Across all meetings" accent="amber" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard label="Past Due" value={overdueCt ? counts.pastDue : '…'} sub="Need chasing" accent="red" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard label="This Month" value={monthCt ? counts.month : '…'} sub="Completed meetings" accent="slate" /></Grid>
      </Grid>

      {/* .list-tabs */}
      <TabBar tabs={tabs} value={tab} onChange={setTab} />

      {/* .filter-bar */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '18px', alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <SearchBox placeholder="Search meetings by title, attendee, type…" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: { xs: '1 1 100%', md: 1 } }} />
        <FilterSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={{ flex: { xs: 1, md: 'none' } }}>
          <option value="">All types</option>
          <option value="internal">Internal</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
          <option value="consultants">Consultants</option>
          <option value="board">Board</option>
          <option value="other">Other</option>
        </FilterSelect>
        <FilterSelect value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} sx={{ flex: { xs: 1, md: 'none' } }}>
          <option>All owners</option>
          <option>My meetings</option>
          <option>Delegated to me</option>
        </FilterSelect>
      </Box>

      {/* .mtg-list */}
      {tab === 'requests' ? (
        <ListRequestsTab me={me} onRequestMeeting={() => setReqOpen(true)} />
      ) : (
        <>
          <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />
          <Fetching on={isFetching} />
          {!error && rows.length === 0 ? (
            isLoading ? null : <EmptyState icon={<Icon name={EMPTY[tab].icon} size={28} />} title={hasFilters ? 'No matching meetings' : `No ${tab} meetings`} desc={hasFilters ? 'Try a different search or clear the filters.' : EMPTY[tab].desc} />
          ) : !error && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rows.map(m => <ListMeetingCard key={m.id} m={m} onClick={() => navigate(`/meetings/${m.id}`)} />)}
              </Box>
              <Box sx={{ border: `1px solid ${tokens.line}`, borderTop: 'none', borderRadius: `0 0 ${tokens.radiusSm} ${tokens.radiusSm}`, mt: '-1px' }}>
                <Pager data={data} page={page} onPage={setPage} loading={isFetching} />
              </Box>
            </>
          )}
        </>
      )}

      <RequestMeetingModal open={reqOpen} onClose={() => setReqOpen(false)} />
    </Box>
  );
}
