import { useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useAppStore } from '../../../store/AppStore';
import { PROJ_CATEGORIES } from '../../../data/projects';
import { TplCatPill } from '../components/Pills';
import { draftFromTemplate } from '../utils';

const h4Sx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700, m: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' };
const itemSx = { p: '8px 12px', bgcolor: tokens.cream, borderLeft: `3px solid ${tokens.teal}`, borderRadius: '4px', mb: '4px', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 };
const dayOffSx = { fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700, whiteSpace: 'nowrap' };

/**
 * Project Templates Library (prototype 15667–15910). Library view → preview view → "Use" builds a draft
 * (dates from TODAY offsets, milestone ids resolved, usedCount++) and hands it to onUse(draft) → wizard.
 */
export default function ProjectTemplatesModal({ open, onClose, onUse }) {
  const { state, mutate } = useAppStore();
  const templates = state.projTemplates;
  const [catFilter, setCatFilter] = useState('all');
  const [previewId, setPreviewId] = useState(null);

  const applyTemplate = (tplId) => {
    const t = templates.find(x => x.id === tplId);
    if (!t) return;
    const draft = draftFromTemplate(t, state.viewer.name, state.projects.length);
    mutate('projTemplates', ts => { const tt = ts.find(x => x.id === tplId); if (tt) tt.usedCount++; });
    onClose();
    onUse(draft);
  };

  const t = previewId ? templates.find(x => x.id === previewId) : null;

  // ---------- PREVIEW VIEW ----------
  if (t) {
    const cat = PROJ_CATEGORIES[t.category] || { label: t.category, emoji: '📁', color: '#6B6B6B' };
    return (
      <ModalShell open={open} onClose={onClose} width={1000} head="gradient" icon={t.emoji} title={t.name} sub={`${cat.emoji} ${cat.label} · ~${t.suggestedDurationDays} days · used ${t.usedCount}×`}
        headSlot={<Btn size="sm" onClick={() => setPreviewId(null)} sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', '&:hover': { borderColor: '#fff' } }}>← Back to Library</Btn>}
        bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}>
        <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: { xs: '18px', md: '24px 28px' }, boxShadow: tokens.shadow }}>
          <Box sx={{ fontSize: 13, color: tokens.slate, lineHeight: 1.6, mb: '18px' }}>{t.description}</Box>

          {t.milestones.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box component="h4" sx={h4Sx}>🎯 Milestones ({t.milestones.length})</Box>
              {t.milestones.map((m, i) => <Box key={i} sx={itemSx}><span>{m.name}</span><Box component="span" sx={dayOffSx}>Day {m.dayOffset}</Box></Box>)}
            </Box>
          )}
          {t.tasks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box component="h4" sx={h4Sx}>✓ Tasks ({t.tasks.length})</Box>
              {t.tasks.map((tk, i) => <Box key={i} sx={itemSx}><span>{tk.name}</span><Box component="span" sx={dayOffSx}>Day {tk.dayOffset}</Box></Box>)}
            </Box>
          )}
          {t.kpis.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box component="h4" sx={h4Sx}>📊 KPIs ({t.kpis.length})</Box>
              <Grid container spacing="10px">
                {t.kpis.map((k, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: '10px 12px', bgcolor: tokens.cream, borderRadius: '6px', borderLeft: `3px solid ${tokens.teal}`, height: '100%' }}>
                      <Box sx={{ fontSize: 11, fontWeight: 700, color: tokens.ink, mb: '3px' }}>{k.name}</Box>
                      <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.tealDark, fontWeight: 700 }}>Target: {k.target}</Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {t.risks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box component="h4" sx={h4Sx}>⚠ Risks ({t.risks.length})</Box>
              {t.risks.map((r, i) => (
                <Box key={i} sx={{ p: '10px 12px', bgcolor: '#FFF8EA', borderRadius: '6px', borderLeft: '3px solid #DD6B20', mb: '6px' }}>
                  <Box sx={{ fontSize: 12, fontWeight: 700, color: tokens.ink, mb: '3px' }}>{r.name} <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C53030', ml: '6px' }}>{r.impact} impact</Box></Box>
                  <Box sx={{ fontSize: 11, color: tokens.slate, lineHeight: 1.5 }}>→ {r.mitigation}</Box>
                </Box>
              ))}
            </Box>
          )}
          {t.teamRoles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box component="h4" sx={h4Sx}>👥 Suggested Team Roles</Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {t.teamRoles.map((r, i) => <Box key={i} component="span" sx={{ p: '6px 12px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '12px', fontSize: 11, fontWeight: 600, color: tokens.ink }}>{r}</Box>)}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 3, pt: '18px', borderTop: `2px solid ${tokens.line}`, display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn onClick={() => setPreviewId(null)}>Back to Library</Btn>
            <Btn variant="primary" onClick={() => applyTemplate(t.id)}>Use This Template →</Btn>
          </Box>
        </Box>
      </ModalShell>
    );
  }

  // ---------- LIBRARY VIEW ----------
  const cats = ['all', ...Object.keys(PROJ_CATEGORIES)];
  const filtered = catFilter === 'all' ? templates : templates.filter(x => x.category === catFilter);

  return (
    <ModalShell open={open} onClose={onClose} width={1000} head="gradient" icon="📋" title="Project Templates Library" sub={`${templates.length} ready-to-use TrustLab project kits — milestones, tasks, KPIs & risks pre-wired`} bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}>
      <Box sx={{ display: 'flex', gap: 1, mb: '18px', flexWrap: 'wrap', p: '10px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '8px', alignItems: 'center' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', color: tokens.slate, fontWeight: 700, mr: '6px', alignSelf: 'center' }}>FILTER:</Box>
        {cats.map(c => {
          const label = c === 'all' ? 'All Templates' : (PROJ_CATEGORIES[c].emoji + ' ' + PROJ_CATEGORIES[c].label);
          const count = c === 'all' ? templates.length : templates.filter(x => x.category === c).length;
          if (c !== 'all' && count === 0) return null;
          return <TplCatPill key={c} active={catFilter === c} onClick={() => setCatFilter(c)} count={count}>{label}</TplCatPill>;
        })}
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ p: '60px 20px', textAlign: 'center', color: tokens.slate, bgcolor: tokens.card, border: `1px dashed ${tokens.line}`, borderRadius: '10px' }}>
          <Box sx={{ fontSize: 40, mb: '10px' }}>📋</Box>
          <Box sx={{ fontSize: 14, fontWeight: 700, mb: '6px' }}>No templates in this category</Box>
          <Box sx={{ fontSize: 12 }}>Try a different category or the full library.</Box>
        </Box>
      ) : (
        <Grid container spacing="12px">
          {filtered.map(tp => {
            const cat = PROJ_CATEGORIES[tp.category] || { label: tp.category, emoji: '📁' };
            return (
              <Grid key={tp.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box onClick={() => setPreviewId(tp.id)} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: `4px solid ${tokens.teal}`, borderRadius: '8px', p: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: tokens.shadowSm, display: 'flex', flexDirection: 'column', height: '100%', '&:hover': { boxShadow: tokens.shadowLg, transform: 'translateY(-2px)', borderColor: tokens.slateSoft, borderTopColor: tokens.teal } }}>
                  <Box sx={{ fontSize: 32, mb: 1, lineHeight: 1.2 }}>{tp.emoji}</Box>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slate, mb: '4px' }}>{cat.emoji} {cat.label}</Box>
                  <Box sx={{ fontSize: 14, fontWeight: 700, mb: '6px', lineHeight: 1.3 }}>{tp.name}</Box>
                  <Box sx={{ fontSize: 11, color: tokens.slate, lineHeight: 1.5, mb: '12px', minHeight: 48 }}>{tp.description}</Box>
                  <Grid container spacing="4px" sx={{ mb: '10px', py: 1, borderTop: `1px dashed ${tokens.line}`, borderBottom: `1px dashed ${tokens.line}` }}>
                    {[[tp.milestones.length, 'Milestones'], [tp.tasks.length, 'Tasks'], [tp.suggestedDurationDays + 'd', 'Duration']].map(([v, l]) => (
                      <Grid key={l} size={4} sx={{ textAlign: 'center' }}>
                        <Box sx={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: 700, color: tokens.ink, lineHeight: 1 }}>{v}</Box>
                        <Box sx={{ fontFamily: fonts.mono, fontSize: 8, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mt: '3px' }}>{l}</Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, letterSpacing: '0.04em', fontWeight: 700 }}>Used {tp.usedCount}×</Box>
                    <ButtonBase onClick={(e) => { e.stopPropagation(); applyTemplate(tp.id); }} sx={{ p: '6px 12px', bgcolor: tokens.greenDeep, color: '#fff', border: 'none', borderRadius: '5px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'inherit', '&:hover': { bgcolor: tokens.tealDark } }}>Use →</ButtonBase>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </ModalShell>
  );
}
