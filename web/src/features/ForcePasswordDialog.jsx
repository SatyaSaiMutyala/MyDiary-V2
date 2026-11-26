import { useCallback, useEffect, useState } from 'react';
import { Box, Modal } from '@mui/material';
import { useDispatch } from 'react-redux';
import { tokens, fonts } from '../theme/tokens';
import { Btn, Icon } from '../components';
import { useAuth } from '../auth/AuthContext';
import { authApi, useChangePasswordMutation } from '../store/api/authApi';

const MIN_LENGTH = 8;

const labelSx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };
const inputSx = {
  width: '100%', mt: '6px', height: 42, p: '0 12px', border: `1px solid ${tokens.line}`, borderRadius: '6px',
  fontFamily: 'inherit', fontSize: 14, bgcolor: tokens.cream, color: tokens.ink, boxSizing: 'border-box',
  '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: tokens.card, boxShadow: `0 0 0 3px ${tokens.tealSoft}` },
};

/**
 * The password a person must set before they can use anything.
 *
 * It is raised by `mustChangePassword` on their own record, which the server turns on whenever
 * somebody else chose their password — an account just created, or a password an admin reset. At
 * that moment two people know it, and only one of them should.
 *
 * There is deliberately no way past it: no close button, no click-outside, no Escape, and the app
 * behind it is not interactive. The only exit is setting a password, or signing out.
 *
 * The same flag drives the phone, so changing it in either place clears both. A person who changes
 * it on their phone while this is open gets through here as soon as the window is looked at again —
 * that is what the focus listener is for, rather than making them reload.
 */
export default function ForcePasswordDialog() {
  const { user, updateUser, logout } = useAuth();
  const dispatch = useDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState('');

  const open = Boolean(user?.mustChangePassword);

  /** Has it already been dealt with somewhere else? */
  const recheck = useCallback(async () => {
    const r = await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
    if (r.data && !r.data.mustChangePassword) updateUser(r.data);
  }, [dispatch, updateUser]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('focus', recheck);
    return () => window.removeEventListener('focus', recheck);
  }, [open, recheck]);

  if (!open) return null;

  const submit = async () => {
    if (next.length < MIN_LENGTH) { setProblem(`Password must be at least ${MIN_LENGTH} characters.`); return; }
    if (next !== again) { setProblem('The two passwords do not match.'); return; }
    setProblem('');
    try {
      await changePassword({ next }).unwrap();
      // Straight into the session, so the app behind unlocks without a reload.
      updateUser({ ...user, mustChangePassword: false });
    } catch (err) {
      setProblem(err?.data?.error?.message || err?.message || 'That did not work. Try again.');
    }
  };

  return (
    // No onClose: Escape and a click outside do nothing, which is the point.
    <Modal open disableEscapeKeyDown sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(16,21,28,.75)', backdropFilter: 'blur(5px)' } } }}>
      <Box sx={{ bgcolor: tokens.card, borderRadius: '14px', boxShadow: '0 24px 60px rgba(16,21,28,.45)', width: 460, maxWidth: '100%', outline: 'none', overflow: 'hidden' }}>
        <Box sx={{ p: '18px 22px', background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="key" size={20} />
          </Box>
          <Box>
            <Box component="h2" sx={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, m: 0 }}>Set your password</Box>
            <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: '3px', letterSpacing: '0.04em' }}>{user?.name}</Box>
          </Box>
        </Box>

        <Box sx={{ p: '20px 22px' }}>
          <Box sx={{ fontSize: 13, color: tokens.ink, lineHeight: 1.55, mb: '16px' }}>
            Your password was set by somebody else, so two people know it. Choose your own to carry on — you cannot use MyDiary until you do.
          </Box>

          <Box sx={{ mb: '14px' }}>
            <Box component="label" sx={labelSx}>New password</Box>
            <Box component="input" type="password" autoFocus autoComplete="new-password" value={next}
              onChange={(e) => { setNext(e.target.value); if (problem) setProblem(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={`At least ${MIN_LENGTH} characters`} sx={inputSx} />
          </Box>
          <Box>
            <Box component="label" sx={labelSx}>New password again</Box>
            <Box component="input" type="password" autoComplete="new-password" value={again}
              onChange={(e) => { setAgain(e.target.value); if (problem) setProblem(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Type it once more" sx={inputSx} />
          </Box>

          {problem && (
            <Box sx={{ mt: '14px', p: '10px 14px', bgcolor: '#FEE2E2', border: `1px solid ${tokens.red}`, color: '#991B1B', borderRadius: '8px', fontSize: 12, fontWeight: 600 }}>{problem}</Box>
          )}
        </Box>

        <Box sx={{ p: '14px 22px', borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {/* The one way out that is not choosing a password — so nobody is trapped on a shared screen. */}
          <Box component="button" type="button" onClick={logout}
            sx={{ background: 'none', border: 'none', p: 0, cursor: 'pointer', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: tokens.slate, '&:hover': { color: tokens.ink } }}>
            Sign out instead
          </Box>
          <Btn variant="primary" onClick={submit} disabled={isLoading}>{isLoading ? 'Saving…' : 'Set password'}</Btn>
        </Box>
      </Box>
    </Modal>
  );
}
