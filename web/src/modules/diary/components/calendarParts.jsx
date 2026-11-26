// Shared lattice pieces for Week + Day views (.week-time-col, .week-hour-line, .diary-event, .all-day-*, .now-line)
import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { START_HOUR, END_HOUR, PX_PER_MIN, NOW_MINS, hourLabel, eventStyle } from '../utils';
import { Icon } from '../../../components';

export const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

/** .week-time-col with .week-time-slot rows */
export function TimeColumn() {
  return (
    <Box sx={{ borderRight: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm }}>
      {HOURS.map((h, i) => (
        <Box key={h} sx={{ height: 48, p: '4px 8px 0', fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, textAlign: 'right', letterSpacing: '0.04em', borderTop: i === 0 ? 'none' : `1px solid ${tokens.lineSoft}`, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>{hourLabel(h)}</Box>
      ))}
    </Box>
  );
}

/** .week-hour-line × 15 — click → open entry modal preset at that hour */
export function HourLines({ dtS, onNewEntry }) {
  return HOURS.map((h, i) => (
    <Box key={h} onClick={() => onNewEntry({ date: dtS, startTime: String(h).padStart(2, '0') + ':00' })} sx={{ height: 48, borderTop: i === 0 ? 'none' : `1px solid ${tokens.lineSoft}`, cursor: 'pointer', transition: 'background 0.1s', boxSizing: 'border-box', '&:hover': { bgcolor: tokens.tealSofter } }} />
  ));
}

/** Geometry for a timed event within the 7am–10pm lattice; null when fully outside */
export function eventGeometry(e, minHeight) {
  const toMin = (t) => { const [h, m] = t.split(':').map(n => +n); return h * 60 + m; };
  const addM = (t, mins) => { const tot = toMin(t) + mins; return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0'); };
  const span = (END_HOUR - START_HOUR) * 60;
  const startMin = toMin(e.startTime) - START_HOUR * 60;
  const endMin = toMin(e.endTime || addM(e.startTime, 60)) - START_HOUR * 60;
  if (endMin <= 0 || startMin >= span) return null;
  const top = Math.max(0, startMin) * PX_PER_MIN;
  const height = Math.max(minHeight, (Math.min(span, endMin) - Math.max(0, startMin)) * PX_PER_MIN);
  return { top, height };
}

/** .diary-event (+ .day-view-event, .by-ea::after "EA") */
export function EventBlock({ e, top, height, dayView, onClick, children }) {
  const s = eventStyle(e.cat);
  return (
    <Box onClick={onClick} sx={{
      position: 'absolute', left: dayView ? 10 : 3, right: dayView ? 10 : 3, top, height,
      bgcolor: s.bg, borderLeft: `3px solid ${s.border}`, color: s.color,
      borderRadius: '5px', p: dayView ? '10px 14px' : '6px 8px', fontSize: dayView ? 13 : 11, cursor: 'pointer',
      overflow: 'hidden', zIndex: 5, transition: 'all 0.1s', boxShadow: tokens.shadowSm, boxSizing: 'border-box',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: tokens.shadow, zIndex: 20 },
      ...(e.createdBy === 'ea' ? { '&::after': { content: '"EA"', position: 'absolute', top: 3, right: 3, fontFamily: fonts.mono, fontSize: 7, bgcolor: tokens.yellow, color: tokens.greenDeep, p: '1px 4px', borderRadius: '6px', fontWeight: 700, letterSpacing: '0.04em' } } : {}),
    }}>
      <Box sx={{ fontWeight: 700, mb: dayView ? '4px' : '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: dayView ? 14 : undefined }}>{e.title}</Box>
      {children}
    </Box>
  );
}
export const evtTimeSx = { fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.04em', opacity: 0.85 };
export const evtLocSx = { fontSize: 10, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: '2px' };

/** .now-line at the demo "now" (11:30) */
export function NowLine() {
  const mins = NOW_MINS - START_HOUR * 60;
  if (mins <= 0 || mins >= (END_HOUR - START_HOUR) * 60) return null;
  return <Box sx={{ position: 'absolute', left: 0, right: 0, top: mins * PX_PER_MIN, height: 2, bgcolor: tokens.red, zIndex: 10, pointerEvents: 'none', '&::before': { content: '""', position: 'absolute', left: -6, top: -4, width: 10, height: 10, bgcolor: tokens.red, borderRadius: '50%' } }} />;
}

/** .all-day-event chip */
export function AllDayEvent({ e, onClick }) {
  const c = DIARY_CATS[e.cat] || DIARY_CATS.meeting;
  return (
    <Box onClick={onClick} sx={{ p: '3px 7px', fontSize: 10, fontWeight: 700, borderRadius: '4px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.03em', bgcolor: c.color + '22', color: c.color }}><Icon name={c.icon} size={10} />{e.title}</Box>
  );
}
/** .all-day-label */
export function AllDayLabel() {
  return <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, letterSpacing: '0.08em', textAlign: 'right', p: '8px 8px 0', textTransform: 'uppercase', fontWeight: 700, borderRight: `1px solid ${tokens.line}` }}>All day</Box>;
}
export const allDayCellSx = { borderLeft: `1px solid ${tokens.lineSoft}`, p: '4px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 };
export const allDayRowSx = { display: 'grid', bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, minHeight: 32 };

/** .week-head-day */
export function HeadDay({ dow, num, isToday, isWeekend }) {
  return (
    <Box sx={{ p: '10px 6px', textAlign: 'center', borderLeft: `1px solid ${tokens.lineSoft}`, fontFamily: fonts.mono, bgcolor: isWeekend ? tokens.cream : 'transparent' }}>
      <Box sx={{ fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700, mb: '4px' }}>{dow}</Box>
      <Box sx={{ fontSize: 20, fontWeight: 700, color: isToday ? '#fff' : tokens.ink, fontFamily: fonts.serif, lineHeight: 1, ...(isToday ? { bgcolor: tokens.greenDeep, borderRadius: '50%', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', m: '0 auto' } : {}) }}>{num}</Box>
    </Box>
  );
}
export const headRowSx = { display: 'grid', borderBottom: `2px solid ${tokens.line}`, bgcolor: tokens.creamWarm };
