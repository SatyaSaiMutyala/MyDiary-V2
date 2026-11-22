import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Btn, FilterPill, SearchBox, FilterSelect, EmptyState } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { useAppStore } from '../../store/AppStore';
import { PROJ_CATEGORIES } from '../../data/projects';
import ProjectCard from './components/ProjectCard';
import ProjectTemplatesModal from './modals/ProjectTemplatesModal';
import ProjectWizardModal from './modals/ProjectWizardModal';
import useProjectActions from './useProjectActions';
import { overdueMilestones, isMine, blankDraft } from './utils';

const STAT_ACCENT = {
  teal: { bar: tokens.teal, icoBg: tokens.tealSofter, icoColor: tokens.tealDark },
  blue: { bar: tokens.blue, icoBg: tokens.blueSoft, icoColor: tokens.blue },
  red: { bar: tokens.red, icoBg: tokens.redSoft, icoColor: tokens.red },
  yellow: { bar: tokens.yellow, icoBg: tokens.yellowSoft, icoColor: tokens.amber },
};

/** .proj-stat-card */
function StatCard({ accent = 'teal', icon, label, value, sub }) {
  const a = STAT_ACCENT[accent];
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '18px 20px', position: 'relative', overflow: 'hidden', boxShadow: tokens.shadowSm, height: '100%', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: a.bar } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700, mb: '6px' }}>
        <Box component="span" sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: a.icoBg, color: a.icoColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{icon}</Box>{label}
      </Box>
      <Box sx={{ fontSize: 32, fontWeight: 700, fontFamily: fonts.serif, lineHeight: 1 }}>{value}</Box>
      <Box sx={{ fontSize: 12, color: tokens.slate, mt: '4px', '& strong': { color: tokens.ink, fontWeight: 700 } }}>{sub}</Box>
    </Box>
  );
}

