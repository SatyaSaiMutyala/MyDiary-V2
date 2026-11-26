import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Btn, EmptyState, Icon } from '../../components';
import { ApiError, Fetching } from '../settings/components/listUi';
import { useDuplicateTemplateMutation, useListTemplatesQuery, useRemoveTemplateMutation } from '../../store/api/templatesApi';
import { errorMessage } from '../../store/api/baseApi';
import { TYPES } from '../../data/meetings';
import { tokens, fonts } from '../../theme/tokens';
import { useDialog } from '../../components/Dialogs';
import TemplateModal from './modals/TemplateModal';

const ORDER = ['internal', 'customer', 'supplier', 'consultants', 'board', 'other'];
const LEFT = { customer: tokens.blue, supplier: tokens.orange, board: tokens.yellow, consultants: tokens.purple };

/** A small action on a card — stops the click reaching the card underneath. */
function CardAction({ title, onClick, children, danger }) {
  return (
    <Box component="button" type="button" title={title} aria-label={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, cursor: 'pointer', borderRadius: '5px', bgcolor: 'transparent', border: `1px solid ${tokens.line}`, color: danger ? tokens.bad : tokens.slate, fontFamily: 'inherit', flexShrink: 0, '&:hover': { bgcolor: danger ? tokens.badSoft : tokens.tealSoft, borderColor: danger ? tokens.bad : tokens.teal, color: danger ? tokens.bad : tokens.tealDark } }}>
      {children}
    </Box>
  );
}

/** 📋 Agenda Templates Library (prototype view-templates + renderTemplates / applyTemplate), fed by GET /api/templates */
export default function TemplatesPage() {
  const dlg = useDialog();
  const navigate = useNavigate();
  // One page of the whole library (12 seeded templates): the cards are grouped by meeting type, not paged.
  const { data, error, isLoading, isFetching, refetch } = useListTemplatesQuery({ limit: 200, sort: 'createdAt' });
  const [removeTemplate] = useRemoveTemplateMutation();
  const [duplicateTemplate] = useDuplicateTemplateMutation();
  const [editing, setEditing] = useState(null); // { template } — null template means "new"
  const templates = data?.items || [];

  const grouped = {};
  templates.forEach(t => { if (!grouped[t.type]) grouped[t.type] = []; grouped[t.type].push(t); });

  const applyTemplate = async (t) => {
    if (await dlg.confirm(`Use template "${t.name}"? This will pre-fill a new ${t.type} meeting with its ${t.agendaCount} agenda items.`)) {
      navigate('/meetings/new', { state: { type: t.type, templateId: t.id } });
    }
  };

  const copyTemplate = async (t) => {
    try {
      const copy = await duplicateTemplate(t.id).unwrap();
      dlg.toast(`\u2713 Copied as "${copy?.name ?? t.name + ' (copy)'}".`);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  const deleteTemplate = async (t) => {
    if (!(await dlg.confirm(`Remove the template "${t.name}"?\n\nMeetings already created from it are not affected.`, { okText: 'Remove template' }))) return;
    try {
      await removeTemplate(t.id).unwrap();
      dlg.toast(`\u2713 Template "${t.name}" removed.`);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['Meeting Management', 'Templates']} icon={<Icon name="clipboard" />} title="Agenda Templates Library"
        sub="Pre-built agendas for recurring meeting types — load into any new meeting to save setup time and keep reviews consistent."
        actions={<Btn variant="primary" size="lg" onClick={() => setEditing({ template: null })}>+ New Template</Btn>} />

      {isFetching && <Fetching on />}
      <ApiError error={error} onRetry={refetch} sx={{ mb: '20px' }} />

      {isLoading && (
        <Typography component="div" sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.14em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700 }}>
          Loading templates…
        </Typography>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState icon={<Icon name="clipboard" />} title="No templates yet" desc="Agenda templates let you load a ready-made agenda into any new meeting. Create one to get started." />
      )}

      {ORDER.filter(t => grouped[t]).map(type => (
        <Box key={type} sx={{ mb: '28px' }}>
          <Typography component="div" sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.14em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700, mb: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name={TYPES[type].icon} size={14} />{TYPES[type].name}s
          </Typography>
          {/* .tpl-grid */}
          <Grid container spacing="14px">
            {grouped[type].map(t => (
              <Grid key={t.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box onClick={() => applyTemplate(t)}
                  sx={{ position: 'relative', height: '100%', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${LEFT[t.type] || tokens.teal}`, borderRadius: tokens.radius, p: '18px 20px', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: tokens.teal, borderLeftColor: LEFT[t.type] || tokens.teal, boxShadow: tokens.shadow, transform: 'translateY(-2px)' }, '&:hover .tpl-actions': { opacity: 1 } }}>
                  <Box className="tpl-actions" sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '5px', opacity: { xs: 1, md: 0 }, transition: 'opacity .15s' }}>
                    <CardAction title="Edit this template" onClick={() => setEditing({ template: t })}>\u270E</CardAction>
                    <CardAction title="Make a copy" onClick={() => copyTemplate(t)}>\u29C9</CardAction>
                    <CardAction title="Remove this template" danger onClick={() => deleteTemplate(t)}>\u00D7</CardAction>
                  </Box>
                  <Box sx={{ mb: '10px' }}><Icon name={t.ico} size={24} /></Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '4px', pr: '84px' }}>{t.name}</Typography>
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

      <TemplateModal open={Boolean(editing)} template={editing?.template ?? null} onClose={() => setEditing(null)} />
    </Box>
  );
}
