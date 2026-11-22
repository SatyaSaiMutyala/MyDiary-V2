import { Box, ButtonBase, Typography } from '@mui/material';
import { Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { computeDateLabel } from '../utils';

const VIEWS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['agenda', 'Agenda']];

const navBtnSx = {
  width: 32, height: 32, borderRadius: '6px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, fontSize: 14, cursor: 'pointer', color: tokens.slate, fontFamily: 'inherit', transition: 'all 0.15s',
  '&:hover': { bgcolor: tokens.tealSofter, color: tokens.tealDark, borderColor: tokens.teal },
};

/** .diary-toolbar — view switch · ‹ Today › · Playfair date label · + New Entry / VIEW-ONLY */
export default function DiaryToolbar({ view, date, canEdit, onView, onNavigate, onToday, onNewEntry }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '14px 18px', mb: '14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', boxShadow: tokens.shadowSm }}>
      {/* .diary-view-switch */}
      <Box sx={{ display: 'inline-flex', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '8px', p: '3px' }}>
        {VIEWS.map(([k, label]) => {
          const active = view === k;
          return (
            <ButtonBase key={k} onClick={() => onView(k)} sx={{ p: '8px 14px', bgcolor: active ? tokens.greenDeep : 'transparent', border: 'none', borderRadius: '6px', fontSize: 12, fontWeight: 600, color: active ? '#fff' : tokens.slate, fontFamily: 'inherit', letterSpacing: '0.02em', '&:hover': active ? {} : { color: tokens.ink } }}>{label}</ButtonBase>
          );
        })}
      </Box>
      {/* .diary-date-nav */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <ButtonBase onClick={() => onNavigate(-1)} title="Previous" sx={navBtnSx}>‹</ButtonBase>
        <ButtonBase onClick={onToday} sx={{ ...navBtnSx, width: 'auto', p: '0 14px', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: tokens.ink }}>Today</ButtonBase>
        <ButtonBase onClick={() => onNavigate(1)} title="Next" sx={navBtnSx}>›</ButtonBase>
      </Box>
      <Typography sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: tokens.ink, ml: { xs: 0, sm: '8px' } }}>{computeDateLabel(date, view)}</Typography>
      {/* .diary-right-actions */}
      <Box sx={{ ml: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {canEdit
          ? <Btn variant="primary" onClick={() => onNewEntry()}>+ New Entry</Btn>
          : <Box component="span" sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em' }}>VIEW-ONLY</Box>}
      </Box>
    </Box>
  );
}
