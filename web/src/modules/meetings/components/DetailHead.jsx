import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Eyebrow, Btn, TypePill, RsvpPill, Chip, FieldLabel, Avatar } from '../../../components';
import { tokens, fonts, TYPE_COLORS } from '../../../theme/tokens';
import { TYPES } from '../../../data/meetings';
import { parseDate, formatDateLong, formatTime, isToday, daysUntil } from '../../../utils/dates';
import { normExt, rsvpSummary } from '../../../utils/people';

/** .eyebrow + .detail-head (title, meta row, action buttons by status, cancel reason, attendee block) */
export default function DetailHead({ m, onEdit, onDuplicate, onMarkCompleted, onCancel, onRestore, onDelete, onPreview, onExport, onCirculate, onOpenRsvp, onEditEmail }) {
  const dt = parseDate(m.date);
  let statusLabel = '';
  if (m.status === 'upcoming') statusLabel = isToday(m.date) ? '◉ Today' : 'Scheduled · ' + (daysUntil(m.date) + ' days away');
  else if (m.status === 'completed') statusLabel = '✓ Completed';
  else if (m.status === 'cancelled') statusLabel = '⊘ Cancelled';

  let actionBtns;
  if (m.status === 'upcoming') {
    actionBtns = (<>
      <Btn size="sm" onClick={onEdit}>✎ Edit</Btn>
      <Btn size="sm" onClick={onDuplicate}>⧉ Duplicate</Btn>
      <Btn size="sm" onClick={onMarkCompleted}>✓ Mark as Completed</Btn>
      <Btn size="sm" variant="danger" onClick={onCancel}>⊘ Cancel Meeting</Btn>
    </>);
  } else if (m.status === 'completed') {
    actionBtns = (<>
      <Btn size="sm" onClick={onPreview}>👁 Preview</Btn>
      <Btn size="sm" onClick={onExport}>📄 Export Minutes</Btn>
      <Btn size="sm" onClick={onCirculate}>📧 Circulate</Btn>
      <Btn size="sm" onClick={onDuplicate}>⧉ Duplicate</Btn>
    </>);
  } else {
    actionBtns = (<>
      <Btn size="sm" onClick={onRestore}>↺ Restore</Btn>
      <Btn size="sm" onClick={onDuplicate}>⧉ Duplicate as New</Btn>
      <Btn size="sm" variant="danger" onClick={onDelete}>🗑 Delete</Btn>
    </>);
  }

  const externals = m.external || [];
  const rc = externals.length ? rsvpSummary(externals) : null;
  const rsSpan = (color, txt) => <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color }}>{txt}</Box>;

  return (
    <>
      <Eyebrow code="TL-OPS-DRM-001" parts={[`Meeting · ${m.id.slice(-6).toUpperCase()}`, statusLabel]} />

      <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${(TYPE_COLORS[m.type] || TYPE_COLORS.other).line}`, borderRadius: tokens.radius, p: { xs: '18px 16px', md: '22px 24px' }, mb: '18px', boxShadow: tokens.shadowSm }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', mb: '14px', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <TypePill type={m.type} sx={{ mb: '7px' }}>{TYPES[m.type].icon} {TYPES[m.type].name}{m.subBadge ? ' · ' + m.subBadge : ''}</TypePill>
            <Typography component="h1" sx={{ fontFamily: fonts.serif, fontSize: { xs: 22, md: 28 }, fontWeight: 700, letterSpacing: '-0.01em', m: '8px 0 10px', lineHeight: 1.2 }}>{m.title}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: '10px 16px', md: '20px' }, fontSize: 13, color: tokens.slate, '& strong': { color: tokens.ink, fontWeight: 600 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span>📅</span><strong>{formatDateLong(dt)}</strong></Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span>🕐</span><strong>{formatTime(m.time)}</strong> · {m.dur}</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span>{m.mode.split(' ')[0]}</span>{m.loc}</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span>👤</span>Chair: <strong>{m.chair}</strong></Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>{actionBtns}</Box>
        </Box>

        {m.cancelReason && (
          <Box sx={{ bgcolor: tokens.redSoft, border: `1px solid ${tokens.red}`, borderRadius: tokens.radiusSm, p: '10px 14px', mt: '14px', fontSize: 12, color: tokens.red }}>
            <strong>Cancellation reason:</strong> {m.cancelReason}
          </Box>
        )}

        <Box sx={{ mt: '14px', pt: '14px', borderTop: `1px dashed ${tokens.line}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: externals.length ? 6 : 12 }} sx={{ minWidth: 0 }}>
              <FieldLabel sx={{ mb: '6px' }}><span>Internal · {m.attendees.length}</span></FieldLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
                {m.attendees.map((a, i) => <Chip key={i}>{a}</Chip>)}
              </Box>
            </Grid>
            {externals.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                <FieldLabel sx={{ mb: '6px', alignItems: 'center', gap: '8px' }} right={
                  <Box component="span" sx={{ display: 'inline-flex', gap: 1, ml: 1, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.04em', fontWeight: 700, textTransform: 'none' }}>
                    {rc.accepted ? rsSpan(tokens.tealDark, '✓ ' + rc.accepted) : null}
                    {rc.tentative ? rsSpan(tokens.blue, '? ' + rc.tentative) : null}
                    {rc.declined ? rsSpan(tokens.red, '✗ ' + rc.declined) : null}
                    {rc.pending ? rsSpan(tokens.amber, '⌛ ' + rc.pending) : null}
                  </Box>
                }>
                  <span>External · {externals.length}</span>
                </FieldLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {externals.map((a, idx) => {
                    const n = normExt(a);
                    return (
                      <Box key={idx} onClick={() => { if (!n.email) onEditEmail(idx); }} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '10px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', flexWrap: { xs: 'wrap', sm: 'nowrap' }, cursor: n.email ? 'default' : 'pointer' }}>
                        <Avatar name={n.name} size={28} color={tokens.blue} fontSize={10} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ fontSize: 12, fontWeight: 600 }}>{n.name} <RsvpPill rsvp={n.rsvp} /></Box>
                          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', mt: '1px' }}>
                            {n.email || <Box component="span" sx={{ color: tokens.red }}>⚠ No email — click row to add</Box>}
                            {n.respondedAt ? ' · responded ' + n.respondedAt.slice(5, 10).replace('-', '/') : ''}
                          </Box>
                          {n.respondedNote && <Box sx={{ fontSize: 11, color: tokens.slate, fontStyle: 'italic', mt: '4px', p: '4px 8px', bgcolor: tokens.cream, borderRadius: '4px' }}>"{n.respondedNote}"</Box>}
                        </Box>
                        <Box sx={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <SimBtn title="Simulate what this invitee sees in their email" onClick={(e) => { e.stopPropagation(); onOpenRsvp(idx); }}>📧 Open as recipient</SimBtn>
                          {!n.email && <SimBtn onClick={(e) => { e.stopPropagation(); onEditEmail(idx); }}>+ Add email</SimBtn>}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    </>
  );
}

/** .ext-invitee-row .btn-simulate */
export function SimBtn({ sx, children, ...rest }) {
  return (
    <Box component="button" type="button" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '4px 8px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '4px', cursor: 'pointer', color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', '&:hover': { bgcolor: tokens.tealSoft, color: tokens.tealDark, borderColor: tokens.teal }, ...sx }} {...rest}>
      {children}
    </Box>
  );
}
