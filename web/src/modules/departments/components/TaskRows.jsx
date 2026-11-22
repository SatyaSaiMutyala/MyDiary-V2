import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { describeWeekly, describeMonthly } from '../../../utils/departments';
import LiveInput, { TimeInput } from './LiveInput';
import { taskTextSx } from './styles';
import { PosChips, DowChips, DomGroup, RowDel } from './Chips';

const KIND_BORDER = { opening: tokens.teal, closing: '#DD6B20', weekly: '#7C3AED', monthly: '#2563EB' };

export const DAILY_HEADER_COLS = '30px 1fr 90px auto 26px';
export const DAILY_ROW_COLS = '30px 1fr auto auto auto';
export const WM_COLS = '30px 1.5fr 1fr 90px auto 26px';

const rowSx = (kind, cols) => ({
  display: 'grid', gridTemplateColumns: cols, gap: '10px', alignItems: 'center', p: '10px 14px', bgcolor: tokens.cream,
  borderRadius: '6px', mb: '5px', borderLeft: `3px solid ${KIND_BORDER[kind] || 'transparent'}`,
});

const Order = ({ children }) => <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, fontWeight: 700, textAlign: 'center' }}>{children}</Box>;

/** .dept-task-row (opening / closing) */
export function TaskRow({ dept, task, kind, api }) {
  return (
    <Box sx={rowSx(kind, DAILY_ROW_COLS)}>
      <Order>{task.order}</Order>
      <LiveInput value={task.text} onCommit={(v) => api.updateDeptTask(kind, task.id, 'text', v)} sx={taskTextSx} />
      <TimeInput value={task.defaultTime} onCommit={(v) => api.updateDeptTask(kind, task.id, 'defaultTime', v)} />
      <PosChips positions={dept.positions} positionIds={task.positionIds} onToggle={(pid) => api.togglePositionTag(kind, task.id, pid)} onClear={() => api.clearPositionTags(kind, task.id)} />
      <RowDel onClick={() => api.removeDeptTask(kind, task.id)} />
    </Box>
  );
}

/** .dept-task-row.weekly.weekly-grid */
export function WeeklyRow({ dept, task, api }) {
  return (
    <Box sx={rowSx('weekly', WM_COLS)}>
      <Order>{task.order}</Order>
      <LiveInput value={task.text} onCommit={(v) => api.updateDeptTask('weekly', task.id, 'text', v)} sx={taskTextSx} />
      <Box><DowChips daysOfWeek={task.daysOfWeek} title={describeWeekly(task.daysOfWeek)} onToggle={(dow) => api.toggleWeeklyDow(task.id, dow)} /></Box>
      <TimeInput value={task.defaultTime} onCommit={(v) => api.updateDeptTask('weekly', task.id, 'defaultTime', v)} />
      <PosChips positions={dept.positions} positionIds={task.positionIds} onToggle={(pid) => api.togglePositionTag('weekly', task.id, pid)} onClear={() => api.clearPositionTags('weekly', task.id)} />
      <RowDel onClick={() => api.removeDeptTask('weekly', task.id)} />
    </Box>
  );
}

/** .dept-task-row.monthly.monthly-grid */
export function MonthlyRow({ dept, task, api }) {
  return (
    <Box sx={rowSx('monthly', WM_COLS)}>
      <Order>{task.order}</Order>
      <LiveInput value={task.text} onCommit={(v) => api.updateDeptTask('monthly', task.id, 'text', v)} sx={taskTextSx} />
      <Box>
        <DomGroup dayOfMonth={task.dayOfMonth} title={`${describeMonthly(task.dayOfMonth)} of the month`} onChangeDay={(n) => api.updateDeptTask('monthly', task.id, 'dayOfMonth', n)} onToggleLast={() => api.toggleMonthlyLast(task.id)} />
      </Box>
      <TimeInput value={task.defaultTime} onCommit={(v) => api.updateDeptTask('monthly', task.id, 'defaultTime', v)} />
      <PosChips positions={dept.positions} positionIds={task.positionIds} onToggle={(pid) => api.togglePositionTag('monthly', task.id, pid)} onClear={() => api.clearPositionTags('monthly', task.id)} />
      <RowDel onClick={() => api.removeDeptTask('monthly', task.id)} />
    </Box>
  );
}

/** .position-row */
export function PositionRow({ dept, position, api }) {
  const taskCt = [...dept.openingTasks, ...dept.closingTasks, ...(dept.weeklyTasks || []), ...(dept.monthlyTasks || [])].filter(t => (t.positionIds || []).includes(position.id)).length;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: '12px', alignItems: 'center', p: '10px 14px', bgcolor: tokens.cream, borderLeft: `3px solid ${tokens.teal}`, borderRadius: '6px', mb: '6px' }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: tokens.tealSofter, color: tokens.tealDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{position.name.charAt(0)}</Box>
      <Box>
        <LiveInput value={position.name} onCommit={(v) => api.updatePosition(position.id, 'name', v)} sx={{ width: '100%', p: '6px 8px', fontSize: 13, fontWeight: 700, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card }} />
      </Box>
      <LiveInput value={position.description || ''} placeholder="What does this position do?" onCommit={(v) => api.updatePosition(position.id, 'description', v)} sx={{ width: '100%', p: '6px 8px', fontSize: 12, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card, color: tokens.slate }} />
      <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{taskCt} task{taskCt !== 1 ? 's' : ''}</Box>
        <RowDel title="Remove position (tasks revert to all-dept)" onClick={() => api.removePosition(position.id)} />
      </Box>
    </Box>
  );
}
