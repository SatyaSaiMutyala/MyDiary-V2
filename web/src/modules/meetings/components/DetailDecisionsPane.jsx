import { Box } from '@mui/material';
import { Btn, EmptyState, Tag } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';

/** renderDecisionsPane — decisions logged from this meeting, "View in Registry →" */
export default function DetailDecisionsPane({ m, decisions, onViewRegistry }) {
  if (decisions.length === 0) {
    return <EmptyState icon="⚖" title="No decisions logged yet" desc="Log a decision via the Minutes tab (+ Link Decision button) or from AI Summary once generated." />;
  }
  return (
    <Box>
      <Box sx={{ mb: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 12, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em' }}><strong>{decisions.length}</strong> DECISION{decisions.length > 1 ? 'S' : ''} LOGGED FROM THIS MEETING</Box>
        <Btn size="sm" onClick={onViewRegistry}>View in Registry →</Btn>
      </Box>
      {decisions.map(d => (
        <Box key={d.id} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${tokens.teal}`, borderRadius: tokens.radius, p: '14px 18px', mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '6px', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Box sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{d.text}</Box>
            <Box sx={{ display: 'flex', gap: '4px', ml: { sm: '12px' }, flexShrink: 0, flexWrap: 'wrap' }}>{d.tags.map(t => <Tag key={t} sx={{ borderRadius: '10px', letterSpacing: '0.1em', p: '2px 8px' }}>{t}</Tag>)}</Box>
          </Box>
          <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.05em', mt: 1, display: 'flex', gap: '14px', flexWrap: 'wrap', '& strong': { color: tokens.ink } }}>
            <span>Dept: <strong>{d.department}</strong></span>
            <span>Decided by: <strong>{d.decidedBy}</strong></span>
            <span>Linked to agenda item #{d.agendaIdx + 1}: <em>{m.agenda[d.agendaIdx] || ''}</em></span>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
