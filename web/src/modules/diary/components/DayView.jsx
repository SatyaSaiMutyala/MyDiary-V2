import { Box } from '@mui/material';
import { tokens } from '../../../theme/tokens';
import { DAYS_LONG } from '../../../utils/dates';
import { toISO, TODAY_ISO, entryOnDate } from '../utils';
import { TimeColumn, HourLines, EventBlock, eventGeometry, evtTimeSx, NowLine, AllDayEvent, AllDayLabel, allDayCellSx, allDayRowSx, HeadDay, headRowSx } from './calendarParts';
import { DiaryEmptyNote, DiaryLoading } from './ViewState';

const COLS = '80px 1fr';

/** renderDayView 10018–10073 */
export default function DayView({ date, entries, onOpenEntry, onNewEntry, loading }) {
  if (loading) return <DiaryLoading />;
  const dtS = toISO(date);
  const isToday = dtS === TODAY_ISO;
  const dayEvents = entries.filter(e => !e.allDay && entryOnDate(e, dtS));
  const allDay = entries.filter(e => e.allDay && entryOnDate(e, dtS));

  return (
    <Box>
      {dayEvents.length + allDay.length === 0 && <DiaryEmptyNote period="on this day" />}
      <Box sx={{ ...headRowSx, gridTemplateColumns: COLS }}>
        <div />
        <HeadDay dow={DAYS_LONG[date.getDay()]} num={date.getDate()} isToday={isToday} />
      </Box>
      {allDay.length > 0 && (
        <Box sx={{ ...allDayRowSx, gridTemplateColumns: COLS }}>
          <AllDayLabel />
          <Box sx={allDayCellSx}>{allDay.map(e => <AllDayEvent key={e.id} e={e} onClick={() => onOpenEntry(e.id)} />)}</Box>
        </Box>
      )}
      {/* .day-view-grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: COLS, minHeight: 600 }}>
        <TimeColumn />
        <Box sx={{ position: 'relative', borderLeft: `1px solid ${tokens.lineSoft}`, minWidth: 0 }}>
          <HourLines dtS={dtS} onNewEntry={onNewEntry} />
          {dayEvents.map(e => {
            if (!e.startTime) return null;
            const g = eventGeometry(e, 32);
            if (!g) return null;
            return (
              <EventBlock key={e.id} e={e} top={g.top} height={g.height} dayView onClick={() => onOpenEntry(e.id)}>
                <Box sx={evtTimeSx}>{e.startTime}{e.endTime ? ' – ' + e.endTime : ''} {e.loc ? '· 📍 ' + e.loc : ''}</Box>
                {e.notes && g.height > 70 ? <Box sx={{ fontSize: 11, opacity: 0.85, mt: '4px' }}>{e.notes.slice(0, 80)}{e.notes.length > 80 ? '…' : ''}</Box> : null}
              </EventBlock>
            );
          })}
          {isToday && <NowLine />}
        </Box>
      </Box>
    </Box>
  );
}
