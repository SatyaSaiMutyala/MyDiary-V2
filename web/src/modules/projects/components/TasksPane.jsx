import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, EmptyState } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { ProjPriorityPill, KAvatar, KDate, KpiBar, MiniSelect } from './Pills';
import { milestoneTaskProgress, sortedMilestones, PRIORITY_ACCENT } from '../utils';

const STATUSES = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
const COL_TOP = { todo: tokens.slateSoft, 'in-progress': tokens.blue, review: tokens.yellow, done: tokens.teal };
const STATUS_OPTS = [['todo', 'Todo'], ['in-progress', 'Progress'], ['review', 'Review'], ['done', 'Done']];

const sectionSx = { mb: '18px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', overflow: 'hidden' };
const sectionHeadSx = { p: '12px 16px', bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' };

/** renderTasksPane() — GROUP BY Status·Kanban / Milestone / Owner */
export default function TasksPane({ p, actions, groupBy, setGroupBy }) {
  const msOf = (t) => t.milestoneId ? (p.milestones || []).find(m => m.id === t.milestoneId) : null;

  const kanbanCard = (t) => {
    const od = t.status !== 'done' && isOverdue(t.dueDate);
    const ms = msOf(t);
    return (
      <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${PRIORITY_ACCENT[t.priority] || tokens.teal}`, borderRadius: '6px', p: '10px 12px', mb: '6px', boxShadow: tokens.shadowSm, cursor: 'pointer', transition: 'all 0.1s', '&:hover': { boxShadow: tokens.shadow, transform: 'translateY(-1px)' } }}>
        <Box sx={{ fontSize: 12, fontWeight: 700, mb: '6px', lineHeight: 1.4 }}>{t.title}</Box>
        {ms && <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.tealDark, bgcolor: tokens.tealSofter, p: '2px 7px', borderRadius: '8px', mt: '4px', letterSpacing: '0.04em', fontWeight: 700, display: 'inline-block', mb: '6px' }}>🏁 {ms.name.slice(0, 30)}{ms.name.length > 30 ? '…' : ''}</Box>}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <KAvatar bg={ownerAvatarColor(t.assignee)}>{initials(t.assignee)}</KAvatar>
            <Box component="span" sx={{ fontSize: 10, color: tokens.slate, fontWeight: 600 }}>{t.assignee.split(' ')[0]}</Box>
          </Box>
          <KDate overdue={od}>{od ? '⚠ ' : ''}{t.dueDate ? t.dueDate.slice(5).replace('-', '/') : '—'}</KDate>
        </Box>
        <Box sx={{ mt: '6px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'space-between' }}>
          <ProjPriorityPill priority={t.priority} />
          <MiniSelect value={t.status} onChange={v => actions.updateTaskStatus(p.id, t.id, v)} options={STATUS_OPTS} sx={{ p: '2px 6px', fontSize: 10 }} />
        </Box>
      </Box>
    );
  };

  const taskRow = (t) => {
    const od = t.status !== 'done' && isOverdue(t.dueDate);
    const ms = msOf(t);
    const done = t.status === 'done';
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', md: 'auto 1fr auto auto auto auto' }, gap: '12px', alignItems: 'center', p: '10px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', mb: '6px', opacity: done ? 0.65 : 1 }}>
        <Box component="input" type="checkbox" checked={done} onChange={e => actions.updateTaskStatus(p.id, t.id, e.target.checked ? 'done' : 'todo')} sx={{ width: 16, height: 16, cursor: 'pointer', m: 0, accentColor: tokens.teal }} />
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</Box>
          {ms && <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.tealDark, mt: '3px', letterSpacing: '0.04em', fontWeight: 700 }}>🏁 {ms.name}</Box>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: { xs: '2', md: 'auto' } }}>
          <KAvatar bg={ownerAvatarColor(t.assignee)}>{initials(t.assignee)}</KAvatar>
          <Box component="span" sx={{ fontSize: 11, color: tokens.slate, fontWeight: 600 }}>{t.assignee}</Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', gridColumn: { xs: '2', md: 'span 3' }, justifyContent: { md: 'flex-end' } }}>
          <KDate overdue={od}>{od ? '⚠ ' : ''}{t.dueDate || '—'}</KDate>
          <ProjPriorityPill priority={t.priority} />
          <MiniSelect value={t.status} onChange={v => actions.updateTaskStatus(p.id, t.id, v)} options={STATUS_OPTS} sx={{ p: '4px 8px' }} />
        </Box>
      </Box>
    );
  };

  const header = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '12px', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: '4px', p: '4px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', color: tokens.slate, fontWeight: 700, p: '5px 6px 5px 10px', alignSelf: 'center' }}>GROUP BY:</Box>
        {[['status', 'Status · Kanban'], ['milestone', '🏁 Milestone'], ['owner', '👤 Owner']].map(([k, l]) => (
          <Btn key={k} size="sm" variant={groupBy === k ? 'primary' : 'default'} onClick={() => setGroupBy(k)} sx={{ p: '4px 10px', fontSize: 11 }}>{l}</Btn>
        ))}
      </Box>
      <Btn variant="primary" size="sm" onClick={() => actions.addProjectTask(p.id)}>+ Add Task</Btn>
    </Box>
  );

  // --- GROUP BY STATUS (Kanban) ---
  if (groupBy === 'status') {
    return (
      <>
        {header}
        <Box sx={{ overflowX: 'auto', pb: 1 }}>
          <Grid container spacing="10px" wrap="nowrap" sx={{ minWidth: { xs: 900, lg: 0 } }}>
            {Object.entries(STATUSES).map(([key, label]) => {
              const tasks = (p.tasks || []).filter(t => t.status === key);
              return (
                <Grid key={key} size={3}>
                  <Box sx={{ bgcolor: tokens.cream, borderRadius: '8px', p: '10px', minHeight: 300, borderTop: `3px solid ${COL_TOP[key]}`, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '6px 8px', mb: 1, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slate }}>
                      <span>{label}</span><Box component="span" sx={{ bgcolor: tokens.card, p: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{tasks.length}</Box>
                    </Box>
                    {tasks.map(t => kanbanCard(t))}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </>
    );
  }

  // --- GROUP BY MILESTONE ---
  if (groupBy === 'milestone') {
    const milestones = sortedMilestones(p);
    const unassigned = (p.tasks || []).filter(t => !t.milestoneId);
    return (
      <>
        {header}
        {milestones.map(m => {
          const tasks = (p.tasks || []).filter(t => t.milestoneId === m.id);
          const tp = milestoneTaskProgress(p, m.id);
          const od = m.status !== 'done' && isOverdue(m.dueDate);
          return (
            <Box key={m.id} sx={sectionSx}>
              <Box sx={sectionHeadSx}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: m.status === 'done' ? tokens.tealDark : od ? '#C53030' : tokens.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏁</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{m.name}</Box>
                  <Box sx={{ fontSize: 11, color: tokens.slate, mt: '2px' }}>Due {m.dueDate} · {m.owner} · <strong>{tp.done}/{tp.total} tasks done ({tp.pct}%)</strong></Box>
                </Box>
                <Box sx={{ width: 140 }}><KpiBar pct={tp.pct} color={tp.pct >= 70 ? '' : tp.pct >= 30 ? 'amber' : 'red'} height={8} sx={{ mb: 0 }} /></Box>
                <Btn size="sm" sx={{ fontSize: 11 }} onClick={() => actions.addProjectTask(p.id, m.id)}>+ Task</Btn>
              </Box>
              <Box sx={{ p: '10px 14px' }}>
                {tasks.length ? tasks.map(t => taskRow(t)) : <Box sx={{ fontSize: 12, color: tokens.slateSoft, fontStyle: 'italic', p: '6px 2px' }}>No tasks under this milestone yet.</Box>}
              </Box>
            </Box>
          );
        })}
        <Box sx={{ ...sectionSx, border: `1px dashed ${tokens.slateSoft}` }}>
          <Box sx={{ ...sectionHeadSx, bgcolor: tokens.creamWarm }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: tokens.slateSoft, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>∅</Box>
            <Box sx={{ flex: 1 }}><Box sx={{ fontSize: 14, fontWeight: 700 }}>Not linked to a milestone</Box><Box sx={{ fontSize: 11, color: tokens.slate, mt: '2px' }}>{unassigned.length} task{unassigned.length !== 1 ? 's' : ''} · project-level work</Box></Box>
            <Btn size="sm" sx={{ fontSize: 11 }} onClick={() => actions.addProjectTask(p.id, null)}>+ Task</Btn>
          </Box>
          <Box sx={{ p: '10px 14px' }}>
            {unassigned.length ? unassigned.map(t => taskRow(t)) : <Box sx={{ fontSize: 12, color: tokens.slateSoft, fontStyle: 'italic', p: '6px 2px' }}>All tasks are linked to milestones.</Box>}
          </Box>
        </Box>
      </>
    );
  }

  // --- GROUP BY OWNER ---
  const owners = {};
  (p.tasks || []).forEach(t => { const o = t.assignee || '(unassigned)'; if (!owners[o]) owners[o] = []; owners[o].push(t); });
  const entries = Object.entries(owners).sort((a, b) => b[1].length - a[1].length);
  return (
    <>
      {header}
      {entries.length ? entries.map(([owner, tasks]) => {
        const done = tasks.filter(t => t.status === 'done').length;
        return (
          <Box key={owner} sx={{ ...sectionSx, mb: 2 }}>
            <Box sx={sectionHeadSx}>
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: ownerAvatarColor(owner), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(owner)}</Box>
              <Box sx={{ flex: 1 }}><Box sx={{ fontSize: 14, fontWeight: 700 }}>{owner}</Box><Box sx={{ fontSize: 11, color: tokens.slate, mt: '2px' }}>{done}/{tasks.length} done</Box></Box>
            </Box>
            <Box sx={{ p: '10px 14px' }}>{tasks.map(t => taskRow(t))}</Box>
          </Box>
        );
      }) : <EmptyState icon="✓" title="No tasks yet" />}
    </>
  );
}
