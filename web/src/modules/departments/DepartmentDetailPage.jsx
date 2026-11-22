import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/AppStore';
import { useCrumbs } from '../../store/CrumbsContext';
import { Eyebrow, Btn } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { DAYS_OF_WEEK_FULL } from '../../data/departments';
import { deptTaskList, rid } from './utils';
import DeptSection, { SectionNote, ColHeader, EmptyLine } from './components/DeptSection';
import { TaskRow, WeeklyRow, MonthlyRow, PositionRow, DAILY_HEADER_COLS, WM_COLS } from './components/TaskRows';
import ReviewCadenceSection from './components/ReviewCadenceSection';

const DAILY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];
const WEEKLY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'DAYS OF WEEK (click to toggle)' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];
const MONTHLY_HEADER = [
  { label: '#', sx: { textAlign: 'center' } }, { label: 'TASK' }, { label: 'DATE OF MONTH' }, { label: 'TIME' }, { label: 'ASSIGNED TO', sx: { textAlign: 'left', pl: '8px' } }, { label: '' },
];

/** horizontal scroll wrapper for the table-like rows on narrow screens */
const Scroller = ({ minWidth, children }) => (
  <Box sx={{ overflowX: 'auto' }}><Box sx={{ minWidth }}>{children}</Box></Box>
);

