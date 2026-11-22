import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { TextLink } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';

const spin = keyframes`to { transform: rotate(360deg); }`;

function GenerateCta({ title, sub, btn, onClick }) {
  return (
    <Box sx={{ background: 'linear-gradient(135deg, #0F8F76, #1A3A2F)', color: '#fff', p: { xs: '20px', md: '24px 28px' }, borderRadius: '14px', mb: '16px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden', flexWrap: { xs: 'wrap', md: 'nowrap' }, '&::before': { content: '"✨"', position: 'absolute', right: -10, top: -10, fontSize: 100, opacity: 0.1 } }}>
      <Box sx={{ fontSize: 40, flexShrink: 0 }}>✨</Box>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Box sx={{ fontSize: 18, fontWeight: 700, mb: '4px' }}>{title}</Box>
        <Box sx={{ fontSize: 12, opacity: 0.85 }}>{sub}</Box>
      </Box>
      <Box component="button" type="button" onClick={onClick} sx={{ p: '12px 22px', bgcolor: tokens.yellow, color: tokens.greenDeep, border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.02em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 1, fontFamily: 'inherit', position: 'relative', '&:hover': { bgcolor: '#fff' } }}>{btn}</Box>
    </Box>
  );
}

function Loading() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '30px', justifyContent: 'center', color: tokens.tealDark, fontSize: 13, fontWeight: 600, bgcolor: tokens.tealSofter, borderRadius: tokens.radius, mb: '14px' }}>
      <Box sx={{ width: 18, height: 18, border: `2px solid ${tokens.tealSoft}`, borderTopColor: tokens.teal, borderRadius: '50%', animation: `${spin} 0.8s linear infinite` }} />
      <Box>Claude is analysing transcript and generating summary…</Box>
    </Box>
  );
}

function AiBlock({ head, children }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '18px 16px', md: '22px 26px' }, mb: '14px', position: 'relative', '&::before': { content: '"✨"', position: 'absolute', top: -8, left: 20, bgcolor: tokens.card, p: '0 8px', fontSize: 14 } }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.tealDark, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '10px' }}>{head}</Box>
      <Box sx={{ fontSize: 14, lineHeight: 1.6, '& ul': { pl: '20px', m: '10px 0' }, '& li': { p: '4px 0' } }}>{children}</Box>
    </Box>
  );
}

function AiChip({ kind, onClick, children }) {
  const s = kind === 'risk' ? { bg: tokens.redSoft, color: tokens.red } : kind === 'decision' ? { bg: tokens.tealSoft, color: tokens.tealDark } : { bg: tokens.tealSofter, color: tokens.tealDark };
  return <Box component="span" onClick={onClick} sx={{ p: '4px 10px', borderRadius: '12px', fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: tokens.tealSoft } }}>{children}</Box>;
}

/** renderAIPane — 3 states + loading spinner (2200ms, controlled by the page) */
export default function DetailAIPane({ m, loading, onGoLive, onGenerate, onLogDecisions, onApplyActions }) {
  const transcriptLen = (m.transcript || []).length;
  if (!m.aiSummary && !transcriptLen) {
    return <GenerateCta title="AI Summary — not yet generated" sub="Record the meeting first (Live tab) so Claude has a transcript to work with. Once recorded, AI will summarise the discussion, extract action items, and detect decisions." btn="🎙 Go to Live Tab" onClick={onGoLive} />;
  }
  if (!m.aiSummary) {
    return (
      <>
        <GenerateCta title="Ready to summarise" sub={`${transcriptLen} transcript lines captured. Claude will produce an overview, decisions, action items, and risks in ~10 seconds.`} btn="✨ Generate Summary" onClick={onGenerate} />
        {loading && <Loading />}
      </>
    );
  }
  if (loading) return <Loading />;
  const s = m.aiSummary;
  return (
    <Box>
      <AiBlock head="📝 Overview">{s.overview}</AiBlock>
      <AiBlock head={`🎯 Decisions Detected (${s.decisions.length})`}>
        <ul>{s.decisions.map((d, i) => <li key={i}><strong>{d.text}</strong><br /><Box component="span" sx={{ fontSize: 12, color: tokens.slate }}>Owner: {d.owner} · Deadline: {d.deadline}</Box></li>)}</ul>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}><AiChip kind="decision" onClick={onLogDecisions}>+ Log all to Decisions Registry</AiChip></Box>
      </AiBlock>
      <AiBlock head={`✓ Action Items Extracted (${s.actions.length})`}>
        <ul>{s.actions.map((a, i) => <li key={i}><strong>{a.desc}</strong><br /><Box component="span" sx={{ fontSize: 12, color: tokens.slate }}>Owner: {a.owner} · Deadline: {a.deadline} · Priority: {a.priority}</Box></li>)}</ul>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}><AiChip onClick={onApplyActions}>+ Add all to Action Items</AiChip></Box>
      </AiBlock>
      <AiBlock head="⚠ Risks & Patterns">
        <ul>{s.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>{s.risks.map((_, i) => <AiChip key={i} kind="risk">+ Flag to Audit, Risk & Compliance</AiChip>)}</Box>
      </AiBlock>
      <Box sx={{ p: '12px 16px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', mt: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        ✨ Generated by Claude · Review and edit before finalising minutes · <TextLink onClick={onGenerate}>↻ Regenerate</TextLink>
      </Box>
    </Box>
  );
}
