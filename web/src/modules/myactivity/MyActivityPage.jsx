import { useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { useViewerUser } from '../../auth/useViewerUser';
import { tokens, fonts } from '../../theme/tokens';
import { PageHeader, EmptyState, Avatar, Btn } from '../../components';
import { todayFacts, getTaskStatus } from '../../utils/departments';
import { DAYS_OF_WEEK_FULL } from '../../data/departments';
import { MONTHS } from '../../utils/dates';
import { useGetActivityQuery, useGetDepartmentQuery, useListAssignmentsQuery, useSetActivityTickMutation } from '../../store/api/departmentsApi';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import { activityArgs, assignmentFor, shiftStats, PHASE_KEYS } from './utils';
// Kept available for parity with the prototype's renderCMDOversightBlock / renderMyActivityOversight —
// the prototype's renderMyActivity does NOT render them, so neither do we.
// eslint-disable-next-line no-unused-vars
import { CMDOversightBlock, MyActivityOversight } from './components/OversightBlock';

const LANE_BORDER = { opening: tokens.teal, closing: '#DD6B20', weekly: '#7C3AED', monthly: '#2563EB', review: tokens.greenDeep };

/* .ma-phase chip (+ .all-chip master variant) */
function PhaseChip({ ticked, all, onClick, title, label, pct }) {
  const base = all
    ? { bg: ticked ? tokens.greenDeep : tokens.creamWarm, color: ticked ? '#fff' : tokens.slate, border: ticked ? tokens.greenDeep : tokens.slateSoft }
    : { bg: ticked ? tokens.tealSofter : tokens.card, color: ticked ? tokens.ink : tokens.slate, border: ticked ? tokens.teal : tokens.line };
  const check = all && ticked
    ? { bg: tokens.yellow, border: tokens.yellow, color: tokens.greenDeep }
    : ticked ? { bg: tokens.tealDark, border: tokens.tealDark, color: '#fff' } : { bg: tokens.card, border: tokens.lineSoft, color: '#fff' };
  const pctSx = all && ticked
    ? { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }
    : ticked ? { bgcolor: tokens.card, color: tokens.tealDark } : { bgcolor: tokens.cream, color: tokens.slate };
  return (
    <ButtonBase onClick={onClick} title={title} sx={{ p: '7px 14px 7px 10px', bgcolor: base.bg, border: `1px solid ${base.border}`, borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: 1, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: base.color, cursor: 'pointer', transition: 'all 0.12s', '&:hover': { borderColor: tokens.teal } }}>
      <Box component="span" sx={{ width: 18, height: 18, borderRadius: '4px', bgcolor: check.bg, border: `2px solid ${check.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: check.color, flexShrink: 0, transition: 'all 0.12s' }}>{ticked ? '✓' : ''}</Box>
      <span>{label}</span>
      {pct !== undefined && <Box component="span" sx={{ fontSize: 10, p: '1px 7px', borderRadius: '10px', fontWeight: 700, ...pctSx }}>{pct}</Box>}
    </ButtonBase>
  );
}

/* .ma-lane */
function Lane({ kind, title, count, pill, pillDone, children }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', mb: '14px', overflow: 'hidden', borderLeft: `4px solid ${LANE_BORDER[kind] || tokens.teal}` }}>
      <Box sx={{ p: { xs: '12px 14px', md: '14px 20px' }, bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <Box sx={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 700, color: tokens.ink, display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
          {count && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>{count}</Box>}
        </Box>
        <Box sx={{ p: '4px 10px', bgcolor: pillDone ? tokens.tealDark : tokens.card, border: `1px solid ${pillDone ? tokens.tealDark : tokens.line}`, borderRadius: '12px', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: pillDone ? '#fff' : tokens.ink, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{pill}</Box>
      </Box>
      <Box sx={{ p: '10px 14px' }}>{children}</Box>
    </Box>
  );
}

/* .ma-task row */
function TaskRow({ task, dept, isDone, onToggle }) {
  const ids = Array.isArray(task.positionIds) ? task.positionIds : (task.positionId != null && task.positionId !== '' ? [task.positionId] : []);
  const posList = ids.map(id => (dept.positions || []).find(p => p.id === id)).filter(Boolean);
  const chipSx = { fontFamily: fonts.mono, fontSize: 10, p: '4px 9px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700, whiteSpace: 'nowrap' };
  let posBadge;
  if (posList.length === 0) posBadge = <Box sx={{ ...chipSx, bgcolor: tokens.cream, color: tokens.slate }}>All dept</Box>;
  else if (posList.length === 1) posBadge = <Box sx={{ ...chipSx, bgcolor: tokens.tealSofter, color: tokens.tealDark }}>{posList[0].name}</Box>;
  else posBadge = <Box title={posList.map(p => p.name).join(', ')} sx={{ ...chipSx, bgcolor: tokens.tealSofter, color: tokens.tealDark }}>{posList.length} positions</Box>;
  return (
    <Box sx={{ p: '11px 14px', m: '4px 0', bgcolor: isDone ? tokens.creamWarm : tokens.card, opacity: isDone ? 0.6 : 1, border: `1px solid ${tokens.line}`, borderRadius: '8px', transition: 'background 0.12s', '&:hover': { bgcolor: isDone ? tokens.creamWarm : tokens.cream } }}>
      <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
        <Grid size="auto">
          <Box onClick={onToggle} sx={{ width: 26, height: 26, borderRadius: '6px', bgcolor: isDone ? tokens.tealDark : tokens.card, border: `2px solid ${isDone ? tokens.tealDark : tokens.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', cursor: 'pointer', transition: 'all 0.12s', userSelect: 'none', '&:hover': { borderColor: tokens.teal } }}>{isDone ? '✓' : ''}</Box>
        </Grid>
        <Grid size="grow">
          <Box sx={{ fontSize: 13, color: isDone ? tokens.slate : tokens.ink, lineHeight: 1.45, textDecoration: isDone ? 'line-through' : 'none' }}>{task.text}</Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, pl: { xs: '38px', sm: 0 } }}>
            {task.defaultTime ? <Box sx={{ ...chipSx, color: tokens.slate, bgcolor: tokens.creamWarm }}>⏱ {task.defaultTime}</Box> : <Box />}
            {posBadge}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function MyActivityPage() {
  const navigate = useNavigate();
  const { viewer, isSelf } = useViewerUser();
  const [show, setShow] = useState({ opening: true, closing: true, weekly: true, monthly: true, review: true });
  const { toast, show: toastShow } = useToast();

  const me = viewer.name;
  const facts = todayFacts();
  const { today, todayStr, dow: dowToday } = facts;

  // Who I am in the organisation → my department → today's ticks.
  const { data: assignments, error: assignErr, isLoading: assignLoading, refetch: refetchAssignments } = useListAssignmentsQuery();
  const assignment = assignmentFor(assignments, me);
  const { data: dept, error: deptErr, isLoading: deptLoading, isFetching: deptFetching, refetch: refetchDept } = useGetDepartmentQuery(assignment.departmentId, { skip: !assignment.departmentId });
  const { data: log = {}, error: logErr, isFetching: logFetching } = useGetActivityQuery(activityArgs({ date: todayStr, person: me, isSelf }));
  const [setTick] = useSetActivityTickMutation();
  // A department that runs a readiness board has no shift tasks: its rounds are its opening and
  // closing tasks, and these are this person's own lines of them.

  const header = (
    <PageHeader code="TL-OPS-ACT-001" parts={['MyDiary · Personal', 'Daily Shift Checklist']} icon="✍" title="My Activity"
      sub="Your department's opening & closing shift checklist for the day, plus any weekly or monthly items due today. Tick off as you go — completion rolls up to Department Master for governance." />
  );

  if (assignLoading || deptLoading) {
    return (
      <Box>
        {header}
        <Box sx={{ p: '30px', textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', color: tokens.slate, textTransform: 'uppercase' }}>Loading your checklist…</Box>
      </Box>
    );
  }

  if (assignErr || deptErr) {
    return (
      <Box>
        {header}
        <ApiError error={assignErr || deptErr} onRetry={() => { refetchAssignments(); if (assignment.departmentId) refetchDept(); }} />
      </Box>
    );
  }

  if (!dept) {
    return (
      <Box>
        {header}
        <EmptyState icon="🏢" title="You are not assigned to a department yet"
          desc={<>Ask your HR Head or an admin to assign your department in <Box component="a" onClick={() => navigate('/departments')} sx={{ color: tokens.tealDark, cursor: 'pointer', fontWeight: 700 }}>Department Master</Box>, and your daily shift checklist will appear here.</>} />
      </Box>
    );
  }

  const position = (dept.positions || []).find(p => p.id === assignment.positionId);
  const posLabel = position ? position.name : (assignment.role === 'head' ? 'Department Head' : 'All positions');

  const stats = shiftStats(log, me, dept, assignment.positionId, assignment.role, facts);
  const { lists, total: shiftTotal, done: shiftDone } = stats;

  // Where a readiness board replaces the shift tasks, the day's count is the person's own lines of
  // it — otherwise the two halves of the page would disagree about how much work there is.
  const totalT = shiftTotal;
  const doneT = shiftDone;
  const pct = totalT ? Math.round((doneT / totalT) * 100) : 0;
  const circ = 2 * Math.PI * 38;
  const offset = circ - (pct / 100) * circ;

  const phaseCount = (kind) => ({ total: lists[kind].length, done: lists[kind].filter(t => getTaskStatus(log, me, todayStr, kind, t.id) === 'done').length });
  const op = phaseCount('opening'), cl = phaseCount('closing'), wk = phaseCount('weekly'), mo = phaseCount('monthly');

  const allOn = PHASE_KEYS.every(k => show[k]);
  const togglePhase = (k) => setShow(s => ({ ...s, [k]: !s[k] }));
  const toggleAll = () => { const anyOff = PHASE_KEYS.some(k => !show[k]); setShow(Object.fromEntries(PHASE_KEYS.map(k => [k, anyOff]))); };

  // toggleMATask → PUT /api/departments/activity { kind, taskId, done }
  const toggleTask = async (kind, taskId) => {
    const current = getTaskStatus(log, me, todayStr, kind, taskId);
    try {
      await setTick({ departmentId: dept.id, kind, taskId, done: current !== 'done', date: todayStr, ...(isSelf ? {} : { person: me }) }).unwrap();
    } catch (err) {
      toastShow(err);
    }
  };

  /** One readiness line, in the same shape the lane draws a shift task. */
  const lane = (kind, label, icon) => {
    const list = lists[kind];
    if (!show[kind] || list.length === 0) return null;
    const doneCt = list.filter(t => getTaskStatus(log, me, todayStr, kind, t.id) === 'done').length;
    const pctL = list.length ? Math.round((doneCt / list.length) * 100) : 0;
    return (
      <Lane key={kind} kind={kind} title={`${icon} ${label}`} count={`· ${list.length} task${list.length > 1 ? 's' : ''}`} pill={`${doneCt}/${list.length} · ${pctL}%`} pillDone={pctL === 100}>
        {list.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map(t => (
          <TaskRow key={t.id} task={t} dept={dept} isDone={getTaskStatus(log, me, todayStr, kind, t.id) === 'done'} onToggle={() => toggleTask(kind, t.id)} />
        ))}
      </Lane>
    );
  };

  // Review-cadence meeting that may be due today
  let review = null;
  if (dept.reviewCadence) {
    const rc = dept.reviewCadence;
    const weeklyDue = (rc.weekly.daysOfWeek || []).includes(dowToday);
    const monthlyDue = (rc.monthly.dayOfMonth === 'last' && facts.isLastDay) || (+rc.monthly.dayOfMonth === facts.dom);
    const isOwner = rc.owner && rc.owner.toLowerCase().includes(me.toLowerCase().split(' ')[0]);
    if ((weeklyDue || monthlyDue) && (isOwner || assignment.role === 'head')) {
      const kind = weeklyDue ? 'weekly' : 'monthly';
      const agenda = weeklyDue ? (rc.weeklyAgenda || []) : (rc.monthlyAgenda || []);
      const pts = agenda.reduce((s, sec) => s + (sec.points || []).length, 0);
      const t = weeklyDue ? rc.weekly.time : rc.monthly.time;
      review = (
        <Lane kind="review" title={`🗓 ${kind === 'weekly' ? 'Weekly' : 'Monthly'} Review Meeting (you chair)`} pill={`${pts} agenda points`}>
          <Box sx={{ p: '12px 14px', bgcolor: tokens.cream, borderRadius: '6px', fontSize: 13, color: tokens.ink, lineHeight: 1.5 }}>
            <Box sx={{ mb: '6px' }}><strong>{dept.name}</strong> {kind} review is today{t ? ' at ' + t : ''}.</Box>
            <Box sx={{ fontSize: 12, color: tokens.slate, mb: '10px' }}>Agenda walks {agenda.length} section{agenda.length !== 1 ? 's' : ''} with {pts} discussion points. RAG-flag each point during the meeting.</Box>
            <Btn variant="primary" size="sm" onClick={() => navigate(`/departments/${dept.id}`)}>Open Agenda Template →</Btn>
          </Box>
        </Lane>
      );
    }
  }

  return (
    <Box>
      {header}

      <ApiError error={logErr} sx={{ mb: '12px' }} />
      <Fetching on={deptFetching || logFetching} />

      {/* .ma-hero */}
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: '14px', p: { xs: '18px', md: '22px 26px' }, mb: '18px' }}>
        <Grid container spacing={2.25} sx={{ alignItems: "center" }}>
          <Grid size="auto"><Avatar name={me} size={68} fontSize={22} sx={{ border: '3px solid rgba(255,255,255,0.3)' }} /></Grid>
          <Grid size="grow">
            <Box component="h1" sx={{ fontFamily: fonts.serif, fontSize: 24, m: 0, fontWeight: 700 }}>{me === 'Venkata Cherukuri' ? 'Your activity' : `${me}'s activity`}</Box>
            <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: '4px', letterSpacing: '0.04em' }}>{dept.icon} {dept.name} · {posLabel}</Box>
            <Box sx={{ fontSize: 13, opacity: 0.92, mt: '6px' }}>Day-opening, day-closing and any weekly/monthly items on your plate today. {totalT === 0 ? "Nothing scheduled — you're free for ad-hoc work." : `Tick as you go. ${pct === 100 ? '🎉 All done — clean close!' : `${totalT - doneT} to go.`}`}</Box>
          </Grid>
          <Grid size={{ xs: 12, md: 'auto' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box component="svg" viewBox="0 0 100 100" sx={{ width: 92, height: 92 }}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="38" fill="none" stroke={tokens.yellow} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.4s' }} />
                <text x="50" y="50" fill="#fff" fontFamily={fonts.serif} fontSize="20" fontWeight="700" textAnchor="middle" dominantBaseline="central">{pct}%</text>
              </Box>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9, opacity: 0.85, letterSpacing: '0.1em', mt: '4px', textTransform: 'uppercase' }}>{doneT}/{totalT} done</Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* .ma-phase-row */}
      <Box sx={{ display: 'flex', gap: 1, mb: '18px', alignItems: 'center', p: '10px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', mr: '4px' }}>SHOW:</Box>
        <PhaseChip all ticked={allOn} onClick={toggleAll} title="Tick everything on or off" label="All" pct={`${doneT}/${totalT}`} />
        {op.total > 0 && <PhaseChip ticked={show.opening} onClick={() => togglePhase('opening')} label="🌅 Opening" pct={`${op.done}/${op.total}`} />}
        {cl.total > 0 && <PhaseChip ticked={show.closing} onClick={() => togglePhase('closing')} label="🌙 Closing" pct={`${cl.done}/${cl.total}`} />}
        {lists.weekly.length > 0 && <PhaseChip ticked={show.weekly} onClick={() => togglePhase('weekly')} label="📅 Weekly" pct={`${wk.done}/${wk.total}`} />}
        {lists.monthly.length > 0 && <PhaseChip ticked={show.monthly} onClick={() => togglePhase('monthly')} label="📆 Monthly" pct={`${mo.done}/${mo.total}`} />}
        {review && <PhaseChip ticked={show.review} onClick={() => togglePhase('review')} label="🗓 Review" />}
        <Box sx={{ p: '8px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '20px', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: tokens.slate, letterSpacing: '0.04em', ml: { xs: 0, sm: 'auto' } }}>📅 {DAYS_OF_WEEK_FULL[dowToday]}, {today.getDate()} {MONTHS[today.getMonth()]} {today.getFullYear()}</Box>
      </Box>

      {/* A lab person with no unit has a board waiting but no lines of their own — "clean slate"
          would hide that, so it says what is missing and who sets it. */}
      {totalT === 0 && (
        <EmptyState icon="🎯" title="Clean slate" sx={{ mb: '14px' }}
          desc={<>No department tasks for your position today. {dept.openingTasks.length || dept.closingTasks.length ? "The only configured tasks don't apply to your position." : <>Your department hasn't set up shift tasks yet — visit <Box component="a" onClick={() => navigate(`/departments/${dept.id}`)} sx={{ color: tokens.tealDark, cursor: 'pointer', fontWeight: 700 }}>Department Master</Box> to add them.</>}</>} />
      )}

      {lane('opening', 'Opening Shift', '🌅')}
      {lane('closing', 'Closing Shift', '🌙')}
      {lane('weekly', 'Weekly Task' + (lists.weekly.length > 1 ? 's' : ''), '📅')}
      {lane('monthly', 'Monthly Task' + (lists.monthly.length > 1 ? 's' : ''), '📆')}

      {show.review && review}

      <Box sx={{ mt: '20px', p: '12px 16px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', fontSize: 12, color: tokens.slate, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Box component="span" sx={{ fontSize: 16 }}>💡</Box>
        <span>Your ticks persist to today's activity log. Yesterday's activity is sealed. Your HOD and department governance can see your completion rate in the Department Master detail view.</span>
      </Box>
      {toast}
    </Box>
  );
}
