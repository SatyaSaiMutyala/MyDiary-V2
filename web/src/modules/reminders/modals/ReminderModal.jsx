import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { ModalShell, Btn, Field, TextInput, TextArea, ToggleRow, Chip, AddBtn } from '../../../components';
import { DateInput, TimeInput } from '../../../components/DateTimeInput';
import { tokens } from '../../../theme/tokens';
import { whenLabel, whyNotSavable } from '../utils';

/**
 * Set a reminder, or change one.
 *
 * People are typed, not picked from a list: v2 names people everywhere, and GET /api/users is
 * admin-only, so a picker would be empty for most people. "Remind me too" is on by default — the
 * commonest reminder is one you set for yourself.
 */
export default function ReminderModal({ open, draft, setDraft, me, onClose, onSave, saving }) {
  const [person, setPerson] = useState('');
  if (!open || !draft) return null;

  const d = draft;
  const upd = (patch) => setDraft({ ...d, ...patch });

  const addPerson = () => {
    const name = person.trim();
    if (!name || d.recipients.includes(name) || name === me) { setPerson(''); return; }
    upd({ recipients: [...d.recipients, name] });
    setPerson('');
  };

  const problem = whyNotSavable(d);

  return (
    <ModalShell
      open
      onClose={onClose}
      width={620}
      icon="⏰"
      title={d.id ? 'Edit reminder' : 'Set a reminder'}
      sub="It goes off at the minute you choose, for everyone you name."
      footer={
        <>
          <Box sx={{ fontSize: 12, color: tokens.slate }}>
            {d.date && d.time ? `Goes off ${whenLabel(d).toLowerCase()}` : 'Pick a date and a time'}
          </Box>
          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!!problem || saving} onClick={() => onSave(d)}>
              {saving ? 'Saving…' : d.id ? 'Save changes' : 'Set reminder'}
            </Btn>
          </Box>
        </>
      }
    >
      <Grid container spacing="12px">
        <Grid size={12}>
          <Field label="Title" req>
            <TextInput value={d.title} onChange={(e) => upd({ title: e.target.value })} placeholder="e.g. Review meeting starts" />
          </Field>
        </Grid>
        <Grid size={12}>
          <Field label="Note" hint="optional">
            <TextArea value={d.note} onChange={(e) => upd({ note: e.target.value })} placeholder="Anything worth adding" />
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field label="Date" req><DateInput value={d.date} onChange={(e) => upd({ date: e.target.value })} /></Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field label="Time" req><TimeInput value={d.time} onChange={(e) => upd({ time: e.target.value })} /></Field>
        </Grid>

        <Grid size={12}>
          <ToggleRow
            label="Remind me too"
            desc="Add yourself to the people this goes off for."
            on={d.remindMe}
            onChange={(v) => upd({ remindMe: v })}
          />
        </Grid>

        <Grid size={12}>
          <Field label="Also remind" hint="type a name and press +">
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <TextInput
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } }}
                placeholder="Their name"
                sx={{ flex: 1 }}
              />
              <AddBtn onClick={addPerson}>+ Add</AddBtn>
            </Box>
          </Field>
          {d.recipients.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
              {d.recipients.map((name) => (
                <Chip key={name} onRemove={() => upd({ recipients: d.recipients.filter((x) => x !== name) })}>
                  {name}
                </Chip>
              ))}
            </Box>
          )}
          <Box sx={{ fontSize: 11.5, color: tokens.slate, mt: '8px' }}>
            Everyone named gets a notification the moment it is set, and again when it goes off.
          </Box>
        </Grid>

        {problem && (
          <Grid size={12}>
            <Box sx={{ fontSize: 12, color: tokens.bad }}>{problem}</Box>
          </Grid>
        )}
      </Grid>
    </ModalShell>
  );
}
