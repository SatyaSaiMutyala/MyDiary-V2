import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import { initials, ownerAvatarColor } from '../../../utils/people';
import HeadCard from '../../myactivity/components/HeadCard';
import { deptRollupRows, deptPeopleRows, sortByLowest, barClassFor } from '../../myactivity/utils';

/* .pd-oversight shell */
function Oversight({ icon, iconSize = 24, title, sub, right, children }) {
  return (
    <Box sx={{ mt: '28px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '12px', overflow: 'hidden', boxShadow: tokens.shadow }}>
      <Box sx={{ p: { xs: '16px 18px', md: '18px 24px' }, background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Box component="span" sx={{ fontSize: iconSize }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Box component="h2" sx={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 700, m: 0 }}>{title}</Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: '3px', letterSpacing: '0.04em' }}>{sub}</Box>
        </Box>
        {right}
      </Box>
      <Box sx={{ p: { xs: '16px 18px', md: '20px 24px' } }}>{children}</Box>
    </Box>
  );
}

function StatTile({ color, label, value, sub }) {
  return (
    <Box sx={{ p: '12px 14px', bgcolor: tokens.cream, borderLeft: `3px solid ${color}`, borderRadius: '6px', height: '100%' }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase' }}>{label}</Box>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 700, mt: '4px' }}>{value}</Box>
      <Box sx={{ fontSize: 11, color: tokens.slate, mt: '2px' }}>{sub}</Box>
    </Box>
  );
}

/** renderOrgOversightBlock — full org oversight (CMD / CGO only) */
export function OrgOversightBlock({ state, facts }) {
  const navigate = useNavigate();
  const rows = deptRollupRows(state.departments, state.activityLog, facts);
  const orgTotal = rows.reduce((s, r) => s + r.total, 0);
  const orgDone = rows.reduce((s, r) => s + r.done, 0);
  const orgPct = orgTotal ? Math.round((orgDone / orgTotal) * 100) : 0;

  const allProjects = state.projects.length;
  const activeProjects = state.projects.filter(p => p.status === 'active').length;
  const atRiskProjects = state.projects.filter(p => p.status === 'at-risk').length;
  const openActions = state.meetings.reduce((s, m) => s + (m.actions || []).filter(a => a.status !== 'done').length, 0);
  const overdueActions = state.meetings.reduce((s, m) => s + (m.actions || []).filter(a => a.status !== 'done' && isOverdue(a.deadline)).length, 0);

  return (
    <Oversight icon="🌐" title="Organisation Oversight — CMD View" sub="All 17 departments · Cross-module rollup · Today"
      right={<Box sx={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 700 }}>{orgPct}%</Box>}>
      <Grid container spacing={1.25} sx={{ mb: '18px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile color={tokens.teal} label="Shift Completion" value={`${orgDone}/${orgTotal}`} sub="tasks ticked today" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile color={tokens.blue} label="Active Projects" value={activeProjects} sub={`of ${allProjects} · ${atRiskProjects} at risk`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile color={tokens.amber} label="Open Meeting Actions" value={openActions} sub={`${overdueActions} overdue`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile color="#7C3AED" label="Decisions on Record" value={state.decisions.length} sub="all time, searchable" /></Grid>
      </Grid>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', mb: '10px' }}>Department Shift Completion — Sorted by Lowest</Box>
      <Grid container spacing={1.25}>
        {sortByLowest(rows).map(r => (
          <Grid key={r.dept.id} size={{ xs: 12, lg: 6 }}>
            <HeadCard icon={r.dept.icon} name={r.dept.name} meta={`${r.people} people · ${r.total} task${r.total !== 1 ? 's' : ''} due today`} done={r.done} total={r.total} pct={r.pct} barClass={barClassFor(r.pct)} onClick={() => navigate(`/departments/${r.dept.id}`)} />
          </Grid>
        ))}
      </Grid>
    </Oversight>
  );
}

/** renderDeptOversightBlock — dept head oversight, only their own department */
export function DeptOversightBlock({ dept, state, facts }) {
  const rows = deptPeopleRows(dept, state.activityLog, facts);
  return (
    <Oversight icon={dept.icon} iconSize={22} title={`${dept.name} — Head View`} sub={`Your department · ${rows.length} ${rows.length === 1 ? 'person' : 'people'} · today's shift completion`}>
      <Grid container spacing={1.25}>
        {sortByLowest(rows).map(r => (
          <Grid key={r.name} size={{ xs: 12, md: 6 }}>
            <HeadCard icon={initials(r.name)} iconSx={{ bgcolor: ownerAvatarColor(r.name), color: '#fff' }} name={r.name} meta={`${r.posName} · ${r.total} task${r.total !== 1 ? 's' : ''} today`} done={r.done} total={r.total} pct={r.pct} barClass={barClassFor(r.pct)} />
          </Grid>
        ))}
      </Grid>
    </Oversight>
  );
}
