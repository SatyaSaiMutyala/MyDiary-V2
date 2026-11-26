import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts, TYPE_COLORS } from '../../../theme/tokens';
import { Icon } from '../../../components';

const CARDS = [
  { type: 'internal', icon: '', name: 'Internal', desc: 'Team · Dept · Cross-func' },
  { type: 'customer', icon: '', name: 'Customer', desc: 'B2B · Hospital · Corporate' },
  { type: 'supplier', icon: '', name: 'Supplier', desc: 'Vendor · Equipment · Reagent' },
  { type: 'consultants', icon: '', name: 'Consultants', desc: 'QMS · Legal · Tax · Advisory' },
  { type: 'board', icon: '⚖️', name: 'Board', desc: 'Directors · Committees' },
  { type: 'other', icon: '◦', name: 'Other', desc: 'Anything else' },
];

/** .type-picker — big select + 6 type cards. selected: highlighted type (before the 220ms hand-off) */
export default function ScheduleTypePicker({ selected, onSelect }) {
  return (
    <Box sx={{ background: 'linear-gradient(145deg, #fff, #fcf9f0)', border: `1.5px solid ${tokens.line}`, borderRadius: '14px', p: { xs: '24px 16px', md: '28px 32px' }, boxShadow: tokens.shadow, mb: 3, position: 'relative', overflow: 'hidden',
      '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${tokens.teal}, ${tokens.greenMid}, ${tokens.yellow})` } }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.18em', color: tokens.tealDark, textTransform: 'uppercase', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ bgcolor: tokens.yellow, color: tokens.greenDeep, p: '3px 9px', borderRadius: '10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>First</Box> Step 1 of 5
      </Box>
      <Typography component="h2" sx={{ fontFamily: fonts.serif, fontSize: { xs: 22, md: 26 }, fontWeight: 700, m: '0 0 6px', letterSpacing: '-0.01em' }}>What type of meeting is this?</Typography>
      <Typography sx={{ color: tokens.slate, fontSize: 13, mb: '20px' }}>Pick from the list or click a card below. The rest of the form adapts based on what you choose.</Typography>

      <Box sx={{ position: 'relative' }}>
        <Box component="select" value={selected} onChange={e => onSelect(e.target.value)} sx={{ width: '100%', p: { xs: '14px 44px 14px 14px', md: '18px 48px 18px 20px' }, fontSize: { xs: 14, md: 16 }, fontWeight: 600, bgcolor: '#fff', border: `2px solid ${tokens.line}`, borderRadius: '10px', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s', color: tokens.ink, fontFamily: 'inherit', '&:hover': { borderColor: tokens.teal }, '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: `0 0 0 4px ${tokens.tealSoft}` } }}>
          <option value="">— Choose meeting type —</option>
          <option value="internal"><Icon name="department" /> Internal Meeting (team / dept / cross-functional)</option>
          <option value="customer"><Icon name="handshake" /> Customer Meeting (B2B client, hospital, corporate)</option>
          <option value="supplier"><Icon name="package" /> Supplier Meeting (vendor, equipment, reagent)</option>
          <option value="consultants"><Icon name="consultant" /> Consultants Meeting (QMS, legal, tax, advisory)</option>
          <option value="board">⚖️  Board Meeting (directors, committees, statutory)</option>
          <option value="other">◦  Other Meeting</option>
        </Box>
        <Box component="span" sx={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: tokens.slate, pointerEvents: 'none', fontSize: 18 }}>▾</Box>
      </Box>

      {/* .type-cards: 3 → 2 → 1 columns */}
      <Grid container spacing={1.25} sx={{ mt: '18px' }}>
        {CARDS.map(c => {
          const tc = TYPE_COLORS[c.type];
          const sel = selected === c.type;
          return (
            <Grid key={c.type} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ButtonBase onClick={() => onSelect(c.type)} sx={{ width: '100%', p: '14px 14px 14px 16px', border: `1.5px solid ${sel ? tokens.teal : tokens.line}`, borderRadius: '10px', bgcolor: sel ? tokens.tealSofter : tokens.card, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', textAlign: 'left', position: 'relative', fontFamily: 'inherit', boxShadow: sel ? `0 0 0 3px ${tokens.tealSoft}` : 'none', '&:hover': { borderColor: tokens.teal, bgcolor: tokens.tealSofter, transform: 'translateY(-1px)' } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, bgcolor: tc.soft, color: tc.color }}><Icon name={c.icon} size={18} /></Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1, mb: '3px', color: tokens.ink }}>{c.name}</Typography>
                  <Typography sx={{ fontSize: 10, color: tokens.slate, lineHeight: 1.3, fontFamily: fonts.mono, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{c.desc}</Typography>
                </Box>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
