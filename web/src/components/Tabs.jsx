import { Box, ButtonBase } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';

/**
 * The app's tab strip.
 *
 * A raised segmented bar rather than a bare underline: the row sits in its own sunk trough, and the
 * chosen tab is a white card lifted off it in teal. The old version was a flat line of grey labels
 * with a 2px underline, which on a busy page (a meeting's Agenda · Live · Minutes · AI · Actions ·
 * Decisions) read as six loose words with no sign of which one you were on.
 *
 * Same contract as before — `tabs` of `{ key, label, icon?, count?, countSx? }`, `value`, `onChange` —
 * so every page that already uses it gets the new look with no change.
 */
export default function TabBar({ tabs, value, onChange, sx }) {
  return (
    <Box role="tablist" sx={{ display: 'flex', mb: '18px', maxWidth: '100%', ...sx }}>
      <Box
        sx={{
          // Phone: the trough spans the width and the tabs wrap onto a second row, so none of them
          // is hidden off-screen. Desktop: one inline strip, only as wide as its tabs.
          display: { xs: 'flex', sm: 'inline-flex' },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: { xs: '100%', sm: 'auto' },
          alignItems: 'center',
          gap: '2px',
          p: '4px',
          maxWidth: '100%',
          // A touch deeper than the page canvas, with an inset edge, so the trough reads as
          // recessed and the chosen tab clearly sits on top of it.
          bgcolor: '#E8EDF1',
          border: `1px solid ${tokens.line}`,
          borderRadius: '10px',
          boxShadow: 'inset 0 1px 2px rgba(16,21,28,.05)',
          overflowX: { xs: 'visible', sm: 'auto' },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {tabs.map(t => {
          const active = t.key === value;
          return (
            <ButtonBase
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              sx={{
                minHeight: 34,
                px: { xs: '10px', sm: '14px' },
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                flexShrink: 0,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                letterSpacing: active ? '-0.005em' : 0,
                color: active ? tokens.teal : tokens.grey,
                bgcolor: active ? tokens.card : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(16,21,28,.10), 0 2px 8px rgba(16,21,28,.06)' : 'none',
                transition: 'color .15s ease, background-color .15s ease, box-shadow .15s ease',
                '&:hover': active ? {} : { color: tokens.ink, bgcolor: 'rgba(255,255,255,.62)' },
                '&.Mui-focusVisible': { boxShadow: `0 0 0 2px rgba(15,118,110,.35)` },
              }}
            >
              {t.icon && (
                // Colour only on the tab you are on; the rest sit back in grey.
                <Box component="span" sx={{ fontSize: 13.5, lineHeight: 1, display: 'inline-flex', filter: active ? 'none' : 'grayscale(30%)', opacity: active ? 1 : 0.82 }}>
                  {t.icon}
                </Box>
              )}
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{t.label}</Box>
              {t.count !== undefined && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: fonts.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em',
                    px: '6px', minWidth: 18, height: 18,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: active ? tokens.tealSoft : 'rgba(16,21,28,.07)',
                    color: active ? tokens.teal : tokens.grey,
                    borderRadius: '20px',
                    ...t.countSx,
                  }}
                >
                  {t.count}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Box>
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
