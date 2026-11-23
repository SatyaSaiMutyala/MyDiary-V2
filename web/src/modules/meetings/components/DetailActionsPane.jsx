import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Btn, TextLink, PRIORITY_STYLE, STATUS_STYLE } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import DetailOwnerCell from './DetailOwnerCell';
import DetailActionExpand from './DetailActionExpand';
import { DateInput } from '../../../components/DateTimeInput';

// 30px 2fr 1.3fr 1fr 0.8fr 0.8fr 40px — at <1100px the 6th column (Status) is dropped, as in the prototype CSS
const COLS = { xs: '30px 2fr 1fr 1fr 0.8fr 40px', lg: '30px 2fr 1.3fr 1fr 0.8fr 0.8fr 40px' };
const HIDE_LG = { display: { xs: 'none', lg: 'block' } };

const fieldSx = {
  p: '7px 10px', border: '1px solid transparent', borderRadius: '5px', bgcolor: 'transparent', fontSize: 13, width: '100%', fontFamily: 'inherit', color: tokens.ink, boxSizing: 'border-box', minWidth: 0,
  '&:hover': { borderColor: tokens.line, bgcolor: tokens.card },
  '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: '#fff', boxShadow: `0 0 0 2px ${tokens.tealSoft}` },
};
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%236B6B6B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;

/** .action-field.action-select.priority-pill / .status-pill — native select styled as a pill */
function PillSelect({ style, value, onChange, children }) {
  return (
    <Box component="select" value={value} onChange={onChange} sx={{ ...fieldSx, appearance: 'none', backgroundImage: CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', cursor: 'pointer', fontFamily: fonts.mono, fontSize: 9, p: '4px 9px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center', bgcolor: style.bg, color: style.color, '&:hover': { bgcolor: style.bg, borderColor: tokens.line }, '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: style.bg, boxShadow: `0 0 0 2px ${tokens.tealSoft}` } }}>
      {children}
    </Box>
  );
}

const Ind = ({ color, title, children }) => <Box component="span" title={title} sx={{ fontSize: 10, color, fontFamily: fonts.mono, fontWeight: 700 }}>{children}</Box>;

