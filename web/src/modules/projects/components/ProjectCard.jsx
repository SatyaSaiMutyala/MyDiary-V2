import { Box, ButtonBase } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { ProjStatusPill, ProjPriorityPill } from './Pills';
import { projectAvgProgress, overdueMilestones, fmtRange, catOf, STATUS_BORDER } from '../utils';

const pctColor = { '': tokens.tealDark, amber: tokens.amber, red: tokens.red };
const fillBg = {
  '': `linear-gradient(90deg, ${tokens.teal}, ${tokens.tealDark})`,
  amber: `linear-gradient(90deg, ${tokens.yellow}, ${tokens.amber})`,
  red: `linear-gradient(90deg, ${tokens.red}, #8B1E1E)`,
};

function ActionBtn({ danger, title, onClick, children }) {
  return (
    <ButtonBase title={title} onClick={onClick} sx={{ width: 30, height: 30, borderRadius: '6px', bgcolor: 'transparent', border: `1px solid ${tokens.line}`, color: tokens.slate, fontSize: 12, '&:hover': danger ? { bgcolor: tokens.redSoft, color: tokens.red, borderColor: tokens.red } : { bgcolor: tokens.tealSofter, color: tokens.tealDark, borderColor: tokens.teal } }}>
      {children}
    </ButtonBase>
  );
}

/** .proj-card — renderProjectCard() */
export default function ProjectCard({ p, onOpen, onEdit, onDuplicate, onDelete }) {
  const cat = catOf(p);
  const progress = projectAvgProgress(p);
  const progressColor = progress >= 70 ? '' : progress >= 40 ? 'amber' : 'red';
  const ovMilestones = overdueMilestones(p).length;
  const totalMs = (p.milestones || []).length;
  const teamAll = [...p.team, ...(p.external || []).map(e => ({ ...e, type: 'external' }))];
  const teamShow = teamAll.slice(0, 4);
  const extra = teamAll.length - teamShow.length;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <Box onClick={() => onOpen()} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: `4px solid ${STATUS_BORDER[p.status] || tokens.teal}`, borderRadius: tokens.radius, p: '18px 20px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: tokens.shadowSm, display: 'flex', flexDirection: 'column', height: '100%', opacity: p.status === 'completed' ? 0.85 : p.status === 'cancelled' ? 0.6 : 1, '&:hover': { boxShadow: tokens.shadow, transform: 'translateY(-2px)', borderColor: tokens.slateSoft, borderTopColor: STATUS_BORDER[p.status] || tokens.teal } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '10px', gap: 1 }}>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.tealDark, letterSpacing: '0.08em', fontWeight: 700 }}>{p.code}</Box>
        <ProjStatusPill status={p.status} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mb: '10px', flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontSize: 12 }}>{cat.emoji}</Box>{cat.label}
        <Box component="span" sx={{ color: tokens.slateSofter }}>·</Box>
        <ProjPriorityPill priority={p.priority}>{p.priority} priority</ProjPriorityPill>
      </Box>
      <Box sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, mb: 1, letterSpacing: '-0.01em' }}>{p.name}</Box>
      <Box sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: '14px' }}>{p.description}</Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '6px', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.slate, fontWeight: 700 }}>
        <span>Overall Progress</span>
        <Box component="span" sx={{ color: pctColor[progressColor], fontSize: 11 }}>{progress}%</Box>
      </Box>
      <Box sx={{ height: 8, bgcolor: tokens.lineSoft, borderRadius: '4px', overflow: 'hidden', mb: '14px' }}>
        <Box sx={{ height: '100%', width: `${progress}%`, background: fillBg[progressColor], borderRadius: '4px', transition: 'width 0.6s' }} />
      </Box>

      <Box sx={{ fontSize: 11, color: tokens.slate, mb: '10px', borderTop: `1px dashed ${tokens.line}`, pt: '10px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', p: '3px 0' }}><Box component="span" sx={{ color: tokens.slateSoft, fontSize: 11 }}>📅</Box>{fmtRange(p.startDate, p.endDate)}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', p: '3px 0' }}><Box component="span" sx={{ color: tokens.slateSoft, fontSize: 11 }}>👤</Box>{p.owner}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', p: '3px 0' }}>
          <Box component="span" sx={{ color: tokens.slateSoft, fontSize: 11 }}>🏁</Box>
          <span>{totalMs} milestone{totalMs !== 1 ? 's' : ''}{ovMilestones ? <> · <Box component="strong" sx={{ color: tokens.red }}>{ovMilestones} overdue</Box></> : null}</span>
        </Box>
      </Box>

      <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '10px', borderTop: `1px dashed ${tokens.line}`, gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex' }}>
          {teamShow.map((t, i) => (
            <Box key={i} title={t.name + (t.role ? ' · ' + t.role : '')} sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: t.type === 'external' ? tokens.blue : ownerAvatarColor(t.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, ml: i === 0 ? 0 : '-6px', border: `2px solid ${tokens.card}`, flexShrink: 0 }}>{initials(t.name)}</Box>
          ))}
          {extra > 0 && <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: tokens.slateSoft, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, ml: '-6px', border: `2px solid ${tokens.card}`, flexShrink: 0 }}>+{extra}</Box>}
        </Box>
        <Box sx={{ display: 'flex', gap: '6px' }}>
          <ActionBtn title="Edit" onClick={stop(onEdit)}>✎</ActionBtn>
          <ActionBtn title="Duplicate" onClick={stop(onDuplicate)}>⧉</ActionBtn>
          <ActionBtn title="Delete" danger onClick={stop(onDelete)}>🗑</ActionBtn>
          <ButtonBase onClick={stop(onOpen)} sx={{ p: '7px 14px', bgcolor: tokens.greenDeep, color: '#fff', border: 'none', borderRadius: '6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'inherit', '&:hover': { bgcolor: tokens.tealDark } }}>Open →</ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}
