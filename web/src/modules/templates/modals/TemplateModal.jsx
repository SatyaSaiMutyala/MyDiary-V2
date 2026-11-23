import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, Btn, Field, FieldLabel, TextInput, TextArea, SelectInput, DelBtn, AddBtn, DurationInput } from '../../../components';
import { useDialog } from '../../../components/Dialogs';
import { errorMessage } from '../../../store/api/baseApi';
import { useCreateTemplateMutation, useUpdateTemplateMutation } from '../../../store/api/templatesApi';
import { TYPES } from '../../../data/meetings';
import { tokens, fonts } from '../../../theme/tokens';

const TYPE_KEYS = ['internal', 'customer', 'supplier', 'consultants', 'board', 'other'];
const ICONS = ['📋', '📊', '🏢', '🤝', '📦', '🎓', '⚖️', '🔬', '💰', '📈', '🧪', '🩺', '🗂', '⚙️', '🎯', '📝'];
const blankItem = () => ({ text: '', time: '10m' });

/** One editable agenda row: number · text · duration · remove */
function AgendaRow({ idx, item, onChange, onDelete, autoFocus }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '6px', sm: '10px' }, p: '8px 10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radiusSm }}>
      <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: tokens.greenDeep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
        {String(idx + 1).padStart(2, '0')}
      </Box>
      <Box component="input" type="text" autoFocus={autoFocus} value={item.text} placeholder="Agenda item…"
        onChange={(e) => onChange({ ...item, text: e.target.value })}
        sx={{ flex: 1, minWidth: 0, bgcolor: 'transparent', border: 'none', fontSize: 13, outline: 'none', p: '2px 4px', borderRadius: '3px', fontFamily: 'inherit', color: tokens.ink, '&:focus': { bgcolor: '#fff', boxShadow: `0 0 0 2px ${tokens.teal}` }, '&::placeholder': { color: tokens.slateSoft } }} />
      <DurationInput size="sm" value={item.time || ''} onChange={(e) => onChange({ ...item, time: e.target.value })}
        sx={{ width: 64, flexShrink: 0 }} inputSx={{ bgcolor: tokens.cream }} />
      <DelBtn onClick={onDelete} />
    </Box>
  );
}

/**
 * Create or edit an agenda template. `template` null means "new".
 * Saving calls POST /api/templates or PATCH /api/templates/:id and shows the server's own message on refusal.
 */
export default function TemplateModal({ open, template, onClose, onSaved }) {
  const dlg = useDialog();
  const [createTemplate, { isLoading: creating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: updating }] = useUpdateTemplateMutation();
  const saving = creating || updating;
  const isEdit = Boolean(template);

  const [name, setName] = useState('');
  const [type, setType] = useState('internal');
  const [ico, setIco] = useState('📋');
  const [desc, setDesc] = useState('');
  const [agenda, setAgenda] = useState([blankItem()]);
  const [focusIdx, setFocusIdx] = useState(-1);

  // Fill the form each time it opens: the template being edited, or an empty one.
  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? '');
    setType(template?.type ?? 'internal');
    setIco(template?.ico || '📋');
    setDesc(template?.desc ?? '');
    const items = template?.agenda ?? [];
    setAgenda(items.length ? items.map((a) => ({ text: a.text, time: a.time || '10m' })) : [blankItem()]);
    setFocusIdx(-1);
  }, [open, template]);

  const setItem = (i, next) => setAgenda((a) => a.map((x, j) => (j === i ? next : x)));
  const addItem = () => { setAgenda((a) => [...a, blankItem()]); setFocusIdx(agenda.length); };
  const delItem = (i) => { setAgenda((a) => (a.length === 1 ? [blankItem()] : a.filter((_, j) => j !== i))); setFocusIdx(-1); };

  const save = async () => {
    const items = agenda.filter((a) => a.text.trim()).map((a) => ({ text: a.text.trim(), time: (a.time || '10m').trim() }));
    if (!name.trim()) { await dlg.alert('Enter a name for this template.'); return; }
    if (!items.length) { await dlg.alert('Add at least one agenda item — a template with an empty agenda saves nothing.'); return; }

    const body = { name: name.trim(), type, ico: ico || '📋', desc: desc.trim(), agenda: items };
    try {
      const saved = isEdit
        ? await updateTemplate({ id: template.id, ...body }).unwrap()
        : await createTemplate(body).unwrap();
      dlg.toast(`✓ Template "${saved?.name ?? body.name}" ${isEdit ? 'updated' : 'created'}.`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  const filled = agenda.filter((a) => a.text.trim()).length;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      width={660}
      icon={ico || '📋'}
      title={isEdit ? 'Edit template' : 'New agenda template'}
      sub={isEdit ? 'Changes apply to future meetings only' : 'Reusable agenda for a recurring meeting'}
      footer={
        <>
          <Typography sx={{ fontSize: 11.5, color: tokens.faint, fontFamily: fonts.mono }}>
            {filled} agenda item{filled === 1 ? '' : 's'}
          </Typography>
          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Btn variant="default" size="sm" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
            </Btn>
          </Box>
        </>
      }
    >
      <Grid container spacing="14px">
        <Grid size={{ xs: 12, sm: 8 }}>
          <Field>
            <FieldLabel required>Template name</FieldLabel>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Ops Review" />
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field>
            <FieldLabel required>Meeting type</FieldLabel>
            <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_KEYS.map((k) => <option key={k} value={k}>{TYPES[k].name}</option>)}
            </SelectInput>
          </Field>
        </Grid>

        <Grid size={12}>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this meeting is for, in one line." />
          </Field>
        </Grid>

        <Grid size={12}>
          <FieldLabel>Icon</FieldLabel>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '4px' }}>
            {ICONS.map((e) => (
              <Box key={e} component="button" type="button" onClick={() => setIco(e)}
                sx={{ width: 34, height: 34, fontSize: 17, lineHeight: 1, cursor: 'pointer', borderRadius: tokens.radiusSm, bgcolor: ico === e ? tokens.tealSoft : tokens.card, border: `1px solid ${ico === e ? tokens.teal : tokens.line}`, fontFamily: 'inherit', '&:hover': { borderColor: tokens.teal } }}>
                {e}
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid size={12}>
          <FieldLabel required>Agenda items</FieldLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', mt: '6px' }}>
            {agenda.map((item, i) => (
              <AgendaRow key={i} idx={i} item={item} autoFocus={i === focusIdx}
                onChange={(next) => setItem(i, next)} onDelete={() => delItem(i)} />
            ))}
          </Box>
          <Box sx={{ mt: '10px' }}><AddBtn onClick={addItem}>+ Add agenda item</AddBtn></Box>
        </Grid>
      </Grid>
    </ModalShell>
  );
}
