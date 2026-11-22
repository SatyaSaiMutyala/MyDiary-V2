import { Box, Typography } from '@mui/material';
import { tokens, fonts, RAIL_BG } from '../theme/tokens';

const ACCENT = { teal: tokens.teal, amber: tokens.gold, yellow: tokens.gold, red: tokens.bad, slate: tokens.slateSoft, blue: tokens.info, purple: tokens.purple };

/** AIMS KPI tile: white card, mono label, 28px mono number, coloured left rule. */
export function SummaryCard({ label, value, sub, accent = 'teal', sx }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', boxShadow: tokens.shadowSm, p: '14px 16px', position: 'relative', overflow: 'hidden', height: '100%', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, bgcolor: ACCENT[accent] || tokens.teal }, ...sx }}>
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tokens.slate, textTransform: 'uppercase', mb: '6px' }}>{label}</Typography>
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 28, fontWeight: 600, color: tokens.ink, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 12, color: tokens.faint, mt: '4px' }}>{sub}</Typography>}
    </Box>
  );
}

export function DmsCard({ label, value, sub, accent = 'teal', sx }) {
  return <SummaryCard label={label} value={value} sub={sub} accent={accent} sx={sx} />;
}

/** Buttons sitting on the dark panel title bar */
const onBar = {
  '& .MuiButtonBase-root': { color: '#fff' },
};

/** AIMS panel (`.card-x`): white, 1px border, soft shadow; with a title → teal title bar with gold rule. */
export function Card({ num, title, sub, right, badge, sx, bodySx, children }) {
  const head = title || right;
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', mb: '16px', boxShadow: tokens.shadowSm, overflow: 'hidden', ...sx }}>
      {head && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', minHeight: 48, px: 1.875, py: 1, bgcolor: tokens.head, color: '#fff', borderBottom: `2px solid ${tokens.headRule}`, ...onBar }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {num !== undefined && <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: 'rgba(255,255,255,.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>{num}</Box>}
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontFamily: fonts.display, fontSize: '0.84rem', fontWeight: 700, letterSpacing: '0.02em', color: '#fff', display: 'flex', alignItems: 'center', gap: 1, lineHeight: 1.25 }}>{title}{badge}</Typography>
              {sub && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.72)', mt: '1px' }}>{sub}</Typography>}
            </Box>
          </Box>
          {right}
        </Box>
      )}
      <Box sx={{ px: 2, py: 1.75, ...bodySx }}>{children}</Box>
    </Box>
  );
}

/** Same panel, mono-label header variant used by form sections. */
export function VSection({ icon, head, meta, sx, bodySx, children }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', mb: '14px', boxShadow: tokens.shadowSm, overflow: 'hidden', ...sx }}>
      <Box sx={{ minHeight: 44, px: 1.875, py: 0.75, bgcolor: tokens.head, color: '#fff', borderBottom: `2px solid ${tokens.headRule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', fontFamily: fonts.display, fontSize: '0.84rem', fontWeight: 700, letterSpacing: '0.02em', ...onBar }}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', textTransform: 'none' }}>{icon && <Box component="span" sx={{ mr: '8px', opacity: 0.9 }}>{icon}</Box>}{head}</Box>
        {meta && <Box component="span" sx={{ color: 'rgba(255,255,255,.75)', fontWeight: 500, fontSize: 11.5, fontFamily: fonts.mono }}>{meta}</Box>}
      </Box>
      <Box sx={{ px: 2, py: 1.75, ...bodySx }}>{children}</Box>
    </Box>
  );
}

/** AIMS empty state: dashed border on the canvas colour. */
export function EmptyState({ icon, title, desc, sx }) {
  return (
    <Box sx={{ textAlign: 'center', p: { xs: 3.5, md: 5 }, bgcolor: tokens.cream, border: `1px dashed ${tokens.line}`, borderRadius: '10px', ...sx }}>
      {icon && <Box sx={{ fontSize: 28, mb: 1, color: tokens.faint }}>{icon}</Box>}
      <Typography sx={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, mb: 0.75 }}>{title}</Typography>
      <Typography component="div" sx={{ fontSize: 13, color: tokens.faint, maxWidth: 440, mx: 'auto' }}>{desc}</Typography>
    </Box>
  );
}

export function MonoHeading({ color = tokens.slate, sx, children }) {
  return <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, color, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, m: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 1, ...sx }}>{children}</Typography>;
}

/** Dark hero band — uses the AIMS rail gradient. */
export function GradientHero({ sx, children }) {
  return <Box sx={{ background: RAIL_BG, color: '#fff', borderRadius: '6px', p: { xs: '18px', md: '22px 26px' }, display: 'flex', alignItems: 'center', gap: 3, mb: '20px', boxShadow: tokens.shadowSm, flexWrap: 'wrap', ...sx }}>{children}</Box>;
}

export function ProgressBar({ pct, color = '', height = 8, sx }) {
  const fill = color === 'red' ? tokens.bad : color === 'amber' ? tokens.warn : tokens.teal;
  return (
    <Box sx={{ height, bgcolor: tokens.tealSoft, borderRadius: height / 2, overflow: 'hidden', ...sx }}>
      <Box sx={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, bgcolor: fill, borderRadius: height / 2, transition: 'width 0.6s' }} />
    </Box>
  );
}
