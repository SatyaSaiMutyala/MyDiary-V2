import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { Btn, TextLink, TabBar, Icon } from '../../../components';
import { describeWeekly, describeMonthly } from '../../../utils/departments';
import { EMPLOYEES } from '../../../data/employees';
import DeptSection, { SectionNote } from './DeptSection';
import LiveInput, { TimeInput } from './LiveInput';
import { DowChips, DomGroup, RagGroup, RowDel } from './Chips';

const heroInputSx = {
  width: '100%', p: '4px 6px', fontSize: 14, fontWeight: 700, border: '1px solid transparent', bgcolor: 'transparent', color: tokens.ink, borderRadius: '4px', fontFamily: 'inherit',
  '&:focus': { bgcolor: tokens.cream, borderColor: tokens.line, outline: 'none' }, '&::placeholder': { color: tokens.slateSoft, opacity: 1 },
};
const heroTimeSx = { width: 90, fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, p: '4px 6px', border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card, color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none' } };
const heroSubSx = { fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, mt: '6px', letterSpacing: '0.04em' };

function HeroTile({ label, topColor = tokens.teal, children }) {
  return (
    <Box sx={{ p: '12px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '8px', borderTop: `3px solid ${topColor}`, height: '100%' }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700, mb: '5px' }}>{label}</Box>
      {children}
    </Box>
  );
}

/** renderReviewCadenceSection (prototype 12499–12610) */
export default function ReviewCadenceSection({ dept: d, tab, onTab, api }) {
  if (!d.reviewCadence) return null;
  const rc = d.reviewCadence;
  const weeklyDaysLabel = describeWeekly(rc.weekly.daysOfWeek || []);
  const monthlyDayLabel = rc.monthly.dayOfMonth ? describeMonthly(rc.monthly.dayOfMonth) + ' of the month' : 'Not set';
  const agenda = tab === 'weekly' ? (rc.weeklyAgenda || []) : (rc.monthlyAgenda || []);
  const totalPts = (list) => list.reduce((s, sec) => s + (sec.points || []).length, 0);

  const agendaTabs = [
    { key: 'weekly', icon: '', label: 'Weekly Agenda', count: `${(rc.weeklyAgenda || []).length} sections · ${totalPts(rc.weeklyAgenda || [])} points` },
    { key: 'monthly', icon: '', label: 'Monthly Agenda', count: `${(rc.monthlyAgenda || []).length} sections · ${totalPts(rc.monthlyAgenda || [])} points` },
  ];

  return (
    <DeptSection
      sx={{ borderTop: '4px solid #0A6B59' }}
      headSx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff' }}
      titleColor="#fff"
      title={<><Icon name="review" />Review Cadence</>}
      count="Governance forum for this department"
      countSx={{ color: 'rgba(255,255,255,0.75)' }}
    >
      <SectionNote sx={{ mb: '14px' }}>
        A pre-planned review meeting template for this department. Pick when the weekly and monthly reviews happen, who owns them, the systems they draw from — and the standing agenda that's walked every time.
      </SectionNote>

      {/* HERO TILES */}
      <Grid container spacing="10px" sx={{ mb: '14px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HeroTile label="Weekly Cadence">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px', flexWrap: 'wrap' }}>
              <DowChips daysOfWeek={rc.weekly.daysOfWeek || []} title={weeklyDaysLabel} onToggle={(dow) => api.toggleRCWeeklyDow(dow)} />
              <TimeInput value={rc.weekly.time} onCommit={(v) => api.updateRC('weekly.time', v)} sx={heroTimeSx} />
            </Box>
            <Box sx={heroSubSx}>{weeklyDaysLabel} · {rc.weekly.time || '—'} · {rc.weekly.duration || 45}min</Box>
          </HeroTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HeroTile label="Monthly Cadence" topColor="#2563EB">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px', flexWrap: 'wrap' }}>
              <DomGroup dayOfMonth={rc.monthly.dayOfMonth} onChangeDay={(n) => api.updateRC('monthly.dayOfMonth', n)} onToggleLast={() => api.toggleRCMonthlyLast()} />
              <TimeInput value={rc.monthly.time} onCommit={(v) => api.updateRC('monthly.time', v)} sx={heroTimeSx} />
            </Box>
            <Box sx={heroSubSx}>{monthlyDayLabel} · {rc.monthly.time || '—'} · {rc.monthly.duration || 60}min</Box>
          </HeroTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HeroTile label="Dept Owner" topColor="#DD6B20">
            <LiveInput value={rc.owner || ''} placeholder="e.g. HR Head" list="dept-owner-datalist" onCommit={(v) => api.updateRC('owner', v)} sx={heroInputSx} />
            <Box component="datalist" id="dept-owner-datalist">
              {EMPLOYEES.flatMap(g => g.people.map(p => <option key={p.name} value={p.name}>{p.role}</option>))}
            </Box>
          </HeroTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HeroTile label="Primary Systems" topColor="#7C3AED">
            <LiveInput value={(rc.primarySystems || []).join(', ')} placeholder="e.g. LIS, QMS, TruFlow" onCommit={(v) => api.updateRC('primarySystems', v.split(',').map(s => s.trim()).filter(Boolean))} sx={heroInputSx} />
          </HeroTile>
        </Grid>
      </Grid>

      {/* AGENDA TABS */}
      <TabBar tabs={agendaTabs} value={tab} onChange={onTab} sx={{ mt: '20px', mb: '14px' }} />

      {/* AGENDA TEMPLATE */}
      <SectionNote>
        Baseline checklist for every {tab} meeting in this department. Each point can carry a <Box component="span" sx={{ color: '#C53030', fontWeight: 700 }}>RED</Box> / <Box component="span" sx={{ color: '#DD6B20', fontWeight: 700 }}>AMBER</Box> / <Box component="span" sx={{ color: '#0F8F76', fontWeight: 700 }}>GREEN</Box> status flag that gets set during the meeting.
      </SectionNote>

      {agenda.length ? agenda.slice().sort((a, b) => a.order - b.order).map((sec, si) => (
        <Box key={sec.id} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: { xs: '12px 14px', md: '16px 20px' }, mb: '14px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '10px', flexWrap: 'wrap' }}>
            <Box sx={{ width: 30, height: 30, borderRadius: '6px', bgcolor: tokens.tealSofter, color: tokens.tealDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0 }}>{String(si + 1).padStart(2, '0')}</Box>
            <LiveInput value={sec.heading} onCommit={(v) => api.updateRCSection(tab, sec.id, 'heading', v)} sx={{ flex: 1, minWidth: 160, fontFamily: fonts.serif, fontSize: 16, fontWeight: 700, color: tokens.tealDark, border: '1px solid transparent', bgcolor: 'transparent', p: '4px 6px', borderRadius: '4px', '&:focus': { bgcolor: tokens.cream, borderColor: tokens.line, outline: 'none' } }} />
            <Btn size="sm" onClick={() => api.addRCPoint(tab, sec.id)} sx={{ fontSize: 11 }}>+ Point</Btn>
            <RowDel title="Remove this section" onClick={() => api.removeRCSection(tab, sec.id)} />
          </Box>
          {(sec.points || []).map(pt => (
            <Box key={pt.id} sx={{ display: 'grid', gridTemplateColumns: '14px 1fr auto auto 26px', gap: '8px', alignItems: 'center', p: '6px 10px', borderLeft: '2px solid transparent', mb: '3px', '&:hover': { bgcolor: tokens.cream } }}>
              <Box component="span" sx={{ color: tokens.teal, fontSize: 10 }}>●</Box>
              <LiveInput value={pt.text || ''} onCommit={(v) => api.updateRCPoint(tab, sec.id, pt.id, 'text', v)} sx={{ width: '100%', p: '6px 8px', fontSize: 13, border: '1px solid transparent', bgcolor: 'transparent', color: tokens.ink, borderRadius: '4px', fontFamily: 'inherit', '&:focus': { bgcolor: tokens.cream, borderColor: tokens.line, outline: 'none' } }} />
              <RagGroup indicator={pt.indicator} onChange={(v) => api.updateRCPoint(tab, sec.id, pt.id, 'indicator', v)} />
              <Box sx={{ width: 4 }} />
              <RowDel onClick={() => api.removeRCPoint(tab, sec.id, pt.id)} />
            </Box>
          ))}
          <Box sx={{ mt: '6px' }}>
            <TextLink onClick={() => api.addRCPoint(tab, sec.id)}>+ Add point</TextLink>
          </Box>
        </Box>
      )) : (
        <Box sx={{ p: '30px 20px', textAlign: 'center', bgcolor: tokens.creamWarm, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '8px', color: tokens.slate }}>
          <Box sx={{ fontSize: 30, mb: '8px' }}><Icon name="clipboard" /></Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink, mb: '4px' }}>No {tab} agenda yet</Typography>
          <Typography sx={{ fontSize: 12, mb: '12px' }}>Build a reusable checklist that this department walks through every {tab === 'weekly' ? 'week' : 'month'}.</Typography>
        </Box>
      )}

      <Box sx={{ mt: '14px', textAlign: 'right' }}>
        <Btn variant="primary" size="sm" onClick={() => api.addRCSection(tab)}>+ Add Agenda Section</Btn>
      </Box>
    </DeptSection>
  );
}
