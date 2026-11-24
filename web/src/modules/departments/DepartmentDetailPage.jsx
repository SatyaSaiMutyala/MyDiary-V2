import { useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbs } from '../../store/CrumbsContext';
import { Eyebrow, Btn } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { DAYS_OF_WEEK_FULL } from '../../data/departments';
import {
  useAddAgendaPointMutation, useAddAgendaSectionMutation, useAddPositionMutation, useAddTaskMutation,
  useGetDepartmentQuery, usePutCadenceMutation, useRemoveAgendaPointMutation, useRemoveAgendaSectionMutation,
  useRemoveDepartmentMutation, useRemovePositionMutation, useRemoveTaskMutation, useUpdateAgendaPointMutation,
  useUpdateAgendaSectionMutation, useUpdateDepartmentMutation, useUpdatePositionMutation, useUpdateTaskMutation,
} from '../../store/api/departmentsApi';
import { errorCode } from '../../store/api/baseApi';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import { makeDebouncer } from './utils';
import DeptSection, { SectionNote, ColHeader, EmptyLine } from './components/DeptSection';
import { TaskRow, WeeklyRow, MonthlyRow, PositionRow, DAILY_HEADER_COLS, WM_COLS } from './components/TaskRows';
import ReviewCadenceSection from './components/ReviewCadenceSection';
import { useDialog } from '../../components/Dialogs';

const DAILY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];
const WEEKLY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'DAYS OF WEEK (click to toggle)' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];
const MONTHLY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'DATE OF MONTH' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];

const TASK_LIST_KEY = { opening: 'openingTasks', closing: 'closingTasks', weekly: 'weeklyTasks', monthly: 'monthlyTasks' };

/** horizontal scroll wrapper for the table-like rows on narrow screens */
const Scroller = ({ minWidth, children }) => (
  <Box sx={{ overflowX: 'auto' }}><Box sx={{ minWidth }}>{children}</Box></Box>
);

/**
 * VIEW: DEPARTMENT DETAIL — renderDepartmentDetail (prototype 12295–12497) + CRUD (12611–12692, 12887–13034).
 * Reads GET /api/departments/:id; every edit below is one call to that department's sub-resources.
 */
