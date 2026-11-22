import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { VISIT_TYPES, RATING_AREAS, OVERALL_OPTIONS } from '../../../data/visits';
import { parseDate, formatDateLong, isOverdue } from '../../../utils/dates';
import { ModalShell, FootNote, Btn, VSection, Tag } from '../../../components';
import { avgRating, detailHeadGradient, visitDetailHeadStyle, exportVisitReport } from '../utils';
import { OverallPill } from '../components/VisitCard';
import { PhotoSlot } from './VisitModal';

const subLabel = { fontWeight: 700, mb: '4px', fontSize: 12, color: tokens.slate, letterSpacing: '0.08em', fontFamily: fonts.mono, textTransform: 'uppercase' };
const NotSpecified = () => <Box component="em" sx={{ color: tokens.slate }}>Not specified</Box>;

/** Visit detail modal (openVisitDetail) — submitted visits only; drafts open the editor */
export default function VisitDetailModal({ visit: v, onClose, onEdit }) {
  if (!v) return null;
  const t = VISIT_TYPES[v.type] || VISIT_TYPES.other;
  const dt = parseDate(v.date);
  const avg = avgRating(v);
  const stats = [
    ['Host', <>{v.host.name || '—'}{v.host.designation && <Box component="span" sx={{ opacity: 0.8, fontWeight: 400 }}> · {v.host.designation}</Box>}</>],
    ['Team', v.team.length ? v.team.join(', ') : '—'],
    ['Overall', v.overallAssessment ? v.overallAssessment.replace('-', ' ') : '—'],
    ['Avg Rating', `★ ${avg} / 5`],
  ];

  const footer = (
    <>
      <FootNote>Submitted {v.submittedAt ? v.submittedAt.slice(0, 10) : '—'} · by {v.owner}</FootNote>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Btn size="sm" onClick={() => exportVisitReport(v)}>📄 Export</Btn>
        <Btn size="sm" onClick={() => onEdit(v.id)}>✎ Edit</Btn>
        <Btn variant="primary" size="sm" onClick={onClose}>Close</Btn>
      </Box>
    </>
  );

  return (
    <ModalShell open={!!v} onClose={onClose} width={920} head="gradient" icon={t.emoji} title={v.title} headSx={{ background: detailHeadGradient(v.type) }}
      sub={<Box component="span" sx={{ fontFamily: fonts.mono, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t.label} · {formatDateLong(dt)} · {v.timeIn}{v.timeOut ? ' – ' + v.timeOut : ''}</Box>}
      footer={footer} bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}>

      {/* .visit-detail-head */}
      <Box sx={{ ...visitDetailHeadStyle(v.type), p: { xs: '18px', md: '24px 28px' }, borderRadius: tokens.radius, mb: '14px', position: 'relative' }}>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.85, mb: '4px' }}>📍 Visited Organisation</Box>
        <Box sx={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{v.org.name}{v.org.branch ? ' · ' + v.org.branch : ''}</Box>
        <Box sx={{ fontSize: 12, opacity: 0.85, mt: '4px' }}>{v.org.address}{v.org.city ? ', ' + v.org.city : ''}{v.org.state ? ', ' + v.org.state : ''}</Box>
        <Grid container spacing="14px" sx={{ mt: '14px' }}>
          {stats.map(([lbl, val]) => (
            <Grid key={lbl} size={{ xs: 6, md: 3 }}>
              <Box sx={{ p: '10px 12px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '6px', height: '100%' }}>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85, mb: '3px', fontWeight: 700 }}>{lbl}</Box>
                <Box sx={{ fontWeight: 700, fontSize: 13 }}>{val}</Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <VSection icon="🎯" head="Purpose & Scope" bodySx={{ fontSize: 13, lineHeight: 1.6 }}>
        <Box sx={subLabel}>Purpose</Box>
        <Box sx={{ mb: '12px' }}>{v.purpose || <NotSpecified />}</Box>
        <Box sx={subLabel}>Scope</Box>
        <Box sx={{ mb: '12px' }}>{v.scope || <NotSpecified />}</Box>
        <Box sx={subLabel}>References</Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 12 }}>{v.references || '—'}</Box>
        {v.tags.length > 0 && <Box sx={{ mt: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{v.tags.map(tg => <Tag key={tg}>{tg}</Tag>)}</Box>}
      </VSection>

      <VSection icon="⭐" head="Area Ratings" meta={`Avg ★ ${avg}`}>
        <Grid container spacing="10px">
          {RATING_AREAS.map(a => {
            const r = v.ratings[a.key] || 0;
            return (
              <Grid key={a.key} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ p: '12px 14px', bgcolor: tokens.cream, borderRadius: '6px', borderLeft: `3px solid ${tokens.yellow}`, height: '100%' }}>
                  <Box sx={{ fontSize: 11, fontWeight: 700, mb: '4px' }}>{a.label}</Box>
                  <Box sx={{ color: tokens.yellow, fontSize: 14, letterSpacing: '2px' }}>{r ? '★'.repeat(r) + '☆'.repeat(5 - r) : '☆☆☆☆☆'}<Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, ml: '6px', fontWeight: 700, letterSpacing: 0 }}>{r}/5</Box></Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </VSection>

      <VSection icon="📊" head="Overall Assessment">
        {v.overallAssessment && <OverallPill value={v.overallAssessment} label={(OVERALL_OPTIONS.find(o => o.key === v.overallAssessment) || {}).label} sx={{ fontSize: 11, p: '5px 12px' }} />}
        {v.executiveSummary && <Box sx={{ mt: '12px', fontSize: 13, lineHeight: 1.6, bgcolor: tokens.cream, p: '14px 16px', borderRadius: '6px', borderLeft: `3px solid ${tokens.teal}`, whiteSpace: 'pre-wrap' }}>{v.executiveSummary}</Box>}
      </VSection>

      {v.observations.length > 0 && (
        <VSection icon="🔍" head="Detailed Observations" meta={String(v.observations.length)}>
          {v.observations.map((o, i) => (
            <Box key={i} sx={{ p: '10px 14px', bgcolor: tokens.cream, borderLeft: `3px solid ${tokens.teal}`, borderRadius: '6px', mb: '6px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: '5px', flexWrap: 'wrap' }}>
                <Tag sx={{ bgcolor: tokens.tealSofter, color: tokens.tealDark }}>{o.category}</Tag>
                {o.evidence && <Box component="span" sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', ml: 'auto' }}>📎 {o.evidence}</Box>}
              </Box>
              <Box sx={{ fontSize: 13, lineHeight: 1.5 }}>{o.observation}</Box>
            </Box>
          ))}
        </VSection>
      )}

      {v.photos > 0 && (
        <VSection icon="📷" head="Photos & Evidence" meta={`${v.photos} photos`}>
          <Grid container spacing={1}>{Array.from({ length: v.photos }).map((_, i) => <Grid key={i} size="auto"><PhotoSlot filled /></Grid>)}</Grid>
        </VSection>
      )}

      {v.actionItems.length > 0 && (
        <VSection icon="⚡" head="Action Items" meta={`${v.actionItems.length} · synced to My To-Do`}>
          {v.actionItems.map((a, i) => (
            <Grid key={i} container spacing="12px" sx={{ alignItems: 'center', p: '10px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${tokens.yellow}`, borderRadius: '6px', mb: '5px' }}>
              <Grid size={{ xs: 12, sm: 'grow' }} sx={{ fontSize: 13, fontWeight: 600 }}>{a.text}</Grid>
              <Grid size="auto" sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, fontWeight: 700 }}>{a.owner || 'Unassigned'}</Grid>
              <Grid size="auto" sx={{ fontFamily: fonts.mono, fontSize: 11, color: a.deadline && isOverdue(a.deadline) ? tokens.red : tokens.slate, fontWeight: 700 }}>{a.deadline || '—'}</Grid>
            </Grid>
          ))}
        </VSection>
      )}

      <VSection icon="🔁" head="Follow-up & Sign-off" bodySx={{ fontSize: 13 }}>
        <div><strong>Follow-Up Required:</strong> {v.followUpRequired ? '✓ Yes' : '✗ No — visit complete'}</div>
        {v.nextVisitDate && <Box sx={{ mt: '6px' }}><strong>Next Visit:</strong> {formatDateLong(parseDate(v.nextVisitDate))}</Box>}
        {v.additionalRemarks && <Box sx={{ mt: '10px', p: '10px 14px', bgcolor: tokens.cream, borderRadius: '6px', whiteSpace: 'pre-wrap' }}>{v.additionalRemarks}</Box>}
      </VSection>
    </ModalShell>
  );
}
