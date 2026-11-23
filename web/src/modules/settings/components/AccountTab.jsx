import { useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { Avatar, Btn, Card, Field, ModalShell, Pill, TextInput } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { useViewerUser } from '../../../auth/useViewerUser';
import { tokens, fonts } from '../../../theme/tokens';
import { MODULES, ROLE_LABEL, viewerRole } from '../../../data/users';
import { useChangePasswordMutation, useUpdateMeMutation } from '../../../store/api/authApi';
import { ApiError, useToast } from './listUi';

/** Change password: POST /api/auth/change-password { current, next }; server errors shown inline. */
function ChangePasswordDialog({ onClose, onDone }) {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [again, setAgain] = useState('');
  const [error, setError] = useState(null); const [localError, setLocalError] = useState('');
  const submit = async (e) => {
    e?.preventDefault();
    setError(null); setLocalError('');
    if (next !== again) { setLocalError('The new passwords do not match.'); return; }
    try { await changePassword({ current, next }).unwrap(); onDone('✓ Password changed.'); onClose(); } catch (err) { setError(err); }
  };
  return (
    <ModalShell open onClose={onClose} width={460} icon="🔑" title="Change password" sub="Your account"
      footer={<><span /><Box sx={{ display: 'flex', gap: 1 }}><Btn onClick={onClose} disabled={isLoading}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={isLoading || !current || !next || !again}>{isLoading ? 'Saving…' : 'Change password'}</Btn></Box></>}>
      <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 1.5 }}>
        <ApiError error={error} />
        {localError ? <Alert severity="error" sx={{ borderRadius: '6px', fontSize: 13 }}>{localError}</Alert> : null}
        <Field label="Current password" req><TextInput type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus /></Field>
        <Field label="New password" req hint="at least 8 characters"><TextInput type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} /></Field>
        <Field label="Repeat new password" req><TextInput type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} /></Field>
        <button type="submit" hidden />
      </Box>
    </ModalShell>
  );
}

/** Edit name / title: PATCH /api/auth/me. */
function EditProfileDialog({ user, onClose, onDone }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name); const [title, setTitle] = useState(user.title || '');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e?.preventDefault(); setError(null);
    const body = {}; if (name.trim() !== user.name) body.name = name.trim(); if (title.trim() !== (user.title || '')) body.title = title.trim();
    if (!Object.keys(body).length) { onClose(); return; }
    try { const u = await updateMe(body).unwrap(); updateUser(u); onDone('✓ Profile saved.'); onClose(); } catch (err) { setError(err); }
  };
  return (
    <ModalShell open onClose={onClose} width={460} icon="✎" title="Edit profile" sub={user.email}
      footer={<><span /><Box sx={{ display: 'flex', gap: 1 }}><Btn onClick={onClose} disabled={isLoading}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={isLoading || !name.trim()}>{isLoading ? 'Saving…' : '💾 Save'}</Btn></Box></>}>
      <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 1.5 }}>
        <ApiError error={error} />
        <Field label="Full name" req><TextInput value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
        <Field label="Title / position"><TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lab Head" /></Field>
        <Typography sx={{ fontSize: 12, color: tokens.faint }}>Email, department, role and module access are changed by an admin in Users & Permissions.</Typography>
        <button type="submit" hidden />
      </Box>
    </ModalShell>
  );
}

function Row({ k, v }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: `1px solid ${tokens.lineSoft}`, fontSize: 13 }}>
      <Typography sx={{ color: tokens.muted, fontSize: 13 }}>{k}</Typography><Typography sx={{ fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{v}</Typography>
    </Box>
  );
}

/** My account: the signed-in person from the API (profile, role, module access, password), sign out. */
export default function AccountTab() {
  const { logout } = useAuth();
  const { me, isSelf, viewer } = useViewerUser();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [dialog, setDialog] = useState(null); // 'password' | 'profile' | null
  const mods = me ? (me.role === 'admin' ? MODULES : MODULES.filter(m => (me.modules || []).includes(m.key))) : MODULES;
  const signOut = async () => { await logout(); navigate('/login'); };
  return (
    <Grid container spacing="14px">
      <Grid size={{ xs: 12, lg: 5 }}>
        <Card title="Profile" right={isSelf ? <Pill bg="rgba(255,255,255,.18)" color="#fff">Signed in</Pill> : <Pill bg={tokens.gold} color={tokens.ink}>View as · demo</Pill>} sx={{ height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar name={me?.name || viewer.name} size={56} sx={{ boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${tokens.gold}` }} />
            <Box><Typography sx={{ fontSize: 17, fontWeight: 700 }}>{me?.name || viewer.name}</Typography><Typography sx={{ fontSize: 12.5, color: tokens.faint }}>{me ? viewerRole(me) : viewer.role}</Typography></Box>
          </Box>
          <Row k="Email" v={me?.email || '—'} />
          <Row k="Department" v={me?.department || '—'} />
          <Row k="Title" v={me?.title || '—'} />
          <Row k="Role" v={ROLE_LABEL[me?.role] || me?.role || '—'} />
          <Row k="Status" v={me?.status === 'inactive' ? 'Inactive' : 'Active'} />
          {isSelf && me?.createdAt ? <Row k="Account since" v={new Date(me.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} /> : null}
          {!isSelf && <Typography sx={{ fontSize: 12, color: tokens.warn, mt: 1.5 }}>You are viewing as {viewer.name}. Profile and password changes apply only to your own signed-in account — switch back to yourself in the top bar.</Typography>}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {isSelf && <Btn onClick={() => setDialog('profile')}>✎ Edit profile</Btn>}
            {isSelf && <Btn onClick={() => setDialog('password')}>🔑 Change password</Btn>}
            <Btn variant="danger" onClick={signOut}>Sign out</Btn>
          </Box>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Card title="Your module access" right={<Pill bg="rgba(255,255,255,.18)" color="#fff">{mods.length} / {MODULES.length}</Pill>} sx={{ height: '100%' }}>
          <Grid container spacing="8px">
            {MODULES.map(m => { const on = mods.includes(m); return (
              <Grid key={m.key} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '8px 10px', border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: on ? tokens.card : tokens.sunk, opacity: on ? 1 : 0.6 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: on ? tokens.ok : tokens.faint }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{m.label}</Typography>
                  <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, color: tokens.faint, textTransform: 'uppercase' }}>{m.group}</Typography>
                </Box>
              </Grid>
            ); })}
          </Grid>
          <Typography sx={{ fontSize: 12, color: tokens.faint, mt: 1.5 }}>Ask an admin to change your access in Settings → Users & Permissions.</Typography>
        </Card>
      </Grid>
      {dialog === 'password' && <ChangePasswordDialog onClose={() => setDialog(null)} onDone={show} />}
      {dialog === 'profile' && me && <EditProfileDialog user={me} onClose={() => setDialog(null)} onDone={show} />}
      {toast}
    </Grid>
  );
}
