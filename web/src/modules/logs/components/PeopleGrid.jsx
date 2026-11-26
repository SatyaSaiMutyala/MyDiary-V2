import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { EmptyState, Icon } from '../../../components';
import { ApiError, Fetching } from '../../settings/components/listUi';

/**
 * renderPeopleGrid — auto-fill minmax(240px,1fr) cards. One card per row of GET /api/logs/people, which
 * does the grouping on the server (`count`, `lastDate`, `lastTime` per person).
 */
export default function PeopleGrid({ query, onFocusPerson }) {
  const { data, error, isLoading, isFetching, refetch } = query;
  const people = data?.items || [];
  const head = <><ApiError error={error} onRetry={refetch} sx={{ mb: '14px' }} /><Fetching on={isFetching} /></>;

  if (error) return head;
  if (people.length === 0) {
    if (isLoading) return head;
    return <>{head}<EmptyState icon={<Icon name="people" />} title="No logged conversations yet" desc="Start capturing your discussions to build a timeline per person." /></>;
  }
  return (
    <>
    {head}
    <Grid container spacing="10px">
      {people.map(p => (
        <Grid key={p.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Box onClick={() => onFocusPerson(p.name)} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '14px 16px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: tokens.shadowSm, height: '100%', '&:hover': { boxShadow: tokens.shadow, borderColor: tokens.slateSoft } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: p.type === 'external' ? tokens.blue : ownerAvatarColor(p.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{initials(p.name)}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Box>
                <Box sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700, mt: '2px' }}>{p.type === 'external' ? 'External' : 'Internal'}</Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
              <span><Box component="strong" sx={{ color: tokens.ink, fontFamily: fonts.serif, fontSize: 14 }}>{p.count}</Box> log{p.count > 1 ? 's' : ''}</span>
              <span>last: {p.lastDate.slice(5).replace('-', '/')}</span>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
    </>
  );
}
