import { Box, Typography } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';

/** .dept-section with .dept-section-head (cream) + .dept-section-body */
export default function DeptSection({ title, titleColor = tokens.ink, count, countSx, action, headSx, sx, children }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', mb: '18px', overflow: 'hidden', ...sx }}>
      <Box sx={{ p: '14px 18px', bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', ...headSx }}>
        <Typography component="div" sx={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 700, color: titleColor, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {title}
          {count !== undefined && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.08em', fontWeight: 700, ml: '6px', ...countSx }}>{count}</Box>}
        </Typography>
        {action}
      </Box>
      <Box sx={{ p: '14px 18px' }}>{children}</Box>
    </Box>
  );
}

/** grey helper paragraph at the top of each section body */
export function SectionNote({ sx, children }) {
  return <Typography component="div" sx={{ fontSize: 12, color: tokens.slate, mb: '12px', ...sx }}>{children}</Typography>;
}

/** mono column header row above task rows */
export function ColHeader({ columns, cols }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', p: '0 14px 6px', fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', color: tokens.slateSoft, fontWeight: 700, textTransform: 'uppercase' }}>
      {columns.map((c, i) => <Box key={i} sx={c.sx}>{c.label}</Box>)}
    </Box>
  );
}

/** italic "No … yet." line */
export function EmptyLine({ children }) {
  return <Box sx={{ p: '14px', textAlign: 'center', color: tokens.slateSoft, fontStyle: 'italic', fontSize: 12 }}>{children}</Box>;
}
