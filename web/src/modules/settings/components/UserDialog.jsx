import { useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, Field, FootNote, ModalShell, SelectInput, TextInput, TextLink, ToggleRow, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { ADMIN_ONLY_MODULES, MODULES, ROLES, ROLE_LABEL, defaultModulesFor } from '../../../data/users';
import { tdplEmail } from '../../../utils/people';
import { useCreateUserMutation, useUpdateUserMutation, useUserModulesQuery } from '../../../store/api/usersApi';
import { ApiError } from './listUi';

const EDITABLE = ['name', 'email', 'title', 'department', 'position', 'labUnit', 'role', 'status', 'modules'];

/** Add / edit a user through POST / PATCH /api/users; modules checklist from GET /api/users/modules. */
export default function UserDialog({ user, departments = [], deptRecords = [], onClose, onSaved }) {
  const { data: registry, error: registryError } = useUserModulesQuery();
  const modules = registry?.modules?.length ? registry.modules : MODULES;
  const roles = registry?.roles?.length ? registry.roles : ROLES.map(r => r.key);
  const [create, { isLoading: creating }] = useCreateUserMutation();
  const [update, { isLoading: updating }] = useUpdateUserMutation();
  const [error, setError] = useState(null);
  const [d, setD] = useState(() => user
    ? { name: user.name, email: user.email, title: user.title || '', department: user.department || '', position: user.position || '', labUnit: user.labUnit || '', role: user.role, status: user.status, modules: [...(user.modules || [])] }
    : { name: '', email: '', title: '', department: '', position: '', labUnit: '', role: 'employee', status: 'active', modules: defaultModulesFor('employee', modules), password: '' });
  // The positions of the department currently picked — the one the person holds decides which of
  // that department's shift tasks land on their My Activity.
  const dept = deptRecords.find(x => x.name === d.department);
  const positions = dept?.positions || [];
  // A department that runs a readiness board has units inside it; the one a person works in is
  // what My Activity reads to know which board is theirs. Every other department has none, so the
  // field is simply not there.
  const units = (dept?.labReadiness?.enabled ? dept.labReadiness.units : []).filter(u => u.active !== false);

  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const toggle = (k) => setD(x => ({ ...x, modules: x.modules.includes(k) ? x.modules.filter(m => m !== k) : [...x.modules, k] }));
  const setRole = (r) => setD(x => ({ ...x, role: r, modules: defaultModulesFor(r, modules) }));
  const groups = useMemo(() => [...new Set(modules.map(m => m.group))], [modules]);
  const busy = creating || updating;
  const grantable = modules.filter(m => d.role === 'admin' || !ADMIN_ONLY_MODULES.includes(m.key));
  const granted = d.role === 'admin' ? modules.length : d.modules.filter(k => grantable.some(m => m.key === k)).length;

  const save = async () => {
    setError(null);
    const email = d.email.trim() || (d.name.trim() ? tdplEmail(d.name.trim()) : '');
    try {
      if (!user) {
        const body = { name: d.name.trim(), email, role: d.role, title: d.title.trim(), department: d.department.trim(), position: d.position.trim(), labUnit: units.length ? d.labUnit : '', status: d.status };
        if (d.role !== 'admin') body.modules = d.modules;
        if (d.password) body.password = d.password;
        const u = await create(body).unwrap();
        onSaved?.(`✓ ${u.name} added. They can sign in with ${u.email}${d.password ? '.' : ' and the default password.'}`);
      } else {
        const body = {};
        EDITABLE.forEach(k => {
          const next = k === 'modules' ? d.modules : typeof d[k] === 'string' ? d[k].trim() : d[k];
          const prev = k === 'modules' ? (user.modules || []) : (user[k] ?? '');
          if (JSON.stringify(next) !== JSON.stringify(prev)) body[k] = next;
        });
        if (d.role === 'admin') delete body.modules;
        if (!Object.keys(body).length) { onClose(); return; }
        const u = await update({ id: user.id, ...body }).unwrap();
        onSaved?.(`✓ ${u.name} saved.`);
      }
      onClose();
    } catch (err) { setError(err); }
  };

  return (
    <ModalShell open onClose={onClose} width={720} icon={<Icon name="person" />} title={user ? `Edit ${user.name}` : 'Add user'} sub={user ? [user.title, user.department].filter(Boolean).join(' · ') || user.email : 'New MyDiary user'}
      footer={<><FootNote>{d.role === 'admin' ? 'Admins always have every module.' : `${granted} of ${grantable.length} modules granted`}</FootNote>
        <Box sx={{ display: 'flex', gap: 1 }}><Btn onClick={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn></Box></>}>
      <ApiError error={error} sx={{ mb: 1.5 }} />
      <Grid container spacing="12px">
        <Grid size={{ xs: 12, sm: 6 }}><Field label="Full name" req><TextInput value={d.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Anusha Singh" autoFocus={!user} /></Field></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><Field label="Email" req hint="used to sign in"><TextInput type="email" value={d.email} onChange={e => set('email', e.target.value)} placeholder={d.name ? tdplEmail(d.name) : 'name@trustlab.co.in'} /></Field></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><Field label="Title / position"><TextInput value={d.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Lab Head" /></Field></Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {/* Straight from Department Master — the department decides whose daily shift checklist this
              person gets in My Activity, so it has to be one that actually exists. */}
          <Field label="Department" hint="from Department Master">
            <SelectInput value={d.department} onChange={e => set('department', e.target.value)}>
              <option value="">— No department —</option>
              {departments.map(x => <option key={x} value={x}>{x}</option>)}
              {d.department && !departments.includes(d.department) && <option value={d.department}>{d.department} (not in Department Master)</option>}
            </SelectInput>
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field label="Position in department" hint={d.department ? 'decides which shift tasks they get' : 'pick a department first'}>
            <SelectInput value={d.position} onChange={e => set('position', e.target.value)} disabled={!d.department}>
              <option value="">{d.role === 'admin' || d.role === 'manager' ? '— All positions (sees every task) —' : '— Shared tasks only —'}</option>
              {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              {d.position && !positions.some(p => p.name === d.position) && <option value={d.position}>{d.position} (not a position here)</option>}
            </SelectInput>
          </Field>
        </Grid>
        {units.length > 0 && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label="Unit" hint="which board is theirs on My Activity">
              <SelectInput value={d.labUnit} onChange={e => set('labUnit', e.target.value)}>
                <option value="">— No unit (sees the board, no lines of their own) —</option>
                {units.map(u => <option key={u.key} value={u.key}>{u.name}</option>)}
                {d.labUnit && !units.some(u => u.key === d.labUnit) && <option value={d.labUnit}>{d.labUnit} (not a unit here)</option>}
              </SelectInput>
            </Field>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field label="Role"><SelectInput value={d.role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}</SelectInput></Field>
          <Typography sx={{ fontSize: 11.5, color: tokens.faint, mt: 0.5 }}>{ROLES.find(r => r.key === d.role)?.desc}. Changing the role resets the module grid to that role’s defaults.</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}><ToggleRow label="Active" desc={d.status === 'active' ? 'Can sign in and use granted modules' : 'Signed out everywhere · no access'} on={d.status === 'active'} onChange={v => set('status', v ? 'active' : 'inactive')} /></Grid>
        {!user && <Grid size={{ xs: 12, sm: 6 }}><Field label="Initial password" hint="blank = the default password (min 8)"><TextInput type="text" autoComplete="off" value={d.password} onChange={e => set('password', e.target.value)} placeholder="Leave blank for the default" /></Field></Grid>}
      </Grid>

      <Box sx={{ mt: 2, bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', overflow: 'hidden' }}>
        <Box sx={{ px: 1.875, py: 1, bgcolor: tokens.head, color: '#fff', borderBottom: `2px solid ${tokens.headRule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, letterSpacing: '0.02em' }}>Module permissions</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextLink sx={{ color: '#fff' }} disabled={d.role === 'admin'} onClick={() => set('modules', grantable.map(m => m.key))}>Grant all</TextLink>
            <TextLink sx={{ color: '#fff' }} disabled={d.role === 'admin'} onClick={() => set('modules', [])}>Clear</TextLink>
          </Box>
        </Box>
        <Box sx={{ p: 2 }}>
          <ApiError error={registryError} sx={{ mb: 1.5 }} />
          {groups.map(g => (
            <Box key={g} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.faint, mb: 0.5 }}>{g}</Typography>
              <Grid container>
                {modules.filter(m => m.group === g).map(m => {
                  const adminOnly = d.role !== 'admin' && ADMIN_ONLY_MODULES.includes(m.key);
                  return (
                    <Grid key={m.key} size={{ xs: 12, sm: 6, md: 4 }}>
                      <FormControlLabel sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }} title={adminOnly ? 'Admins only' : undefined}
                        control={<Checkbox size="small" checked={d.role === 'admin' || (!adminOnly && d.modules.includes(m.key))} disabled={d.role === 'admin' || adminOnly} onChange={() => toggle(m.key)} />}
                        label={adminOnly ? `${m.label} (admins only)` : m.label} />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      </Box>
    </ModalShell>
  );
}
