import { useState } from 'react';
import { Box } from '@mui/material';
import { ModalShell, Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { errorMessage } from '../../../store/api/baseApi';
import { useAddCommentMutation, useUpdateActionItemMutation } from '../../../store/api/actionItemsApi';
import { useGetMeetingQuery } from '../../../store/api/meetingsApi';
import { useDialog } from '../../../components/Dialogs';

const CONFIG = {
  complete: { ico: '✓', label: 'Mark Task as Complete', sub: 'Status will update in the source meeting and your comment is added to the action trail.', placeholder: 'Completion note — what was done, any output / document produced, follow-up needed? (optional)', btnText: '✓ Mark Complete & Notify Chair', btnClass: 'primary', headClass: '', required: false },
  progress: { ico: '⏳', label: 'Update: In Progress', sub: 'Signal that you have started on this task.', placeholder: 'Quick status update — where you are, any early blockers? (optional)', btnText: '⏳ Update Status', btnClass: 'primary', headClass: 'progress-head', required: false },
  blocker: { ico: '⚠', label: 'Raise a Blocker', sub: 'Status will change to Blocked and the meeting chair will be notified. Please describe what is holding you up.', placeholder: 'What is blocking you? What do you need to unblock? Who could help? (required)', btnText: '⚠ Raise Blocker & Notify', btnClass: 'danger', headClass: 'blocker-head', required: true },
};

/**
 * COMPLETION / UPDATE DIALOG (openCompleteDialog / submitCompleteDialog).
 *  ctx: { action, mode: 'complete' | 'progress' | 'blocker' } — `action` is an item from /api/action-items.
 * Submitting PATCHes the item's status and POSTs the note as a comment; the API appends to its history
 * and refreshes the meeting through RTK tags.
 */
export default function CompleteDialog({ ctx, onClose }) {
  const dlg = useDialog();
  const [txt, setTxt] = useState('');
  const [updateActionItem, { isLoading: saving }] = useUpdateActionItemMutation();
  const [addComment, { isLoading: commenting }] = useAddCommentMutation();
  const a = ctx?.action || null;
  const { data: meeting } = useGetMeetingQuery(a?.meetingId, { skip: !a?.meetingId });
  if (!ctx || !a) return null;
  const { mode } = ctx;
  const m = { title: a.meetingTitle || meeting?.title || '', chair: meeting?.chair || 'the chair' };
  const c = CONFIG[mode];
  const icoColors = mode === 'blocker' ? { bg: tokens.redSoft, color: tokens.red } : mode === 'progress' ? { bg: tokens.blueSoft, color: tokens.blue } : { bg: tokens.tealSoft, color: tokens.tealDark };

  const submit = async () => {
    const text = txt.trim();
    if (mode === 'blocker' && !text) { await dlg.alert('Please describe what is blocking you so the chair can help unblock.'); return; }
    const newStatus = mode === 'complete' ? 'done' : mode === 'progress' ? 'in-progress' : 'blocked';
    try {
      await updateActionItem({ id: a.id, meetingId: a.meetingId, status: newStatus }).unwrap();
      if (text) await addComment({ id: a.id, meetingId: a.meetingId, text }).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err));
      return;
    }
    const toast = mode === 'complete' ? `✓ Completed. ${m.chair} notified. Visible in meeting under Action Items.` :
      mode === 'progress' ? '⏳ Status set to In Progress. Chair notified.' :
      `⚠ Blocker raised. ${m.chair} notified — expect a reply.`;
    onClose();
    setTimeout(() => dlg.alert(toast), 100);
  };

  const headSlot = (
    <Box sx={{ p: '22px 26px', borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', gap: '14px', background: `linear-gradient(135deg, ${tokens.tealSofter}, ${tokens.card})` }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: icoColors.bg, color: icoColors.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{c.ico}</Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{c.label}</Box>
        <Box sx={{ fontSize: 12, color: tokens.slate, mt: '3px' }}>{c.sub}</Box>
      </Box>
      <Btn size="sm" onClick={onClose}>×</Btn>
    </Box>
  );

  return (
    <ModalShell open onClose={onClose} width={520} head="custom" headSlot={headSlot} bodySx={{ p: '20px 26px' }}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>↻ Round-trip to <strong>{m.title.slice(0, 32)}{m.title.length > 32 ? '…' : ''}</strong></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant={c.btnClass === 'danger' ? 'danger' : 'primary'} onClick={submit} disabled={saving || commenting}>{c.btnText}</Btn>
        </Box>
      </>}>
      <Box sx={{ p: '12px 14px', bgcolor: tokens.cream, borderRadius: '6px', mb: '16px', fontSize: 13, fontWeight: 600, borderLeft: `3px solid ${tokens.teal}` }}>
        {a.desc || <em style={{ color: tokens.slate }}>(no description)</em>}
        <Box sx={{ fontWeight: 400, fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', mt: '4px', textTransform: 'uppercase' }}>From: {m.title} · Owner: {a.owner} · Due: {a.deadline}</Box>
      </Box>
      <Box sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.slate, mb: '6px' }}>{c.required ? '✱ ' : ''}{mode === 'complete' ? 'Completion Note' : mode === 'blocker' ? 'What is blocking you' : 'Status Update'}</Box>
      <Box component="textarea" autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder={c.placeholder}
        sx={{ width: '100%', minHeight: 90, p: '11px 14px', border: `1px solid ${c.required ? tokens.yellow : tokens.line}`, borderRadius: '6px', bgcolor: c.required ? '#FFFBEE' : tokens.cream, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', color: tokens.ink, '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: '#fff', boxShadow: `0 0 0 3px ${tokens.tealSoft}` } }} />
    </ModalShell>
  );
}
