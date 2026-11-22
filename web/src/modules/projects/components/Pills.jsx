import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { PROJ_STATUSES } from '../../../data/projects';
import { STATUS_PILL, PRIORITY_PILL } from '../utils';
import { FilterPill } from '../../../components';

/** .proj-status-pill */
export function ProjStatusPill({ status, sx }) {
  const s = STATUS_PILL[status] || STATUS_PILL.active;
  return (
    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, p: '3px 9px', borderRadius: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, bgcolor: s.bg, color: s.color, whiteSpace: 'nowrap', ...sx }}>
      {(PROJ_STATUSES[status] || { label: status }).label}
    </Box>
  );
}

/** .proj-priority-pill */
export function ProjPriorityPill({ priority, sx, children }) {
  const s = PRIORITY_PILL[priority] || PRIORITY_PILL.medium;
  return (
    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '2px 7px', borderRadius: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, bgcolor: s.bg, color: s.color, whiteSpace: 'nowrap', display: 'inline-block', ...sx }}>
      {children || priority}
    </Box>
  );
}

/** .kpi-bar-wrap + .kpi-bar (red/amber are flat colours, default is the teal gradient) */
export function KpiBar({ pct, color = '', height = 6, sx }) {
  const bg = color === 'red' ? tokens.red : color === 'amber' ? tokens.yellow : `linear-gradient(90deg, ${tokens.teal}, ${tokens.tealDark})`;
  return (
    <Box sx={{ height, bgcolor: tokens.lineSoft, borderRadius: '3px', overflow: 'hidden', mb: '4px', ...sx }}>
      <Box sx={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: bg, borderRadius: '3px', transition: 'width 0.6s' }} />
    </Box>
  );
}

/** .k-avatar (20px) */
export function KAvatar({ bg, children, size = 20, fontSize = 8, sx }) {
  return <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: bg, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, flexShrink: 0, ...sx }}>{children}</Box>;
}

/** .k-date */
export function KDate({ overdue, children, sx }) {
  return <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: overdue ? tokens.red : tokens.slate, letterSpacing: '0.04em', fontWeight: 700, whiteSpace: 'nowrap', ...sx }}>{children}</Box>;
}

/** Small native select used inside milestone rows / kanban cards (inline-styled in the prototype) */
export function MiniSelect({ value, onChange, options, sx }) {
  return (
    <Box component="select" value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} sx={{ p: '5px 8px', fontSize: 11, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.cream, fontFamily: 'inherit', color: tokens.ink, cursor: 'pointer', ...sx }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Box>
  );
}

/** mono helper text line (12px slate, 0.04em) used above panes */
export function MonoNote({ sx, children }) {
  return <Box sx={{ fontSize: 12, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', '& strong': { color: tokens.ink }, ...sx }}>{children}</Box>;
}

/** .tpl-cat-pill — also used for the Risks scope filter. Now the shared GateBook FilterPill. */
export function TplCatPill({ active, onClick, count, sx, children }) {
  return <FilterPill active={active} onClick={onClick} count={count} sx={sx}>{children}</FilterPill>;
}
