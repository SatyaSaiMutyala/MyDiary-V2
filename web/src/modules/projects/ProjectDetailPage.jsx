import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate, useParams } from 'react-router-dom';
import { Eyebrow, Btn, EmptyState, TabBar } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { useAppStore } from '../../store/AppStore';
import { useCrumbs } from '../../store/CrumbsContext';
import { TODAY, parseDate } from '../../utils/dates';
import { PROJ_STATUSES } from '../../data/projects';
import useProjectActions from './useProjectActions';
import { projectAvgProgress, fmtRange, catOf, STATUS_GRADIENT } from './utils';
import OverviewPane from './components/OverviewPane';
import GanttPane from './components/GanttPane';
import MilestonesPane from './components/MilestonesPane';
import TasksPane from './components/TasksPane';
import TeamPane from './components/TeamPane';
import KpisPane from './components/KpisPane';
import RisksPane from './components/RisksPane';
import ActivityPane from './components/ActivityPane';
import ProjectWizardModal from './modals/ProjectWizardModal';

/** renderProjectDetail() — hero with ring, 4 meta tiles, 8 tabs, panes, footer bar */
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useAppStore();
  const actions = useProjectActions();
  const p = state.projects.find(x => x.id === id);

  const [tab, setTab] = useState('overview');          // CURRENT_PROJECT_TAB
  const [tasksGroupBy, setTasksGroupBy] = useState('status'); // TASKS_GROUP_BY
  const [risksScope, setRisksScope] = useState('all');  // RISKS_SCOPE
  const [ganttZoom, setGanttZoom] = useState('week');   // GANTT_ZOOM
  const [wizDraft, setWizDraft] = useState(null);

  useCrumbs([{ label: 'Meetings', to: '/' }, { label: 'My Projects', to: '/projects' }, { label: p ? p.code : 'Project' }]);

  if (!p) {
    return (
      <>
        <EmptyState icon="📁" title="Project not found" desc="It may have been deleted." />
        <Box sx={{ mt: 2 }}><Btn size="sm" onClick={() => navigate('/projects')}>← Back to Portfolio</Btn></Box>
      </>
    );
  }

  const cat = catOf(p);
  const progress = projectAvgProgress(p);
  const end = parseDate(p.endDate);
  const daysLeft = Math.round((end - TODAY) / 86400000);
  const totalMs = (p.milestones || []).length;
  const doneMs = (p.milestones || []).filter(m => m.status === 'done').length;
  const circ = 2 * Math.PI * 42;
  const offset = circ - (progress / 100) * circ;

  const tabs = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'gantt', icon: '📅', label: 'Timeline' },
    { key: 'milestones', icon: '🏁', label: 'Milestones', count: `${doneMs}/${totalMs}` },
    { key: 'tasks', icon: '✓', label: 'Tasks', count: (p.tasks || []).length },
    { key: 'team', icon: '👥', label: 'Team', count: (p.team || []).length + (p.external || []).length },
    { key: 'kpis', icon: '📈', label: 'KPIs', count: (p.kpis || []).length },
    { key: 'risks', icon: '⚠', label: 'Risks', count: (p.risks || []).filter(r => r.status !== 'mitigated').length },
    { key: 'activity', icon: '💬', label: 'Activity' },
  ];
  const metaTile = (lbl, val) => (
    <Box sx={{ p: '8px 12px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '6px', height: '100%' }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700, mb: '3px' }}>{lbl}</Box>
      <Box sx={{ fontSize: 13, fontWeight: 700 }}>{val}</Box>
    </Box>
  );

  return (
    <>
      <Eyebrow code="TL-OPS-DRM-001" parts={['Project Management', p.code]} />

      {/* .proj-detail-head */}
      <Box sx={{ background: STATUS_GRADIENT[p.status] || STATUS_GRADIENT.active, color: '#fff', p: { xs: '20px', md: '24px 28px' }, borderRadius: tokens.radius, mb: '18px', position: 'relative' }}>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.15em', opacity: 0.85, mb: '4px', fontWeight: 700, textTransform: 'uppercase' }}>{cat.emoji} {cat.label} · {p.code}</Box>
        <Box sx={{ fontFamily: fonts.serif, fontSize: { xs: 22, md: 28 }, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, mb: 1, pr: { md: '130px' } }}>{p.name}</Box>
        <Box sx={{ fontSize: 13, opacity: 0.85, maxWidth: 760, lineHeight: 1.5, mb: '14px', pr: { md: '130px' } }}>{p.description}</Box>

        {/* .pd-progress-outer — absolute right on md+, in flow (centered) on xs */}
        <Box sx={{ position: { xs: 'static', md: 'absolute' }, right: 28, top: '50%', transform: { xs: 'none', md: 'translateY(-50%)' }, textAlign: 'center', mb: { xs: '14px', md: 0 } }}>
          <Box component="svg" viewBox="0 0 100 100" sx={{ width: 100, height: 100 }}>
            <circle cx="50" cy="50" r="42" style={{ stroke: 'rgba(255,255,255,0.15)', fill: 'none', strokeWidth: 8 }} />
            <circle cx="50" cy="50" r="42" strokeDasharray={circ} strokeDashoffset={offset} style={{ fill: 'none', stroke: tokens.yellow, strokeWidth: 8, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.8s' }} />
            <text x="50" y="50" style={{ fontFamily: fonts.serif, fill: '#fff', textAnchor: 'middle', dominantBaseline: 'central', fontSize: 24, fontWeight: 700 }}>{progress}%</text>
          </Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 9, opacity: 0.85, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, mt: '4px' }}>Overall</Box>
        </Box>

        <Box sx={{ pt: '14px', borderTop: '1px solid rgba(255,255,255,0.15)', mr: { md: '130px' } }}>
          <Grid container spacing="12px">
            <Grid size={{ xs: 6, md: 3 }}>{metaTile('Status', `${PROJ_STATUSES[p.status].label} · ${p.priority.toUpperCase()} priority`)}</Grid>
            <Grid size={{ xs: 6, md: 3 }}>{metaTile('Timeline', fmtRange(p.startDate, p.endDate))}</Grid>
            <Grid size={{ xs: 6, md: 3 }}>{metaTile('Days Remaining', daysLeft > 0 ? daysLeft + ' days' : daysLeft === 0 ? 'Today' : Math.abs(daysLeft) + ' days overdue')}</Grid>
            <Grid size={{ xs: 6, md: 3 }}>{metaTile('Owner', p.owner)}</Grid>
          </Grid>
        </Box>
      </Box>

      {/* .proj-detail-tabs → shared GateBook TabBar */}
      <TabBar tabs={tabs} value={tab} onChange={setTab} sx={{ mb: '14px' }} />

      {tab === 'overview' && <OverviewPane p={p} />}
      {tab === 'gantt' && <GanttPane p={p} actions={actions} zoom={ganttZoom} setZoom={setGanttZoom} />}
      {tab === 'milestones' && <MilestonesPane p={p} actions={actions} />}
      {tab === 'tasks' && <TasksPane p={p} actions={actions} groupBy={tasksGroupBy} setGroupBy={setTasksGroupBy} />}
      {tab === 'team' && <TeamPane p={p} />}
      {tab === 'kpis' && <KpisPane p={p} />}
      {tab === 'risks' && <RisksPane p={p} actions={actions} scope={risksScope} setScope={setRisksScope} />}
      {tab === 'activity' && <ActivityPane p={p} actions={actions} />}

      {/* footer bar */}
      <Box sx={{ mt: '20px', p: '16px 20px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>Last updated {p.updatedAt} · Created {p.createdAt}</Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Btn size="sm" onClick={() => navigate('/projects')}>← Back to Portfolio</Btn>
          <Btn size="sm" onClick={() => setWizDraft(JSON.parse(JSON.stringify(p)))}>✎ Edit Project</Btn>
          <Btn size="sm" onClick={() => window.alert('Export project report — PDF summary with all sections, timeline chart, and team view.')}>📤 Export Report</Btn>
        </Box>
      </Box>

      {wizDraft && <ProjectWizardModal key={wizDraft.id} draft={wizDraft} onClose={() => setWizDraft(null)} />}
    </>
  );
}
