import { Box } from '@mui/material';
import { Btn, TextLink, EmptyState, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import { KpiBar, MiniSelect, MonoNote } from './Pills';
import { milestoneTaskProgress, milestoneAcceptanceProgress, milestoneRiskCount, sortedMilestones } from '../utils';

const leftColor = { done: tokens.tealDark, overdue: tokens.red, 'in-progress': tokens.blue, todo: tokens.teal };

/** renderMilestonesPane() */
export default function MilestonesPane({ p, actions }) {
  const sorted = sortedMilestones(p);
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '12px', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <MonoNote><strong>{sorted.filter(m => m.status === 'done').length}</strong> done · <strong>{sorted.filter(m => m.status === 'in-progress').length}</strong> in progress · <strong>{sorted.filter(m => m.status === 'todo').length}</strong> to do</MonoNote>
        <Btn variant="primary" size="sm" onClick={() => actions.addMilestone(p.id)}>+ Add Milestone</Btn>
      </Box>
      {sorted.map(m => {
        const od = m.status !== 'done' && isOverdue(m.dueDate);
        const cls = m.status === 'done' ? 'done' : od ? 'overdue' : m.status;
        const tp = milestoneTaskProgress(p, m.id);
        const ap = milestoneAcceptanceProgress(m);
        const rc = milestoneRiskCount(p, m.id);
        const barClass = tp.pct >= 70 ? '' : tp.pct >= 30 ? 'amber' : 'red';
        const done = m.status === 'done';
        return (
          <Box key={m.id} sx={{ bgcolor: done ? tokens.cream : tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${leftColor[cls] || tokens.teal}`, borderRadius: '8px', p: '14px 18px', mb: 1, display: 'grid', gridTemplateColumns: { xs: '40px 1fr', sm: '40px 1fr auto' }, gap: '14px', alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.1s', opacity: done ? 0.75 : 1, '&:hover': { boxShadow: tokens.shadowSm, borderColor: tokens.slateSoft, borderLeftColor: leftColor[cls] || tokens.teal } }}>
            <Box onClick={() => actions.toggleMilestone(p.id, m.id)} sx={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${done ? tokens.tealDark : tokens.line}`, bgcolor: done ? tokens.tealDark : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: done ? '#fff' : tokens.slateSoft }}>{done ? '✓' : ''}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontSize: 14, fontWeight: 700, mb: '4px', textDecoration: done ? 'line-through' : 'none' }}>{m.name}</Box>
              {m.description && <Box sx={{ fontSize: 12, color: tokens.slate, mb: '6px', lineHeight: 1.4 }}>{m.description}</Box>}
              <Box sx={{ display: 'flex', gap: '14px', fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', flexWrap: 'wrap', alignItems: 'center' }}>
                <Box component="span" sx={{ fontWeight: 700, color: od ? tokens.red : 'inherit' }}>{od ? '⚠ OVERDUE · ' : ''}{m.dueDate}</Box>
                <Box component="span" sx={{ bgcolor: tokens.creamWarm, p: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{m.owner}</Box>
                <Box component="span" sx={{ color: tokens.slateSoft }}>{m.status === 'in-progress' ? '⏳ in progress' : m.status === 'done' ? '✓ done' : '○ to do'}</Box>
              </Box>

              {/* Linked tasks progress */}
              <Box sx={{ mt: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', color: tokens.slate, fontWeight: 700 }}>TASKS:</Box>
                {tp.total > 0 ? (
                  <>
                    <Box sx={{ flex: 1, minWidth: 140, maxWidth: 280 }}><KpiBar pct={tp.pct} color={barClass} height={8} sx={{ mb: 0 }} /></Box>
                    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.ink, fontWeight: 700 }}>{tp.done}/{tp.total} · {tp.pct}%</Box>
                  </>
                ) : <Box component="span" sx={{ fontSize: 11, color: tokens.slateSoft, fontStyle: 'italic' }}>no tasks linked yet</Box>}
                {rc > 0 && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: '#C53030', bgcolor: tokens.redSoft, p: '3px 8px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700 }}>⚠ {rc} open risk{rc > 1 ? 's' : ''}</Box>}
              </Box>

              {/* Acceptance criteria */}
              <Box sx={{ mt: '12px', p: '10px 12px', bgcolor: tokens.cream, borderRadius: '6px', borderLeft: `3px solid ${tokens.teal}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '6px' }}>
                  <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700 }}>ACCEPTANCE CRITERIA {ap.total ? `· ${ap.done}/${ap.total}` : ''}</Box>
                  <TextLink sx={{ fontSize: 11 }} onClick={() => actions.addAcceptanceCriterion(p.id, m.id)}>+ Add</TextLink>
                </Box>
                {(m.acceptanceCriteria || []).length ? (m.acceptanceCriteria || []).map((c, i) => (
                  <Box component="label" key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '4px 0', fontSize: 12, cursor: 'pointer', color: c.done ? tokens.slateSoft : tokens.ink, textDecoration: c.done ? 'line-through' : 'none' }}>
                    <Box component="input" type="checkbox" checked={!!c.done} onChange={() => actions.toggleAcceptanceCriterion(p.id, m.id, i)} sx={{ width: 14, height: 14, cursor: 'pointer', m: 0, accentColor: tokens.teal }} />
                    <span>{c.text}</span>
                  </Box>
                )) : <Box sx={{ fontSize: 11, color: tokens.slateSoft, fontStyle: 'italic' }}>No criteria yet. Add pass/fail tests that define "done".</Box>}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
              <MiniSelect value={m.status} onChange={v => actions.updateMilestoneStatus(p.id, m.id, v)} options={[['todo', 'To Do'], ['in-progress', 'In Progress'], ['done', 'Done']]} />
            </Box>
          </Box>
        );
      })}
      {sorted.length === 0 && <EmptyState icon={<Icon name="milestone" />} title="No milestones yet" desc="Add project milestones to track progress." />}
    </>
  );
}
