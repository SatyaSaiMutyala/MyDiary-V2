import { useState } from 'react';
import { Box } from '@mui/material';
import { Btn, TextLink } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { ownerAvatarColor } from '../../../utils/people';
import { relativeTime } from '../../../utils/dates';

const EmptyNote = ({ children }) => <Box sx={{ color: tokens.slate, fontSize: 12, fontStyle: 'italic', p: '8px 0' }}>{children}</Box>;

function AeTab({ active, onClick, badge, children }) {
  return (
    <Box component="button" type="button" onClick={onClick} sx={{ p: '6px 12px', border: `1px solid ${active ? tokens.greenDeep : tokens.line}`, borderRadius: '14px', bgcolor: active ? tokens.greenDeep : tokens.card, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: active ? '#fff' : tokens.slate, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', '&:hover': active ? {} : { borderColor: tokens.teal, color: tokens.tealDark } }}>
      {children}
      <Box component="span" sx={{ bgcolor: active ? 'rgba(255,255,255,0.2)' : tokens.creamWarm, color: active ? 'inherit' : tokens.slate, p: '1px 6px', borderRadius: '8px', fontSize: 9, fontFamily: fonts.mono }}>{badge}</Box>
    </Box>
  );
}

/** renderActionExpand — Sub-tasks / Dependencies / Comments / History */
export default function DetailActionExpand({ extras: ex, tab, onTab, onToggleSubtask, onAddSubtask, onAddDependency, onAddComment }) {
  const extras = ex || { subtasks: [], dependencies: [], comments: [], history: [] };
  const [comment, setComment] = useState('');
  const subtasks = extras.subtasks || [], deps = extras.dependencies || [], comments = extras.comments || [], history = extras.history || [];
  const post = () => { const t = comment.trim(); if (!t) return; onAddComment(t); setComment(''); };

  return (
    <Box sx={{ p: { xs: '14px 16px', md: '16px 22px 16px 46px' }, bgcolor: tokens.cream, borderTop: `1px solid ${tokens.lineSoft}`, borderLeft: `3px solid ${tokens.teal}` }}>
      <Box sx={{ display: 'flex', gap: '6px', mb: '14px', flexWrap: 'wrap' }}>
        <AeTab active={tab === 'subtasks'} onClick={() => onTab('subtasks')} badge={`${subtasks.filter(s => s.done).length}/${subtasks.length}`}>☐ Sub-tasks</AeTab>
        <AeTab active={tab === 'deps'} onClick={() => onTab('deps')} badge={deps.length}>⚡ Dependencies</AeTab>
        <AeTab active={tab === 'comments'} onClick={() => onTab('comments')} badge={comments.length}>💬 Comments</AeTab>
        <AeTab active={tab === 'history'} onClick={() => onTab('history')} badge={history.length}>🕐 History</AeTab>
      </Box>

      {tab === 'subtasks' && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {subtasks.length === 0 ? <EmptyNote>No sub-tasks yet.</EmptyNote> : subtasks.map((s, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '6px 8px', borderRadius: '4px', '&:hover': { bgcolor: tokens.card } }}>
                <Box onClick={() => onToggleSubtask(idx)} sx={{ width: 16, height: 16, border: `2px solid ${s.done ? tokens.teal : tokens.line}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, bgcolor: s.done ? tokens.teal : 'transparent', color: '#fff', fontSize: 11 }}>{s.done ? '✓' : ''}</Box>
                <Box sx={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? tokens.slate : 'inherit' }}>{s.text}</Box>
              </Box>
            ))}
          </Box>
          <TextLink sx={{ mt: '6px' }} onClick={onAddSubtask}>+ Add sub-task</TextLink>
        </Box>
      )}

      {tab === 'deps' && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {deps.length === 0 ? <EmptyNote>No dependencies — this action can proceed independently.</EmptyNote> : deps.map((d, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', fontSize: 12, flexWrap: 'wrap' }}>
                <Box component="span" sx={{ color: tokens.slate, fontSize: 14 }}>⚡</Box>
                <span>Blocked by: <strong>{d.desc.slice(0, 80)}</strong></span>
                <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '2px 7px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', ml: 'auto', bgcolor: d.status === 'done' ? tokens.tealSoft : tokens.yellowSoft, color: d.status === 'done' ? tokens.tealDark : tokens.amber }}>{d.status.toUpperCase().replace('-', ' ')}</Box>
              </Box>
            ))}
          </Box>
          <TextLink sx={{ mt: '6px' }} onClick={onAddDependency}>+ Add dependency</TextLink>
        </Box>
      )}

      {tab === 'comments' && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '10px' }}>
            {comments.length === 0 ? <EmptyNote>No comments yet. Discuss progress or blockers below.</EmptyNote> : comments.map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: '10px' }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: ownerAvatarColor(c.user), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{c.ini}</Box>
                <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '8px 12px', flex: 1 }}>
                  <Box sx={{ fontSize: 11, color: tokens.slate, mb: '3px', '& strong': { color: tokens.ink, fontWeight: 700 } }}><strong>{c.user}</strong> · {relativeTime(c.at)}</Box>
                  <Box sx={{ fontSize: 13, lineHeight: 1.5 }}>{c.text}</Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box component="input" type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); post(); } }}
              sx={{ flex: 1, p: '8px 12px', border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.card, fontSize: 13, fontFamily: 'inherit', color: tokens.ink, minWidth: 0, '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: `0 0 0 2px ${tokens.tealSoft}` } }} />
            <Btn variant="primary" size="sm" onClick={post}>Post</Btn>
          </Box>
        </Box>
      )}

      {tab === 'history' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {history.length === 0 ? <EmptyNote>No history yet.</EmptyNote> : history.map((h, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '6px 8px 6px 12px', fontSize: 12, color: tokens.slate, borderLeft: `2px solid ${tokens.line}`, flexWrap: 'wrap' }}>
              <Box component="span" sx={{ fontWeight: 700, color: tokens.ink }}>{h.user}</Box>
              <Box component="span" sx={{ color: tokens.tealDark, fontWeight: 600 }}>{h.action}</Box>
              <Box component="span" sx={{ ml: 'auto', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.04em' }}>{relativeTime(h.at)}</Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
