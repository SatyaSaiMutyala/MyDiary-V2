import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { VSection } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import { initials, ownerAvatarColor } from '../../../utils/people';
import ActivityEntry from './ActivityEntry';

const sevBg = { critical: tokens.redSoft, high: tokens.orangeSoft };
const sevLine = { critical: tokens.red, high: tokens.orange };

/** renderOverviewPane() — 2fr / 1fr grid */
export default function OverviewPane({ p }) {
  const upcomingMs = (p.milestones || []).filter(m => m.status !== 'done').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const openRisks = (p.risks || []).filter(r => r.status !== 'mitigated');
  const person = (name, role, ext) => (
    <Box key={name + role} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '6px 0', ...(ext ? { borderTop: `1px dashed ${tokens.lineSoft}`, mt: '6px' } : {}) }}>
      <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: ext ? tokens.blue : ownerAvatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(name)}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 12, fontWeight: 700 }}>{name}{ext && <Box component="span" sx={{ fontSize: 8, bgcolor: tokens.blueSoft, color: tokens.blue, p: '1px 5px', borderRadius: '6px', fontWeight: 700, ml: '4px' }}>EXT</Box>}</Box>
        <Box sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{role || ''}</Box>
      </Box>
    </Box>
  );

  return (
    <Grid container spacing="14px">
      <Grid size={{ xs: 12, lg: 8 }}>
        <VSection head="Next Milestones" meta={`${upcomingMs.length} upcoming`}>
          {upcomingMs.length ? upcomingMs.map(m => {
            const od = isOverdue(m.dueDate);
            return (
              <Box key={m.id} sx={{ p: '10px 14px', bgcolor: tokens.cream, borderLeft: `3px solid ${od ? tokens.red : tokens.teal}`, borderRadius: '5px', mb: '5px' }}>
                <Box sx={{ fontSize: 13, fontWeight: 700, mb: '3px' }}>{m.name}</Box>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>
                  {od && <Box component="span" sx={{ color: tokens.red }}>⚠ OVERDUE · </Box>}Due {m.dueDate} · {m.owner}
                </Box>
              </Box>
            );
          }) : <Box sx={{ color: tokens.slate, fontSize: 12, fontStyle: 'italic' }}>No pending milestones.</Box>}
        </VSection>
        <VSection head="Recent Activity">
          {(p.activity || []).slice(0, 5).map((a, i) => <ActivityEntry key={i} a={a} />)}
        </VSection>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <VSection head="Team" meta={(p.team || []).length + (p.external || []).length} bodySx={{ p: '10px 14px' }}>
          {(p.team || []).map(t => person(t.name, t.role, false))}
          {(p.external || []).map(e => person(e.name, e.role, true))}
        </VSection>
        {openRisks.length > 0 && (
          <VSection head="⚠ Top Risks" meta={<Box component="span" sx={{ color: openRisks.some(r => r.severity === 'critical') ? '#FBD5D5' : tokens.yellow, fontWeight: 700 }}>{openRisks.length} open</Box>} bodySx={{ p: '10px 14px' }}>
            {openRisks.slice(0, 3).map(r => (
              <Box key={r.id} sx={{ p: '8px 10px', bgcolor: sevBg[r.severity] || tokens.yellowSoft, borderRadius: '4px', mb: '5px', borderLeft: `3px solid ${sevLine[r.severity] || tokens.yellow}` }}>
                <Box sx={{ fontSize: 12, fontWeight: 700, mb: '2px' }}>{r.title}</Box>
                <Box sx={{ fontSize: 10, fontFamily: fonts.mono, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>{r.severity.toUpperCase()} · {r.owner}</Box>
              </Box>
            ))}
          </VSection>
        )}
      </Grid>
    </Grid>
  );
}
