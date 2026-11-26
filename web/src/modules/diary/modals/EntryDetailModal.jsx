import { Box, ButtonBase } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ModalShell, Btn, Chip, RsvpPill, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { TDPL_LOGO_FULL } from '../../../data/logos';
import { parseDate, formatDateLong } from '../../../utils/dates';
import { normExt, rsvpSummary, initials, tdplEmail } from '../../../utils/people';
import { errorMessage } from '../../../store/api/baseApi';
import { useUpdateDiaryEntryMutation } from '../../../store/api/diaryApi';
import { usePatchExternalMutation } from '../../../store/api/meetingsApi';
import { openRsvpPreview } from '../../meetings/rsvpPreview';
import { DETAIL_HEAD } from '../utils';
import { useDialog } from '../../../components/Dialogs';

const Row = ({ ico, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px', p: '8px 0', fontSize: 13, lineHeight: 1.5 }}>
    <Box sx={{ width: 20, color: tokens.slate, fontSize: 14, flexShrink: 0, textAlign: 'center' }}>{ico}</Box>
    {children}
  </Box>
);
const sumSx = { display: 'inline-flex', gap: '8px', ml: '8px', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.04em', fontWeight: 700, '& span': { display: 'inline-flex', alignItems: 'center', gap: '3px' } };

/** Entry detail popover (openEntryDetail 10362–10457) */
export default function EntryDetailModal({ entry, canEdit, onClose, onDelete }) {
  const dlg = useDialog();
  const navigate = useNavigate();
  const [updateEntry] = useUpdateDiaryEntryMutation();
  const [patchMeetingExternal] = usePatchExternalMutation();
  if (!entry) return null;
  const cat = DIARY_CATS[entry.cat] || DIARY_CATS.meeting;
  const head = DETAIL_HEAD[entry.cat] || DETAIL_HEAD.meeting;
  const ext = (entry.external || []).map(normExt);
  const rc = rsvpSummary(entry.external);

  // "Open as recipient" → RSVP preview window; the recipient's response writes back here
  const openPreview = (idx) => {
    const invitee = normExt(entry.external[idx]);
    const subject = entry.title;
    openRsvpPreview({
      dlg,
      subject,
      dateStr: formatDateLong(parseDate(entry.date)),
      timeStr: entry.allDay ? 'All day' : (entry.startTime + (entry.endTime ? ' – ' + entry.endTime : '')),
      dur: '',
      location: entry.loc || 'TBD',
      modeStr: '',
      organizer: entry.owner,
      orgEmail: tdplEmail(entry.owner),
      invitee,
      agenda: [],
      notes: entry.notes || '',
      logoDataUrl: TDPL_LOGO_FULL,
      // The reply is written where the invitee lives: on the meeting (Meetings module) or on this
      // diary entry. Either way the API raises the notification, so the panel says it once.
      onRespond: async (resp, note) => {
        try {
          if (entry.sourceMeetingId) {
            await patchMeetingExternal({ id: entry.sourceMeetingId, index: idx, rsvp: resp, respondedNote: note || '' }).unwrap();
          } else {
            const external = (entry.external || []).map(normExt).map((x, i) => (i === idx
              ? { name: x.name, email: x.email, rsvp: resp, respondedAt: new Date().toISOString().slice(0, 16), respondedNote: note || '' }
              : { name: x.name, email: x.email, rsvp: x.rsvp, respondedAt: x.respondedAt, respondedNote: x.respondedNote }));
            await updateEntry({ id: entry.id, external }).unwrap();
          }
        } catch (err) {
          await dlg.alert(errorMessage(err));
        }
      },
    });
  };

  const headSlot = (
    <Box sx={{ p: '20px 24px', color: head.color, position: 'relative', background: head.bg }}>
      <ButtonBase onClick={onClose} sx={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</ButtonBase>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85, mb: '6px', pr: 4 }}>
        <Icon name={cat.icon} size={13} />{cat.label}{entry.createdBy === 'ea' ? ' · ADDED BY EA' : ''}{entry.sourceMeetingId ? ' · FROM MEETINGS MODULE' : ''}
      </Box>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', pr: 4 }}>{entry.title}</Box>
    </Box>
  );

  return (
    <ModalShell open onClose={onClose} width={460} head="custom" headSlot={headSlot} bodySx={{ p: '18px 24px' }}
      footer={<Box sx={{ display: 'flex', gap: 1, ml: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {entry.sourceMeetingId && <Btn variant="primary" onClick={() => { onClose(); navigate('/meetings/' + entry.sourceMeetingId); }}>Open Meeting →</Btn>}
        {canEdit && !entry.sourceMeetingId && <Btn variant="danger" onClick={() => onDelete(entry.id)}><Icon name="remove" />Delete</Btn>}
        <Btn onClick={onClose}>Close</Btn>
      </Box>}>

      <Row ico="">
        <Box>
          <strong>{formatDateLong(parseDate(entry.date))}</strong>
          {entry.endDate && entry.endDate !== entry.date ? ' → ' + formatDateLong(parseDate(entry.endDate)) : ''}
          <br />{entry.allDay ? <em>All day</em> : (entry.startTime + (entry.endTime ? ' – ' + entry.endTime : ''))}
        </Box>
      </Row>
      {entry.loc && <Row ico=""><Box>{entry.loc}</Box></Row>}
      {entry.notes && <Row ico=""><Box sx={{ whiteSpace: 'pre-wrap' }}>{entry.notes}</Box></Row>}
      {entry.attendees && entry.attendees.length > 0 && (
        <Row ico="">
          <Box>
            <Box sx={{ fontWeight: 700, mb: '4px' }}>Internal ({entry.attendees.length})</Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>{entry.attendees.map((a, i) => <Chip key={i}>{a}</Chip>)}</Box>
          </Box>
        </Row>
      )}
      {ext.length > 0 && (
        <Row ico="">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontWeight: 700, mb: '6px', color: tokens.blue, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>External Invitees · {ext.length}</span>
              <Box component="span" sx={sumSx}>
                {rc.accepted ? <Box component="span" sx={{ color: tokens.tealDark }}>✓ {rc.accepted} accepted</Box> : null}
                {rc.tentative ? <Box component="span" sx={{ color: tokens.blue }}>? {rc.tentative} tentative</Box> : null}
                {rc.declined ? <Box component="span" sx={{ color: tokens.red }}>✗ {rc.declined} declined</Box> : null}
                {rc.pending ? <Box component="span" sx={{ color: tokens.amber }}>⌛ {rc.pending} pending</Box> : null}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {ext.map((e, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '10px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', flexWrap: 'wrap' }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: tokens.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(e.name)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontSize: 12, fontWeight: 600 }}>{e.name} <RsvpPill rsvp={e.rsvp} /></Box>
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', mt: '1px' }}>
                      {e.email || <Box component="span" sx={{ color: tokens.red }}>⚠ No email</Box>}{e.respondedAt ? ' · responded ' + e.respondedAt.slice(5, 10).replace('-', '/') : ''}
                    </Box>
                    {e.respondedNote && <Box sx={{ fontSize: 11, color: tokens.slate, fontStyle: 'italic', mt: '4px', p: '4px 8px', bgcolor: tokens.cream, borderRadius: '4px' }}>"{e.respondedNote}"</Box>}
                  </Box>
                  <Box sx={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <ButtonBase onClick={() => openPreview(idx)} sx={{ fontFamily: fonts.mono, fontSize: 9, p: '4px 8px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '4px', cursor: 'pointer', color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', '&:hover': { bgcolor: tokens.tealSoft, color: tokens.tealDark, borderColor: tokens.teal } }}><Icon name="email" />Open as recipient</ButtonBase>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Row>
      )}
    </ModalShell>
  );
}
