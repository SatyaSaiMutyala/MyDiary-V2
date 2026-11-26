import { Box, ButtonBase, keyframes } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { TODAY, parseDate, isOverdue, MONTHS_FULL, DAYS } from '../../../utils/dates';
import { initials } from '../../../utils/people';
import { projectAvgProgress, daysBetween, GANTT_ZOOM_CFG } from '../utils';
import { useDialog } from '../../../components/Dialogs';
import { Icon } from '../../../components';

const pulseBar = keyframes`0%,100% { box-shadow: 0 1px 3px rgba(0,0,0,0.1); } 50% { box-shadow: 0 0 0 4px rgba(197,48,48,0.3); }`;

const ROW_H = 42;
const BAR_STYLE = {
  'milestone-todo': { background: `linear-gradient(90deg, ${tokens.slateSoft}, ${tokens.slate})`, color: '#fff' },
  'milestone-in-progress': { background: `linear-gradient(90deg, ${tokens.blue}, #1E40AF)`, color: '#fff' },
  'milestone-done': { background: `linear-gradient(90deg, ${tokens.teal}, ${tokens.tealDark})`, color: '#fff' },
  'milestone-overdue': { background: `linear-gradient(90deg, ${tokens.red}, #8B1E1E)`, color: '#fff', animation: `${pulseBar} 2s infinite` },
  'task-low': { background: `linear-gradient(90deg, #5EEAD4, ${tokens.teal})`, color: tokens.greenDeep },
  'task-medium': { background: `linear-gradient(90deg, #FDE68A, ${tokens.yellow})`, color: tokens.greenDeep },
  'task-high': { background: `linear-gradient(90deg, #FDBA74, ${tokens.orange})`, color: '#fff' },
  'task-critical': { background: `linear-gradient(90deg, #FCA5A5, ${tokens.red})`, color: '#fff' },
};
const DIAMOND = { todo: tokens.slateSoft, done: tokens.teal, 'in-progress': tokens.blue, overdue: tokens.red };

