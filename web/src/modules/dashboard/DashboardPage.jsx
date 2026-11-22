import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/AppStore';
import { useViewerUser } from '../../auth/useViewerUser';
import { tokens, fonts } from '../../theme/tokens';
import { Avatar } from '../../components';
import { todayFacts } from '../../utils/departments';
import { daysUntil, isOverdue, formatDate, parseDate, MONTHS } from '../../utils/dates';
import { DAYS_OF_WEEK_FULL } from '../../data/departments';
import { useGetActivityQuery, useListAssignmentsQuery, useListDepartmentsQuery } from '../../store/api/departmentsApi';
import { ApiError, Fetching } from '../settings/components/listUi';
import { activityArgs, assignmentFor, shiftStats } from '../myactivity/utils';
import { collectTodoItems } from '../todo/utils';
import { OrgOversightBlock, DeptOversightBlock } from './components/OversightBlocks';

const VIEW_ROUTE = { myactivity: '/my-activity', mytodo: '/todo', list: '/meetings', diary: '/diary', projects: '/projects', logs: '/logs', visits: '/visits', decisions: '/decisions', templates: '/templates', departments: '/departments' };
const TILE_COLOR = { teal: tokens.teal, amber: tokens.amber, red: tokens.red, blue: tokens.blue, purple: '#7C3AED' };
const STAT_COLOR = { red: tokens.red, amber: tokens.amber, teal: tokens.tealDark, '': tokens.ink };

/* .pd-section-label */
function SectionLabel({ children }) {
  return <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700, m: '24px 0 10px' }}>{children}</Box>;
}

/* .pd-today-tile */
function TodayTile({ color = 'teal', onClick, lbl, val, sub, ring, ringCirc, ringOffset }) {
  return (
    <Box onClick={onClick} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '16px 18px', cursor: 'pointer', borderLeft: `4px solid ${TILE_COLOR[color]}`, transition: 'all 0.15s', position: 'relative', height: '100%', '&:hover': { boxShadow: tokens.shadow, transform: 'translateY(-1px)' } }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</Box>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 36, fontWeight: 700, color: tokens.ink, lineHeight: 1, mt: 1 }}>{val}</Box>
      <Box sx={{ fontSize: 12, color: tokens.slate, mt: '6px' }}>{sub}</Box>
      {ring != null && (
        <Box sx={{ position: 'absolute', top: 14, right: 14, width: 44, height: 44 }}>
          <Box component="svg" viewBox="0 0 44 44" sx={{ width: 44, height: 44 }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke={tokens.cream} strokeWidth="5" />
            <circle cx="22" cy="22" r="18" fill="none" stroke={tokens.tealDark} strokeWidth="5" strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.3s' }} />
            <text x="22" y="22" fill={tokens.ink} fontFamily={fonts.mono} fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="central">{ring}%</text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* .pd-module-card */
function ModuleCard({ c, onClick }) {
  return (
    <Box onClick={onClick} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', minHeight: 160, height: '100%', '&:hover': { boxShadow: tokens.shadowLg, borderColor: tokens.slateSoft, transform: 'translateY(-2px)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: tokens.tealSofter, color: tokens.tealDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</Box>
        <Box sx={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 700, color: tokens.ink }}>{c.title}</Box>
      </Box>
      <Box sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, mt: '4px', flex: 1 }}>{c.snippet}</Box>
      <Box sx={{ display: 'flex', gap: '14px', p: '10px 0', mt: 1, borderTop: `1px dashed ${tokens.line}`, fontFamily: fonts.mono }}>
        {c.stats.map((s, i) => (
          <Box key={i} sx={{ fontSize: 11, color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em' }}>
            <Box component="span" sx={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 700, color: STAT_COLOR[s.cls || ''], display: 'block', lineHeight: 1 }}>{s.n}</Box>{s.l}
          </Box>
        ))}
      </Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.tealDark, mt: 'auto', letterSpacing: '0.04em', fontWeight: 700 }}>{c.foot}</Box>
    </Box>
  );
}

