import { Box, ButtonBase } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';

/** AIMS tabs: underline bar, teal indicator on the active tab, mono count chips. */
export default function TabBar({ tabs, value, onChange, sx }) {
  return (
    <Box sx={{ display: 'flex', gap: 0, mb: '18px', borderBottom: `1px solid ${tokens.line}`, overflowX: 'auto', ...sx }}>
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <ButtonBase key={t.key} onClick={() => onChange(t.key)} sx={{ minHeight: 40, px: '14px', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? tokens.teal : tokens.muted, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', borderBottom: `2px solid ${active ? tokens.teal : 'transparent'}`, mb: '-1px', '&:hover': { color: tokens.teal } }}>
            {t.icon && <span>{t.icon}</span>} {t.label}
            {t.count !== undefined && (
              <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, px: '7px', height: 18, display: 'inline-flex', alignItems: 'center', bgcolor: active ? tokens.tealSoft : tokens.greySoft, color: active ? tokens.teal : tokens.grey, borderRadius: '20px', ...t.countSx }}>{t.count}</Box>
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** AIMS filter chip (`.chip` with click): outlined; active = teal fill. */
export function FilterPill({ active, onClick, count, sx, children }) {
  return (
    <ButtonBase onClick={onClick} sx={{ minHeight: 30, px: '12px', bgcolor: active ? tokens.teal : tokens.card, border: `1px solid ${active ? tokens.teal : tokens.line}`, borderRadius: '20px', fontSize: 12.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px', color: active ? '#fff' : tokens.muted, fontFamily: 'inherit', '&:hover': active ? {} : { borderColor: tokens.teal, color: tokens.teal }, ...sx }}>
      {children}
      {count !== undefined && <Box component="span" sx={{ bgcolor: active ? 'rgba(255,255,255,.22)' : tokens.greySoft, color: active ? '#fff' : tokens.grey, px: '7px', borderRadius: '20px', fontFamily: fonts.mono, fontSize: 11, fontWeight: 600 }}>{count}</Box>}
    </ButtonBase>
  );
}

/** AIMS `.radiobar` segmented choice: bordered group, checked = teal with white text. */
export function Segmented({ options, value, onChange, sx }) {
  return (
    <Box sx={{ display: 'inline-flex', border: `1px solid ${tokens.line}`, borderRadius: '6px', overflow: 'hidden', width: '100%', bgcolor: tokens.card, ...sx }}>
      {options.map((o, i) => {
        const key = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const active = key === value;
        return <ButtonBase key={key} onClick={() => onChange(key)} sx={{ flex: 1, minHeight: 34, px: '12px', bgcolor: active ? tokens.teal : 'transparent', fontSize: 12.5, fontWeight: 500, color: active ? '#fff' : tokens.muted, fontFamily: 'inherit', borderLeft: i ? `1px solid ${tokens.line}` : 'none', '&:hover': active ? {} : { bgcolor: tokens.tealSoft } }}>{label}</ButtonBase>;
      })}
    </Box>
  );
}
