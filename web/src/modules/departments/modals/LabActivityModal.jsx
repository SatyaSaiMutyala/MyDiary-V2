import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, FootNote, Btn, Field, TextInput, TextArea, SelectInput, TimeInput } from '../../../components';
import { errorMessage, errorDetails } from '../../../store/api/baseApi';
import { useAddLabActivityMutation, useUpdateLabActivityMutation } from '../../../store/api/labReadinessApi';
import { tokens, fonts } from '../../../theme/tokens';
import { PosChips } from '../components/Chips';

const SCOPES = [
  { value: 'all', label: 'Every unit', hint: 'All 14 — NRL departments, regional labs and satellites' },
  { value: 'nrl', label: 'NRL only', hint: 'The NRL Hyderabad departments' },
  { value: 'field', label: 'Field labs only', hint: 'Regional labs and satellites' },
];

const NEW_SECTION = '__new__';

/**
 * Add or edit one line of the readiness round — everything about it in one form.
 *
 * The row on the page can be typed into directly, which is quick for a word or a time but hides
 * what a line actually carries. This shows all of it at once: the wording, where it sits in the
 * round, which branches it applies to, whose line it is, and whether it needs a photograph.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.dept the department, for its positions and existing section headings
 * @param {'opening' | 'closing'} props.phase which round it belongs to
 * @param {object} [props.activity] the line being edited; omitted means "add a new one"
 * @param {() => void} props.onClose
 */
