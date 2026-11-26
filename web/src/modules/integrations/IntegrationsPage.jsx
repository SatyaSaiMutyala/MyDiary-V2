import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { PageHeader, DmsCard, Btn, Pill, EmptyState, Icon } from '../../components';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import { useConnectIntegrationMutation, useListIntegrationsQuery } from '../../store/api/integrationsApi';
import { errorMessage } from '../../store/api/baseApi';
import { tokens, fonts } from '../../theme/tokens';
import { useDialog } from '../../components/Dialogs';

const STATUS = {
  connected: { bg: tokens.tealSoft, color: tokens.tealDark, label: '● Connected', btn: 'Manage' },
  pending: { bg: tokens.yellowSoft, color: tokens.amber, label: '⚙ Pending', btn: 'Resume' },
  disconnected: { bg: tokens.creamWarm, color: tokens.slate, label: '○ Disconnected', btn: 'Connect' },
};

/**
 * 🔗 Integrations (prototype view-integrations + renderIntegrations / toggleIntegration).
 *
 * The register of which third-party tools are switched on, served by GET /api/integrations. "Connect" saves
 * that state (status + who + when) through POST /api/integrations/:id/connect — it does not authenticate with
 * Google, Zoom, Slack or anything else, so the row survives a refresh without any live connection existing.
 */
export default function IntegrationsPage() {
  const dlg = useDialog();
  const { data, error, isLoading, isFetching, refetch } = useListIntegrationsQuery({ limit: 200, sort: 'order' });
  const [connect, { isLoading: connecting }] = useConnectIntegrationMutation();
  const { toast, show } = useToast();

  const list = data?.items || [];
  const total = data?.total ?? list.length;
  const count = (status) => list.filter(i => i.status === status).length;
  const num = (v) => (isLoading ? '—' : v);

  const toggleIntegration = async (i) => {
    if (i.status === 'connected') {
      if (await dlg.confirm('Manage ' + i.name + '? (would open the settings panel for this integration)')) {
        await dlg.alert(i.name + ' settings panel — scope, re-auth, sync frequency, disconnect.');
      }
      return;
    }
    if (!await dlg.confirm('Connect to ' + i.name + '? You will be redirected to authenticate.')) return;
    try {
      await connect({ id: i.id }).unwrap();
      show(i.name + ' is switched on.');
    } catch (err) {
      show(errorMessage(err), 'error');
    }
  };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['Meeting Management', 'Integrations']} icon={<Icon name="link" />} title="Integrations"
        sub="Connect MyDiary Meetings with calendar, video conference, chat, CRM, and task systems so meetings flow naturally with the rest of TrustLab." />

      {/* .dash-meta-strip (3 cols) */}
      <Grid container spacing="10px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard label="Connected" value={num(count('connected'))} sub={`of ${total}`} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="yellow" label="Pending Setup" value={num(count('pending'))} sub="Mid-configuration" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="slate" label="Available" value={num(count('disconnected'))} sub="Ready to connect" /></Grid>
      </Grid>

      <ApiError error={error} onRetry={refetch} sx={{ mb: '10px' }} />
      {(isFetching || connecting) && <Fetching on />}

      {!error && list.length === 0 ? (
        isLoading ? null : <EmptyState icon={<Icon name="link" />} title="No integrations yet" desc="The register is empty — nothing is switched on." />
      ) : (
        /* .integ-list */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {list.map((i) => {
            const s = STATUS[i.status] || STATUS.disconnected;
            return (
              <Box key={i.id} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: tokens.creamWarm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={i.ico} size={22} /></Box>
                <Box sx={{ flex: 1, minWidth: { xs: 'calc(100% - 60px)', sm: 220 } }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{i.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '2px' }}>{i.desc}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', ml: { xs: 'auto', lg: 0 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em', mr: { xs: 0, lg: '12px' } }}>{i.lastSync}</Box>
                  <Pill bg={s.bg} color={s.color} size={11} sx={{ p: '5px 12px', borderRadius: '12px', letterSpacing: '0.06em' }}>{s.label}</Pill>
                  <Btn size="sm" disabled={connecting} onClick={() => toggleIntegration(i)}>{s.btn}</Btn>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      {toast}
    </Box>
  );
}
