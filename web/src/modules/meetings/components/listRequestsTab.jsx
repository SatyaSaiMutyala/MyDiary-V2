import { Box, Typography } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { Btn, EmptyState, Icon } from '../../../components';
import { useLazyListRequestsQuery, useListRequestsQuery } from '../../../store/api/meetingRequestsApi';
import { usePagedQuery } from '../../../store/usePagedQuery';
import { ApiError, Fetching } from '../../settings/components/listUi';
import { useRequestActions } from './requestActions';

const monoLabel = { fontFamily: fonts.mono, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, fontSize: 11 };

/** "2026-11-22T06:41:13.000Z" → "2026-11-22 06:41" (the stamp format the prototype showed). */
const stamp = (iso) => (iso ? String(iso).slice(0, 16).replace('T', ' ') : '');

function RoutingBadge({ children }) {
  return <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: '#7C3AED', bgcolor: '#F3EDFD', p: '2px 8px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700, ml: '6px', textTransform: 'none', display: 'inline-block' }}>{children}</Box>;
}

/** One request card (renderReqCard in the prototype). direction: 'in' | 'out' */
function RequestCard({ r, direction, busy, onAccept, onPropose, onDecline }) {
  const otherPerson = direction === 'in' ? r.from : (r.onBehalfOf || r.to);
  const statusColor = r.status === 'accepted' ? '#0F8F76' : r.status === 'declined' ? '#C53030' : '#DD6B20';
  const statusIcon = r.status === 'accepted' ? '✓ Accepted' : r.status === 'declined' ? '✗ Declined' : '⏳ Pending';
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${statusColor}`, borderRadius: '8px', p: { xs: '12px 14px', md: '14px 18px' }, mb: '10px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', mb: '8px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="div" sx={{ ...monoLabel, letterSpacing: '0.08em', color: tokens.slate, mb: '4px' }}>
            {direction === 'in' ? 'From' : 'To'}: {otherPerson}
            {r.onBehalfOf && direction === 'in' && <RoutingBadge><Icon name="hybrid" />On behalf of {r.onBehalfOf}</RoutingBadge>}
            {r.routedTo && direction === 'out' && <RoutingBadge><Icon name="hybrid" />Routed through {r.routedTo} (EA)</RoutingBadge>}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.ink, mb: '4px' }}>{r.topic}</Typography>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.tealDark, letterSpacing: '0.04em', fontWeight: 700 }}><Icon name="weekly" />{r.proposedDate} at {r.proposedTime} · {r.durationMin} min</Typography>
          {r.notes && <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '6px', lineHeight: 1.5, fontStyle: 'italic' }}>"{r.notes}"</Typography>}
          {r.responseNote && (
            <Box sx={{ mt: '8px', p: '8px 10px', bgcolor: tokens.cream, borderLeft: `3px solid ${tokens.slateSoft}`, borderRadius: '4px', fontSize: 12, color: tokens.ink }}>
              <strong>{direction === 'in' ? 'Your note' : 'Reply from ' + otherPerson}:</strong> "{r.responseNote}"
            </Box>
          )}
        </Box>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, bgcolor: statusColor, color: '#fff', p: '4px 10px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{statusIcon}</Box>
      </Box>
      {direction === 'in' && r.status === 'pending' && (
        <Box sx={{ display: 'flex', gap: '6px', mt: '10px', pt: '10px', borderTop: `1px dashed ${tokens.line}`, flexWrap: 'wrap' }}>
          <Btn variant="primary" size="sm" sx={{ fontSize: 12 }} disabled={busy} onClick={() => onAccept(r)}>✓ Accept</Btn>
          <Btn size="sm" sx={{ fontSize: 12 }} disabled={busy} onClick={() => onPropose(r)}>↺ Propose Alternative</Btn>
          <Btn variant="danger" size="sm" sx={{ fontSize: 12 }} disabled={busy} onClick={() => onDecline(r)}>✗ Decline</Btn>
        </Box>
      )}
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, letterSpacing: '0.04em', mt: '8px' }}>Requested {stamp(r.createdAt)}{r.respondedAt ? ' · responded ' + stamp(r.respondedAt) : ''}</Typography>
    </Box>
  );
}

/**
 * REQUESTS tab body — two server lists: `box=inbox` (addressed or routed to me) and `box=sent`.
 * Accept / decline / counter all go through the API.
 */
export default function ListRequestsTab({ me, onRequestMeeting }) {
  // A page at a time from each box, rather than a hundred of each on every load.
  const inboxQ = usePagedQuery(useListRequestsQuery, useLazyListRequestsQuery, { box: 'inbox', sort: '-createdAt' });
  const sentQ = usePagedQuery(useListRequestsQuery, useLazyListRequestsQuery, { box: 'sent', sort: '-createdAt' });
  const { accept, decline, propose, busy } = useRequestActions();

  const received = inboxQ.items;
  const sent = sentQ.items;
  const pendingRcv = received.filter(r => r.status === 'pending');
  const sentPending = sent.filter(r => r.status === 'pending');
  const history = [...received, ...sent].filter(r => r.status !== 'pending')
    .filter((r, i, all) => all.findIndex(x => x.id === r.id) === i)
    .sort((a, b) => (b.respondedAt || '').localeCompare(a.respondedAt || ''));
  const cardProps = { onAccept: accept, onPropose: propose, onDecline: decline, busy };
  const error = inboxQ.error || sentQ.error;
  const loading = inboxQ.isLoading || sentQ.isLoading;

  return (
    <Box>
      <Box sx={{ p: '14px 18px', bgcolor: pendingRcv.length ? tokens.yellowSoft : tokens.creamWarm, border: `1px solid ${pendingRcv.length ? tokens.yellow : tokens.line}`, borderRadius: '8px', mb: '18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontSize: 18 }}><Icon name="request" /></Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: tokens.ink }}>{me === 'Pallavi Elisetti' ? 'EA Inbox — Meeting requests for CMD route through you' : 'Meeting Requests'}</Typography>
          <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '2px' }}>{pendingRcv.length ? pendingRcv.length + ' pending your response' : 'Clean inbox — no pending requests'} · {sentPending.length} sent by you still awaiting reply</Typography>
        </Box>
        <Btn variant="primary" size="sm" sx={{ fontSize: 12 }} onClick={onRequestMeeting}><Icon name="request" />Request Meeting</Btn>
      </Box>

      <ApiError error={error} onRetry={() => { inboxQ.refetch(); sentQ.refetch(); }} sx={{ mb: 1.5 }} />
      <Fetching on={inboxQ.isFetching || sentQ.isFetching} />

      {pendingRcv.length > 0 && (
        <>
          <Typography sx={{ ...monoLabel, color: tokens.red, m: '14px 0 10px' }}><Icon name="inbox" />Awaiting your response · {pendingRcv.length}</Typography>
          {pendingRcv.map(r => <RequestCard key={r.id} r={r} direction="in" {...cardProps} />)}
        </>
      )}

      {sentPending.length > 0 && (
        <>
          <Typography sx={{ ...monoLabel, color: tokens.slate, m: '20px 0 10px' }}><Icon name="share" />Sent by you · awaiting their reply · {sentPending.length}</Typography>
          {sentPending.map(r => <RequestCard key={r.id} r={r} direction="out" {...cardProps} />)}
        </>
      )}

      {(inboxQ.more > 0 || sentQ.more > 0) && (
        <Box sx={{ textAlign: 'center', mt: '14px' }}>
          <Btn size="sm" disabled={inboxQ.loadingMore || sentQ.loadingMore}
            onClick={() => { if (inboxQ.more) inboxQ.loadMore(); if (sentQ.more) sentQ.loadMore(); }}>
            {inboxQ.loadingMore || sentQ.loadingMore ? 'Loading…' : `Load ${inboxQ.nextBatch + sentQ.nextBatch} more`}
          </Btn>
          <Box sx={{ ...monoLabel, color: tokens.slate, mt: '6px' }}>
            SHOWING {received.length + sent.length} OF {inboxQ.total + sentQ.total}
          </Box>
        </Box>
      )}

      {history.length > 0 && (
        <>
          <Typography sx={{ ...monoLabel, color: tokens.slate, m: '20px 0 10px' }}><Icon name="policy" />History</Typography>
          {history.map(r => <RequestCard key={r.id} r={r} direction={r.from === me ? 'out' : 'in'} {...cardProps} />)}
        </>
      )}

      {!error && !loading && !pendingRcv.length && !sentPending.length && !history.length && (
        <EmptyState icon={<Icon name="request" />} title="No meeting requests yet" desc={<>Click <strong>Request Meeting</strong> to invite a colleague for a quick chat or sit-down. They'll get a notification and can accept, decline, or propose another time.</>} />
      )}
    </Box>
  );
}
