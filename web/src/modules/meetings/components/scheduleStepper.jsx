import { Box, Typography } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';

const STEPS = ['Meeting Type', 'Basics', 'Agenda', 'Attendees', 'Context'];

/** .stepper — state: { [n]: 'active' | 'done' } */
export default function ScheduleStepper({ states }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: '28px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '8px 8px', md: '10px 14px' }, overflow: 'hidden' }}>
      {STEPS.map((label, i) => {
        const st = states[i + 1];
        const active = st === 'active', done = st === 'done';
        return (
          <Box key={label} sx={{ display: 'contents' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: { xs: '6px 4px', md: '6px 8px' }, flex: 1, minWidth: 0 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: done ? tokens.teal : active ? tokens.greenDeep : tokens.lineSoft, color: done || active ? '#fff' : tokens.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s', outline: active ? `4px solid ${tokens.tealSofter}` : 'none' }}>{i + 1}</Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: active ? tokens.ink : done ? tokens.tealDark : tokens.slate, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: { xs: active ? 'block' : 'none', sm: 'block' } }}>{label}</Typography>
            </Box>
            {i < STEPS.length - 1 && <Box component="span" sx={{ color: tokens.slateSofter, fontSize: 14, flexShrink: 0 }}>›</Box>}
          </Box>
        );
      })}
    </Box>
  );
}
