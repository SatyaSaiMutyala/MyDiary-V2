import { Box } from '@mui/material';
import { tokens } from '../../../theme/tokens';
import { DAYS, startOfWeek } from '../../../utils/dates';
import { toISO, TODAY_ISO, entryOnDate } from '../utils';
import { TimeColumn, HourLines, EventBlock, eventGeometry, evtTimeSx, evtLocSx, NowLine, AllDayEvent, AllDayLabel, allDayCellSx, allDayRowSx, HeadDay, headRowSx } from './calendarParts';

const COLS = '60px repeat(7, 1fr)';

/** renderWeekView 9933–10016 */
export default function WeekView({ date, entries, onOpenEntry, onNewEntry }) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 700 }}>
        {/* .week-head */}
        <Box sx={{ ...headRowSx, gridTemplateColumns: COLS }}>
          <div />
          {days.map(d => {
            const dtS = toISO(d);
            return <HeadDay key={dtS} dow={DAYS[d.getDay()]} num={d.getDate()} isToday={dtS === TODAY_ISO} isWeekend={d.getDay() === 0 || d.getDay() === 6} />;
          })}
        </Box>
        {/* .all-day-row */}
        <Box sx={{ ...allDayRowSx, gridTemplateColumns: COLS }}>
          <AllDayLabel />
          {days.map(d => {
            const dtS = toISO(d);
            const items = entries.filter(e => e.allDay && entryOnDate(e, dtS));
            return <Box key={dtS} sx={allDayCellSx}>{items.map(e => <AllDayEvent key={e.id} e={e} onClick={() => onOpenEntry(e.id)} />)}</Box>;
          })}
        </Box>
        {/* .week-body */}
        <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: COLS, minHeight: 600 }}>
          <TimeColumn />
          {days.map(d => {
            const dtS = toISO(d);
            const isWknd = d.getDay() === 0 || d.getDay() === 6;
            const isToday = dtS === TODAY_ISO;
            const dayEvents = entries.filter(e => !e.allDay && entryOnDate(e, dtS) && e.startTime);
            return (
              <Box key={dtS} sx={{ borderLeft: `1px solid ${tokens.lineSoft}`, position: 'relative', minWidth: 0, background: isToday ? 'linear-gradient(to bottom, rgba(15,143,118,0.03), transparent 150px)' : isWknd ? 'rgba(0,0,0,0.015)' : 'transparent' }}>
                <HourLines dtS={dtS} onNewEntry={onNewEntry} />
                {dayEvents.map(e => {
                  const g = eventGeometry(e, 20);
                  if (!g) return null;
                  return (
                    <EventBlock key={e.id} e={e} top={g.top} height={g.height} onClick={() => onOpenEntry(e.id)}>
                      <Box sx={evtTimeSx}>{e.startTime}{e.endTime ? ' – ' + e.endTime : ''}</Box>
                      {g.height > 50 && e.loc ? <Box sx={evtLocSx}>📍 {e.loc}</Box> : null}
                    </EventBlock>
                  );
                })}
                {isToday && <NowLine />}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
