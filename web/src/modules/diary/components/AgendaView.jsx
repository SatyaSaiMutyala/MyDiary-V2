import { Box } from '@mui/material';
import { EmptyState } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { DAYS, MONTHS } from '../../../utils/dates';
import { toISO, TODAY_ISO, entryOnDate, AGENDA_BORDER } from '../utils';

const badgeSx = (bg, color) => ({ fontFamily: fonts.mono, fontSize: 9, bgcolor: bg, color, p: '2px 7px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.04em', display: 'inline-block' });

/** renderAgendaView 10117–10169 — next 21 days grouped by date */
export default function AgendaView({ date, entries, onOpenEntry }) {
  const start = new Date(date);
  const end = new Date(start); end.setDate(end.getDate() + 21);
  const grouped = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = toISO(d);
    const items = entries.filter(e => entryOnDate(e, k)).sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
    grouped.push([k, items]);
  }
  const any = grouped.some(([, items]) => items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, p: '14px 18px' }}>
      {grouped.map(([dtS, items]) => {
        if (!items.length) return null;
        const dt = new Date(dtS + 'T00:00:00');
        const isToday = dtS === TODAY_ISO;
        return (
          <Box key={dtS} sx={{ mb: '18px' }}>
            {/* .agenda-day-label */}
            <Box sx={{ bgcolor: isToday ? tokens.tealSofter : tokens.creamWarm, p: '10px 16px', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: isToday ? tokens.tealDark : tokens.slate, display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `3px solid ${tokens.teal}`, flexWrap: 'wrap' }}>
              {DAYS[dt.getDay()]}
              <Box component="span" sx={{ fontFamily: fonts.serif, fontSize: 18, color: tokens.ink, letterSpacing: '-0.01em', textTransform: 'none' }}>{dt.getDate()} {MONTHS[dt.getMonth()]}</Box>
              {isToday && <Box component="span" sx={{ color: tokens.tealDark, fontWeight: 700 }}>· TODAY</Box>}
              <Box component="span" sx={{ ml: 'auto', fontFamily: fonts.mono, color: tokens.slateSoft }}>{items.length} ITEM{items.length > 1 ? 'S' : ''}</Box>
            </Box>
            {items.map(e => {
              const cat = DIARY_CATS[e.cat] || DIARY_CATS.meeting;
              const people = (e.attendees || []).length + (e.external || []).length;
              return (
                <Box key={e.id} onClick={() => onOpenEntry(e.id)} sx={{ display: 'grid', gridTemplateColumns: { xs: '64px 1fr auto', sm: '110px 1fr auto' }, gap: { xs: '10px', sm: '16px' }, p: { xs: '12px 10px', sm: '14px 16px' }, borderBottom: `1px solid ${tokens.lineSoft}`, cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: tokens.cream } }}>
                  {/* .agenda-time */}
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, letterSpacing: '0.05em', textAlign: 'right', pt: '2px' }}>
                    <Box component="strong" sx={{ display: 'block', color: tokens.ink, fontSize: 13, letterSpacing: '0.02em' }}>{e.allDay ? 'All day' : (e.startTime || '')}</Box>
                    {!e.allDay && e.endTime ? e.endTime : null}
                  </Box>
                  {/* .agenda-main */}
                  <Box sx={{ borderLeft: `3px solid ${AGENDA_BORDER[e.cat] || tokens.teal}`, pl: '14px', minWidth: 0 }}>
                    <Box sx={{ fontSize: 14, fontWeight: 700, mb: '4px' }}>{cat.emoji} {e.title}</Box>
                    <Box sx={{ display: 'flex', gap: '12px', fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', flexWrap: 'wrap' }}>
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{cat.label.toUpperCase()}</Box>
                      {e.loc && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>📍 {e.loc}</Box>}
                      {people > 0 && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>👥 {people} {e.external && e.external.length ? '· ' + e.external.length + ' external' : ''}</Box>}
                    </Box>
                  </Box>
                  {/* .agenda-right-badges */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {e.createdBy === 'ea' && <Box component="span" sx={badgeSx(tokens.yellow, tokens.greenDeep)}>EA</Box>}
                    {e.sourceMeetingId && <Box component="span" sx={badgeSx(tokens.tealSofter, tokens.tealDark)}>MEETING</Box>}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}
      {!any && <EmptyState icon="📅" title="Nothing scheduled" desc="The next 3 weeks are clear. Click + New Entry above to add something." />}
    </Box>
  );
}
