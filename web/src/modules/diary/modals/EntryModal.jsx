import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, Btn, Field, FieldLabel, TextInput, TextArea, SelectInput, Chip, AddBtn, FootNote } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { DIARY_CATS } from '../../../data/diary';
import { EMPLOYEES } from '../../../data/employees';
import { CAT_BTN_SELECTED, toISO } from '../utils';

const sectionLabelSx = { fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.slate };
const countSx = { fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'none' };
const CAT_KEYS = ['meeting', 'focus', 'personal', 'travel', 'ooo', 'reminder'];

/** New Diary Entry modal (openEntryModal / renderEntryModal / saveEntry 10171–10360) */
export default function EntryModal({ open, onClose, owner, viewer, date, preset, onSave }) {
  const isDelegated = owner !== viewer.name;
  const [d, setD] = useState(() => ({
    cat: preset?.cat || 'meeting',
    date: preset?.date || toISO(date),
    startTime: preset?.startTime || '09:00',
    endTime: preset?.endTime || '10:00',
    allDay: false,
    title: '', loc: '', notes: '', reminder: '15 min before',
    attendees: [], external: [],
  }));
  const [intAdd, setIntAdd] = useState('');
  const [extAdd, setExtAdd] = useState('');
  const [saving, setSaving] = useState(false);   // one click, one entry: onSave is a POST
  const patch = (p) => setD(prev => ({ ...prev, ...p }));

  const addAttendee = (kind) => {
    if (kind === 'int') {
      const v = intAdd.trim();
      if (!v) return;
      patch({ attendees: [...d.attendees, v] });
      setIntAdd('');
    } else {
      const raw = extAdd.trim();
      if (!raw) return;
      const em = raw.match(/^(.*?)\s*<\s*([^@<>]+@[^@<>]+\.[a-z]{2,})\s*>?\s*$/i);
      let name = raw, email = '';
      if (em) { name = em[1].trim(); email = em[2].trim(); }
      if (!email) {
        email = (window.prompt('Email for ' + name + ' (so they get the calendar invite):') || '').trim();
        if (!email && !window.confirm('Add without email? They will not receive the invite.')) return;
      }
      patch({ external: [...d.external, { name, email }] });
      setExtAdd('');
    }
  };
  const removeAttendee = (kind, keyOrIdx) => {
    if (kind === 'int') patch({ attendees: d.attendees.filter(a => a !== keyOrIdx) });
    else patch({ external: d.external.filter((_, i) => i !== keyOrIdx) });
  };

  const save = async () => {
    if (saving) return;
    if (!d.title.trim()) { window.alert('Please enter a title.'); return; }
    setSaving(true);
    try {
      await onSave({
        owner,
        title: d.title.trim(),
        cat: d.cat,
        date: d.date,
        startTime: d.allDay ? undefined : d.startTime,
        endTime: d.allDay ? undefined : d.endTime,
        allDay: d.allDay,
        loc: d.loc.trim(),
        notes: d.notes.trim(),
        reminder: d.reminder,
        attendees: [...d.attendees],
        external: [...d.external],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} width={620} head="light" title="New Diary Entry"
      sub={<>For <Box component="strong" sx={{ color: tokens.ink }}>{owner}</Box>{isDelegated ? ' · Added by you as EA' : ''}</>}
      footer={<>
        <FootNote>🔒 Default: visible to Pallavi (EA) · {d.cat === 'personal' ? 'PERSONAL — hidden from EA by default' : 'can be made private'}</FootNote>
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Adding…' : '+ Add to Diary'}</Btn>
        </Box>
      </>}>

      <Typography sx={{ ...sectionLabelSx, mb: '8px' }}>Category</Typography>
      {/* .entry-cat-picker */}
      <Grid container spacing="6px" sx={{ mb: '14px' }}>
        {CAT_KEYS.map(k => {
          const v = DIARY_CATS[k];
          const sel = d.cat === k;
          const s = CAT_BTN_SELECTED[k];
          return (
            <Grid key={k} size={{ xs: 4, sm: 2 }}>
              <ButtonBase onClick={() => patch({ cat: k })} sx={{
                width: '100%', p: '10px 6px', border: `1.5px solid ${sel ? s.border : tokens.line}`, borderRadius: '8px', bgcolor: sel ? s.bg : tokens.card, color: sel ? s.color : tokens.slate,
                textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: fonts.mono, display: 'block', boxShadow: sel ? `0 0 0 2px ${tokens.tealSofter}` : 'none', transition: 'all 0.15s',
                '&:hover': { borderColor: sel ? s.border : tokens.teal },
              }}>
                <Box component="span" sx={{ fontSize: 20, display: 'block', mb: '4px' }}>{v.emoji}</Box>{v.label}
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>

      <Field label="Title" req sx={{ mb: '12px' }}>
        <TextInput autoFocus value={d.title} onChange={e => patch({ title: e.target.value })} placeholder="e.g. Quick sync with CFO · Flight to Delhi · Focus block" />
      </Field>

      <Grid container spacing="12px" sx={{ mb: '12px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><Field label="Date"><TextInput type="date" value={d.date} onChange={e => patch({ date: e.target.value })} /></Field></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><Field label="Start"><TextInput type="time" value={d.startTime} disabled={d.allDay} onChange={e => patch({ startTime: e.target.value })} /></Field></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><Field label="End"><TextInput type="time" value={d.endTime} disabled={d.allDay} onChange={e => patch({ endTime: e.target.value })} /></Field></Grid>
      </Grid>

      <Box sx={{ mb: '12px' }}>
        <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={d.allDay} onChange={e => patch({ allDay: e.target.checked })} /> <strong>All-day event</strong> <Box component="span" sx={{ color: tokens.slate }}>— no specific time</Box>
        </Box>
      </Box>

      <Grid container spacing="12px" sx={{ mb: '12px' }}>
        <Grid size={{ xs: 12, sm: 6 }}><Field label="Location / Venue"><TextInput value={d.loc} onChange={e => patch({ loc: e.target.value })} placeholder="e.g. CMD cabin · Taj Deccan · Virtual (Zoom)" /></Field></Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field label="Reminder">
            <SelectInput value={d.reminder} onChange={e => patch({ reminder: e.target.value })}>
              <option>None</option><option>15 min before</option><option>30 min before</option><option>1 hour before</option><option>1 day before</option>
            </SelectInput>
          </Field>
        </Grid>
      </Grid>

      <Field label="Notes" hint="context, links, PNRs, agenda points…" sx={{ mb: '12px' }}>
        <TextArea value={d.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Anything that helps when you open this later." />
      </Field>

      {/* .entry-attendee-section */}
      <Box sx={{ mt: '12px', p: '14px', bgcolor: tokens.cream, borderRadius: '6px' }}>
        <Typography sx={{ ...sectionLabelSx, mb: '10px' }}>Invite People <Box component="span" sx={{ color: tokens.slateSoft, fontWeight: 400, textTransform: 'none', letterSpacing: '0.01em' }}>· they'll receive a calendar invite</Box></Typography>
        <Grid container spacing="20px">
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldLabel right={<Box component="span" sx={countSx}>{d.attendees.length} added</Box>} sx={{ mb: '10px' }}>Internal (TrustLab)</FieldLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
              {d.attendees.map(a => <Chip key={a} onRemove={() => removeAttendee('int', a)}>{a}</Chip>)}
            </Box>
            <Box sx={{ display: 'flex', gap: '6px', mt: '8px' }}>
              <TextInput sx={{ flex: 1 }} value={intAdd} onChange={e => setIntAdd(e.target.value)} placeholder="Search employee..." inputProps={{ list: 'entry-int-datalist' }} onKeyDown={e => { if (e.key === 'Enter') { addAttendee('int'); e.preventDefault(); } }} />
              <datalist id="entry-int-datalist">
                {EMPLOYEES.flatMap(g => g.people.map(p => <option key={p.name} value={p.name}>{p.role}</option>))}
              </datalist>
              <AddBtn onClick={() => addAttendee('int')}>+ Add</AddBtn>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldLabel right={<Box component="span" sx={countSx}>{d.external.length} added</Box>} sx={{ mb: '10px' }}>External</FieldLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
              {d.external.map((e, i) => <Chip key={i} external noEmail={!e.email} email={e.email || undefined} onRemove={() => removeAttendee('ext', i)}>{e.name}</Chip>)}
            </Box>
            <Box sx={{ display: 'flex', gap: '6px', mt: '8px' }}>
              <TextInput sx={{ flex: 1 }} value={extAdd} onChange={e => setExtAdd(e.target.value)} placeholder="Name <email> or just name..." onKeyDown={e => { if (e.key === 'Enter') { addAttendee('ext'); e.preventDefault(); } }} />
              <AddBtn ext onClick={() => addAttendee('ext')}>+ Add</AddBtn>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: '14px', p: '10px 14px', bgcolor: tokens.creamWarm, borderRadius: '6px', fontSize: 11, color: tokens.slate, lineHeight: 1.5 }}>
        💡 <Box component="strong" sx={{ color: tokens.ink }}>Tip:</Box> This entry stays on your diary. Internal invitees will see it on their own diary too. External invitees receive an .ics file via email so they can add it to their calendar.
      </Box>
    </ModalShell>
  );
}
