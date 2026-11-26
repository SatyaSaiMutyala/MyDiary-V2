import { Box, ButtonBase } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { parseDate, formatDate, daysUntil, relativeTime } from '../../../utils/dates';

// .priority-pill / .status-pill (prototype has no .critical rule → unstyled, as in the HTML)
const PRI = { high: { bg: tokens.redSoft, color: tokens.red }, medium: { bg: tokens.yellowSoft, color: tokens.amber }, low: { bg: tokens.tealSoft, color: tokens.tealDark } };
const STA = { open: { bg: 'rgba(107,107,107,0.15)', color: tokens.slate }, 'in-progress': { bg: tokens.blueSoft, color: tokens.blue }, done: { bg: tokens.tealSoft, color: tokens.tealDark }, blocked: { bg: tokens.redSoft, color: tokens.red }, overdue: { bg: tokens.red, color: '#fff' } };
function MiniPill({ style, children }) {
  return <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '4px 9px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center', cursor: 'pointer', border: '1px solid transparent', bgcolor: style ? style.bg : 'transparent', color: style ? style.color : 'inherit', whiteSpace: 'nowrap' }}>{children}</Box>;
}

const BORDER = { overdue: tokens.red, 'in-progress': tokens.blue, blocked: tokens.red, done: tokens.slateSoft };

