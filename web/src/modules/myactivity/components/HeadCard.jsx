import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';

/**
 * .ma-head-card — dept / person completion card with flat progress bar.
 *  icon: emoji (dept) · iconSx overrides (avatar colours for people)
 *  barClass: '' | 'amber' | 'red'
 */
export default function HeadCard({ icon, iconSx, name, meta, done, total, pct, barClass = '', onClick }) {
  const bar = barClass === 'red' ? tokens.red : barClass === 'amber' ? tokens.amber : tokens.teal;
  return (
    <Box onClick={onClick} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '16px 18px', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '14px', height: '100%', '&:hover': onClick ? { borderColor: tokens.teal, boxShadow: tokens.shadowSm } : {} }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: tokens.tealSofter, color: tokens.tealDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, ...iconSx }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontWeight: 700, fontSize: 14, color: tokens.ink, mb: '2px' }}>{name}</Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>{meta}</Box>
        <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center', mt: 1 }}>
          <Box sx={{ flex: 1, height: 6, bgcolor: tokens.cream, borderRadius: '3px', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: bar, transition: 'width 0.4s' }} />
          </Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, color: tokens.ink, minWidth: 60, textAlign: 'right' }}>{done}/{total} · {pct}%</Box>
        </Box>
      </Box>
    </Box>
  );
}
