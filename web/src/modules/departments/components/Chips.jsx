import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { posPill } from '../../../utils/people';
import { DAYS_OF_WEEK, DAYS_OF_WEEK_FULL } from '../../../data/departments';
import { describeWeekly } from '../../../utils/departments';

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** .pos-chips — multi-select position chip picker (All + posPill chips) */
export function PosChips({ positions = [], positionIds, onToggle, onClear }) {
  const ids = Array.isArray(positionIds) ? positionIds : [];
  const isAll = ids.length === 0;
  const title = isAll ? 'All in department' : ids.map(id => (positions.find(x => x.id === id) || {}).name).filter(Boolean).join(', ');
  return (
    <Box title={title} sx={{ display: 'inline-flex', gap: '3px', p: '3px 5px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', alignItems: 'center', flexWrap: 'wrap', maxWidth: 220 }}>
      <Box onClick={onClear} title="Clears all — task applies to everyone in the department" sx={{ ...chipBase, bgcolor: isAll ? tokens.creamWarm : 'transparent', color: isAll ? tokens.slate : tokens.slateSoft, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', p: '0 8px', border: `1px ${isAll ? 'solid' : 'dashed'} ${tokens.slateSoft}`, '&:hover': isAll ? {} : { bgcolor: tokens.cream, color: tokens.slate } }}>All</Box>
      {positions.map(p => {
        const active = ids.includes(p.id);
        return (
          <Box key={p.id} onClick={() => onToggle(p.id)} title={p.name + (active ? ' (tagged)' : '')} sx={{ ...chipBase, bgcolor: active ? tokens.tealDark : 'transparent', color: active ? '#fff' : tokens.slateSoft, '&:hover': active ? {} : { bgcolor: tokens.cream, color: tokens.slate } }}>
            {posPill(p.name)}
          </Box>
        );
      })}
    </Box>
  );
}

const chipBase = {
  minWidth: 28, height: 24, p: '0 7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', borderRadius: '4px',
  transition: 'all 0.12s', userSelect: 'none', border: '1px solid transparent', boxSizing: 'border-box',
};

/** .dow-chips — day-of-week toggle row M T W T F S S (weekend tinted) */
export function DowChips({ daysOfWeek = [], onToggle, title }) {
  return (
    <Box title={title ?? describeWeekly(daysOfWeek)} sx={{ display: 'inline-flex', gap: '2px', p: '2px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px' }}>
      {WEEK_DISPLAY_ORDER.map(dow => {
        const active = (daysOfWeek || []).includes(dow);
        const weekend = dow === 0 || dow === 6;
        return (
          <Box key={dow} onClick={() => onToggle(dow)} title={DAYS_OF_WEEK_FULL[dow]} sx={{ width: 28, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: active ? '#fff' : weekend ? '#A78BFA' : tokens.slateSoft, bgcolor: active ? '#7C3AED' : 'transparent', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.12s', userSelect: 'none', '&:hover': active ? {} : { bgcolor: tokens.cream, color: tokens.slate } }}>
            {DAYS_OF_WEEK[dow].charAt(0)}
          </Box>
        );
      })}
    </Box>
  );
}

/** .dom-group — number input (1-31) + "Last" toggle */
export function DomGroup({ dayOfMonth, onChangeDay, onToggleLast, title }) {
  const isLast = dayOfMonth === 'last';
  const serverNum = isLast ? '' : (dayOfMonth ?? '');
  // Keeps the typed number while focused, so the debounced save behind onChangeDay never fights the caret.
  const ref = useRef(null);
  const [num, setNum] = useState(serverNum);
  useEffect(() => { if (document.activeElement !== ref.current) setNum(serverNum); }, [serverNum]);
  return (
    <Box title={title} sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', p: '2px 4px 2px 2px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px' }}>
      <Box component="input" type="number" min={1} max={31} value={num} disabled={isLast} title="Day of month (1-31)" ref={ref}
        onChange={(e) => { const n = Math.max(1, Math.min(31, +e.target.value || 1)); setNum(e.target.value === '' ? '' : n); onChangeDay(n); }}
        sx={{ width: 44, height: 24, textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, border: 'none', bgcolor: 'transparent', color: isLast ? tokens.slateSoft : tokens.ink, borderRadius: '4px', boxSizing: 'border-box', '&:focus': { outline: '1px solid #2563EB' } }} />
      <Box onClick={onToggleLast} title="Fire on the last day of every month (handles 28/29/30/31 automatically)" sx={{ p: '2px 8px', fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', borderRadius: '4px', bgcolor: isLast ? '#2563EB' : tokens.cream, color: isLast ? '#fff' : tokens.slate, transition: 'all 0.12s', userSelect: 'none', '&:hover': isLast ? {} : { bgcolor: tokens.creamWarm, color: tokens.ink } }}>Last</Box>
    </Box>
  );
}

/** .rag-group with four .rag-mini dots (off / green / amber / red) */
export function RagGroup({ indicator, onChange }) {
  const dots = [
    { key: null, title: 'No status', color: tokens.slateSoft },
    { key: 'green', title: 'GREEN — on track', color: '#0F8F76' },
    { key: 'amber', title: 'AMBER — needs attention', color: '#DD6B20' },
    { key: 'red', title: 'RED — critical', color: '#C53030' },
  ];
  return (
    <Box title="Flag this point red/amber/green or leave blank" sx={{ display: 'inline-flex', gap: '3px', p: '2px', bgcolor: tokens.cream, borderRadius: '12px', border: `1px solid ${tokens.line}` }}>
      {dots.map(dt => {
        const active = (indicator || null) === dt.key;
        return <Box key={String(dt.key)} onClick={() => onChange(dt.key)} title={dt.title} sx={{ width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', bgcolor: active ? dt.color : tokens.card, border: `1px solid ${active ? dt.color : tokens.lineSoft}`, transition: 'all 0.12s', '&:hover': { transform: 'scale(1.15)' } }} />;
      })}
    </Box>
  );
}

/** .obs-del 26×26 remove button used on every row */
export function RowDel({ title, onClick }) {
  return <Box component="button" type="button" title={title} onClick={onClick} sx={{ width: 26, height: 26, p: 0, bgcolor: 'transparent', border: '1px solid transparent', borderRadius: '4px', color: tokens.slateSoft, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', '&:hover': { color: tokens.red, borderColor: tokens.red, bgcolor: tokens.redSoft } }}>×</Box>;
}