/** VIEW: DEPARTMENT DETAIL — renderDepartmentDetail (prototype 12295–12497) + CRUD (12611–12692, 12887–13034) */
export default function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, mutate } = useAppStore();
  const [RC_AGENDA_TAB, setRCAgendaTab] = useState('weekly');
  const d = state.departments.find(x => x.id === id);

  useCrumbs([{ label: 'Admin', to: '/' }, { label: 'Department Master', to: '/departments' }, { label: d ? d.code : '' }]);

  if (!d) {
    return (
      <Box sx={{ p: 4, color: tokens.slate, fontSize: 13 }}>
        Department not found. <Btn size="sm" sx={{ ml: 1 }} onClick={() => navigate('/departments')}>← Back to Department Master</Btn>
      </Box>
    );
  }

  // Every mutation below edits a deep clone of the departments collection (prototype mutated DEPARTMENTS in place)
  const edit = (fn) => mutate('departments', ds => { const dd = ds.find(x => x.id === id); if (!dd) return; fn(dd); });

  const api = {
    // ===== REVIEW CADENCE CRUD =====
    updateRC(path, value) {
      edit(dd => {
        const parts = path.split('.');
        let target = dd.reviewCadence;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
      });
    },
    toggleRCWeeklyDow(dow) {
      edit(dd => {
        if (!dd.reviewCadence.weekly.daysOfWeek) dd.reviewCadence.weekly.daysOfWeek = [];
        const arr = dd.reviewCadence.weekly.daysOfWeek;
        const idx = arr.indexOf(dow);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(dow);
      });
    },
    toggleRCMonthlyLast() {
      edit(dd => { const m = dd.reviewCadence.monthly; m.dayOfMonth = (m.dayOfMonth === 'last') ? 1 : 'last'; });
    },
    addRCSection(tab) {
      const heading = window.prompt('Section heading (e.g. "Stockouts & Near-Stockouts"):');
      if (!heading || !heading.trim()) return;
      edit(dd => {
        const list = tab === 'weekly' ? dd.reviewCadence.weeklyAgenda : dd.reviewCadence.monthlyAgenda;
        const nextOrder = (list.reduce((m, s) => Math.max(m, s.order || 0), 0)) + 1;
        list.push({ id: 'a' + rid(), order: nextOrder, heading: heading.trim(), points: [] });
      });
    },
    updateRCSection(tab, sid, field, value) {
      edit(dd => {
        const list = tab === 'weekly' ? dd.reviewCadence.weeklyAgenda : dd.reviewCadence.monthlyAgenda;
        const s = list.find(x => x.id === sid); if (!s) return;
        s[field] = value;
      });
    },
    removeRCSection(tab, sid) {
      if (!window.confirm('Remove this agenda section and all its points?')) return;
      edit(dd => {
        if (tab === 'weekly') dd.reviewCadence.weeklyAgenda = dd.reviewCadence.weeklyAgenda.filter(x => x.id !== sid);
        else dd.reviewCadence.monthlyAgenda = dd.reviewCadence.monthlyAgenda.filter(x => x.id !== sid);
      });
    },
    addRCPoint(tab, sid) {
      const text = window.prompt('Agenda point text:');
      if (!text || !text.trim()) return;
      edit(dd => {
        const list = tab === 'weekly' ? dd.reviewCadence.weeklyAgenda : dd.reviewCadence.monthlyAgenda;
        const s = list.find(x => x.id === sid); if (!s) return;
        if (!s.points) s.points = [];
        s.points.push({ id: 'p' + rid(), text: text.trim(), indicator: null });
      });
    },
    updateRCPoint(tab, sid, pid, field, value) {
      edit(dd => {
        const list = tab === 'weekly' ? dd.reviewCadence.weeklyAgenda : dd.reviewCadence.monthlyAgenda;
        const s = list.find(x => x.id === sid); if (!s) return;
        const p = s.points.find(x => x.id === pid); if (!p) return;
        p[field] = value;
      });
    },
    removeRCPoint(tab, sid, pid) {
      edit(dd => {
        const list = tab === 'weekly' ? dd.reviewCadence.weeklyAgenda : dd.reviewCadence.monthlyAgenda;
        const s = list.find(x => x.id === sid); if (!s) return;
        s.points = s.points.filter(x => x.id !== pid);
      });
    },

    // ===== DEPARTMENT CRUD =====
    editDepartmentMeta() {
      const name = window.prompt('Department name:', d.name); if (name === null) return;
      const icon = window.prompt('Icon (one emoji):', d.icon) || d.icon;
      const description = window.prompt('Short description:', d.description || '');
      edit(dd => {
        dd.name = name.trim() || dd.name;
        dd.icon = icon;
        if (description !== null) dd.description = description;
      });
    },
    deleteDepartment() {
      if (!window.confirm('Delete department "' + d.name + '"? This removes all its positions and tasks. Cannot be undone.')) return;
      mutate('departments', ds => ds.filter(x => x.id !== id));
      navigate('/departments');
    },
    addPosition() {
      const name = window.prompt('Position name (e.g. "Lab Technician"):');
      if (!name || !name.trim()) return;
      const description = window.prompt('What does this position do?', '') || '';
      edit(dd => { dd.positions.push({ id: 'p' + rid(), name: name.trim(), description }); });
    },
    updatePosition(pid, field, value) {
      edit(dd => { const p = dd.positions.find(x => x.id === pid); if (!p) return; p[field] = value; });
    },
    togglePositionTag(kind, tid, pid) {
      edit(dd => {
        const t = deptTaskList(dd, kind).find(x => x.id === tid); if (!t) return;
        if (!Array.isArray(t.positionIds)) t.positionIds = [];
        const idx = t.positionIds.indexOf(pid);
        if (idx >= 0) t.positionIds.splice(idx, 1);
        else t.positionIds.push(pid);
      });
    },
    clearPositionTags(kind, tid) {
      edit(dd => { const t = deptTaskList(dd, kind).find(x => x.id === tid); if (!t) return; t.positionIds = []; });
    },
    toggleWeeklyDow(tid, dow) {
      edit(dd => {
        const t = (dd.weeklyTasks || []).find(x => x.id === tid); if (!t) return;
        if (!Array.isArray(t.daysOfWeek)) t.daysOfWeek = [];
        const idx = t.daysOfWeek.indexOf(dow);
        if (idx >= 0) t.daysOfWeek.splice(idx, 1);
        else t.daysOfWeek.push(dow);
        // Keep at least one day — if user cleared all, re-add Mon
        if (t.daysOfWeek.length === 0) t.daysOfWeek = [1];
      });
    },
    toggleMonthlyLast(tid) {
      edit(dd => { const t = (dd.monthlyTasks || []).find(x => x.id === tid); if (!t) return; t.dayOfMonth = (t.dayOfMonth === 'last') ? 1 : 'last'; });
    },
    removePosition(pid) {
      if (!window.confirm('Remove this position? Tasks assigned to it will revert to "All in department".')) return;
      edit(dd => {
        dd.positions = dd.positions.filter(x => x.id !== pid);
        // Remove the position id from every tagged task's positionIds across all cadences
        ['opening', 'closing', 'weekly', 'monthly'].forEach(k => deptTaskList(dd, k).forEach(t => {
          if (Array.isArray(t.positionIds)) t.positionIds = t.positionIds.filter(x => x !== pid);
          if (t.positionId === pid) t.positionId = null;
        }));
      });
    },
    addDeptTask(kind) {
      const labels = { opening: 'Opening shift task', closing: 'Closing shift task', weekly: 'Weekly task (for managers)', monthly: 'Monthly task (for heads)' };
      const text = window.prompt(labels[kind] + ' description:');
      if (!text || !text.trim()) return;
      const defaultTime = window.prompt('Default time (HH:MM):', kind === 'opening' ? '09:00' : kind === 'closing' ? '18:00' : '10:00') || '';

      const extra = {};
      if (kind === 'weekly') {
        const dowMenu = DAYS_OF_WEEK_FULL.map((dn, i) => i + '=' + dn).join(' · ');
        const dowRaw = window.prompt('Which day(s) of the week? Enter comma-separated numbers (' + dowMenu + ')\n\nExamples:\n  1          → every Monday\n  1,5       → Mondays and Fridays\n  1,2,3,4,5 → Mon–Fri', '1');
        if (dowRaw === null) return;
        const picked = dowRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 6);
        extra.daysOfWeek = picked.length ? Array.from(new Set(picked)) : [1];
      }
      if (kind === 'monthly') {
        const dom = window.prompt('Which date of the month? Enter 1-31, or type "last" for the last day of every month:', '1');
        if (dom === null) return;
        const trimmed = (dom || '').trim().toLowerCase();
        if (trimmed === 'last' || trimmed === 'l') extra.dayOfMonth = 'last';
        else extra.dayOfMonth = Math.max(1, Math.min(31, parseInt(trimmed, 10) || 1));
      }

      let positionIds = [];
      if (d.positions.length > 0) {
        const menu = d.positions.map((p, i) => (i + 1) + '. ' + p.name).join('\n');
        const pick = window.prompt('Tag to which position(s)? Enter comma-separated numbers, or blank for "All in department".\n\n' + menu + '\n\nExamples:\n  1          → only position 1\n  1,3       → positions 1 AND 3\n  (blank)  → everyone in the department');
        if (pick && pick.trim() !== '') {
          const nums = pick.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= d.positions.length);
          positionIds = Array.from(new Set(nums.map(n => d.positions[n - 1].id)));
        }
      }
      edit(dd => {
        const list = deptTaskList(dd, kind);
        const nextOrder = (list.reduce((m, t) => Math.max(m, t.order || 0), 0)) + 1;
        list.push({ id: kind.charAt(0) + rid(), order: nextOrder, text: text.trim(), defaultTime, positionIds, ...extra });
      });
    },
    updateDeptTask(kind, tid, field, value) {
      edit(dd => { const t = deptTaskList(dd, kind).find(x => x.id === tid); if (!t) return; t[field] = value; });
    },
    removeDeptTask(kind, tid) {
      if (!window.confirm('Remove this task?')) return;
      edit(dd => {
        const list = deptTaskList(dd, kind);
        if (kind === 'opening') dd.openingTasks = list.filter(x => x.id !== tid);
        else if (kind === 'closing') dd.closingTasks = list.filter(x => x.id !== tid);
        else if (kind === 'weekly') dd.weeklyTasks = list.filter(x => x.id !== tid);
        else if (kind === 'monthly') dd.monthlyTasks = list.filter(x => x.id !== tid);
      });
    },
  };

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
    </Box>
  );
}
