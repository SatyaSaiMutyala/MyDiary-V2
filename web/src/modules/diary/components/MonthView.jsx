import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { toISO, TODAY_ISO, entryOnDate } from '../utils';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** renderMonthView 10075–10115 */
export default function MonthView({ date, entries, onOpenEntry, onJump }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    const pd = new Date(first); pd.setDate(pd.getDate() - (startDow - i));
    cells.push({ key: 'p' + i, num: pd.getDate(), other: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day);
    const dtS = toISO(cellDate);
    cells.push({ key: dtS, num: day, dtS, isToday: dtS === TODAY_ISO, isWknd: cellDate.getDay() === 0 || cellDate.getDay() === 6, events: entries.filter(e => entryOnDate(e, dtS)) });
  }
  const trailing = (7 - (startDow + daysInMonth) % 7) % 7;
  for (let i = 1; i <= trailing; i++) cells.push({ key: 'n' + i, num: i, other: true });

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 560 }}>
        {/* .month-head */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: tokens.creamWarm, borderBottom: `2px solid ${tokens.line}` }}>
          {DOW.map((d, i) => <Box key={d} sx={{ p: '8px 0', textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700, borderLeft: i === 0 ? 'none' : `1px solid ${tokens.lineSoft}` }}>{d}</Box>)}
        </Box>
        {/* .month-body */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 600 }}>
          {cells.map((c, idx) => (
            <Box key={c.key} onClick={c.dtS ? () => onJump(c.dtS) : undefined} sx={{
              borderLeft: idx === 0 ? 'none' : `1px solid ${tokens.lineSoft}`, borderTop: `1px solid ${tokens.lineSoft}`, p: '6px 8px', minHeight: 100, cursor: 'pointer', position: 'relative', transition: 'background 0.1s', minWidth: 0,
              bgcolor: c.other ? tokens.cream : c.isToday ? 'rgba(240,180,41,0.08)' : c.isWknd ? 'rgba(0,0,0,0.015)' : 'transparent',
              opacity: c.other ? 0.55 : 1,
              '&:hover': { bgcolor: tokens.cream },
            }}>
              <Box sx={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: c.isToday ? 13 : 15, mb: '4px', ...(c.isToday ? { bgcolor: tokens.greenDeep, color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}) }}>{c.num}</Box>
              {(c.events || []).slice(0, 3).map(e => {
                const cat = DIARY_CATS[e.cat] || DIARY_CATS.meeting;
                return (
                  <Box key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpenEntry(e.id); }} sx={{ fontSize: 10, p: '2px 6px', borderRadius: '3px', mb: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 600, bgcolor: cat.color + '22', color: cat.color }}>
                    {e.startTime ? e.startTime + ' ' : ''}{e.title}
                  </Box>
                );
              })}
              {c.events && c.events.length > 3 && <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, fontWeight: 700, mt: '2px', letterSpacing: '0.04em' }}>+ {c.events.length - 3} more</Box>}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