export default function DashboardPage() {
  const { state } = useAppStore();
  const { viewer, isSelf } = useViewerUser();
  const navigate = useNavigate();
  const go = (view) => view && navigate(VIEW_ROUTE[view] || '/');

  const me = viewer.name;
  const facts = todayFacts();
  const { today, todayStr, dow } = facts;

  // Department Master feeds the shift tiles, the module card and the oversight bands.
  const { data: deptList, error: deptErr, isFetching: deptFetching, refetch: refetchDepts } = useListDepartmentsQuery({ limit: 200, sort: 'order' });
  const { data: assignments, error: assignErr } = useListAssignmentsQuery();
  const departments = deptList?.items || [];
  const assignment = assignmentFor(assignments, me);
  const dept = departments.find(d => d.id === assignment.departmentId);
  const position = dept ? (dept.positions || []).find(p => p.id === assignment.positionId) : null;
  const isCMD = assignment.role === 'cmd';
  const isCGO = assignment.role === 'cgo';
  const isHead = assignment.role === 'head' || isCMD || isCGO;

  // One read of today's ticks, scoped to what this person is allowed to roll up.
  const scope = isCMD || isCGO ? 'org' : (isHead && dept ? 'department' : 'me');
  const { data: activityLog = {}, isFetching: activityFetching } = useGetActivityQuery(
    activityArgs({ date: todayStr, person: me, isSelf, scope, departmentId: dept?.id }),
    { skip: scope === 'department' && !dept },
  );

  const hour = new Date().getHours(); // real clock for the greeting only (TODAY is the simulated date)
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ===== MY ACTIVITY STATS =====
  const ma = dept ? shiftStats(activityLog, me, dept, assignment.positionId, assignment.role, facts) : { total: 0, done: 0, pct: 0 };
  const maDone = ma.done, maTotal = ma.total, maPct = ma.pct;
  const maRingCirc = 2 * Math.PI * 18;
  const maRingOffset = maRingCirc - (maPct / 100) * maRingCirc;

  // ===== MY TO-DO STATS =====
  const allTodos = collectTodoItems(state);
  const myTodos = allTodos.filter(x => x.owner === me);
  const myOpenTodos = myTodos.filter(x => x.status !== 'done').length;
  const myOverdueTodos = myTodos.filter(x => x.status !== 'done' && isOverdue(x.deadline)).length;

  // ===== MY MEETINGS STATS =====
  const myMeetingsToday = state.meetings.filter(m => m.date === todayStr && m.status === 'upcoming');
  const nextMeeting = state.meetings.filter(m => m.status === 'upcoming' && m.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))[0];
  const myMeetingsWeek = state.meetings.filter(m => m.status === 'upcoming' && daysUntil(m.date) <= 7).length;

  // ===== MY DIARY / LOGS / VISITS / PROJECTS =====
  const diaryTodayCt = state.diaryEntries.filter(e => e.date === todayStr).length;
  const myProjectsOwned = state.projects.filter(p => p.owner === me || (p.team || []).some(t => t.name === me));
  const myActiveProjects = myProjectsOwned.filter(p => p.status === 'active' || p.status === 'at-risk' || p.status === 'planning').length;
  const myAtRiskProjects = myProjectsOwned.filter(p => p.status === 'at-risk').length;
  const myLogsCt = state.discussionLogs.filter(l => l.owner === me).length;
  const myVisitsCt = state.visits.filter(v => v.owner === me).length;
  const decisionsCt = state.decisions.length;

  // ===== Priority tile =====
  const priorityTile = (() => {
    if (myOverdueTodos > 0) return { lbl: '⚠ Attention', val: myOverdueTodos, sub: 'task' + (myOverdueTodos > 1 ? 's' : '') + ' overdue right now', color: 'red', target: 'mytodo' };
    if (maTotal > 0 && maPct < 50) return { lbl: '🌅 Your Shift', val: maDone + '/' + maTotal, sub: maPct + '% done — keep going', color: 'amber', target: 'myactivity', ring: maPct };
    if (myMeetingsToday.length) return { lbl: '📅 Today', val: myMeetingsToday.length, sub: 'meeting' + (myMeetingsToday.length > 1 ? 's' : '') + ' on your calendar', color: 'blue', target: 'list' };
    if (maTotal > 0 && maPct === 100) return { lbl: '🎉 Clean close', val: 'Done', sub: 'all shift tasks ticked for today', color: 'teal', target: 'myactivity' };
    return { lbl: '✓ Clear slate', val: '—', sub: 'no priority items flagged', color: 'teal', target: null };
  })();

  // ===== Module cards =====
  const D = departments;
  const moduleCards = [
    { icon: '✍', title: 'My Activity', view: 'myactivity',
      snippet: dept ? (dept.name + ' · ' + (position ? position.name : 'All positions') + '. Your daily shift checklist.') : 'Set your department to see your daily checklist.',
      stats: [{ n: maDone + '/' + maTotal, l: 'Today', cls: maPct === 100 ? 'teal' : maPct < 50 ? 'red' : '' }, { n: maPct + '%', l: 'Done', cls: '' }],
      foot: dept ? 'Open My Activity →' : 'Set up department →' },
    { icon: '✅', title: 'My To-Do', view: 'mytodo',
      snippet: myOpenTodos ? (myOpenTodos + ' task' + (myOpenTodos > 1 ? 's' : '') + ' assigned to you across meetings, visits & ad-hoc.') : 'Clean inbox — no open tasks owed by you.',
      stats: [{ n: myOpenTodos, l: 'Open', cls: '' }, { n: myOverdueTodos, l: 'Overdue', cls: myOverdueTodos ? 'red' : '' }],
      foot: 'Open My To-Do →' },
    { icon: '👥', title: 'My Meetings', view: 'list',
      snippet: nextMeeting ? ('Next: ' + (nextMeeting.title.length > 44 ? nextMeeting.title.slice(0, 44) + '…' : nextMeeting.title) + ' — ' + formatDate(parseDate(nextMeeting.date))) : 'No upcoming meetings scheduled.',
      stats: [{ n: myMeetingsToday.length, l: 'Today', cls: myMeetingsToday.length ? 'teal' : '' }, { n: myMeetingsWeek, l: '7 days', cls: '' }],
      foot: 'Open My Meetings →' },
    { icon: '📅', title: 'My Diary', view: 'diary',
      snippet: diaryTodayCt ? (diaryTodayCt + ' event' + (diaryTodayCt > 1 ? 's' : '') + ' on your calendar today.') : 'Open your calendar to plan the day.',
      stats: [{ n: diaryTodayCt, l: 'Today', cls: '' }],
      foot: 'Open My Diary →' },
    { icon: '📁', title: 'My Projects', view: 'projects',
      snippet: myActiveProjects ? (myActiveProjects + ' active project' + (myActiveProjects > 1 ? 's' : '') + ' you own or are on the team.') : 'No active projects assigned to you.',
      stats: [{ n: myActiveProjects, l: 'Active', cls: 'teal' }, { n: myAtRiskProjects, l: 'At risk', cls: myAtRiskProjects ? 'red' : '' }],
      foot: 'Open My Projects →' },
    { icon: '💬', title: 'My Discussion Logs', view: 'logs',
      snippet: myLogsCt ? (myLogsCt + ' informal log' + (myLogsCt > 1 ? 's' : '') + ' captured by you — searchable by person & topic.') : 'Capture informal chats, calls, WhatsApp exchanges.',
      stats: [{ n: myLogsCt, l: 'Total', cls: '' }],
      foot: 'Open My Discussion Logs →' },
    { icon: '📝', title: 'My Visit Observations', view: 'visits',
      snippet: myVisitsCt ? (myVisitsCt + ' visit' + (myVisitsCt > 1 ? 's' : '') + ' logged — supplier audits, branch inspections, premises walks.') : 'Log site visits — audits, inspections, walks.',
      stats: [{ n: myVisitsCt, l: 'Logged', cls: '' }],
      foot: 'Open My Visit Observations →' },
    { icon: '⚖', title: 'Decisions Registry', view: 'decisions',
      snippet: decisionsCt + ' decision' + (decisionsCt !== 1 ? 's' : '') + ' on record across all TrustLab meetings.',
      stats: [{ n: decisionsCt, l: 'Total', cls: '' }],
      foot: 'Open Decisions Registry →' },
    { icon: '📋', title: 'Templates', view: 'templates',
      snippet: 'Agenda templates for recurring meetings — load into any new meeting.',
      stats: [{ n: state.templates.length, l: 'Agendas', cls: '' }],
      foot: 'Open Templates →' },
    { icon: '🏢', title: 'Department Master', view: 'departments',
      snippet: D.length + ' departments · ' + D.reduce((s, d) => s + d.positions.length, 0) + ' positions · ' + D.reduce((s, d) => s + d.openingTasks.length + d.closingTasks.length + (d.weeklyTasks || []).length + (d.monthlyTasks || []).length, 0) + ' total shift tasks configured.',
      stats: [{ n: D.length, l: 'Depts', cls: '' }],
      foot: isHead ? 'Open Department Master →' : 'View Department Master →' },
  ];

  return (
    <Box>
      {/* .pd-hero */}
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: '14px', p: { xs: '20px', md: '28px 32px' }, display: 'flex', alignItems: 'center', gap: 3, mb: '22px', boxShadow: tokens.shadow, flexWrap: 'wrap' }}>
        <Avatar name={me} size={80} fontSize={28} sx={{ border: '3px solid rgba(255,255,255,0.3)' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{greeting}</Box>
          <Box component="h1" sx={{ fontFamily: fonts.serif, fontSize: { xs: 26, md: 32 }, fontWeight: 700, m: '6px 0 0', letterSpacing: '-0.01em' }}>{me === 'Venkata Cherukuri' ? me.split(' ')[0] : me}</Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 12, opacity: 0.85, mt: '6px', letterSpacing: '0.04em' }}>{dept ? (dept.icon + ' ' + dept.name + (position ? ' · ' + position.name : '')) : 'No department assigned'}{isCMD ? ' · 👑 CMD · Super Admin' : ''}</Box>
        </Box>
        <Box sx={{ ml: { xs: 0, sm: 'auto' }, p: '10px 16px', bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '10px', fontFamily: fonts.mono, fontSize: 12, letterSpacing: '0.04em', fontWeight: 700, textAlign: 'center' }}>
          {DAYS_OF_WEEK_FULL[dow]}
          <Box component="span" sx={{ fontFamily: fonts.serif, fontSize: 22, display: 'block', mt: '2px', letterSpacing: '-0.01em' }}>{today.getDate()} {MONTHS[today.getMonth()]}</Box>
          {today.getFullYear()}
        </Box>
      </Box>

      <ApiError error={deptErr || assignErr} onRetry={refetchDepts} sx={{ mb: '12px' }} />
      <Fetching on={deptFetching || activityFetching} />

      <SectionLabel>⚡ Today's Priority</SectionLabel>
      <Grid container spacing={1.5} sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <TodayTile color={priorityTile.color} onClick={() => go(priorityTile.target)} lbl={priorityTile.lbl} val={priorityTile.val} sub={priorityTile.sub} ring={priorityTile.ring} ringCirc={maRingCirc} ringOffset={maRingOffset} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <TodayTile color={myOverdueTodos ? 'red' : 'amber'} onClick={() => go('mytodo')} lbl="Open Tasks (You Own)" val={myOpenTodos} sub={myOverdueTodos ? myOverdueTodos + ' overdue · chase today' : 'All on track'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <TodayTile color="blue" onClick={() => go('list')} lbl="Meetings Today" val={myMeetingsToday.length} sub={nextMeeting ? 'Next: ' + nextMeeting.title.slice(0, 40) : 'Nothing scheduled'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <TodayTile color="purple" onClick={() => go('myactivity')} lbl="Shift Checklist" val={`${maPct}%`} sub={`${maDone}/${maTotal} tasks done · ${maTotal === 0 ? 'nothing scheduled' : maPct === 100 ? 'all done' : (maTotal - maDone) + ' to go'}`} />
        </Grid>
      </Grid>

      <SectionLabel>📚 Modules</SectionLabel>
      <Grid container spacing={1.5}>
        {moduleCards.map(c => (
          <Grid key={c.view} size={{ xs: 12, sm: 6, lg: 4 }}>
            <ModuleCard c={c} onClick={() => go(c.view)} />
          </Grid>
        ))}
      </Grid>

      {isHead && !isCMD && !isCGO && dept && <DeptOversightBlock dept={dept} activityLog={activityLog} facts={facts} />}
      {(isCMD || isCGO) && <OrgOversightBlock departments={departments} activityLog={activityLog} state={state} facts={facts} />}
    </Box>
  );
}
