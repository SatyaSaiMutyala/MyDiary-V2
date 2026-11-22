import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { CHANNELS } from '../../../data/logs';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { Tag } from '../../../components';

/** .log-with .person-chip — mini avatar + name (+ EXT) */
export function PersonChip({ person, onClick }) {
  const ext = person.type === 'external';
  return (
    <Box component="span" onClick={onClick} sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', p: '3px 8px 3px 4px', bgcolor: ext ? tokens.blueSoft : tokens.cream, color: ext ? tokens.blue : tokens.ink, borderRadius: '12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: tokens.tealSoft, color: tokens.tealDark } }}>
      <Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: ext ? tokens.blue : ownerAvatarColor(person.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{initials(person.name)}</Box>
      {person.name}{ext && <Box component="span" sx={{ fontSize: 8, opacity: 0.7 }}>EXT</Box>}
    </Box>
  );
}

/** .log-entry card (renderLogCard) — grid 90px | 1fr | auto, stacking on xs. onOpen gets the whole log,
 * so the detail modal can draw it at once while GET /api/logs/:id refreshes it. */
export default function LogCard({ log: l, onOpen, onFocusPerson }) {
  const ch = CHANNELS[l.channel] || CHANNELS['in-person'];
  const openFUs = (l.followUps || []).filter(f => !f.done).length;
  return (
    <Grid container spacing={{ xs: 1, sm: '14px' }} onClick={() => onOpen(l)} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: 'none', borderLeft: `4px solid ${ch.color}`, p: '14px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', '&:hover': { bgcolor: tokens.cream } }}>
      <Grid size={{ xs: 12, sm: 'auto' }} sx={{ width: { sm: 90 }, fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, letterSpacing: '0.04em', textAlign: { xs: 'left', sm: 'right' }, pt: '2px', display: { xs: 'flex', sm: 'block' }, alignItems: 'center', gap: 1 }}>
        <Box component="strong" sx={{ display: 'block', color: tokens.ink, fontSize: 14, letterSpacing: '0.02em', mb: '2px' }}>{l.time}</Box>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', mt: { xs: 0, sm: '6px' }, p: '3px 7px', bgcolor: tokens.creamWarm, borderRadius: '10px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, color: ch.color }}>{ch.emoji} {ch.label}</Box>
        {l.duration && <Box component="span" sx={{ display: 'block', fontSize: 10, color: tokens.slateSoft, mt: { xs: 0, sm: '4px' } }}>{l.duration}</Box>}
      </Grid>
      <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: '6px' }}>
          {(l.with || []).map((p, i) => <PersonChip key={i} person={p} onClick={(e) => { e.stopPropagation(); onFocusPerson(p.name); }} />)}
        </Box>
        <Box sx={{ fontSize: 14, fontWeight: 700, mb: '5px', color: tokens.ink, letterSpacing: '-0.01em' }}>{l.topic}</Box>
        <Box sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: '7px' }}>{l.summary}</Box>
        {l.tags && l.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mt: '6px' }}>{l.tags.map(t => <Tag key={t}>{t}</Tag>)}</Box>
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, gap: '4px', alignItems: { xs: 'center', sm: 'flex-end' } }}>
        {openFUs > 0 && <Box sx={{ bgcolor: tokens.yellowSoft, color: tokens.amber, fontFamily: fonts.mono, fontSize: 10, p: '3px 9px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>⚡ {openFUs} follow-up{openFUs > 1 ? 's' : ''}</Box>}
        <Box sx={{ fontSize: 11, color: tokens.slateSoft }}>🔒 {l.privacy === 'private' ? 'private' : 'shared'}</Box>
      </Grid>
    </Grid>
  );
}

/** .log-day-group + .log-day-label — groups come from groupLogsByDay() */
export function DayGroups({ groups, onOpen, onFocusPerson }) {
  return groups.map(g => (
    <Box key={g.dateStr} sx={{ mb: '20px' }}>
      <Box sx={{ bgcolor: g.isToday ? tokens.tealSofter : tokens.creamWarm, p: '8px 16px', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: g.isToday ? tokens.tealDark : tokens.slate, borderLeft: `3px solid ${tokens.teal}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {g.relative} <Box component="span" sx={{ fontFamily: fonts.serif, fontSize: 16, color: tokens.ink, letterSpacing: '-0.01em', textTransform: 'none' }}>· {g.big}</Box>
        <Box component="span" sx={{ ml: 'auto', fontFamily: fonts.mono, color: tokens.slateSoft }}>{g.items.length} LOG{g.items.length > 1 ? 'S' : ''}</Box>
      </Box>
      {g.items.map(l => <LogCard key={l.id} log={l} onOpen={onOpen} onFocusPerson={onFocusPerson} />)}
    </Box>
  ));
}
