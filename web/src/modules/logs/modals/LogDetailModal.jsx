import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { CHANNELS } from '../../../data/logs';
import { parseDate, formatDateLong } from '../../../utils/dates';
import { ModalShell, FootNote, Btn, Chip, Tag, Icon } from '../../../components';
import { FUItem } from '../components/FollowupsView';

// .log-detail-head.channel-* gradients (in-person / sms fall back to the default green → teal)
const HEAD_GRADIENT = {
  phone: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
  whatsapp: 'linear-gradient(135deg, #075E54, #25D366)',
  video: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
  email: 'linear-gradient(135deg, #9A3412, #DD6B20)',
  chat: 'linear-gradient(135deg, #BE185D, #D53F8C)',
};

function SectionHead({ first, children }) {
  return <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, m: first ? '0 0 8px' : '16px 0 8px', display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>;
}
function FieldBlock({ decisions, children }) {
  return <Box sx={{ bgcolor: decisions ? tokens.tealSofter : tokens.cream, borderRadius: '6px', p: '12px 14px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', borderLeft: `3px solid ${decisions ? tokens.teal : tokens.line}` }}>{children}</Box>;
}

/** Log detail modal (openLogDetail) */
export default function LogDetailModal({ log, onClose, onToggleFU, onDelete, onEdit, onFocusPerson }) {
  if (!log) return null;
  const ch = CHANNELS[log.channel] || CHANNELS['in-person'];
  const dt = parseDate(log.date);
  const openCount = (log.followUps || []).filter(f => !f.done).length;

  const head = (
    <Box sx={{ p: { xs: '18px', md: '22px 26px' }, color: '#fff', position: 'relative', background: HEAD_GRADIENT[log.channel] || `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})` }}>
      <Box component="button" type="button" onClick={onClose} sx={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.85, mb: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name={ch.icon} size={13} />{ch.label}{log.duration ? ' · ' + log.duration : ''}</Box>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', pr: 4 }}>{log.topic}</Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: 1, letterSpacing: '0.04em' }}>{formatDateLong(dt)} · {log.time}{log.privacy === 'private' ? ' · PRIVATE' : ''}</Box>
    </Box>
  );

  const footer = (
    <>
      <FootNote>Captured {log.createdAt ? 'automatically' : 'just now'}</FootNote>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Btn variant="danger" size="sm" onClick={() => onDelete(log.id)}><Icon name="remove" />Delete</Btn>
        <Btn size="sm" onClick={() => onEdit(log)}>✎ Edit</Btn>
        <Btn variant="primary" size="sm" onClick={onClose}>Close</Btn>
      </Box>
    </>
  );

  return (
    <ModalShell open={!!log} onClose={onClose} width={620} head="custom" headSlot={head} footer={footer} bodySx={{ p: { xs: '16px', md: '20px 26px' } }}>
      <SectionHead first><Icon name="people" />With</SectionHead>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
        {log.with.map((p, i) => (
          <Chip key={i} external={p.type === 'external'} onClick={() => { onClose(); onFocusPerson(p.name); }}>
            {p.name}{p.email && <Box component="span" sx={{ fontSize: 10, opacity: 0.8 }}>{p.email}</Box>}{p.type === 'external' && <Box component="span" sx={{ fontSize: 8, opacity: 0.7 }}>EXT</Box>}
          </Chip>
        ))}
      </Box>

      <SectionHead><Icon name="chat" />Summary</SectionHead>
      <FieldBlock>{log.summary}</FieldBlock>

      {log.decisions && <><SectionHead><Icon name="target" />Decisions / Outcomes</SectionHead><FieldBlock decisions>{log.decisions}</FieldBlock></>}

      {log.tags && log.tags.length > 0 && (
        <><SectionHead><Icon name="tag" />Tags</SectionHead><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mt: '6px' }}>{log.tags.map(t => <Tag key={t}>{t}</Tag>)}</Box></>
      )}

      {log.followUps && log.followUps.length > 0 && (
        <>
          <SectionHead>⚡ Follow-ups · {openCount} open / {log.followUps.length} total</SectionHead>
          {log.followUps.map(fu => <FUItem key={fu.id} fu={fu} onToggle={() => onToggleFU(log.id, fu.id)} />)}
        </>
      )}
    </ModalShell>
  );
}