export default function LabActivityModal({ open, dept, phase, activity, onClose }) {
  const [addActivity, { isLoading: adding }] = useAddLabActivityMutation();
  const [updateActivity, { isLoading: saving }] = useUpdateLabActivityMutation();
  const busy = adding || saving;
  const isEdit = Boolean(activity);

  const headings = [...new Set((dept.labReadiness?.activities ?? [])
    .filter((a) => a.phase === phase && a.section)
    .map((a) => a.section))];

  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [newSection, setNewSection] = useState('');
  const [time, setTime] = useState('');
  const [scope, setScope] = useState('all');
  const [positionIds, setPositionIds] = useState([]);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [active, setActive] = useState(true);
  const [error, setError] = useState(null);

  // Fill the form each time it opens, from the line being edited or empty for a new one.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setText(activity?.text ?? '');
    const sec = activity?.section ?? '';
    setSection(sec && !headings.includes(sec) ? NEW_SECTION : sec || headings[headings.length - 1] || NEW_SECTION);
    setNewSection(sec && !headings.includes(sec) ? sec : '');
    setTime(activity?.scheduledTime ?? '');
    setScope(activity?.scope ?? 'all');
    setPositionIds(activity?.positionIds ?? []);
    setPhotoRequired(Boolean(activity?.photoRequired));
    setActive(activity ? activity.active !== false : true);
  }, [open, activity]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const body = {
      text: text.trim(),
      section: (section === NEW_SECTION ? newSection : section).trim(),
      scheduledTime: time,
      scope,
      positionIds,
      photoRequired,
      active,
    };
    if (!body.text) { setError({ data: { error: { message: 'Enter what has to be done.' } } }); return; }
    setError(null);
    try {
      if (isEdit) await updateActivity({ id: dept.id, activityId: activity.id, ...body }).unwrap();
      else await addActivity({ id: dept.id, phase, ...body }).unwrap();
      onClose();
    } catch (err) {
      setError(err);
    }
  };

  const details = errorDetails(error);
  const round = phase === 'opening' ? 'Opening round' : 'Closing round';

  return (
    <ModalShell
      open={open}
      onClose={busy ? () => {} : onClose}
      width={660}
      icon={isEdit ? '✎' : '+'}
      title={isEdit ? `Edit ${activity.key}` : 'New activity'}
      sub={`${dept.name} · ${round}`}
      footer={<>
        <FootNote>{isEdit ? 'A line already on completed records keeps the wording it was signed with' : 'It joins today’s board as soon as it is saved'}</FootNote>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : '+ Add activity'}</Btn>
        </Box>
      </>}
    >
      {error && (
        <Box sx={{ mb: '14px', p: '10px 14px', bgcolor: tokens.badSoft, border: `1px solid ${tokens.bad}`, borderRadius: tokens.radiusSm, fontSize: 12.5, color: tokens.bad }}>
          {errorMessage(error)}
          {details.length > 0 && (
            <Box component="ul" sx={{ m: '6px 0 0', pl: '18px' }}>
              {details.map((d, i) => <li key={i}>{d.message}</li>)}
            </Box>
          )}
        </Box>
      )}

      <Field label="What has to be done" req sx={{ mb: '12px' }}>
        <TextArea minRows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus
          placeholder="e.g. Check that the standby generator has fuel"
          sx={{ '& textarea.MuiInputBase-input': { minHeight: 48 } }} />
      </Field>

      <Grid container spacing="12px" sx={{ mb: '12px' }}>
        <Grid size={{ xs: 12, sm: 7 }}>
          <Field label="Section" hint="the heading it sits under on the board">
            <SelectInput value={section} onChange={(e) => setSection(e.target.value)}>
              {headings.map((h) => <option key={h} value={h}>{h}</option>)}
              <option value={NEW_SECTION}>— a new section —</option>
            </SelectInput>
            {section === NEW_SECTION && (
              <TextInput value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="New heading" sx={{ mt: '8px' }} />
            )}
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <Field label="When in the round" hint="optional">
            <TimeInput value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </Grid>
      </Grid>

      <Field label="Which branches it applies to" sx={{ mb: '12px' }}>
        <SelectInput value={scope} onChange={(e) => setScope(e.target.value)}>
          {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.hint}</option>)}
        </SelectInput>
      </Field>

      <Field label="Whose line it is" hint="none tagged means everyone in the department" sx={{ mb: '12px' }}>
        {(dept.positions ?? []).length === 0 ? (
          <Typography sx={{ fontSize: 12, color: tokens.slate }}>This department has no positions yet, so every line belongs to everyone in it.</Typography>
        ) : (
          <PosChips
            positions={dept.positions}
            positionIds={positionIds}
            onToggle={(pid) => setPositionIds((ids) => (ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid]))}
            onClear={() => setPositionIds([])}
          />
        )}
      </Field>

      <Grid container spacing="12px">
        <Grid size={{ xs: 12, sm: 6 }}>
          <Switch
            on={photoRequired}
            onClick={() => setPhotoRequired((v) => !v)}
            label="Needs a photograph"
            desc={photoRequired ? 'The round cannot be signed off until one is filed' : 'No photograph asked for'}
            colour={tokens.amber}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Switch
            on={active}
            onClick={() => setActive((v) => !v)}
            label="On the board"
            desc={active ? 'It appears on the round' : 'Switched off — kept on past records, off today’s board'}
            colour={tokens.teal}
          />
        </Grid>
      </Grid>
    </ModalShell>
  );
}

/** A labelled on/off box, big enough to read what it does before pressing it. */
function Switch({ on, onClick, label, desc, colour }) {
  return (
    <Box
      onClick={onClick}
      role="switch"
      aria-checked={on}
      sx={{
        p: '12px 14px', borderRadius: tokens.radiusSm, cursor: 'pointer', height: '100%',
        bgcolor: on ? tokens.tealSofter : tokens.cream,
        border: `1px solid ${on ? colour : tokens.line}`,
        '&:hover': { borderColor: colour },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Box sx={{ width: 34, height: 20, borderRadius: '20px', bgcolor: on ? colour : tokens.line, position: 'relative', flexShrink: 0, transition: 'background .15s', '&::after': { content: '""', position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, bgcolor: '#fff', borderRadius: '50%', transition: 'left .15s' } }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.ink }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, mt: '6px', letterSpacing: '0.02em' }}>{desc}</Typography>
    </Box>
  );
}