/** .gantt-bar */
function Bar({ left, width, kind, done, overdue, extraSx, onClick, children }) {
  return (
    <Box onClick={onClick} sx={{ position: 'absolute', top: 9, height: 24, borderRadius: '4px', p: '0 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', overflow: 'hidden', fontWeight: 700, zIndex: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: 24, transition: 'all 0.1s', letterSpacing: '0.02em', whiteSpace: 'nowrap', color: '#fff', left, width, boxSizing: 'border-box', ...(BAR_STYLE[kind] || {}), ...(overdue ? BAR_STYLE['milestone-overdue'] : {}), ...(done ? { opacity: 0.55, textDecoration: 'line-through' } : {}), '&:hover': { zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', transform: 'translateY(-1px)' }, ...extraSx }}>
      {children}
    </Box>
  );
}

/** renderGanttPane() — zoom toolbar, sticky label column, scrollable timeline with axis, bars, diamonds, today line */
export default function GanttPane({ p, actions, zoom, setZoom }) {
  const dlg = useDialog();
  const cfg = GANTT_ZOOM_CFG[zoom];
  const pxPerDay = cfg.pxPerDay;

  const projStart = parseDate(p.startDate);
  const projEnd = parseDate(p.endDate);
  const rangeStart = new Date(projStart); rangeStart.setDate(rangeStart.getDate() - 3);
  const rangeEnd = new Date(projEnd); rangeEnd.setDate(rangeEnd.getDate() + 3);
  const totalDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
  const totalWidth = totalDays * pxPerDay;

  const todayStr = new Date(TODAY).toISOString().slice(0, 10);
  const todayDate = parseDate(todayStr);
  const todayOffset = Math.round((todayDate - rangeStart) / 86400000) * pxPerDay;

  const months = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const monthKey = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
    let month = months.find(m => m.key === monthKey);
    if (!month) { month = { key: monthKey, year: cursor.getFullYear(), monthIdx: cursor.getMonth(), days: [] }; months.push(month); }
    month.days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const allDays = months.flatMap(m => m.days);

  const milestones = (p.milestones || []).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tasks = (p.tasks || []).slice().sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  // ---- left column rows ----
  const labelSx = { p: '8px 14px', borderBottom: `1px solid ${tokens.lineSoft}`, height: ROW_H, display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, cursor: 'pointer', transition: 'background 0.1s', boxSizing: 'border-box', '&:hover': { bgcolor: tokens.cream } };
  const sectionLabelSx = { ...labelSx, bgcolor: tokens.cream, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700, cursor: 'default', '&:hover': {} };
  const rowIco = (bg, ch) => <Box sx={{ width: 20, height: 20, borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, bgcolor: bg }}>{ch}</Box>;
  const rowName = (t) => <Box title={t} sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{t}</Box>;
  const rowOwner = (n) => <Box sx={{ fontSize: 9, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{initials(n)}</Box>;

  const leftRows = [
    <Box key="sh-p" sx={sectionLabelSx}><span><Icon name="chart" />Project Overview</span></Box>,
    <Box key="p" sx={labelSx} onClick={() => dlg.alert(`Project spans ${p.startDate} to ${p.endDate}`)}>{rowIco(tokens.greenDeep, 'P')}{rowName(p.name)}</Box>,
  ];
  if (milestones.length) {
    leftRows.push(<Box key="sh-m" sx={sectionLabelSx}><span><Icon name="milestone" />Milestones ({milestones.length})</span></Box>);
    milestones.forEach((m, i) => leftRows.push(
      <Box key={m.id} sx={labelSx} onClick={() => actions.updateMilestoneStatus(p.id, m.id, m.status === 'done' ? 'todo' : 'done')}>{rowIco(tokens.tealDark, i + 1)}{rowName(m.name)}{rowOwner(m.owner)}</Box>
    ));
  }
  if (tasks.length) {
    leftRows.push(<Box key="sh-t" sx={sectionLabelSx}><span>✓ Tasks ({tasks.length})</span></Box>);
    tasks.forEach(t => leftRows.push(
      <Box key={t.id} sx={labelSx}>{rowIco(tokens.blue, t.priority === 'critical' ? '!' : t.priority === 'high' ? '↑' : t.priority === 'low' ? '↓' : '=')}{rowName(t.title)}{rowOwner(t.assignee)}</Box>
    ));
  }

  // ---- right column ----
  const cells = (
    <Box sx={{ display: 'flex', position: 'absolute', inset: 0 }}>
      {allDays.map((d, i) => {
        const dStr = d.toISOString().slice(0, 10);
        const isT = dStr === todayStr;
        const isW = d.getDay() === 0 || d.getDay() === 6;
        return <Box key={i} sx={{ flexShrink: 0, width: pxPerDay, borderRight: `1px solid ${tokens.lineSoft}`, height: '100%', boxSizing: 'border-box', bgcolor: isT ? tokens.yellowSoft : isW ? 'rgba(0,0,0,0.02)' : 'transparent', opacity: isT ? 0.4 : 1 }} />;
      })}
    </Box>
  );
  const rowSx = { height: ROW_H, display: 'flex', borderBottom: `1px solid ${tokens.lineSoft}`, position: 'relative', width: totalWidth, boxSizing: 'border-box' };
  const sectionRow = (k) => <Box key={k} sx={{ ...rowSx, bgcolor: tokens.cream }} />;

  const projLeft = Math.max(0, Math.round((projStart - rangeStart) / 86400000) * pxPerDay);
  const projWidth = Math.max(pxPerDay, (daysBetween(p.startDate, p.endDate) + 1) * pxPerDay);

  const rightRows = [
    sectionRow('s-p'),
    <Box key="p" sx={rowSx}>
      {cells}
      <Bar left={projLeft} width={projWidth} kind="milestone-done" extraSx={{ background: `linear-gradient(90deg, ${tokens.greenDeep}, ${tokens.tealDark})`, top: 9 }} onClick={() => dlg.alert('Project: ' + p.name)}>{p.code} · {projectAvgProgress(p)}%</Bar>
    </Box>,
  ];

  if (milestones.length) {
    rightRows.push(sectionRow('s-m'));
    let prevEnd = p.startDate;
    milestones.forEach((m, idx) => {
      const barStart = parseDate(prevEnd);
      const barEnd = parseDate(m.dueDate);
      const leftPx = Math.max(0, Math.round((barStart - rangeStart) / 86400000) * pxPerDay);
      const widthPx = Math.max(pxPerDay * 1.5, Math.round((barEnd - barStart) / 86400000 + 1) * pxPerDay);
      const diamondLeft = Math.round((barEnd - rangeStart) / 86400000) * pxPerDay + pxPerDay;
      const odM = m.status !== 'done' && isOverdue(m.dueDate);
      const kind = m.status === 'done' ? 'milestone-done' : odM ? 'milestone-overdue' : m.status === 'in-progress' ? 'milestone-in-progress' : 'milestone-todo';
      const dk = m.status === 'done' ? 'done' : odM ? 'overdue' : m.status === 'in-progress' ? 'in-progress' : 'todo';
      const maxChars = Math.floor(widthPx / 7);
      rightRows.push(
        <Box key={m.id} sx={rowSx}>
          {cells}
          <Bar left={leftPx} width={widthPx} kind={kind} onClick={() => actions.updateMilestoneStatus(p.id, m.id, m.status === 'done' ? 'todo' : 'done')}>
            {widthPx > 80 ? (idx + 1) + '. ' + (m.name.length > maxChars ? m.name.slice(0, maxChars) + '…' : m.name) : (idx + 1)}
          </Bar>
          <Box onClick={() => dlg.alert(`Milestone: ${m.name}\nDue: ${m.dueDate}\nOwner: ${m.owner}\nStatus: ${m.status}`)} sx={{ position: 'absolute', top: 10, left: diamondLeft, width: 22, height: 22, bgcolor: DIAMOND[dk], transform: 'rotate(45deg)', zIndex: 12, cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', ml: '-11px', boxSizing: 'border-box', '&::before': { content: '""', position: 'absolute', inset: 3, bgcolor: '#fff', opacity: 0.4, borderRadius: '2px' } }} />
        </Box>
      );
      prevEnd = m.dueDate;
    });
  }

  if (tasks.length) {
    rightRows.push(sectionRow('s-t'));
    tasks.forEach(t => {
      if (!t.dueDate) { rightRows.push(<Box key={t.id} sx={rowSx}>{cells}</Box>); return; }
      const taskEnd = parseDate(t.dueDate);
      const taskStart = new Date(taskEnd); taskStart.setDate(taskStart.getDate() - 3);
      const leftPx = Math.max(0, Math.round((taskStart - rangeStart) / 86400000) * pxPerDay);
      const widthPx = Math.max(pxPerDay * 2, 4 * pxPerDay);
      const odT = t.status !== 'done' && isOverdue(t.dueDate);
      const maxChars = Math.floor(widthPx / 7);
      rightRows.push(
        <Box key={t.id} sx={rowSx}>
          {cells}
          <Bar left={leftPx} width={widthPx} kind={'task-' + t.priority} done={t.status === 'done'} overdue={odT} onClick={() => actions.updateTaskStatus(p.id, t.id, t.status === 'done' ? 'todo' : 'done')}>
            {widthPx > 50 ? (t.title.length > maxChars ? t.title.slice(0, maxChars) + '…' : t.title) : '•'}
          </Bar>
        </Box>
      );
    });
  }

  const legend = [[tokens.teal, 'Done'], [tokens.blue, 'In Progress'], [tokens.red, 'Overdue'], [tokens.slateSoft, 'To Do']];
  const labelMono = { fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 };

  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, overflow: 'hidden', boxShadow: tokens.shadowSm }}>
      {/* toolbar */}
      <Box sx={{ p: '12px 18px', borderBottom: `1px solid ${tokens.line}`, bgcolor: tokens.cream, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Box component="span" sx={labelMono}>Zoom:</Box>
        <Box sx={{ display: 'inline-flex', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', p: '3px' }}>
          {['day', 'week', 'month'].map(z => (
            <ButtonBase key={z} onClick={() => setZoom(z)} sx={{ p: '5px 12px', bgcolor: zoom === z ? tokens.greenDeep : 'transparent', border: 'none', borderRadius: '4px', fontSize: 11, fontWeight: 700, color: zoom === z ? '#fff' : tokens.slate, letterSpacing: '0.04em', fontFamily: 'inherit' }}>{GANTT_ZOOM_CFG[z].label}</ButtonBase>
          ))}
        </Box>
        <Box component="span" sx={{ ...labelMono, ml: { md: '14px' } }}>Scroll horizontally to see full timeline. Click a bar to toggle status.</Box>
        <Box sx={{ display: 'inline-flex', gap: '12px', fontSize: 11, color: tokens.slate, ml: { md: 'auto' }, fontFamily: fonts.mono, letterSpacing: '0.04em', flexWrap: 'wrap' }}>
          {legend.map(([c, l]) => <Box key={l} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Box component="span" sx={{ width: 10, height: 10, transform: 'rotate(45deg)', bgcolor: c }} />{l}</Box>)}
        </Box>
      </Box>

      {/* scroll area */}
      <Box sx={{ overflow: 'auto', maxHeight: 560, position: 'relative' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: `180px ${totalWidth}px`, sm: `260px ${totalWidth}px` }, minWidth: '100%' }}>
          {/* sticky left */}
          <Box sx={{ bgcolor: tokens.creamWarm, borderRight: `2px solid ${tokens.line}`, position: 'sticky', left: 0, zIndex: 30 }}>
            <Box sx={{ height: 44, p: '12px 14px', background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `2px solid ${tokens.line}`, position: 'sticky', top: 0, zIndex: 10, boxSizing: 'border-box' }}><Icon name="clipboard" />Item · Owner</Box>
            {leftRows}
          </Box>
          {/* timeline */}
          <Box sx={{ position: 'relative', bgcolor: tokens.card }}>
            <Box sx={{ height: 44, display: 'flex', background: `linear-gradient(to bottom, ${tokens.creamWarm}, ${tokens.card})`, borderBottom: `2px solid ${tokens.line}`, position: 'sticky', top: 0, zIndex: 20, width: totalWidth, boxSizing: 'border-box' }}>
              {months.map(m => (
                <Box key={m.key} sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', width: m.days.length * pxPerDay }}>
                  <Box sx={{ p: '4px 8px', bgcolor: tokens.greenDeep, color: '#fff', fontFamily: fonts.serif, fontSize: 11, fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.15)', height: 22, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap' }}>{MONTHS_FULL[m.monthIdx]} {m.year}</Box>
                  <Box sx={{ display: 'flex', flex: 1 }}>
                    {m.days.map((d, i) => {
                      const dStr = d.toISOString().slice(0, 10);
                      const isT = dStr === todayStr;
                      const isW = d.getDay() === 0 || d.getDay() === 6;
                      const showLabel = zoom === 'day' || (zoom === 'week' && d.getDay() === 1) || (zoom === 'month' && d.getDate() === 1);
                      return (
                        <Box key={i} sx={{ flexShrink: 0, width: pxPerDay, textAlign: 'center', p: '2px 0', fontFamily: fonts.mono, fontSize: 9, color: isT ? tokens.amber : tokens.slate, borderRight: `1px solid ${tokens.lineSoft}`, letterSpacing: '0.04em', fontWeight: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.2, boxSizing: 'border-box', bgcolor: isT ? tokens.yellowSoft : isW ? 'rgba(0,0,0,0.025)' : 'transparent', overflow: 'visible' }}>
                          {showLabel && <><span>{d.getDate()}</span><Box component="span" sx={{ fontSize: 7, opacity: 0.7 }}>{DAYS[d.getDay()]}</Box></>}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ position: 'relative' }}>
              {rightRows}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <Box sx={{ position: 'absolute', top: 0, bottom: 0, width: 2, bgcolor: tokens.red, zIndex: 15, pointerEvents: 'none', left: todayOffset + pxPerDay / 2, '&::before': { content: '"TODAY"', position: 'absolute', top: -18, left: -18, bgcolor: tokens.red, color: '#fff', fontFamily: fonts.mono, fontSize: 8, p: '3px 7px', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' } }} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* footer stats */}
      <Box sx={{ p: '12px 18px', bgcolor: tokens.creamWarm, borderTop: `1px solid ${tokens.line}`, fontSize: 11, color: tokens.slate, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, letterSpacing: '0.04em', '& strong': { color: tokens.ink } }}><strong>{totalDays}</strong> days · <strong>{milestones.length}</strong> milestones · <strong>{tasks.length}</strong> tasks · Project <Box component="strong" sx={{ color: `${tokens.tealDark} !important` }}>{projectAvgProgress(p)}%</Box> complete</Box>
        <Box component="span" sx={{ fontFamily: fonts.mono, letterSpacing: '0.04em' }}><Icon name="tip" />Click any bar to toggle done ↔ to do</Box>
      </Box>
    </Box>
  );
}
