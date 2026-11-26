import { Box } from '@mui/material';
import { Btn, ModalShell, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, normExt, ownerAvatarColor, tdplEmail } from '../../../utils/people';

const Channel = ({ children }) => <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '3px 7px', borderRadius: '8px', bgcolor: tokens.tealSoft, color: tokens.tealDark, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{children}</Box>;
const GroupHead = ({ l, r }) => <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '10px', display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><span>{r}</span></Box>;

function Recipient({ name, bg, email, missing, right }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '10px 12px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '6px', mb: '5px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(name)}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 13, fontWeight: 600 }}>{name}</Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: missing ? tokens.red : tokens.slate, fontStyle: missing ? 'italic' : 'normal', letterSpacing: '0.02em', mt: '2px', wordBreak: 'break-all' }}>{email}</Box>
      </Box>
      <Box sx={{ display: 'flex', gap: '4px', ml: 'auto', flexShrink: 0 }}>{right}</Box>
    </Box>
  );
}

/** circulateMinutes(meetingId) — recipients modal; onAddEmail(idx) closes, prompts and re-opens */
export default function DetailCirculateModal({ open, m, onClose, onConfirm, onAddEmail }) {
  if (!m) return null;
  const externals = (m.external || []).map(normExt);
  const withEmail = externals.filter(e => e.email);
  const noEmail = externals.filter(e => !e.email);
  const total = m.attendees.length + withEmail.length;

  return (
    <ModalShell open={open} onClose={onClose} width={560} head="custom"
      headSlot={
        <Box sx={{ p: { xs: '16px 18px', md: '22px 26px' }, borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', gap: '14px', background: `linear-gradient(135deg, ${tokens.card}, ${tokens.creamWarm})` }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: tokens.tealSoft, color: tokens.tealDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}><Icon name="email" /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>Circulate Minutes</Box>
            <Box sx={{ fontSize: 12, color: tokens.slate, mt: '3px' }}>{m.title}</Box>
          </Box>
          <Btn size="sm" onClick={onClose}>×</Btn>
        </Box>
      }
      footer={<>
        <Box sx={{ fontSize: 12, color: tokens.slate, '& strong': { color: tokens.ink } }}>
          Dispatching to <strong>{total}</strong> recipient{total > 1 ? 's' : ''}{noEmail.length > 0 ? <> · <Box component="span" sx={{ color: tokens.red }}><strong>{noEmail.length}</strong> skipped (no email)</Box></> : null}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={onConfirm}>✓ Send to {total} recipients</Btn>
        </Box>
      </>}>
      <Box sx={{ mb: '18px' }}>
        <GroupHead l="Internal · TrustLab" r={m.attendees.length} />
        {m.attendees.map((a, i) => <Recipient key={i} name={a} bg={ownerAvatarColor(a)} email={tdplEmail(a)} right={<><Channel>✉ Email</Channel><Channel><Icon name="bell" />In-app</Channel></>} />)}
      </Box>
      {externals.length > 0 && (
        <Box sx={{ mb: '18px' }}>
          <GroupHead l="External" r={`${withEmail.length}/${externals.length} with email`} />
          {externals.map((e, idx) => (
            <Recipient key={idx} name={e.name} bg="#2563EB" email={e.email || '⚠ No email — click to add'} missing={!e.email}
              right={e.email ? <Channel>✉ Email</Channel> : <Btn size="sm" onClick={() => onAddEmail(idx)}>+ Add email</Btn>} />
          ))}
        </Box>
      )}
      <Box sx={{ p: '12px 14px', bgcolor: tokens.tealSofter, borderRadius: '6px', fontSize: 12, color: tokens.slate, lineHeight: 1.5, '& strong': { color: tokens.tealDark } }}>
        <Icon name="attach" /><strong>Attached:</strong> Minutes PDF · Action Items summary · Pre-reads<br />
        <Icon name="email" /><strong>Reply-To:</strong> {tdplEmail(m.chair)}<br />
        <Icon name="lock" /><strong>Confidentiality:</strong> Internal · Not for onward distribution without permission
      </Box>
    </ModalShell>
  );
}