function PrimaryBtn({ done, onClick, children }) {
  return <ButtonBase disabled={done} onClick={onClick} sx={{ p: '10px 16px', bgcolor: done ? tokens.slateSoft : tokens.teal, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: 12, cursor: done ? 'default' : 'pointer', letterSpacing: '0.04em', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', '&:hover': { bgcolor: done ? tokens.slateSoft : tokens.tealDark }, '&.Mui-disabled': { color: '#fff' } }}>{children}</ButtonBase>;
}
function SecBtn({ blocker, onClick, children }) {
  return <ButtonBase onClick={onClick} sx={{ flex: 1, p: '6px 10px', bgcolor: 'transparent', border: `1px solid ${tokens.line}`, borderRadius: '4px', fontSize: 10, fontWeight: 600, cursor: 'pointer', color: tokens.slate, letterSpacing: '0.02em', fontFamily: 'inherit', '&:hover': blocker ? { borderColor: tokens.red, color: tokens.red, bgcolor: tokens.redSoft } : { borderColor: tokens.teal, color: tokens.tealDark } }}>{children}</ButtonBase>;
}

/**
 * renderTodoCard(t, isOverdueFlag) — one .mt-task card.
 *  handlers: onOpenSource(), onComplete(mode), onSimple(status), onNudge(), onReassign(), onEdit()
 *  onEdit is only passed when this person may change the task — whoever wrote it, or an admin.
 */
export default function TodoCard({ t, isOverdueFlag, me, extras = {}, onOpenSource, onComplete, onSimple, onNudge, onReassign, onEdit }) {
  const srcIco = t.source === 'meetings' ? '📅' : t.source === 'visits' ? '📝' : '⚡';
  const srcLabel = t.source === 'meetings' ? 'From Meeting' : t.source === 'visits' ? 'From Visit' : 'Standalone';
  const comments = extras.comments || [];
  const lastComment = comments[comments.length - 1];

  const isDone = t.status === 'done';
  const daysLeft = daysUntil(t.deadline);
  let deadlineLabel = formatDate(parseDate(t.deadline));
  if (isOverdueFlag) deadlineLabel += ' · ' + Math.abs(daysLeft) + ' day' + (Math.abs(daysLeft) > 1 ? 's' : '') + ' overdue';
  else if (daysLeft === 0) deadlineLabel += ' · today';
  else if (daysLeft === 1) deadlineLabel += ' · tomorrow';
  else if (daysLeft > 0) deadlineLabel += ' · in ' + daysLeft + ' days';

  const statusClass = isOverdueFlag ? 'overdue' : t.status;
  const shortTitle = (t.sourceTitle || '').length > 40 ? t.sourceTitle.slice(0, 40) + '…' : t.sourceTitle;
  const sourceLink = t.source === 'standalone'
    ? <Box component="span" sx={{ color: tokens.slate, fontWeight: 700, ml: '4px' }}>(Ad-hoc)</Box>
    : <Box component="a" onClick={onOpenSource} sx={{ color: tokens.tealDark, textDecoration: 'none', fontWeight: 700, ml: '4px', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{shortTitle}</Box>;

  const isMine = t.owner === me;

  let actionBtns;
  if (isDone) {
    actionBtns = <>
      <PrimaryBtn done>✓ Completed</PrimaryBtn>
      <Box sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>Delivered back to source</Box>
    </>;
  } else if (!isMine) {
    actionBtns = <>
      <PrimaryBtn onClick={onNudge}>🔔 Nudge Owner</PrimaryBtn>
      <Box sx={{ display: 'flex', gap: '4px', width: '100%' }}>
        <SecBtn onClick={onReassign}>↺ Reassign</SecBtn>
        {onEdit && <SecBtn onClick={onEdit}>✎ Edit</SecBtn>}
      </Box>
    </>;
  } else if (t.source === 'meetings') {
    actionBtns = <>
      <PrimaryBtn onClick={() => onComplete('complete')}>✓ Mark Complete</PrimaryBtn>
      <Box sx={{ display: 'flex', gap: '4px', width: '100%' }}>
        {t.status !== 'in-progress' && <SecBtn onClick={() => onComplete('progress')}>In Progress</SecBtn>}
        <SecBtn blocker onClick={() => onComplete('blocker')}>Raise Blocker</SecBtn>
      </Box>
      {onEdit && <Box sx={{ display: 'flex', gap: '4px', width: '100%' }}><SecBtn onClick={onEdit}>✎ Edit</SecBtn></Box>}
    </>;
  } else {
    actionBtns = <>
      <PrimaryBtn onClick={() => onSimple('done')}>✓ Mark Complete</PrimaryBtn>
      <Box sx={{ display: 'flex', gap: '4px', width: '100%' }}>
        {t.status !== 'in-progress' && <SecBtn onClick={() => onSimple('in-progress')}>In Progress</SecBtn>}
        <SecBtn blocker onClick={() => onSimple('blocked')}>Raise Blocker</SecBtn>
      </Box>
      {onEdit && <Box sx={{ display: 'flex', gap: '4px', width: '100%' }}><SecBtn onClick={onEdit}>✎ Edit</SecBtn></Box>}
    </>;
  }

  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${BORDER[statusClass] || tokens.teal}`, borderRadius: tokens.radius, p: { xs: '14px 16px', md: '16px 20px' }, mb: '10px', boxShadow: tokens.shadowSm, transition: 'all 0.15s', opacity: isDone ? 0.6 : 1, background: statusClass === 'overdue' ? `linear-gradient(90deg, rgba(197,48,48,0.03), ${tokens.card} 20%)` : tokens.card, '&:hover': { boxShadow: tokens.shadow } }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 'grow' }} sx={{ minWidth: 0 }}>
          <Box sx={{ fontSize: 15, fontWeight: 700, mb: 1, lineHeight: 1.35, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? tokens.slate : tokens.ink }}>{t.desc || <em style={{ color: tokens.slate }}>(no description)</em>}</Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: 12, color: tokens.slate, mb: 1, alignItems: 'center', '& strong': { color: tokens.ink } }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', p: '3px 8px', bgcolor: tokens.creamWarm, borderRadius: '12px', fontSize: 10, fontFamily: fonts.mono, letterSpacing: '0.04em', color: tokens.slate, textTransform: 'uppercase', fontWeight: 700 }}>{srcIco} {srcLabel}: {sourceLink}</Box>
            {isMine ? <span>Delegated by: <strong>{t.creator || '—'}</strong></span> : <span>Owner: <strong>{t.owner}</strong></span>}
            <Box component="span" sx={isOverdueFlag ? { color: tokens.red, fontWeight: 700 } : {}}>🗓 {deadlineLabel}</Box>
          </Box>
          <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <MiniPill style={PRI[t.priority]}>{(t.priority || 'medium').toUpperCase()}</MiniPill>
            <MiniPill style={STA[statusClass]}>{statusClass.toUpperCase().replace('-', ' ')}</MiniPill>
            {extras.subtasks && extras.subtasks.length > 0 && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, p: '3px 8px', bgcolor: tokens.creamWarm, borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700 }}>☐ {extras.subtasks.filter(s => s.done).length}/{extras.subtasks.length} sub-tasks</Box>}
            {comments.length > 0 && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.blue, p: '3px 8px', bgcolor: tokens.blueSoft, borderRadius: '10px', letterSpacing: '0.04em', fontWeight: 700 }}>💬 {comments.length}</Box>}
          </Box>
          {lastComment && (
            <Box sx={{ bgcolor: tokens.cream, borderTop: `1px dashed ${tokens.line}`, m: { xs: '8px -16px -14px', md: '8px -20px -16px' }, p: { xs: '10px 16px', md: '10px 20px' }, fontSize: 11, color: tokens.slate, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <span>💬 <strong>{lastComment.user}:</strong> "{lastComment.text.slice(0, 120)}{lastComment.text.length > 120 ? '…' : ''}" · <em>{relativeTime(lastComment.at)}</em></span>
            </Box>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 150, alignItems: 'flex-end' }}>{actionBtns}</Box>
        </Grid>
      </Grid>
    </Box>
  );
}
