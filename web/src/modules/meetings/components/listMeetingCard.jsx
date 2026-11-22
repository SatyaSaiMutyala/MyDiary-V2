import { Box, Typography } from '@mui/material';
import { tokens, fonts, TYPE_COLORS } from '../../../theme/tokens';
import { TYPES } from '../../../data/meetings';
import { TypePill } from '../../../components';
import { parseDate, formatTime, daysUntil, isToday, DAYS, MONTHS } from '../../../utils/dates';

// .mtg-status variants
const STATUS_SX = {
  scheduled: { bgcolor: tokens.tealSoft, color: tokens.tealDark },
  today: { bgcolor: tokens.yellow, color: tokens.greenDeep },
  completed: { bgcolor: 'rgba(107,107,107,0.15)', color: tokens.slate },
  cancelled: { bgcolor: tokens.redSoft, color: tokens.red },
  'has-actions': { bgcolor: tokens.yellowSoft, color: tokens.amber },
};

/** .mtg-status pill */
export function MtgStatus({ kind, children }) {
  return (
    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, p: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', ...(STATUS_SX[kind] || STATUS_SX.scheduled) }}>
      {children}
    </Box>
  );
}

/** Status badge logic from renderList() */
export function meetingStatusBadge(m) {
  const openActions = (m.actions || []).filter(a => a.status !== 'done').length;
  const totalActions = (m.actions || []).length;
  if (m.status === 'upcoming') {
    if (isToday(m.date)) return <MtgStatus kind="today">◉ Today</MtgStatus>;
    if (daysUntil(m.date) === 1) return <MtgStatus kind="scheduled">Tomorrow</MtgStatus>;
    if (daysUntil(m.date) < 7) return <MtgStatus kind="scheduled">In {daysUntil(m.date)} days</MtgStatus>;
    return <MtgStatus kind="scheduled">Scheduled</MtgStatus>;
  }
  if (m.status === 'completed') {
    if (openActions > 0) return <MtgStatus kind="has-actions">{openActions} action{openActions > 1 ? 's' : ''} open</MtgStatus>;
    if (totalActions > 0) return <MtgStatus kind="completed">All done</MtgStatus>;
    return <MtgStatus kind="completed">Completed</MtgStatus>;
  }
  if (m.status === 'cancelled') return <MtgStatus kind="cancelled">Cancelled</MtgStatus>;
  return null;
}

function MetaItem({ ico, children }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <Box component="span" sx={{ opacity: 0.6, fontSize: 11 }}>{ico}</Box>{children}
    </Box>
  );
}

/** .mtg-card — one row in the My Meetings list */
export default function ListMeetingCard({ m, onClick }) {
  const dt = parseDate(m.date);
  const cancelled = m.status === 'cancelled';
  const tc = TYPE_COLORS[m.type] || TYPE_COLORS.other;
  const extCount = (m.external || []).length;
  const modeIcon = (m.mode || '').split(' ')[0];
  return (
    <Box onClick={onClick} sx={{
      bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${tc.line}`, borderRadius: tokens.radius,
      p: { xs: '16px 16px', md: '18px 22px' }, display: 'grid', gridTemplateColumns: { xs: '56px 1fr', lg: '70px 1fr auto' }, gap: { xs: '14px', md: '20px' }, alignItems: 'center',
      cursor: 'pointer', transition: 'all 0.15s', boxShadow: tokens.shadowSm, opacity: cancelled ? 0.6 : 1,
      '&:hover': { borderColor: tokens.slateSoft, borderLeftColor: tc.line, boxShadow: tokens.shadow, transform: 'translateY(-1px)' },
    }}>
      <Box sx={{ textAlign: 'center', p: '6px', bgcolor: tokens.creamWarm, borderRadius: tokens.radiusSm, minWidth: { xs: 56, lg: 60 } }}>
        <Typography sx={{ fontSize: 11, fontFamily: fonts.mono, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{DAYS[dt.getDay()]}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: fonts.serif, color: tokens.ink, lineHeight: 1.1, m: '2px 0 1px' }}>{dt.getDate()}</Typography>
        <Typography sx={{ fontSize: 10, color: tokens.slate, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{MONTHS[dt.getMonth()]}</Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <TypePill type={m.type} sx={{ mb: '7px' }}>{TYPES[m.type].icon} {TYPES[m.type].name.replace(' Meeting', '')}</TypePill>
        <Typography component="h3" sx={{ fontSize: 15, fontWeight: 700, m: '0 0 6px', letterSpacing: '-0.01em', textDecoration: cancelled ? 'line-through' : 'none', color: tokens.ink }}>{m.title}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: 12, color: tokens.slate }}>
          <MetaItem ico="🕐">{formatTime(m.time)} · {m.dur}</MetaItem>
          <MetaItem ico={modeIcon}>{m.loc}</MetaItem>
          <MetaItem ico="👥">{(m.attendees || []).length} internal</MetaItem>
          {extCount > 0 && <>{' · '}<MetaItem ico="👤">+{extCount} external</MetaItem></>}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: { xs: '1 / -1', lg: 'auto' }, justifyContent: { xs: 'flex-start', lg: 'flex-end' }, mt: { xs: '10px', lg: 0 }, pt: { xs: '10px', lg: 0 }, borderTop: { xs: `1px dashed ${tokens.line}`, lg: 'none' } }}>
        {meetingStatusBadge(m)}
        <Box component="span" sx={{ fontSize: 18, color: tokens.slateSofter }}>›</Box>
      </Box>
    </Box>
  );
}
