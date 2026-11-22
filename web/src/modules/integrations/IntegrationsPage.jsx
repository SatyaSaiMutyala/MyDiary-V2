import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAppStore } from '../../store/AppStore';
import { PageHeader, DmsCard, Btn, Pill } from '../../components';
import { tokens, fonts } from '../../theme/tokens';

const STATUS = {
  connected: { bg: tokens.tealSoft, color: tokens.tealDark, label: '● Connected', btn: 'Manage' },
  pending: { bg: tokens.yellowSoft, color: tokens.amber, label: '⚙ Pending', btn: 'Resume' },
  disconnected: { bg: tokens.creamWarm, color: tokens.slate, label: '○ Disconnected', btn: 'Connect' },
};

/** 🔗 Integrations (prototype view-integrations + renderIntegrations / toggleIntegration) */
export default function IntegrationsPage() {
  const { state, mutate } = useAppStore();
  const list = state.integrations;
  const connected = list.filter(i => i.status === 'connected').length;

  const toggleIntegration = (idx) => {
    const i = list[idx];
    if (i.status === 'connected') {
      if (confirm('Manage ' + i.name + '? (would open the settings panel for this integration)')) {
        alert(i.name + ' settings panel — scope, re-auth, sync frequency, disconnect.');
      }
    } else {
      if (confirm('Connect to ' + i.name + '? You will be redirected to authenticate.')) {
        mutate('integrations', arr => { arr[idx].status = 'connected'; arr[idx].lastSync = 'Just now'; });
      }
    }
  };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['Meeting Management', 'Integrations']} icon="🔗" title="Integrations"
        sub="Connect MyDiary Meetings with calendar, video conference, chat, CRM, and task systems so meetings flow naturally with the rest of TrustLab." />

      {/* .dash-meta-strip (3 cols) */}
      <Grid container spacing="10px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard label="Connected" value={connected} sub={`of ${list.length}`} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="yellow" label="Pending Setup" value={list.filter(i => i.status === 'pending').length} sub="Mid-configuration" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="slate" label="Available" value={list.filter(i => i.status === 'disconnected').length} sub="Ready to connect" /></Grid>
      </Grid>

      {/* .integ-list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {list.map((i, idx) => {
          const s = STATUS[i.status] || STATUS.disconnected;
          return (
            <Box key={i.name} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: tokens.creamWarm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{i.ico}</Box>
              <Box sx={{ flex: 1, minWidth: { xs: 'calc(100% - 60px)', sm: 220 } }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{i.name}</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '2px' }}>{i.desc}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', ml: { xs: 'auto', lg: 0 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em', mr: { xs: 0, lg: '12px' } }}>{i.lastSync}</Box>
                <Pill bg={s.bg} color={s.color} size={11} sx={{ p: '5px 12px', borderRadius: '12px', letterSpacing: '0.06em' }}>{s.label}</Pill>
                <Btn size="sm" onClick={() => toggleIntegration(idx)}>{s.btn}</Btn>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
