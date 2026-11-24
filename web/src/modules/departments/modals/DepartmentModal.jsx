import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, FootNote, Btn, Field, TextInput, TextArea } from '../../../components';
import { useDialog } from '../../../components/Dialogs';
import { errorMessage, errorDetails } from '../../../store/api/baseApi';
import { useCreateDepartmentMutation, useUpdateDepartmentMutation } from '../../../store/api/departmentsApi';
import { tokens, fonts } from '../../../theme/tokens';

/** A handful of sensible department icons; anything else can be typed straight into the box. */
const ICONS = ['🏢', '🔬', '🚚', '👥', '🛒', '🛡', '📦', '💻', '☎', '🏠', '⚙', '⏱', '💸', '💰', '🏛', '💼', '📒', '👑', '📊', '🧪', '🩺', '📋'];

/**
 * Add or edit a department — name, code, icon and description in one form.
 *
 * This replaces the chain of pop-up questions the prototype used ("Department name?" → "Icon?" →
 * "Description?"), which gave no way to see what you had typed, go back a step, or change a code.
 * Everything a department is made of beyond these four fields — positions, the four task lanes and
 * the review cadence — is edited in place on the department's own page.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.department] the department to edit; omitted means "create a new one"
 * @param {object} [props.template] a DEPT_TEMPLATES entry to start from (create only)
 * @param {() => void} props.onClose
 * @param {(dept: object, created: boolean) => void} [props.onSaved]
 */
export default function DepartmentModal({ open, department, template, onClose, onSaved }) {
  const dlg = useDialog();
  const [createDepartment, { isLoading: creating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updating }] = useUpdateDepartmentMutation();
  const saving = creating || updating;
  const isEdit = Boolean(department);

  const [icon, setIcon] = useState('🏢');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState(null);

  // Fill the form each time it opens: the department being edited, the chosen template, or blank.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setIcon(department?.icon || template?.emoji || '🏢');
    setName(department?.name ?? '');
    setCode(department?.code ?? '');
    setDesc(department?.description ?? (template ? template.description.split('.')[0] : ''));
  }, [open, department, template]);

  const save = async () => {
    const n = name.trim();
    if (!n) { await dlg.alert('Enter the department name.'); return; }
    setError(null);

    // The code is optional — the API gives a new department one when it is left blank.
    const body = {
      name: n,
      icon: icon.trim() || '🏢',
      description: desc.trim(),
      ...(code.trim() ? { code: code.trim() } : {}),
    };

    try {
      if (isEdit) {
        const saved = await updateDepartment({ id: department.id, ...body }).unwrap();
        dlg.toast(`✓ ${saved?.name ?? n} updated.`);
        onSaved?.(saved, false);
      } else {
        // A template also brings its positions and shift tasks; tasks point at a position by index
        // and the API resolves those once it has created the positions.
        const lane = (list) => (list || []).map((t, i) => ({
          order: i + 1,
          text: t.text,
          defaultTime: t.defaultTime || '',
          ...(t.position != null ? { positions: [t.position] } : {}),
        }));
        const preset = template?.preset;
        const saved = await createDepartment({
          ...body,
          ...(preset?.positions?.length ? { positions: preset.positions.map((p) => ({ name: p.name, description: p.description || '' })) } : {}),
          ...(preset?.openingTasks?.length ? { openingTasks: lane(preset.openingTasks) } : {}),
          ...(preset?.closingTasks?.length ? { closingTasks: lane(preset.closingTasks) } : {}),
        }).unwrap();
        dlg.toast(`✓ ${saved?.name ?? n} created.`);
        onSaved?.(saved, true);
      }
      onClose();
    } catch (err) {
      // The server's own words, shown where the person is looking rather than in a pop-up.
      setError(err);
    }
  };

  const details = errorDetails(error);

  return (
    <ModalShell
      open={open}
      onClose={saving ? () => {} : onClose}
      width={620}
      icon={isEdit ? '✎' : '🏢'}
      title={isEdit ? `Edit ${department.name}` : template ? `New department from "${template.name}"` : 'New department'}
      sub={isEdit ? department.code : 'Department Master'}
      footer={<>
        <FootNote>{isEdit ? 'Positions and shift tasks are edited on the department page' : 'Positions and tasks come next, on the department page'}</FootNote>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save changes' : '+ Create department'}</Btn>
        </Box>
      </>}
    >
      {error && (
        <Box sx={{ mb: '14px', p: '10px 14px', bgcolor: tokens.badSoft, border: `1px solid ${tokens.bad}`, borderRadius: tokens.radiusSm, fontSize: 12.5, color: tokens.bad }}>
          {errorMessage(error)}
          {details.length > 0 && (
            <Box component="ul" sx={{ m: '6px 0 0', pl: '18px' }}>
              {details.map((d) => <li key={d.field}>{d.message}</li>)}
            </Box>
          )}
        </Box>
      )}

      <Grid container spacing="12px" sx={{ mb: '12px' }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Field label="Department name" req>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clinical Laboratory" autoFocus />
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field label="Code" hint="optional">
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="TDPL-CLIN-001" />
          </Field>
        </Grid>
      </Grid>

      <Field label="Icon" hint="one emoji" sx={{ mb: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <TextInput value={icon} onChange={(e) => setIcon(e.target.value)} sx={{ width: 72 }} inputSx={{ textAlign: 'center', fontSize: 20, p: '6px 8px' }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, minWidth: 0 }}>
            {ICONS.map((ic) => (
              <Box
                key={ic}
                component="button"
                type="button"
                onClick={() => setIcon(ic)}
                sx={{
                  width: 32, height: 32, fontSize: 16, lineHeight: 1, cursor: 'pointer',
                  bgcolor: icon === ic ? tokens.tealSoft : tokens.card,
                  border: `1px solid ${icon === ic ? tokens.teal : tokens.line}`,
                  borderRadius: '6px',
                  '&:hover': { borderColor: tokens.teal },
                }}
              >
                {ic}
              </Box>
            ))}
          </Box>
        </Box>
      </Field>

      <Field label="Description" hint="what this department is responsible for">
        <TextArea minRows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Core processing units — Biochemistry, Haematology, Serology, Microbiology…" sx={{ '& textarea.MuiInputBase-input': { minHeight: 62 } }} />
      </Field>

      {!isEdit && template?.preset && (
        <Box sx={{ mt: '14px', p: '12px 14px', bgcolor: tokens.tealSofter, border: `1px solid ${tokens.teal}`, borderRadius: tokens.radiusSm }}>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.tealDark, mb: '6px' }}>
            This template also creates
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: tokens.ink }}>
            {(template.preset.positions || []).length} position{(template.preset.positions || []).length === 1 ? '' : 's'} ·{' '}
            {(template.preset.openingTasks || []).length} opening task{(template.preset.openingTasks || []).length === 1 ? '' : 's'} ·{' '}
            {(template.preset.closingTasks || []).length} closing task{(template.preset.closingTasks || []).length === 1 ? '' : 's'}
          </Typography>
        </Box>
      )}
    </ModalShell>
  );
}
