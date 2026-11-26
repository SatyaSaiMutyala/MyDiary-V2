import { useState } from 'react';
import { Box, ButtonBase, InputBase } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { CHANNELS } from '../../../data/logs';
import { ModalShell, FootNote, Btn, TextLink, AddBtn, Chip, FieldLabel, Field, TextInput, TextArea, Icon } from '../../../components';
import { useListUsersQuery } from '../../../store/api/usersApi';
import { EMPLOYEE_OPTIONS } from '../utils';
import { useDialog } from '../../../components/Dialogs';
import { DateInput, DurationInput, TimeInput } from '../../../components/DateTimeInput';

const DATALIST_ID = 'log-int-datalist';
const fuInputSx = { p: '6px 8px', border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: '#fff', fontSize: 11, fontFamily: 'inherit', height: 'auto', boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal } };

/** .followup-row — text | owner (140px) | date (135px) | × */
function FollowUpRow({ fu, onChange, onRemove }) {
  return (
    <Grid container spacing={1} sx={{ alignItems: 'center', p: '8px 10px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '6px', mb: '6px' }}>
      <Grid size={{ xs: 12, md: 'grow' }}>
        <InputBase value={fu.text || ''} placeholder="Follow-up action" onChange={e => onChange('text', e.target.value)} sx={{ width: '100%', '& .MuiInputBase-input': fuInputSx }} />
      </Grid>
      <Grid size={{ xs: 6, md: 'auto' }}>
        <InputBase value={fu.owner || ''} placeholder="Owner" inputProps={{ list: DATALIST_ID }} onChange={e => onChange('owner', e.target.value)} sx={{ width: { xs: '100%', md: 140 }, '& .MuiInputBase-input': fuInputSx }} />
      </Grid>
      <Grid size={{ xs: 5, md: 'auto' }}>
        <DateInput value={fu.deadline || ''} onChange={e => onChange('deadline', e.target.value)} sx={{ width: { xs: '100%', md: 135 } }} inputSx={fuInputSx} />
      </Grid>
      <Grid size={{ xs: 1, md: 'auto' }}>
        <Box component="button" type="button" onClick={onRemove} sx={{ p: '4px 8px', bgcolor: 'transparent', border: '1px solid transparent', borderRadius: '4px', color: tokens.slateSoft, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', '&:hover': { color: tokens.red, borderColor: tokens.red, bgcolor: tokens.redSoft } }}>×</Box>
      </Grid>
    </Grid>
  );
}

/**
 * New / Edit Discussion Log modal (renderLogModal). `draft` lives in the page; `setDraft` replaces it.
 * onSave(draft) performs validation alerts + store write in the page.
 */
export default function LogModal({ open, draft, setDraft, viewer, onClose, onSave }) {
  const dlg = useDialog();
  const [intAdd, setIntAdd] = useState('');
  // The internal datalist is the real roster: GET /api/users (admin-only, so everyone else gets the
  // bundled roster instead — the names are the same people).
  const { data: userPage } = useListUsersQuery({ limit: 200, fields: 'name,title', sort: 'name' }, { skip: !open });
  const people = userPage?.items?.length ? userPage.items.map(u => ({ name: u.name, role: u.title || '' })) : EMPLOYEE_OPTIONS;
  if (!draft) return null;
  const d = draft;
  const upd = fn => setDraft(prev => { const c = JSON.parse(JSON.stringify(prev)); fn(c); return c; });

  const addLogPerson = async (kind) => {
    if (kind === 'int') {
      const v = intAdd.trim();
      if (!v) return;
      upd(c => c.with.push({ name: v, type: 'internal' }));
      setIntAdd('');
    } else {
      const name = (await dlg.prompt('External person name (e.g. "Priya Menon (Adani HR)"):') || '').trim();
      if (!name) return;
      const email = await dlg.prompt('Email (optional):');
      if (email === null) return;   // Cancel abandons adding the person, rather than adding them blank.
      upd(c => c.with.push({ name, type: 'external', email: email.trim() }));
    }
  };

  const footer = (
    <>
      <FootNote><Icon name="save" />Auto-saved privately · only {viewer} can see this log</FootNote>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSave(d)}><Icon name="save" />Save Log</Btn>
      </Box>
    </>
  );

  return (
    <ModalShell open={open} onClose={onClose} width={640} head="light" title="New Discussion Log" sub={`Private to you · ${viewer}`} footer={footer}>
      <Box sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.slate, mb: 1 }}>Channel · How did you speak?</Box>
      <Grid container spacing="5px" columns={{ xs: 4, sm: 7 }} sx={{ mb: '14px' }}>
        {Object.entries(CHANNELS).map(([k, v]) => {
          const sel = d.channel === k;
          return (
            <Grid key={k} size={1}>
              <ButtonBase onClick={() => upd(c => { c.channel = k; })} sx={{ width: '100%', p: '10px 4px', border: `1.5px solid ${sel ? tokens.teal : tokens.line}`, borderRadius: '7px', bgcolor: sel ? tokens.tealSoft : tokens.card, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: sel ? tokens.tealDark : tokens.slate, fontFamily: fonts.mono, display: 'block', '&:hover': { borderColor: tokens.teal } }}>
                <Box component="span" sx={{ display: 'block', mb: '3px' }}><Icon name={v.icon} size={18} /></Box>{v.label}
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mb: '14px' }}>
        <FieldLabel req>Who did you speak with?</FieldLabel>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '6px', mb: 1, minHeight: 28 }}>
          {d.with.map((p, i) => (
            <Chip key={i} external={p.type === 'external'} onRemove={() => upd(c => c.with.splice(i, 1))}>
              {p.name}{p.email && <Box component="span" sx={{ fontSize: 10, opacity: 0.8 }}>{p.email}</Box>}
            </Chip>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextInput value={intAdd} onChange={e => setIntAdd(e.target.value)} placeholder="Internal: search TDPL employee..." inputProps={{ list: DATALIST_ID }} onKeyDown={e => { if (e.key === 'Enter') { addLogPerson('int'); e.preventDefault(); } }} sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }} />
          <datalist id={DATALIST_ID}>{people.map(p => <option key={p.name} value={p.name}>{p.role}</option>)}</datalist>
          <AddBtn onClick={() => addLogPerson('int')}>+ Internal</AddBtn>
          <AddBtn ext onClick={() => addLogPerson('ext')}>+ External</AddBtn>
        </Box>
      </Box>

      <Grid container spacing="12px" sx={{ mb: '12px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><Field label="Date"><DateInput value={d.date} onChange={e => upd(c => { c.date = e.target.value; })} /></Field></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><Field label="Time"><TimeInput value={d.time} onChange={e => upd(c => { c.time = e.target.value; })} /></Field></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><Field label="Duration" hint="optional"><DurationInput format="words" value={d.duration} onChange={e => upd(c => { c.duration = e.target.value; })} placeholder="How long?" /></Field></Grid>
      </Grid>

      <Field label="Topic — a quick title" req sx={{ mb: '12px' }}>
        <TextInput value={d.topic} onChange={e => upd(c => { c.topic = e.target.value; })} placeholder="e.g. Fernandez contract follow-up · CME date confirmed · Quick check-in" />
      </Field>
      <Field label="What was discussed?" req sx={{ mb: '12px' }}>
        <TextArea minRows={5} value={d.summary} onChange={e => upd(c => { c.summary = e.target.value; })} placeholder="Capture it in your own words — bullet points, half-sentences, whatever helps you remember later." sx={{ '& textarea.MuiInputBase-input': { minHeight: 120 } }} />
      </Field>
      <Field label="Decisions / Outcomes" hint="optional" sx={{ mb: '12px' }}>
        <TextArea minRows={2} value={d.decisions} onChange={e => upd(c => { c.decisions = e.target.value; })} placeholder="What was agreed? What was concluded?" sx={{ '& textarea.MuiInputBase-input': { minHeight: 60 } }} />
      </Field>
      <Field label="Tags" hint="comma-separated · for easy search" sx={{ mb: '12px' }}>
        <TextInput defaultValue={(d.tags || []).join(', ')} onChange={e => upd(c => { c.tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean); })} placeholder="e.g. sales, adani, urgent" />
      </Field>

      <Box sx={{ mt: '14px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.slate }}>Follow-ups <Box component="span" sx={{ color: tokens.slateSoft, fontWeight: 400, textTransform: 'none', letterSpacing: '0.01em' }}>· things to do from this discussion</Box></Box>
          <TextLink onClick={() => upd(c => c.followUps.push({ id: 'fu' + Date.now() + c.followUps.length, text: '', owner: '', deadline: '', done: false }))}>+ Add Follow-up</TextLink>
        </Box>
        {d.followUps.map((fu, i) => (
          <FollowUpRow key={fu.id || i} fu={fu} onChange={(k, v) => upd(c => { c.followUps[i][k] = v; })} onRemove={() => upd(c => c.followUps.splice(i, 1))} />
        ))}
      </Box>
    </ModalShell>
  );
}
