import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';

/** .activity-entry — grid 32px 1fr auto, dashed divider, last one borderless */
export default function ActivityEntry({ a }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '32px 1fr', sm: '32px 1fr auto' }, gap: '12px', p: '10px 0', alignItems: 'start', borderBottom: `1px dashed ${tokens.lineSoft}`, '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: ownerAvatarColor(a.user), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(a.user)}</Box>
      <Box sx={{ fontSize: 12, lineHeight: 1.55, minWidth: 0, overflowWrap: 'anywhere' }}>
        <Box component="strong" sx={{ color: tokens.ink, fontWeight: 700 }}>{a.user}</Box>{' '}
        <Box component="span" sx={{ color: tokens.tealDark, fontWeight: 600 }}>{a.action}</Box>
      </Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, letterSpacing: '0.04em', fontWeight: 700, whiteSpace: 'nowrap', gridColumn: { xs: '2', sm: 'auto' } }}>{a.at}</Box>
    </Box>
  );
}
