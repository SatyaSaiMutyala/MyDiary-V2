import { Box } from '@mui/material';
import { tokens, TYPE_COLORS } from '../theme/tokens';

/** AIMS chip: tinted background + coloured text, 22px tall, 20px radius, 11px/500. */
export default function Pill({ bg, color, size = 11, sx, children, ...rest }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: size, fontWeight: 500, height: 22, px: '8px', borderRadius: '20px', bgcolor: bg, color, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: 0, ...sx }} {...rest}>
      {children}
    </Box>
  );
}

export const PRIORITY_STYLE = {
  high: { bg: tokens.badSoft, color: tokens.bad },
  medium: { bg: tokens.warnSoft, color: tokens.warn },
  low: { bg: tokens.okSoft, color: tokens.ok },
  critical: { bg: tokens.bad, color: '#fff' },
};
export const STATUS_STYLE = {
  open: { bg: tokens.greySoft, color: tokens.grey },
  'in-progress': { bg: tokens.infoSoft, color: tokens.info },
  done: { bg: tokens.okSoft, color: tokens.ok },
  blocked: { bg: tokens.badSoft, color: tokens.bad },
  overdue: { bg: tokens.bad, color: '#fff' },
  review: { bg: tokens.warnSoft, color: tokens.warn },
  todo: { bg: tokens.greySoft, color: tokens.grey },
};
export const RSVP_STYLE = {
  pending: { bg: tokens.warnSoft, color: tokens.warn },
  accepted: { bg: tokens.okSoft, color: tokens.ok },
  declined: { bg: tokens.badSoft, color: tokens.bad },
  tentative: { bg: tokens.infoSoft, color: tokens.info },
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function PriorityPill({ priority, sx }) {
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.medium;
  return <Pill bg={s.bg} color={s.color} sx={sx}>{priority === 'medium' ? 'Med' : cap(priority)}</Pill>;
}
export function StatusPill({ status, sx, label }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.open;
  return <Pill bg={s.bg} color={s.color} sx={sx}>{label || cap(status.replace('-', ' '))}</Pill>;
}
export function TypePill({ type, children, sx }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.other;
  return <Pill bg={c.soft} color={c.color} sx={{ gap: '5px', ...sx }}>{children}</Pill>;
}
export function RsvpPill({ rsvp, sx }) {
  const labels = { pending: '⌛ Pending', accepted: '✓ Accepted', declined: '✗ Declined', tentative: '? Tentative' };
  const s = RSVP_STYLE[rsvp] || RSVP_STYLE.pending;
  return <Pill bg={s.bg} color={s.color} sx={{ ml: '6px', verticalAlign: 'middle', ...sx }}>{labels[rsvp] || labels.pending}</Pill>;
}
export function Tag({ pri, sx, children }) {
  return <Pill bg={pri ? tokens.warnSoft : tokens.greySoft} color={pri ? tokens.warn : tokens.grey} sx={{ height: 20, px: '7px', ...sx }}>{children}</Pill>;
}
