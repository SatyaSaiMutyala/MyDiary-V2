import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SearchBox, FilterSelect, EmptyState, Pill } from '../../components';
import { useDebounced } from '../../utils/useDebounced';
import { useListDecisionsQuery } from '../../store/api/decisionsApi';
import { useListMeetingsQuery } from '../../store/api/meetingsApi';
import { ApiError, Fetching, PAGE_SIZE, Pager } from '../settings/components/listUi';
import { tokens, fonts } from '../../theme/tokens';

/** .decision-tag */
function DecisionTag({ children }) {
  return <Pill bg={tokens.creamWarm} color={tokens.slate} size={9} sx={{ p: '2px 8px', borderRadius: '10px', letterSpacing: '0.1em' }}>{children}</Pill>;
}

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** ⚖ Decisions Registry — every row, filter and page comes from GET /api/decisions. */
export default function DecisionsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const [tFilter, setTFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Decisions are filtered by meeting, not by meeting type, so a type filter is resolved to that type's
  // meeting ids first and passed as `meetingId=a,b,c`.
  const { data: typedMeetings } = useListMeetingsQuery({ type: tFilter, limit: 200, fields: 'title' }, { skip: !tFilter });
  const typeIds = tFilter ? (typedMeetings?.items || []).map(m => m.id) : null;
  const waitingForTypes = !!tFilter && !typedMeetings;

  const sig = JSON.stringify([search, tFilter, tagFilter]);
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const args = { page, limit: PAGE_SIZE, search, tag: tagFilter, sort: '-createdAt', ...(typeIds ? { meetingId: typeIds.join(',') } : {}) };
  const { data, error, isLoading, isFetching, refetch } = useListDecisionsQuery(args, { skip: waitingForTypes || (!!typeIds && typeIds.length === 0) });

  const rows = data?.items || [];
  const total = data?.total ?? 0;

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['Meeting Management', 'Decision Log']} icon="⚖" title="Decisions Registry"
        sub="Every decision made in every meeting — searchable, auditable, traceable back to the discussion that produced it." />

      {/* filter row */}
      <Box sx={{ mb: '16px', display: 'flex', gap: '10px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <SearchBox value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decisions by text, dept, tag, person..." sx={{ flex: { xs: '1 1 100%', sm: '1 1 0' }, minWidth: 0 }} />
        <FilterSelect value={tFilter} onChange={(e) => setTFilter(e.target.value)} sx={{ flex: { xs: 1, sm: 'none' } }}>
          <option value="">All types</option>
          <option value="internal">Internal</option><option value="customer">Customer</option>
          <option value="supplier">Supplier</option><option value="consultants">Consultants</option>
          <option value="board">Board</option>
        </FilterSelect>
        <FilterSelect value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} sx={{ flex: { xs: 1, sm: 'none' } }}>
          <option value="">All tags</option>
          <option value="approved">Approved</option><option value="policy">Policy</option>
          <option value="financial">Financial</option><option value="operational">Operational</option>
          <option value="governance">Governance</option>
        </FilterSelect>
      </Box>

      <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />
      <Fetching on={isFetching} />

      {!error && rows.length === 0 ? (
        isLoading || waitingForTypes ? null : <EmptyState icon="⚖" title="No matching decisions" desc="Try broader search terms or clear filters." />
      ) : !error && (
        <Box>
          <Typography component="div" sx={{ mb: '14px', fontSize: 12, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em' }}>
            <strong>{total}</strong> DECISION{total > 1 ? 'S' : ''} FOUND
          </Typography>
          {rows.map(d => {
            const left = d.tags.includes('governance') ? tokens.yellow : d.tags.includes('financial') ? tokens.blue : tokens.teal;
            return (
              <Box key={d.id} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${left}`, borderRadius: tokens.radius, p: '14px 18px', mb: '8px' }}>
                {/* .decision-head */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '6px', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{d.text}</Typography>
                  <Box sx={{ display: 'flex', gap: '4px', ml: { xs: 0, sm: '12px' }, flexShrink: 0, flexWrap: 'wrap' }}>
                    {d.tags.map(t => <DecisionTag key={t}>{t}</DecisionTag>)}
                  </Box>
                </Box>
                {/* .decision-meta */}
                <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em', mt: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <Box component="span">Dept: <Box component="strong" sx={{ color: tokens.ink }}>{d.department}</Box></Box>
                  <Box component="span">Decided by: <Box component="strong" sx={{ color: tokens.ink }}>{d.decidedBy}</Box></Box>
                  <Box component="span">From: <Box component="a" onClick={() => navigate('/meetings/' + d.meetingId)} sx={{ color: tokens.tealDark, textDecoration: 'none', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{d.meetingTitle || 'Unknown'}</Box></Box>
                  <Box component="span">{fmt(d.createdAt)}</Box>
                </Box>
              </Box>
            );
          })}
          <Pager data={data} page={page} onPage={setPage} loading={isFetching} />
        </Box>
      )}
    </Box>
  );
}