export default function DepartmentDetailPage() {
  const dlg = useDialog();
  const { id } = useParams();
  const navigate = useNavigate();
  const [RC_AGENDA_TAB, setRCAgendaTab] = useState('weekly');
  const { data: d, error, isLoading, isFetching, refetch } = useGetDepartmentQuery(id);
  const { toast, show } = useToast();
  const debounce = useRef(makeDebouncer()).current;

  const [updateDepartment] = useUpdateDepartmentMutation();
  const [removeDepartment] = useRemoveDepartmentMutation();
  const [addPositionCall] = useAddPositionMutation();
  const [updatePositionCall] = useUpdatePositionMutation();
  const [removePositionCall] = useRemovePositionMutation();
  const [addTaskCall] = useAddTaskMutation();
  const [updateTaskCall] = useUpdateTaskMutation();
  const [removeTaskCall] = useRemoveTaskMutation();
  const [putCadenceCall] = usePutCadenceMutation();
  const [addSectionCall] = useAddAgendaSectionMutation();
  const [updateSectionCall] = useUpdateAgendaSectionMutation();
  const [removeSectionCall] = useRemoveAgendaSectionMutation();
  const [addPointCall] = useAddAgendaPointMutation();
  const [updatePointCall] = useUpdateAgendaPointMutation();
  const [removePointCall] = useRemoveAgendaPointMutation();

  useCrumbs([{ label: 'Admin', to: '/' }, { label: 'Department Master', to: '/departments' }, { label: d ? d.code : '' }]);

  // The server's message is shown exactly as it comes back; nothing is swallowed.
  const api = useMemo(() => {
    const run = async (promise) => { try { return await promise.unwrap(); } catch (err) { show(err); return null; } };
    const later = (key, promise) => debounce(key, () => { void run(promise()); });
    const taskOf = (kind, tid) => ((d && d[TASK_LIST_KEY[kind]]) || []).find(x => x.id === tid);

    return {
      // ===== REVIEW CADENCE CRUD =====
      updateRC(path, value) {
        const [group, field] = path.split('.');
        const body = field ? { [group]: { [field]: value } } : { [group]: value };
        later('rc:' + path, () => putCadenceCall({ id, ...body }));
      },
      toggleRCWeeklyDow(dow) {
        const days = [...(d?.reviewCadence.weekly.daysOfWeek || [])];
        const i = days.indexOf(dow);
        if (i >= 0) days.splice(i, 1); else days.push(dow);
        void run(putCadenceCall({ id, weekly: { daysOfWeek: days } }));
      },
      toggleRCMonthlyLast() {
        const cur = d?.reviewCadence.monthly.dayOfMonth;
        void run(putCadenceCall({ id, monthly: { dayOfMonth: cur === 'last' ? 1 : 'last' } }));
      },
      async addRCSection(tab) {
        const heading = await dlg.prompt('Section heading (e.g. "Stockouts & Near-Stockouts"):');
        if (!heading || !heading.trim()) return;
        void run(addSectionCall({ id, tab, heading: heading.trim() }));
      },
      updateRCSection(tab, sid, field, value) {
        later(`sec:${sid}:${field}`, () => updateSectionCall({ id, tab, sectionId: sid, [field]: value }));
      },
      async removeRCSection(tab, sid) {
        if (!await dlg.confirm('Remove this agenda section and all its points?')) return;
        void run(removeSectionCall({ id, tab, sectionId: sid }));
      },
      async addRCPoint(tab, sid) {
        const text = await dlg.prompt('Agenda point text:');
        if (!text || !text.trim()) return;
        void run(addPointCall({ id, tab, sectionId: sid, text: text.trim() }));
      },
      updateRCPoint(tab, sid, pid, field, value) {
        const body = { id, tab, sectionId: sid, pointId: pid, [field]: value };
        if (field === 'indicator') void run(updatePointCall(body));
        else later(`pt:${pid}:${field}`, () => updatePointCall(body));
      },
      removeRCPoint(tab, sid, pid) {
        void run(removePointCall({ id, tab, sectionId: sid, pointId: pid }));
      },

      // ===== DEPARTMENT CRUD =====
      async editDepartmentMeta() {
        if (!d) return;
        const name = await dlg.prompt('Department name:', d.name); if (name === null) return;
        const iconIn = await dlg.prompt('Icon (one emoji):', d.icon); if (iconIn === null) return;
        const description = await dlg.prompt('Short description:', d.description || ''); if (description === null) return;
        void run(updateDepartment({ id, name: name.trim() || d.name, icon: iconIn.trim() || d.icon, description }));
      },
      async deleteDepartment() {
        if (!d) return;
        if (!await dlg.confirm('Delete department "' + d.name + '"? This removes all its positions and tasks. Cannot be undone.')) return;
        const ok = await run(removeDepartment(id));
        if (ok) navigate('/departments');
      },
      async addPosition() {
        const name = await dlg.prompt('Position name (e.g. "Lab Technician"):');
        if (!name || !name.trim()) return;
        const description = await dlg.prompt('What does this position do?', ''); if (description === null) return;
        void run(addPositionCall({ id, name: name.trim(), description }));
      },
      updatePosition(pid, field, value) {
        later(`pos:${pid}:${field}`, () => updatePositionCall({ id, positionId: pid, [field]: value }));
      },
      togglePositionTag(kind, tid, pid) {
        const t = taskOf(kind, tid); if (!t) return;
        const ids = [...(t.positionIds || [])];
        const i = ids.indexOf(pid);
        if (i >= 0) ids.splice(i, 1); else ids.push(pid);
        void run(updateTaskCall({ id, kind, taskId: tid, positionIds: ids }));
      },
      clearPositionTags(kind, tid) {
        void run(updateTaskCall({ id, kind, taskId: tid, positionIds: [] }));
      },
      toggleWeeklyDow(tid, dow) {
        const t = taskOf('weekly', tid); if (!t) return;
        const days = [...(t.daysOfWeek || [])];
        const i = days.indexOf(dow);
        if (i >= 0) days.splice(i, 1); else days.push(dow);
        // Keep at least one day — if the last chip is cleared the API falls back to Monday.
        void run(updateTaskCall({ id, kind: 'weekly', taskId: tid, daysOfWeek: days }));
      },
      toggleMonthlyLast(tid) {
        const t = taskOf('monthly', tid); if (!t) return;
        void run(updateTaskCall({ id, kind: 'monthly', taskId: tid, dayOfMonth: t.dayOfMonth === 'last' ? 1 : 'last' }));
      },
      async removePosition(pid) {
        if (!await dlg.confirm('Remove this position? Tasks assigned to it will revert to "All in department".')) return;
        void run(removePositionCall({ id, positionId: pid }));
      },
      async addDeptTask(kind) {
        if (!d) return;
        const labels = { opening: 'Opening shift task', closing: 'Closing shift task', weekly: 'Weekly task (for managers)', monthly: 'Monthly task (for heads)' };
        const text = await dlg.prompt(labels[kind] + ' description:');
        if (!text || !text.trim()) return;
        const defaultTime = await dlg.prompt('Default time (HH:MM):', kind === 'opening' ? '09:00' : kind === 'closing' ? '18:00' : '10:00');
        if (defaultTime === null) return;

        const extra = {};
        if (kind === 'weekly') {
          const dowMenu = DAYS_OF_WEEK_FULL.map((dn, i) => i + '=' + dn).join(' · ');
          const dowRaw = await dlg.prompt('Which day(s) of the week? Enter comma-separated numbers (' + dowMenu + ')\n\nExamples:\n  1          → every Monday\n  1,5       → Mondays and Fridays\n  1,2,3,4,5 → Mon–Fri', '1');
          if (dowRaw === null) return;
          const picked = dowRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 6);
          extra.daysOfWeek = picked.length ? Array.from(new Set(picked)) : [1];
        }
        if (kind === 'monthly') {
          const dom = await dlg.prompt('Which date of the month? Enter 1-31, or type "last" for the last day of every month:', '1');
          if (dom === null) return;
          const trimmed = (dom || '').trim().toLowerCase();
          if (trimmed === 'last' || trimmed === 'l') extra.dayOfMonth = 'last';
          else extra.dayOfMonth = Math.max(1, Math.min(31, parseInt(trimmed, 10) || 1));
        }

        let positionIds = [];
        if (d.positions.length > 0) {
          const menu = d.positions.map((p, i) => (i + 1) + '. ' + p.name).join('\n');
          const pick = await dlg.prompt('Tag to which position(s)? Enter comma-separated numbers, or blank for "All in department".\n\n' + menu + '\n\nExamples:\n  1          → only position 1\n  1,3       → positions 1 AND 3\n  (blank)  → everyone in the department');
          if (pick && pick.trim() !== '') {
            const nums = pick.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= d.positions.length);
            positionIds = Array.from(new Set(nums.map(n => d.positions[n - 1].id)));
          }
        }
        void run(addTaskCall({ id, kind, text: text.trim(), defaultTime, positionIds, ...extra }));
      },
      updateDeptTask(kind, tid, field, value) {
        const immediate = field === 'positionIds' || field === 'daysOfWeek';
        const body = { id, kind, taskId: tid, [field]: value };
        if (immediate) void run(updateTaskCall(body));
        else later(`task:${tid}:${field}`, () => updateTaskCall(body));
      },
      async removeDeptTask(kind, tid) {
        if (!await dlg.confirm('Remove this task?')) return;
        void run(removeTaskCall({ id, kind, taskId: tid }));
      },
    };
  }, [d, id, debounce, show, navigate, updateDepartment, removeDepartment, addPositionCall, updatePositionCall, removePositionCall,
    addTaskCall, updateTaskCall, removeTaskCall, putCadenceCall, addSectionCall, updateSectionCall, removeSectionCall,
    addPointCall, updatePointCall, removePointCall]);

  if (isLoading) {
    return <Box sx={{ p: 4, color: tokens.slate, fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading department…</Box>;
  }

  if (!d) {
    return (
      <Box sx={{ p: 4, color: tokens.slate, fontSize: 13 }}>
        {errorCode(error) === 'not_found' || !error ? (
          <>Department not found. <Btn size="sm" sx={{ ml: 1 }} onClick={() => navigate('/departments')}>← Back to Department Master</Btn></>
        ) : (
          <>
            <ApiError error={error} onRetry={refetch} sx={{ mb: 2 }} />
            <Btn size="sm" onClick={() => navigate('/departments')}>← Back to Department Master</Btn>
          </>
        )}
      </Box>
    );
  }

  const weeklySorted = (d.weeklyTasks || []).slice().sort((a, b) => {
    const aFirst = (a.daysOfWeek || [7])[0] ?? 7;
    const bFirst = (b.daysOfWeek || [7])[0] ?? 7;
    return (aFirst - bFirst) || (a.order - b.order);
  });
  const monthlySorted = (d.monthlyTasks || []).slice().sort((a, b) => {
    const aDay = a.dayOfMonth === 'last' ? 99 : +a.dayOfMonth;
    const bDay = b.dayOfMonth === 'last' ? 99 : +b.dayOfMonth;
    return (aDay - bDay) || (a.order - b.order);
  });

  const headStat = (v, l) => (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 700 }}>{v}</Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 9, opacity: 0.8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</Box>
    </Box>
  );

  return (
    <Box>
      <Eyebrow code="TL-OPS-ORG-001" parts={['Administration', d.code]} />

      <ApiError error={error} onRetry={refetch} sx={{ mb: '12px' }} />
      <Fetching on={isFetching} />

      {/* .dept-detail-head */}
      <Box sx={{ p: { xs: '20px', md: '24px 28px' }, background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: '12px', mb: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>{d.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 700, m: 0, letterSpacing: '-0.01em', color: '#fff' }}>{d.name}</Typography>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: '4px', letterSpacing: '0.04em' }}>{d.code} · {d.positions.length} position{d.positions.length !== 1 ? 's' : ''}</Box>
          <Box sx={{ fontSize: 13, opacity: 0.92, mt: '8px', maxWidth: 700, lineHeight: 1.55 }}>{d.description}</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: '22px', ml: { xs: 0, lg: 'auto' }, flexWrap: 'wrap', flexBasis: { xs: '100%', lg: 'auto' } }}>
          {headStat(d.positions.length, 'Positions')}
          {headStat(d.openingTasks.length + d.closingTasks.length, 'Daily')}
          {headStat((d.weeklyTasks || []).length, 'Weekly')}
          {headStat((d.monthlyTasks || []).length, 'Monthly')}
        </Box>
      </Box>

      {/* POSITIONS */}
      <DeptSection title={<>👤 Positions</>} count={d.positions.length} action={<Btn variant="primary" size="sm" onClick={api.addPosition}>+ Add Position</Btn>}>
        <SectionNote>
          Positions are sub-roles within this department. If this department has <strong>no positions</strong>, every employee in the department does every task below.
          If positions exist, tasks can be assigned to a specific position or left as "All in department".
        </SectionNote>
        {d.positions.length ? (
          <Scroller minWidth={560}>
            {d.positions.map(p => <PositionRow key={p.id} dept={d} position={p} api={api} />)}
          </Scroller>
        ) : (
          <Box sx={{ p: '14px', bgcolor: tokens.creamWarm, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '6px', fontSize: 12, color: tokens.slate, textAlign: 'center' }}>No positions defined. Every employee in this department will do all tasks below.</Box>
        )}
      </DeptSection>

      {/* OPENING TASKS */}
      <DeptSection title={<>🌅 Opening Shift Tasks</>} count={d.openingTasks.length} action={<Btn variant="primary" size="sm" onClick={() => api.addDeptTask('opening')}>+ Add Task</Btn>}>
        <SectionNote>Fired at the start of every shift for this department. Order controls the sequence shown in My Activity.</SectionNote>
        <Scroller minWidth={640}>
          <ColHeader columns={DAILY_HEADER} cols={DAILY_HEADER_COLS} />
          {d.openingTasks.length ? d.openingTasks.slice().sort((a, b) => a.order - b.order).map(t => <TaskRow key={t.id} dept={d} task={t} kind="opening" api={api} />) : <EmptyLine>No opening tasks yet.</EmptyLine>}
        </Scroller>
      </DeptSection>

      {/* CLOSING TASKS */}
      <DeptSection title={<>🌙 Closing Shift Tasks</>} count={d.closingTasks.length} action={<Btn variant="primary" size="sm" onClick={() => api.addDeptTask('closing')}>+ Add Task</Btn>}>
        <SectionNote>Fired at the end of every shift. Last-mile hygiene — close logs, lock up, hand over.</SectionNote>
        <Scroller minWidth={640}>
          <ColHeader columns={DAILY_HEADER} cols={DAILY_HEADER_COLS} />
          {d.closingTasks.length ? d.closingTasks.slice().sort((a, b) => a.order - b.order).map(t => <TaskRow key={t.id} dept={d} task={t} kind="closing" api={api} />) : <EmptyLine>No closing tasks yet.</EmptyLine>}
        </Scroller>
      </DeptSection>

      {/* WEEKLY TASKS */}
      <DeptSection title={<>📅 Weekly Tasks</>} titleColor="#5B21B6" count={(d.weeklyTasks || []).length} action={<Btn variant="primary" size="sm" onClick={() => api.addDeptTask('weekly')} sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#7C3AED' } }}>+ Add Weekly Task</Btn>}>
        <SectionNote>Recurring every week on the chosen day(s) — typically for managers to review the week's performance, trends, open items. <strong>Click a day chip to toggle it — pick as many as needed</strong>.</SectionNote>
        <Scroller minWidth={820}>
          <ColHeader columns={WEEKLY_HEADER} cols={WM_COLS} />
          {weeklySorted.length ? weeklySorted.map(t => <WeeklyRow key={t.id} dept={d} task={t} api={api} />) : <EmptyLine>No weekly tasks yet.</EmptyLine>}
        </Scroller>
      </DeptSection>

      {/* MONTHLY TASKS */}
      <DeptSection title={<>📆 Monthly Tasks</>} titleColor="#1E40AF" count={(d.monthlyTasks || []).length} action={<Btn variant="primary" size="sm" onClick={() => api.addDeptTask('monthly')} sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#2563EB' } }}>+ Add Monthly Task</Btn>}>
        <SectionNote>Recurring every month on the chosen date — typically for department heads to roll up, report, and submit statutory / governance items. <strong>Type a date (1-31) or tap "Last" for the last day of every month</strong>.</SectionNote>
        <Scroller minWidth={820}>
          <ColHeader columns={MONTHLY_HEADER} cols={WM_COLS} />
          {monthlySorted.length ? monthlySorted.map(t => <MonthlyRow key={t.id} dept={d} task={t} api={api} />) : <EmptyLine>No monthly tasks yet.</EmptyLine>}
        </Scroller>
      </DeptSection>

      <ReviewCadenceSection dept={d} tab={RC_AGENDA_TAB} onTab={setRCAgendaTab} api={api} />

      {/* footer bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '14px 18px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', mt: '20px', gap: 1, flexWrap: 'wrap' }}>
        <Btn onClick={() => navigate('/departments')}>← Back to Department Master</Btn>
        <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Btn onClick={api.editDepartmentMeta}>✎ Edit Name / Icon / Description</Btn>
          <Btn variant="danger" onClick={api.deleteDepartment}>🗑 Delete Department</Btn>
        </Box>
      </Box>
      {toast}
    </Box>
  );
}
