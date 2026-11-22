import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { VISIT_TYPES } from '../../../data/visits';
import { parseDate, DAYS, MONTHS } from '../../../utils/dates';
import { Pill } from '../../../components';
import { avgRating, TYPE_PILL, TYPE_BORDER, OVERALL_PILL } from '../utils';

/** .visit-type-pill */
export function VisitTypePill({ type, sx }) {
  const t = VISIT_TYPES[type] || VISIT_TYPES.other;
  const c = TYPE_PILL[type] || TYPE_PILL.other;
  return <Pill bg={c.bg} color={c.color} size={9} sx={{ p: '3px 8px', borderRadius: '10px', letterSpacing: '0.1em', gap: '5px', ...sx }}>{t.emoji} {t.label}</Pill>;
}
/** .visit-overall-pill */
export function OverallPill({ value, label, sx }) {
  const c = OVERALL_PILL[value] || OVERALL_PILL.satisfactory;
  return <Pill bg={c.bg} color={c.color} size={9} sx={{ p: '3px 8px', borderRadius: '10px', letterSpacing: '0.06em', ...sx }}>{label || value.replace('-', ' ')}</Pill>;
}

/** .visit-card (renderVisitCard) — grid 90px | 1fr | auto, stacking on xs */
export default function VisitCard({ visit: v, onOpen }) {
  const dt = parseDate(v.date);
  const openActions = (v.actionItems || []).length;
  const hasRatings = Object.values(v.ratings || {}).some(r => r > 0);
  const draft = v.status === 'draft';
  return (
    <Grid container spacing={2} onClick={() => onOpen(v.id)}
      sx={{ alignItems: 'center', bgcolor: draft ? tokens.cream : tokens.card, border: `1px ${draft ? 'dashed' : 'solid'} ${tokens.line}`, borderLeft: `4px ${draft ? 'dashed' : 'solid'} ${TYPE_BORDER[v.type] || tokens.teal}`, borderRadius: tokens.radius, p: { xs: '14px 16px', md: '16px 20px' }, mb: '10px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: tokens.shadowSm, '&:hover': { boxShadow: tokens.shadow, borderColor: tokens.slateSoft, borderLeftColor: TYPE_BORDER[v.type] || tokens.teal } }}>
      <Grid size={{ xs: 'auto', md: 'auto' }} sx={{ width: { md: 90 } }}>
        <Box sx={{ textAlign: 'center', p: '6px', bgcolor: tokens.creamWarm, borderRadius: tokens.radiusSm, minWidth: 76 }}>
          <Box sx={{ fontSize: 10, fontFamily: fonts.mono, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{DAYS[dt.getDay()]}</Box>
          <Box sx={{ fontSize: 22, fontWeight: 700, fontFamily: fonts.serif, lineHeight: 1.1, m: '2px 0 1px' }}>{dt.getDate()}</Box>
          <Box sx={{ fontSize: 10, color: tokens.slate, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{MONTHS[dt.getMonth()]}</Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 'grow', md: 'grow' }} sx={{ minWidth: 0 }}>
        <VisitTypePill type={v.type} sx={{ mb: '6px' }} />
        <Box component="h3" sx={{ fontSize: 15, fontWeight: 700, m: '0 0 5px', letterSpacing: '-0.01em' }}>{v.title}</Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: 12, color: tokens.slate }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>🏢 {v.org.name}{v.org.branch ? ' · ' + v.org.branch : ''}</Box>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>📍 {v.org.city || 'TBD'}</Box>
          {v.timeIn && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>🕐 {v.timeIn}{v.timeOut ? ' – ' + v.timeOut : ''}</Box>}
          {v.team && v.team.length > 0 && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>👥 {v.team.length} on team</Box>}
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 'auto' }} sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexWrap: 'wrap', gap: '5px', alignItems: { xs: 'center', md: 'flex-end' } }}>
        <Pill bg={draft ? tokens.yellowSoft : tokens.tealSoft} color={draft ? tokens.amber : tokens.tealDark} size={10} sx={{ p: '4px 10px', borderRadius: '12px', letterSpacing: '0.08em' }}>{draft ? '📝 Draft' : '✓ Submitted'}</Pill>
        {v.overallAssessment && <OverallPill value={v.overallAssessment} />}
        {hasRatings && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.amber, fontWeight: 700, letterSpacing: '0.04em' }}>★ {avgRating(v)} / 5</Box>}
        {openActions > 0 && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.amber, bgcolor: tokens.yellowSoft, p: '2px 7px', borderRadius: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>⚡ {openActions} action{openActions > 1 ? 's' : ''}</Box>}
      </Grid>
    </Grid>
  );
}
