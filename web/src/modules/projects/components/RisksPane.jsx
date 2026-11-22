import { Box } from '@mui/material';
import { Btn, EmptyState } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { MonoNote, TplCatPill } from './Pills';
import { SEVERITY_ACCENT, SEVERITY_TEXT } from '../utils';

const SCORE = { critical: 'A', high: 'B', medium: 'C', low: 'D' };

/** renderRisksPane() — scope pills + .risk-row list */
export default function RisksPane({ p, actions, scope, setScope }) {
  const all = p.risks || [];
  const milestoneSpecific = all.filter(r => r.milestoneId);
  const projectWide = all.filter(r => !r.milestoneId);
  const open = all.filter(r => r.status !== 'mitigated').length;
  const mitigated = all.length - open;
  const shown = scope === 'milestone' ? milestoneSpecific : scope === 'project' ? projectWide : all;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '12px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <MonoNote><strong>{open}</strong> open · <strong>{mitigated}</strong> mitigated · <strong>{milestoneSpecific.length}</strong> milestone-linked · <strong>{projectWide.length}</strong> project-wide</MonoNote>
        <Btn variant="primary" size="sm" onClick={() => actions.addProjectRisk(p.id)}>+ Add Risk</Btn>
      </Box>

      <Box sx={{ display: 'flex', gap: '6px', mb: '14px', p: '8px 12px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, mr: '4px' }}>SCOPE:</Box>
        <TplCatPill active={scope === 'all'} onClick={() => setScope('all')} count={all.length}>All</TplCatPill>
        <TplCatPill active={scope === 'milestone'} onClick={() => setScope('milestone')} count={milestoneSpecific.length}>🏁 Milestone-specific</TplCatPill>
        <TplCatPill active={scope === 'project'} onClick={() => setScope('project')} count={projectWide.length}>📂 Project-wide</TplCatPill>
      </Box>

      {shown.length ? shown.map(r => {
        const ms = r.milestoneId ? (p.milestones || []).find(m => m.id === r.milestoneId) : null;
        const mit = r.status === 'mitigated';
        return (
          <Box key={r.id} sx={{ bgcolor: mit ? tokens.cream : tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${SEVERITY_ACCENT[r.severity] || tokens.yellow}`, borderRadius: '8px', p: '12px 16px', mb: '6px', display: 'grid', gridTemplateColumns: { xs: '90px 1fr', md: '90px 1fr auto' }, gap: '14px', alignItems: 'center', opacity: mit ? 0.6 : 1 }}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: tokens.creamWarm, borderRadius: '6px' }}>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: SEVERITY_TEXT[r.severity] || tokens.tealDark }}>{r.severity}</Box>
              <Box sx={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 700, color: tokens.ink, lineHeight: 1, mt: '2px' }}>{SCORE[r.severity] || 'D'}</Box>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontSize: 13, fontWeight: 700, mb: '4px' }}>{r.title}</Box>
              {ms
                ? <Box sx={{ mt: '4px', display: 'inline-block', fontFamily: fonts.mono, fontSize: 10, color: tokens.tealDark, bgcolor: tokens.tealSofter, p: '3px 9px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700 }}>🏁 Threatens: {ms.name}</Box>
                : <Box sx={{ mt: '4px', display: 'inline-block', fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, bgcolor: tokens.cream, p: '3px 9px', borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700 }}>📂 Project-wide</Box>}
              <Box sx={{ fontSize: 11, color: tokens.slate, lineHeight: 1.5, mb: '4px', mt: '4px' }}><strong>Mitigation:</strong> {r.mitigation || '—'}</Box>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>Owner: {r.owner} · Status: {mit ? '✓ MITIGATED' : '⚠ OPEN'}</Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: '6px', alignItems: { xs: 'center', md: 'flex-end' }, gridColumn: { xs: '1 / -1', md: 'auto' }, flexWrap: 'wrap' }}>
              <Btn size="sm" onClick={() => actions.toggleRisk(p.id, r.id)}>{mit ? '↺ Re-open' : '✓ Mark Mitigated'}</Btn>
              <Btn size="sm" sx={{ fontSize: 10 }} onClick={() => actions.linkRiskToMilestone(p.id, r.id)}>{ms ? '↺ Re-link' : '🏁 Link'}</Btn>
            </Box>
          </Box>
        );
      }) : <EmptyState icon="⚠" title="No risks in this view" desc="Try a different scope, or add a risk." />}
    </>
  );
}
