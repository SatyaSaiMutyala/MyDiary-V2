import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { Btn, ModalShell, FootNote, TextInput, TextArea, SelectInput } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { useAppStore } from '../../../store/AppStore';
import { errorMessage } from '../../../store/api/baseApi';
import { useCreateRequestMutation } from '../../../store/api/meetingRequestsApi';
import { EMPLOYEES } from '../../../data/employees';
import { addDaysISO } from '../../../utils/dates';
import { useDialog } from '../../../components/Dialogs';
import { DateInput, TimeInput } from '../../../components/DateTimeInput';

const lbl = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };
const inputSx = { fontSize: 13, bgcolor: '#fff' };
const smallInputSx = { ...inputSx, p: '8px 10px' };

/** openRequestModal() / checkCMDRouting() / submitMeetingRequest() — "Request a Meeting" dialog */
export default function RequestMeetingModal({ open, onClose }) {
  const dlg = useDialog();
  const { state } = useAppStore();
  const { user } = useAuth();
  const [createRequest, { isLoading: sending }] = useCreateRequestMutation();
  const me = user?.name || state.viewer.name;
  const others = EMPLOYEES.flatMap(g => (g.people || []).map(p => p.name)).filter(n => n !== me);

  const [to, setTo] = useState('');
  const [date, setDate] = useState(addDaysISO(2));
  const [time, setTime] = useState('10:00');
  const [dur, setDur] = useState('30');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const toRef = useRef(null);

  // Reset the form each time the dialog opens (the prototype rebuilt the markup every open)
  useEffect(() => {
    if (!open) return;
    setTo(''); setDate(addDaysISO(2)); setTime('10:00'); setDur('30'); setTopic(''); setNotes('');
    const t = setTimeout(() => toRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // CMD routing: anyone else requesting CMD routes through EA
  const routesViaEA = to === 'Venkata Cherukuri' && me !== 'Pallavi Elisetti' && me !== 'Venkata Cherukuri';

  const submit = async () => {
    const tp = topic.trim();
    const nt = notes.trim();
    if (!to) return await dlg.alert('Please pick who you want to meet.');
    if (!date || !time) return await dlg.alert('Please set a date and time.');
    if (!tp) return await dlg.alert('Please add a topic.');

    try {
      // The server applies the CMD → EA routing rule and writes the recipient's notification.
      const req = await createRequest({ to, proposedDate: date, proposedTime: time, durationMin: +dur, topic: tp, notes: nt }).unwrap();
      const recipient = req.routedTo || req.to;
      onClose();
      setTimeout(() => dlg.alert('📨 Request sent to ' + recipient + (req.routedTo ? ' (EA — coordinating on behalf of ' + req.onBehalfOf + ')' : '') + '. They\'ll see it in their Requests tab.'), 100);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} width={580} head="gradient" icon="📨" title="Request a Meeting" sub={`From ${me} · peer-to-peer internal request`}
      bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}
      footer={<>
        <FootNote>↻ The recipient gets a notification and can Accept or Decline</FootNote>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={sending}>{sending ? 'Sending…' : '📨 Send Request'}</Btn>
        </Box>
      </>}>
      <Box sx={{ mb: '14px' }}>
        <Typography component="label" sx={lbl}>Request Meeting With ✱</Typography>
        <SelectInput ref={toRef} value={to} onChange={e => setTo(e.target.value)} sx={{ mt: '6px', fontSize: 13, bgcolor: '#fff' }}>
          <option value="">-- Choose a TDPL colleague --</option>
          {others.map(n => <option key={n} value={n}>{n}</option>)}
        </SelectInput>
        {routesViaEA && (
          <Typography sx={{ mt: '8px', fontSize: 11, color: tokens.amber, fontFamily: fonts.mono, letterSpacing: '0.04em', fontWeight: 700 }}>
            🔀 Routed through EA — your request will go to <strong>Pallavi Elisetti (EA)</strong> who coordinates the CMD's calendar.
          </Typography>
        )}
      </Box>
      <Grid container spacing={1.5} sx={{ mb: '14px' }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography component="label" sx={lbl}>Proposed Date ✱</Typography>
          <DateInput value={date} onChange={e => setDate(e.target.value)} sx={{ mt: '6px' }} inputSx={smallInputSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography component="label" sx={lbl}>Proposed Time ✱</Typography>
          <TimeInput value={time} onChange={e => setTime(e.target.value)} sx={{ mt: '6px' }} inputSx={smallInputSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography component="label" sx={lbl}>Duration</Typography>
          <SelectInput value={dur} onChange={e => setDur(e.target.value)} sx={{ mt: '6px', fontSize: 13, bgcolor: '#fff', p: '8px 32px 8px 10px' }}>
            <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option>
            <option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option>
          </SelectInput>
        </Grid>
      </Grid>
      <Box sx={{ mb: '14px' }}>
        <Typography component="label" sx={lbl}>Topic ✱</Typography>
        <TextInput value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quick review — Q3 numbers" sx={{ mt: '6px' }} inputSx={inputSx} />
      </Box>
      <Box>
        <Typography component="label" sx={lbl}>Context / Notes</Typography>
        <TextArea minRows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why this meeting? Any context they should have beforehand?" sx={{ mt: '6px', '& .MuiInputBase-inputMultiline': { fontSize: 13, bgcolor: '#fff' } }} />
      </Box>
    </ModalShell>
  );
}
