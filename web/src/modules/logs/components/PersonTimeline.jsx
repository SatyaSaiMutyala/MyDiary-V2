import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { EmptyState, TextLink } from '../../../components';
import { useListLogsQuery } from '../../../store/api/logsApi';
import { useListMeetingsQuery } from '../../../store/api/meetingsApi';
import { ApiError, Fetching } from '../../settings/components/listUi';
import { groupLogsByDay } from '../utils';
import { DayGroups } from './LogCard';

/** One page of this person's logs — more than anyone has had conversations with one person. */
const LIMIT = 200;

/**
 * renderPersonTimeline — .person-header gradient + "← Back to all people" + day groups.
 * The logs come from GET /api/logs?person=<name>, the meeting count from GET /api/meetings?attendee=<name>.
 */
export default function PersonTimeline({ name, mine, onBack, onOpen, onFocusPerson }) {
  const { data, error, isLoading, isFetching, refetch } = useListLogsQuery({ ...mine, person: name, limit: LIMIT });
  // Meetings are a different module: someone without it simply sees 0 here.
  const { data: meetingData } = useListMeetingsQuery({ attendee: name, limit: 1, fields: 'title' });

  const logs = data?.items || [];
  const person = logs.length ? (logs[0].with.find(p => p.name === name) || { name, type: 'internal' }) : { name, type: 'internal' };
  const openFU = logs.reduce((n, l) => n + (l.openFollowUps ?? (l.followUps || []).filter(f => !f.done).length), 0);
  const stats = [[data?.total ?? 0, 'Discussions'], [meetingData?.total ?? 0, 'Meetings'], [openFU, 'Open FU']];

  return (
    <>
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', p: { xs: '18px', md: '22px 26px' }, borderRadius: tokens.radius, mb: '18px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
        <Box sx={{ width: 68, height: 68, borderRadius: '50%', bgcolor: person.type === 'external' ? tokens.blue : ownerAvatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0, border: '3px solid rgba(255,255,255,0.3)' }}>{initials(name)}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85, mt: '4px' }}>{person.type === 'external' ? '🌐 External' : '👤 TrustLab'}{person.email ? ' · ' + person.email : ''}</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: '20px', ml: { xs: 0, sm: 'auto' } }}>
          {stats.map(([val, lbl]) => (
            <Box key={lbl} sx={{ textAlign: 'center' }}>
              <Box sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{val}</Box>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, mt: '4px' }}>{lbl}</Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ mb: '14px' }}><TextLink onClick={onBack}>← Back to all people</TextLink></Box>
      <ApiError error={error} onRetry={refetch} sx={{ mb: '14px' }} />
      <Fetching on={isFetching} />
      {error || isLoading
        ? null
        : logs.length === 0
          ? <EmptyState icon="💬" title={`No logs with ${name} yet`} />
          : <DayGroups groups={groupLogsByDay(logs)} onOpen={onOpen} onFocusPerson={onFocusPerson} />}
    </>
  );
}