/** Actions tab — summary, action table (expandable rows, owner combobox), footer links, info strip */
export default function DetailActionsPane({ m, actionExtras, expandedId, expandTab, onToggleExpand, onExpandTab, focusActionId,
  onAdd, onUpdate, onDelete, onSelectOwner, onExtract, onRemind, onToggleSubtask, onAddSubtask, onAddDependency, onAddComment }) {
  const actions = m.actions || [];
  const total = actions.length;
  const open = actions.filter(a => a.status !== 'done').length;
  const done = actions.filter(a => a.status === 'done').length;
  const overdue = actions.filter(a => a.status === 'overdue' || (a.status !== 'done' && isOverdue(a.deadline))).length;
  const [ownerOpen, setOwnerOpen] = useState(null);
  const inputRefs = useRef({});

  // addAction() focuses the new row's description input
  useEffect(() => {
    if (!focusActionId) return;
    const t = setTimeout(() => { const el = inputRefs.current[focusActionId]; if (el) el.focus(); }, 50);
    return () => clearTimeout(t);
  }, [focusActionId]);

  const headCell = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700 };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '16px', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 12, color: tokens.slate, '& strong': { color: tokens.ink, fontWeight: 700 } }}>
          <strong>{total}</strong> total action items · <strong>{open}</strong> open · <strong>{done}</strong> done · <strong>{overdue}</strong> overdue
        </Box>
        <Btn variant="primary" size="sm" onClick={onAdd}>+ Add Action Item</Btn>
      </Box>

      <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, overflowX: { xs: 'auto', md: 'visible' } }}>
        <Box sx={{ minWidth: { xs: 620, md: 0 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: COLS, gap: '10px', p: '12px 16px', bgcolor: tokens.creamWarm, borderBottom: `1px solid ${tokens.line}`, borderRadius: '10px 10px 0 0', ...headCell }}>
            <div>#</div>
            <div>What needs to be done</div>
            <div>Who's responsible</div>
            <div>Deadline</div>
            <div>Priority</div>
            <Box sx={HIDE_LG}>Status</Box>
            <div></div>
          </Box>

          {total === 0 ? (
            <Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.slate, fontSize: 13 }}>
              <Box sx={{ fontSize: 30, opacity: 0.4, mb: '10px' }}>✓</Box>
              <Box sx={{ fontWeight: 700, fontSize: 14, mb: '6px' }}>No action items yet</Box>
              <Box>Capture action items here as decisions are made during the meeting.</Box>
            </Box>
          ) : actions.map((a, i) => {
            const extras = actionExtras[a.id] || {};
            const subCount = (extras.subtasks || []).length;
            const subDone = (extras.subtasks || []).filter(s => s.done).length;
            const depCount = (extras.dependencies || []).length;
            const comCount = (extras.comments || []).length;
            const expanded = expandedId === a.id;
            const od = a.status !== 'done' && isOverdue(a.deadline);
            const indicators = [];
            if (a.owner && a.status !== 'done') {
              if (a.ownerType === 'external') indicators.push(<Box key="q" component="span" title="External — notified by email" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', p: '2px 7px', bgcolor: tokens.blueSoft, color: tokens.blue, borderRadius: '8px', fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase', ml: '6px' }}>📧 In {a.owner.split(' ')[0]}'s inbox</Box>);
              else indicators.push(<Box key="q" component="span" title="Visible in owner's My To-Do" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', p: '2px 7px', bgcolor: tokens.tealSofter, color: tokens.tealDark, borderRadius: '8px', fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase', ml: '6px' }}>✅ In {a.owner.split(' ')[0]}'s queue</Box>);
            }
            if (subCount) indicators.push(<Ind key="s" title="Sub-tasks" color={tokens.tealDark}>☐ {subDone}/{subCount}</Ind>);
            if (depCount) indicators.push(<Ind key="d" title="Dependencies" color={tokens.amber}>⚡ {depCount}</Ind>);
            if (comCount) indicators.push(<Ind key="c" title="Comments" color={tokens.blue}>💬 {comCount}</Ind>);

            return (
              <Box key={a.id}>
                <Box sx={{ display: 'grid', gridTemplateColumns: COLS, gap: '10px', p: '12px 16px', borderBottom: `1px solid ${tokens.lineSoft}`, alignItems: 'center', bgcolor: expanded ? tokens.cream : 'transparent', borderLeft: expanded ? `3px solid ${tokens.teal}` : 'none', '&:hover': { bgcolor: tokens.cream } }}>
                  <Box onClick={() => onToggleExpand(a.id)} title="Expand / collapse" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{expanded ? '▾' : '▸'} {String(i + 1).padStart(2, '0')}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box component="input" type="text" value={a.desc} ref={(el) => { inputRefs.current[a.id] = el; }} onChange={(e) => onUpdate(a.id, 'desc', e.target.value)} sx={fieldSx} />
                    {indicators.length > 0 && <Box sx={{ display: 'flex', gap: '10px', p: '2px 10px', mt: '2px', flexWrap: 'wrap', alignItems: 'center' }}>{indicators}</Box>}
                  </Box>
                  <DetailOwnerCell action={a} open={ownerOpen === a.id} onToggle={() => setOwnerOpen(ownerOpen === a.id ? null : a.id)} onClose={() => setOwnerOpen(null)}
                    onSelect={(name, ext) => { onSelectOwner(a.id, name, ext); setOwnerOpen(null); }} />
                  <DateInput value={a.deadline} onChange={(e) => onUpdate(a.id, 'deadline', e.target.value)} sx={{ ...fieldSx, ...(od ? { color: tokens.red, fontWeight: 700 } : {}) }} />
                  <PillSelect style={PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.medium} value={a.priority} onChange={(e) => onUpdate(a.id, 'priority', e.target.value)}>
                    <option value="high">HIGH</option>
                    <option value="medium">MED</option>
                    <option value="low">LOW</option>
                  </PillSelect>
                  <Box sx={HIDE_LG}>
                    <PillSelect style={STATUS_STYLE[od ? 'overdue' : a.status] || STATUS_STYLE.open} value={a.status} onChange={(e) => onUpdate(a.id, 'status', e.target.value)}>
                      <option value="open">OPEN</option>
                      <option value="in-progress">IN PROG</option>
                      <option value="blocked">BLOCKED</option>
                      <option value="done">DONE</option>
                    </PillSelect>
                  </Box>
                  <Box component="button" type="button" onClick={() => onDelete(a.id)} sx={{ p: '5px 8px', bgcolor: 'transparent', border: 'none', color: tokens.slateSoft, fontSize: 15, cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit', '&:hover': { color: tokens.red, bgcolor: tokens.redSoft } }}>×</Box>
                </Box>
                {expanded && (
                  <DetailActionExpand action={a} extras={actionExtras[a.id]} tab={expandTab} onTab={onExpandTab}
                    onToggleSubtask={(idx) => onToggleSubtask(a.id, idx)} onAddSubtask={() => onAddSubtask(a.id)} onAddDependency={() => onAddDependency(a.id)} onAddComment={(t) => onAddComment(a.id, t)} />
                )}
              </Box>
            );
          })}

          <Box sx={{ p: '12px 16px', borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm, borderRadius: '0 0 10px 10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <TextLink onClick={onAdd}>+ Add action item</TextLink>
            <TextLink sx={{ ml: '14px' }} onClick={onExtract}>📄 Extract from minutes…</TextLink>
            <TextLink sx={{ ml: '14px' }} onClick={onRemind}>🔔 Remind all owners now</TextLink>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: '16px', p: '14px 18px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, fontSize: 12, color: tokens.slate, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Box component="span" sx={{ fontSize: 16 }}>💡</Box>
        <span>Action items assigned to system users are auto-synced to their <Box component="strong" sx={{ color: tokens.tealDark }}>My To-Do</Box> inbox. Owners receive email + in-app reminders at D-2, D0 and D+1 (if still open).</span>
      </Box>
    </Box>
  );
}