/** Portfolio — renderProjects() */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const actions = useProjectActions();
  const me = state.viewer.name;
  const [filter, setFilter] = useState('all');          // PROJ_FILTER
  const [catFilter, setCatFilter] = useState('');        // PROJ_CAT_FILTER
  const [search, setSearch] = useState('');              // PROJ_SEARCH
  const [tplOpen, setTplOpen] = useState(false);
  const [wizDraft, setWizDraft] = useState(null);        // PROJ_DRAFT (null = closed)

  const visible = state.projects;
  const total = visible.length;
  const active = visible.filter(p => p.status === 'active' || p.status === 'at-risk').length;
  const allOverdueMilestones = visible.flatMap(p => overdueMilestones(p));
  const allMilestones = visible.flatMap(p => p.milestones || []);
  const milestonesDone = allMilestones.filter(m => m.status === 'done').length;
  const milestonesInProg = allMilestones.filter(m => m.status === 'in-progress').length;

  const catCounts = {};
  Object.keys(PROJ_CATEGORIES).forEach(k => { catCounts[k] = visible.filter(p => p.category === k).length; });
  const mineCount = visible.filter(p => isMine(p, me)).length;
  const overdueCount = visible.filter(p => overdueMilestones(p).length > 0).length;
  const completedCount = visible.filter(p => p.status === 'completed').length;

  let filtered = visible.slice();
  if (filter === 'mine') filtered = filtered.filter(p => isMine(p, me));
  else if (filter === 'active') filtered = filtered.filter(p => p.status === 'active' || p.status === 'at-risk');
  else if (filter === 'overdue') filtered = filtered.filter(p => overdueMilestones(p).length > 0);
  else if (filter === 'completed') filtered = filtered.filter(p => p.status === 'completed');
  if (catFilter) filtered = filtered.filter(p => p.category === catFilter);
  const q = search.trim().toLowerCase();
  if (q) filtered = filtered.filter(p => [p.name, p.code, p.owner, p.description, ...(p.team || []).map(t => t.name), ...(p.external || []).map(e => e.name)].some(s => (s || '').toLowerCase().includes(q)));

  const openProjectModal = (editId) => {
    if (editId) { const ex = state.projects.find(p => p.id === editId); if (ex) setWizDraft(JSON.parse(JSON.stringify(ex))); }
    else setWizDraft(blankDraft(me, state.projects.length));
  };

  return (
    <>
      <PageHeader parts={['Project Management', 'Portfolio']} icon="📁" title="My Projects"
        sub="Milestones · Deadlines · Revisions · Team Collaboration · Progress Tracking — your full project portfolio across TrustLab."
        actions={<>
          <Btn size="lg" onClick={() => window.alert('Export portfolio report — PDF summary of all projects with status, milestones, and team allocation.')}>📤 Export</Btn>
          <Btn size="lg" variant="primary" onClick={() => openProjectModal()}>+ New Project</Btn>
        </>} />

      <Grid container spacing="12px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard icon="📁" label="Total Projects" value={total} sub={<>{Object.keys(catCounts).filter(k => catCounts[k]).length} categories · all departments</>} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard accent="blue" icon="🏃" label="Active" value={active} sub={<>In motion · {visible.filter(p => p.status === 'at-risk').length} at-risk</>} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard accent="red" icon="⚠" label="Overdue Milestones" value={allOverdueMilestones.length} sub={<>Across <strong>{overdueCount}</strong> project{overdueCount !== 1 ? 's' : ''}</>} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard accent="yellow" icon="🏁" label="Total Milestones" value={allMilestones.length} sub={<><strong>{milestonesDone}</strong> done · <strong>{milestonesInProg}</strong> in progress</>} /></Grid>
      </Grid>

      <Box sx={{ background: `linear-gradient(135deg, ${tokens.card}, ${tokens.creamWarm})`, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${tokens.teal}`, borderRadius: tokens.radius, p: '14px 18px', mb: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 20 }}>📂</Box>
        <Box sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Project Portfolio</Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, letterSpacing: '0.08em', fontWeight: 700 }}>FY 2026-27</Box>
        <Btn size="sm" onClick={() => setTplOpen(true)}>📋 Templates</Btn>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', mb: '14px' }}>
        <SearchBox placeholder="Search projects, owners, teams..." value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: '1 1 220px', maxWidth: { sm: 320 } }} />
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} count={visible.length}>All</FilterPill>
        <FilterPill active={filter === 'mine'} onClick={() => setFilter('mine')} count={mineCount}>Mine</FilterPill>
        <FilterPill active={filter === 'active'} onClick={() => setFilter('active')} count={active}>Active</FilterPill>
        <FilterPill active={filter === 'overdue'} onClick={() => setFilter('overdue')} count={overdueCount}>Overdue</FilterPill>
        <FilterPill active={filter === 'completed'} onClick={() => setFilter('completed')} count={completedCount}>Completed</FilterPill>
        <FilterSelect value={catFilter} onChange={e => setCatFilter(e.target.value)} sx={{ ml: { md: 'auto' } }}>
          <option value="">All Categories</option>
          {Object.entries(PROJ_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label} ({catCounts[k] || 0})</option>)}
        </FilterSelect>
      </Box>

      {filtered.length === 0 ? (
        <EmptyState icon="📁" title="No projects match" desc="Clear filters or create a new project." />
      ) : (
        <Grid container spacing="14px">
          {filtered.map(p => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ProjectCard p={p} onOpen={() => navigate(`/projects/${p.id}`)} onEdit={() => openProjectModal(p.id)} onDuplicate={() => actions.duplicateProject(p.id)} onDelete={() => actions.deleteProject(p.id)} />
            </Grid>
          ))}
        </Grid>
      )}

      {tplOpen && <ProjectTemplatesModal open onClose={() => setTplOpen(false)} onUse={(draft) => setWizDraft(draft)} />}
      {wizDraft && <ProjectWizardModal key={wizDraft.id} draft={wizDraft} onClose={() => setWizDraft(null)} />}
    </>
  );
}
