import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Btn, EmptyState } from '../../components';
import { ApiError, Fetching } from '../settings/components/listUi';
import { useListTemplatesQuery } from '../../store/api/templatesApi';
import { TYPES } from '../../data/meetings';
import { tokens, fonts } from '../../theme/tokens';
import { useDialog } from '../../components/Dialogs';

const ORDER = ['internal', 'customer', 'supplier', 'consultants', 'board'];
const LEFT = { customer: tokens.blue, supplier: tokens.orange, board: tokens.yellow, consultants: tokens.purple };

/** 📋 Agenda Templates Library (prototype view-templates + renderTemplates / applyTemplate), fed by GET /api/templates */
export default function TemplatesPage() {
  const dlg = useDialog();
  const navigate = useNavigate();
  // One page of the whole library (12 seeded templates): the cards are grouped by meeting type, not paged.
  const { data, error, isLoading, isFetching, refetch } = useListTemplatesQuery({ limit: 200, sort: 'createdAt' });
  const templates = data?.items || [];

  const grouped = {};
  templates.forEach(t => { if (!grouped[t.type]) grouped[t.type] = []; grouped[t.type].push(t); });

  const applyTemplate = async (id) => {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    if (await dlg.confirm('Use template "' + t.name + '"? This will pre-fill a new ' + t.type + ' meeting with its ' + t.agendaCount + ' agenda items.')) {
      navigate('/meetings/new', { state: { type: t.type, templateId: t.id } });
    }
  };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['Meeting Management', 'Templates']} icon="📋" title="Agenda Templates Library"
        sub="Pre-built agendas for recurring meeting types — load into any new meeting to save setup time and keep reviews consistent."
        actions={<Btn variant="primary" size="lg" onClick={() => dlg.alert('Template creator opens')}>+ New Template</Btn>} />

      {isFetching && <Fetching on />}
      <ApiError error={error} onRetry={refetch} sx={{ mb: '20px' }} />

      {isLoading && (
        <Typography component="div" sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.14em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700 }}>
          Loading templates…
        </Typography>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState icon="📋" title="No templates yet" desc="Agenda templates let you load a ready-made agenda into any new meeting. Create one to get started." />
      )}

      {ORDER.filter(t => grouped[t]).map(type => (
        <Box key={type} sx={{ mb: '28px' }}>
          <Typography component="div" sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.14em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700, mb: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {TYPES[type].icon} {TYPES[type].name}s
          </Typography>
          {/* .tpl-grid */}
          <Grid container spacing="14px">
            {grouped[type].map(t => (
              <Grid key={t.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box onClick={() => applyTemplate(t.id)}
                  sx={{ height: '100%', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${LEFT[t.type] || tokens.teal}`, borderRadius: tokens.radius, p: '18px 20px', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: tokens.teal, borderLeftColor: LEFT[t.type] || tokens.teal, boxShadow: tokens.shadow, transform: 'translateY(-2px)' } }}>
                  <Box sx={{ fontSize: 24, mb: '10px' }}>{t.ico}</Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '4px' }}>{t.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.4, mb: '10px', minHeight: 48 }}>{t.desc}</Typography>
                  <Box sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.agendaCount} agenda items</span><span>Used {t.usedCount}×</span>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
