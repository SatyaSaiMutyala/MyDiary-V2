import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { EMPLOYEES } from '../../../data/employees';
import { TODAY } from '../../../utils/dates';
import { useDialog } from '../../../components/Dialogs';
import { DateInput } from '../../../components/DateTimeInput';

const labelSx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };
const ctrlSx = { width: '100%', mt: '6px', p: '10px 12px', border: `1px solid ${tokens.line}`, borderRadius: '6px', fontFamily: 'inherit', fontSize: 13, bgcolor: '#fff', color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: `0 0 0 3px ${tokens.tealSoft}` } };

/** openStandaloneTask / submitStandaloneTask — "⚡ New Ad-hoc Task" composer */
export default function StandaloneTaskModal({ open, onClose, onSubmit }) {
  const dlg = useDialog();
  const today = new Date(TODAY).toISOString().slice(0, 10);
  const in7 = new Date(TODAY.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState(in7);
  const [priority, setPriority] = useState('medium');
  const people = EMPLOYEES.flatMap(g => (g.people || g.members || []).map(m => ({ ...m, group: g.group })));

  const submit = async () => {
    const d = desc.trim();
    if (!d) { await dlg.alert('Task description is required.'); return; }
    if (!owner) { await dlg.alert('Please select who to allocate this task to.'); return; }
    if (!deadline) { await dlg.alert('Please set a deadline.'); return; }
    onSubmit({ desc: d, owner, deadline, priority });
  };

  return (
    <ModalShell open={open} onClose={onClose} width={640} head="gradient" icon="⚡" title="New Ad-hoc Task" sub="Allocate a task to anyone — no meeting or visit required"
      bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>↻ Task lands in <strong>owner's To-Do inbox</strong> immediately</Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>Create & Notify</Btn>
        </Box>
      </>}>
      <Box sx={{ mb: '14px' }}>
        <Box component="label" sx={labelSx}>Task Description ✱</Box>
        <Box component="textarea" autoFocus rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What needs to be done?" sx={{ ...ctrlSx, resize: 'vertical' }} />
      </Box>
      <Grid container spacing={1.5} sx={{ mb: '14px' }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box component="label" sx={labelSx}>Allocate To ✱</Box>
          <Box component="select" value={owner} onChange={e => setOwner(e.target.value)} sx={ctrlSx}>
            <option value="">-- Choose employee --</option>
            {people.map(m => <option key={m.name} value={m.name}>{m.name} — {m.role}</option>)}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box component="label" sx={labelSx}>Deadline ✱</Box>
          <DateInput value={deadline} min={today} onChange={e => setDeadline(e.target.value)} sx={ctrlSx} />
        </Grid>
      </Grid>
      <Box>
        <Box component="label" sx={labelSx}>Priority</Box>
        <Box component="select" value={priority} onChange={e => setPriority(e.target.value)} sx={ctrlSx}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </Box>
      </Box>
    </ModalShell>
  );
}
