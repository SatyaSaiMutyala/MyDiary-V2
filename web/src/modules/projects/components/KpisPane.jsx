import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, EmptyState, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { KpiBar, MonoNote } from './Pills';

/** renderKPIsPane() — .kpi-grid of .kpi-card */
export default function KpisPane({ p, actions }) {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '12px', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <MonoNote>KPIs tracked for this project</MonoNote>
        <Btn variant="primary" size="sm" onClick={() => actions.addKpi(p.id)}>+ Add KPI</Btn>
      </Box>
      {(p.kpis || []).length ? (
        <Grid container spacing="12px">
          {p.kpis.map(k => {
            const pct = k.target > 0 ? Math.round((k.current / k.target) * 100) : 0;
            const barClass = pct >= 70 ? '' : pct >= 40 ? 'amber' : 'red';
            return (
              <Grid key={k.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: `3px solid ${tokens.teal}`, borderRadius: '8px', p: '14px 18px', height: '100%' }}>
                  <Box sx={{ fontSize: 12, fontWeight: 700, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}>{k.name}</Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Box component="span" sx={{ fontSize: 26, fontWeight: 700, fontFamily: fonts.serif, lineHeight: 1 }}>{k.current}{k.unit && !k.unit.startsWith(' ') ? k.unit.split(' ')[0] : ''}</Box>
                    <Box component="span" sx={{ fontSize: 12, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>/ {k.target}{k.unit}</Box>
                  </Box>
                  <KpiBar pct={Math.min(100, pct)} color={barClass} />
                  <Box sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', fontWeight: 700 }}>{pct}% of target</Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      ) : <EmptyState icon={<Icon name="trending" />} title="No KPIs set" desc="Define key performance indicators to track success." />}
    </>
  );
}
