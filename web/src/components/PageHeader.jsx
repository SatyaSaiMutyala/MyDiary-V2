import { Box, Typography } from '@mui/material';
import Eyebrow from './Eyebrow';
import { tokens, fonts } from '../theme/tokens';

/** AIMS `.phead`: mono eyebrow, 20px bold title, actions right, 2px teal rule; sub-text under the rule. */
export default function PageHeader({ code = 'TL-OPS-DRM-001', parts, icon, title, sub, actions }) {
  return (
    <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, pb: 1.5, borderBottom: `2px solid ${tokens.teal}`, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Eyebrow code={code} parts={parts} sx={{ mb: '3px' }} />
          <Typography component="h1" sx={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1, color: tokens.ink }}>
            {icon && <Box component="span" sx={{ fontSize: 18 }}>{icon}</Box>}{title}
          </Typography>
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>{actions}</Box>}
      </Box>
      {sub && <Typography sx={{ color: tokens.slate, fontSize: 13, maxWidth: 760, mt: 1.25 }}>{sub}</Typography>}
    </Box>
  );
}
