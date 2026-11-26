import { useEffect, useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { ModalShell, Btn } from '../../../components';
import { TimeInput } from '../../../components/DateTimeInput';
import { tokens, fonts } from '../../../theme/tokens';

/** The lanes a logged activity can go into, and how each one reads in the header. */
export const LOG_LANES = [
  { key: 'daily', label: 'Daily', icon: '☀️' },
  { key: 'weekly', label: 'Weekly', icon: '📅' },
  { key: 'monthly', label: 'Monthly', icon: '📆' },
];

/** The eight chips of the prototype's modal. A blank tag is allowed too — nobody is made to pick. */
export const LOG_TAGS = [
  { id: 'approval', label: '✅ Approval', colour: '#059669' },
  { id: 'meeting', label: '👥 Meeting', colour: '#2563EB' },
  { id: 'review', label: '🔍 Review', colour: '#7C3AED' },
  { id: 'call', label: '📞 Call', colour: '#DB2777' },
  { id: 'decision', label: '⚖️ Decision', colour: '#D97706' },
  { id: 'visit', label: '🚗 Visit', colour: '#0891B2' },
  { id: 'task', label: '📝 Task', colour: '#64748B' },
  { id: 'other', label: '💡 Other', colour: '#92400E' },
];

const PLACEHOLDER = {
  daily: 'e.g. "Signed the Apollo MoU for the shared TB panel" or "Alignment call with Fayaz on the November cash position"',
  weekly: 'e.g. "Walked the weekly P&L with the CFO" or "Reviewed last week’s KPI board and set three pivots"',
  monthly: 'e.g. "Closed the November books with Sravan" or "Signed off the October MIS to the board"',
};

const labelSx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };

/** .ma-log-kind-chip / .ma-log-tag-chip — one pill that is either on or off. */
function PickChip({ on, onClick, colour = tokens.tealDark, children, sx }) {
  return (
    <ButtonBase onClick={onClick} sx={{
      p: '6px 12px', borderRadius: '14px', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
      bgcolor: on ? colour : tokens.card, color: on ? '#fff' : tokens.slate,
      border: `1px solid ${on ? colour : tokens.line}`,
      '&:hover': { borderColor: colour, color: on ? '#fff' : colour },
      ...sx,
    }}>{children}</ButtonBase>
  );
}

/**
 * "Log activity" — what the day actually held, beside the checklist that was planned for it.
 *
 * A preset task answers "did you do the thing we agreed?"; this answers "what else did you do?", which
 * is most of a senior person's day. It is written already done, because it is a record of work that has
 * happened, not a promise about work that will.
 *
 * Editing re-uses the same form rather than a second one that would drift from it.
 *
 * @param {object} props
 * @param {string} props.lane the lane it starts on — the one whose button was pressed
 * @param {object} [props.entry] the logged activity being changed; omitted means a new one
 * @param {string} props.dateLabel today, written out, so it is clear which day this lands on
 */
export default function LogActivityModal({ open, lane, entry, dateLabel, person, onClose, onSubmit, busy }) {
  const editing = Boolean(entry);
  const [kind, setKind] = useState(lane || 'daily');
  const [text, setText] = useState('');
  const [atTime, setAtTime] = useState('');
  const [tag, setTag] = useState('');
  const [problem, setProblem] = useState('');

  // Opening it afresh starts from the lane that was pressed, or from the entry being changed.
  useEffect(() => {
    if (!open) return;
    setKind(entry?.lane ?? lane ?? 'daily');
    setText(entry?.text ?? '');
    setAtTime(entry?.atTime ?? '');
    setTag(entry?.tag ?? '');
    setProblem('');
  }, [open, lane, entry]);

  const submit = () => {
    const t = text.trim();
    if (!t) { setProblem('Say what you did.'); return; }
    onSubmit({ lane: kind, text: t, atTime, tag });
  };

  const current = LOG_LANES.find(l => l.key === kind) ?? LOG_LANES[0];

  return (
    <ModalShell open={open} onClose={onClose} width={580} icon={editing ? '✎' : current.icon}
      title={editing ? 'Edit logged activity' : `Log ${current.label.toLowerCase()} activity`}
      sub={`${dateLabel} · ${person}`}
      bodySx={{ p: { xs: '16px', md: '20px 24px' } }}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
          ↻ Saved to {editing ? 'this day' : "today"}&apos;s log — it is your own record
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>{editing ? '💾 Save changes' : "+ Add to today's log"}</Btn>
        </Box>
      </>}>

      {/* .ma-log-kind-row — which lane it belongs to, switchable without losing what was typed. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pb: '14px', mb: '14px', borderBottom: `1px solid ${tokens.line}` }}>
        <Box component="span" sx={{ ...labelSx, mr: '4px' }}>Lane:</Box>
        {LOG_LANES.map(l => (
          <PickChip key={l.key} on={kind === l.key} onClick={() => setKind(l.key)}>{l.icon} {l.label}</PickChip>
        ))}
      </Box>

      <Box sx={{ mb: '16px' }}>
        <Box component="label" sx={labelSx}>What did you do? <Box component="span" sx={{ color: tokens.red }}>✱</Box></Box>
        <Box component="textarea" autoFocus rows={4} value={text}
          onChange={e => { setText(e.target.value); if (problem) setProblem(''); }}
          placeholder={PLACEHOLDER[kind]}
          sx={{ width: '100%', mt: '6px', p: '12px 14px', bgcolor: tokens.cream, border: `1.5px solid ${tokens.line}`, borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, color: tokens.ink, lineHeight: 1.5, boxSizing: 'border-box', minHeight: 90, '&:focus': { outline: 'none', borderColor: tokens.tealDark, bgcolor: tokens.card } }} />
      </Box>

      <Box sx={{ mb: '16px', maxWidth: 190 }}>
        <Box component="label" sx={labelSx}>Approximate time <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: tokens.slateSoft }}>(optional)</Box></Box>
        <TimeInput value={atTime} onChange={e => setAtTime(e.target.value)} sx={{ mt: '6px' }} inputSx={{ height: 40, minHeight: 40 }} />
      </Box>

      <Box>
        <Box component="label" sx={labelSx}>Tag it <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: tokens.slateSoft }}>(optional)</Box></Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '6px' }}>
          {LOG_TAGS.map(t => (
            // Pressing the chip that is already on clears it, so a wrong tag needs no "none" option.
            <PickChip key={t.id} on={tag === t.id} colour={t.colour} onClick={() => setTag(tag === t.id ? '' : t.id)} sx={{ p: '5px 11px', fontSize: 11, borderRadius: '12px' }}>{t.label}</PickChip>
          ))}
        </Box>
      </Box>

      {problem && (
        <Box sx={{ mt: '14px', p: '10px 14px', bgcolor: '#FEE2E2', border: `1px solid ${tokens.red}`, color: '#991B1B', borderRadius: '8px', fontSize: 12, fontWeight: 600 }}>{problem}</Box>
      )}
    </ModalShell>
  );
}
