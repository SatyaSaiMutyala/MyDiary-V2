import { Box, Typography } from '@mui/material';
import { Btn, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { MONTHS_FULL } from '../../../utils/dates';
import { toISO, TODAY_ISO, entryOnDate } from '../utils';

const SideCard = ({ head, children }) => (
  <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '14px 16px', boxShadow: tokens.shadowSm }}>
    <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{head}</Box>
    {children}
  </Box>
);

const monoSuffixSx = { color: tokens.slate, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.04em', fontWeight: 700 };
const calCountSx = { fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, fontWeight: 700 };

/** .cal-row */
function CalRow({ onClick, check, name, count }) {
  return (
    <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: '8px', p: '7px 0', cursor: 'pointer', fontSize: 12, borderRadius: '4px', '&:hover': { bgcolor: tokens.cream, mx: '-8px', px: '8px' } }}>
      {check}
      <Box component="span" sx={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Box>
      {count}
    </Box>
  );
}
/** .cal-check (+ .unchecked) */
function CalCheck({ checked = true, bg, color = '#fff', children }) {
  return (
    <Box sx={{ width: 14, height: 14, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, bgcolor: checked ? bg : (bg || tokens.cream), color: checked ? color : (bg ? color : 'transparent'), border: checked ? 'none' : `1.5px solid ${tokens.line}`, boxSizing: 'border-box' }}>{children}</Box>
  );
}

export default function SidePanel({ date, entries, ownCount, upcomingMtgs, visibleCals, viewer, owner, onToggleCal, onJump, onSwitchOwner, onNewEntry }) {
  const monthLabel = MONTHS_FULL[date.getMonth()] + ' ' + date.getFullYear();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const selIso = toISO(date);

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    const pDate = new Date(firstDay); pDate.setDate(pDate.getDate() - (startDow - i));
    cells.push({ key: 'p' + i, num: pDate.getDate(), other: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dtS = toISO(new Date(date.getFullYear(), date.getMonth(), day));
    cells.push({ key: dtS, num: day, iso: dtS, isToday: dtS === TODAY_ISO, isSel: dtS === selIso, hasEvt: entries.some(e => entryOnDate(e, dtS)) });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SideCard head={<span><Icon name="monthly" size={13} /> {monthLabel}</span>}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mt: '4px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => (
            <Box key={i} sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slateSoft, textAlign: 'center', p: '4px 0', letterSpacing: '0.04em', fontWeight: 700 }}>{x}</Box>
          ))}
          {cells.map(c => (
            <Box key={c.key} onClick={c.iso ? () => onJump(c.iso) : undefined} sx={{
              textAlign: 'center', p: '5px 0', fontSize: 11, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s', fontFamily: fonts.mono, fontWeight: c.isSel && !c.isToday ? 700 : 600, position: 'relative',
              color: c.other ? tokens.slateSofter : c.isToday ? '#fff' : (c.isSel ? tokens.tealDark : tokens.ink),
              bgcolor: c.isToday ? tokens.greenDeep : (c.isSel ? tokens.tealSoft : 'transparent'),
              '&:hover': { bgcolor: c.isToday ? tokens.greenDeep : tokens.tealSofter },
              ...(c.hasEvt ? { '&::after': { content: '""', position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, bgcolor: c.isToday ? tokens.yellow : tokens.teal, borderRadius: '50%' } } : {}),
            }}>{c.num}</Box>
          ))}
        </Box>
      </SideCard>

      <SideCard head="Calendars">
        <CalRow onClick={() => onToggleCal('own')} check={<CalCheck checked={visibleCals.own} bg={visibleCals.own ? tokens.teal : ''}>{visibleCals.own ? '✓' : ''}</CalCheck>} name="Diary entries" count={<Box component="span" sx={calCountSx}>{ownCount}</Box>} />
        <CalRow onClick={() => onToggleCal('meetings')} check={<CalCheck checked={visibleCals.meetings} bg={visibleCals.meetings ? tokens.tealDark : ''}>{visibleCals.meetings ? '✓' : ''}</CalCheck>} name={<>Meetings <Box component="span" sx={monoSuffixSx}>· auto</Box></>} count={<Box component="span" sx={calCountSx}>{upcomingMtgs}</Box>} />
        {viewer.name === 'Pallavi Elisetti' && owner !== 'Venkata Cherukuri' && (
          <CalRow onClick={() => onSwitchOwner('Venkata Cherukuri')} check={<CalCheck checked={false} bg={tokens.yellow} color="#fff"><Icon name="view" /></CalCheck>} name={<>Venkata's diary <Box component="span" sx={monoSuffixSx}>· delegated</Box></>} />
        )}
        {viewer.name === 'Venkata Cherukuri' && owner === 'Venkata Cherukuri' && (
          <CalRow check={<CalCheck bg={tokens.yellow} color={tokens.greenDeep}>E</CalCheck>} name={<>Shared with: <strong>Pallavi</strong></>} count={<Box component="span" sx={{ ...calCountSx, color: tokens.yellow }}>EA</Box>} />
        )}
      </SideCard>

      <SideCard head="Categories">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(DIARY_CATS).map(([k, v]) => (
            <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 12, cursor: 'pointer' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', flexShrink: 0, bgcolor: v.color }} />
              <Box component="span" sx={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name={v.icon} size={13} />{v.label}</Box>
              <Box component="span" sx={calCountSx}>{entries.filter(e => e.cat === k).length}</Box>
            </Box>
          ))}
        </Box>
      </SideCard>

      <SideCard head="Invite people">
        <Typography sx={{ fontSize: 11, color: tokens.slate, lineHeight: 1.5, m: '0 0 8px' }}>When creating an entry, you can invite internal staff from the TDPL roster, and add external people by name + email — they'll receive a calendar invite.</Typography>
        <Btn size="sm" sx={{ width: '100%', justifyContent: 'center' }} onClick={() => onNewEntry()}>+ Quick Entry</Btn>
      </SideCard>
    </Box>
  );
}
