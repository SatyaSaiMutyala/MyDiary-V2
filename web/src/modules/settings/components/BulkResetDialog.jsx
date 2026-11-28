import { useMemo, useState } from 'react';
import { Box, Checkbox } from '@mui/material';
import { useDispatch } from 'react-redux';
import { ModalShell, Btn, Avatar, Icon, SearchBox } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useBulkResetPasswordsMutation } from '../../../store/api/usersApi';
import { authApi } from '../../../store/api/authApi';
import { useAuth } from '../../../auth/AuthContext';

const MIN_LENGTH = 8;

const labelSx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };

/**
 * One password onto many accounts at once.
 *
 * Everybody starts ticked except the two groups where a silent reset would be a mistake: the admin
 * running it, who would lock themselves behind the gate mid-job, and anyone already inactive, who
 * has no use for a password. Both can still be ticked on purpose.
 *
 * Every account reset here is put behind "set your password", because a password handed to a room
 * of people is a way in rather than a secret. That is the point of the screen, so it says so.
 */
export default function BulkResetDialog({ open, onClose, users, total, me, onDone }) {
  const [bulkReset, { isLoading }] = useBulkResetPasswordsMutation();
  const dispatch = useDispatch();
  const { updateUser } = useAuth();
  const [password, setPassword] = useState('');
  const [q, setQ] = useState('');
  const [problem, setProblem] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Ticked by default: active colleagues who are not the person doing this.
  const [picked, setPicked] = useState(() => new Set(
    (users ?? []).filter(u => u.status === 'active' && u.id !== me).map(u => u.id),
  ));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users ?? [];
    return (users ?? []).filter(u => `${u.name} ${u.email} ${u.department ?? ''} ${u.title ?? ''}`.toLowerCase().includes(t));
  }, [users, q]);

  /**
   * Changing who is in the list takes the confirm step back a step. The warning names a number of
   * people, and a warning that was read for five people must not be the button that resets fifty.
   */
  const repick = (fn) => { setPicked(fn); setConfirming(false); if (problem) setProblem(''); };
  const toggle = (id) => repick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allShownPicked = shown.length > 0 && shown.every(u => picked.has(u.id));
  const toggleShown = () => repick((s) => {
    const n = new Set(s);
    if (allShownPicked) shown.forEach(u => n.delete(u.id));
    else shown.forEach(u => n.add(u.id));
    return n;
  });

  const count = picked.size;
  const includesMe = (users ?? []).some(u => picked.has(u.id) && u.id === me);

  const run = async () => {
    if (password.length < MIN_LENGTH) { setProblem(`Password must be at least ${MIN_LENGTH} characters.`); setConfirming(false); return; }
    if (!count) { setProblem('Pick at least one person.'); setConfirming(false); return; }
    setProblem('');
    try {
      const r = await bulkReset({ userIds: [...picked], password }).unwrap();
      /**
       * An admin who put themselves in the list has just been put behind the gate as well, and the
       * gate reads the cached copy of their own record. Re-read it so the popup comes up now rather
       * than the next time this window happens to regain focus.
       */
      if (includesMe) {
        const me2 = await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
        if (me2.data) updateUser(me2.data);
      }
      onDone(r);
      onClose();
    } catch (err) {
      setProblem(err?.data?.error?.message || 'That did not work. Try again.');
      setConfirming(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} width={720} icon={<Icon name="key" size={20} />}
      title="Reset many passwords"
      sub={`${count} of ${(users ?? []).length} selected`}
      bodySx={{ p: 0 }}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
          Each one must set their own before using MyDiary
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          {confirming
            ? <Btn variant="danger" onClick={run} disabled={isLoading}>{isLoading ? 'Resetting…' : `Yes — reset ${count}`}</Btn>
            : <Btn variant="primary" onClick={() => { if (!count) { setProblem('Pick at least one person.'); return; } if (password.length < MIN_LENGTH) { setProblem(`Password must be at least ${MIN_LENGTH} characters.`); return; } setProblem(''); setConfirming(true); }}>
                Reset {count} password{count === 1 ? '' : 's'}
              </Btn>}
        </Box>
      </>}>

      <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${tokens.line}` }}>
        <Box component="label" sx={labelSx}>The password they all get</Box>
        <Box component="input" type="text" autoFocus autoComplete="off" value={password}
          onChange={(e) => { setPassword(e.target.value); if (problem) setProblem(''); setConfirming(false); }}
          placeholder={`At least ${MIN_LENGTH} characters`}
          sx={{ width: '100%', mt: '6px', height: 42, p: '0 12px', border: `1px solid ${tokens.line}`, borderRadius: '6px', fontFamily: fonts.mono, fontSize: 14, bgcolor: tokens.cream, color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: tokens.card } }} />
        {/* Shown as text on purpose: it has to be read out or written down to be handed over, and
            hiding it behind dots only makes that harder to get right. */}
        <Box sx={{ fontSize: 11.5, color: tokens.slate, mt: '8px', lineHeight: 1.5 }}>
          Everybody ticked below gets this password and is then made to replace it the next time they
          open MyDiary, on the phone or here. Nobody keeps it.
        </Box>
      </Box>

      <Box sx={{ p: '12px 20px', borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}><SearchBox value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" /></Box>
        <Btn size="sm" onClick={toggleShown}>{allShownPicked ? 'Untick these' : 'Tick these'}</Btn>
        <Btn size="sm" variant="ghost" onClick={() => repick(new Set())}>Clear all</Btn>
      </Box>

      <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
        {shown.map((u) => {
          const self = u.id === me;
          const on = picked.has(u.id);
          return (
            <Box key={u.id} onClick={() => toggle(u.id)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '8px 20px', cursor: 'pointer', borderBottom: `1px solid ${tokens.lineSoft}`, bgcolor: on ? tokens.tealSofter : 'transparent', '&:hover': { bgcolor: on ? tokens.tealSoft : tokens.cream } }}>
              <Checkbox checked={on} size="small" sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()} onChange={() => toggle(u.id)} />
              <Avatar name={u.name} size={28} fontSize={11} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>
                  {u.name}
                  {self && <Box component="span" sx={{ ml: '6px', fontFamily: fonts.mono, fontSize: 9.5, p: '2px 6px', borderRadius: '8px', bgcolor: tokens.yellow, color: tokens.greenDeep, letterSpacing: '0.06em' }}>YOU</Box>}
                  {u.status !== 'active' && <Box component="span" sx={{ ml: '6px', fontFamily: fonts.mono, fontSize: 9.5, p: '2px 6px', borderRadius: '8px', bgcolor: tokens.creamWarm, color: tokens.slate, letterSpacing: '0.06em' }}>INACTIVE</Box>}
                </Box>
                <Box sx={{ fontSize: 11.5, color: tokens.slate }}>{[u.email, u.department].filter(Boolean).join(' · ')}</Box>
              </Box>
            </Box>
          );
        })}
        {shown.length === 0 && <Box sx={{ p: '24px 20px', textAlign: 'center', fontSize: 13, color: tokens.slate }}>Nobody matches that search.</Box>}
        {/* The list is one request long. Above that it is honest about what is not on it rather than
            quietly resetting the first few hundred and leaving the rest wondering. */}
        {total > (users ?? []).length && (
          <Box sx={{ p: '10px 20px', fontSize: 11.5, color: tokens.slate, bgcolor: tokens.cream }}>
            Showing the first {(users ?? []).length} of {total} accounts, by name. Reset these, then reopen this screen for the rest.
          </Box>
        )}
      </Box>

      {(problem || confirming || includesMe) && (
        <Box sx={{ p: '12px 20px', borderTop: `1px solid ${tokens.line}` }}>
          {problem && <Box sx={{ p: '10px 14px', bgcolor: '#FEE2E2', border: `1px solid ${tokens.red}`, color: '#991B1B', borderRadius: '8px', fontSize: 12, fontWeight: 600 }}>{problem}</Box>}
          {!problem && confirming && (
            <Box sx={{ p: '10px 14px', bgcolor: '#FFF7E5', border: `1px solid ${tokens.yellow}`, color: '#92400E', borderRadius: '8px', fontSize: 12.5, lineHeight: 1.5 }}>
              This replaces the password of <strong>{count} {count === 1 ? 'person' : 'people'}</strong> and cannot be undone. Their old passwords stop working straight away — make sure you can hand the new one over before you press this.
            </Box>
          )}
          {!problem && !confirming && includesMe && (
            <Box sx={{ p: '10px 14px', bgcolor: '#FFF7E5', border: `1px solid ${tokens.yellow}`, color: '#92400E', borderRadius: '8px', fontSize: 12.5 }}>
              You are in this list — you will be asked to set your own password too.
            </Box>
          )}
        </Box>
      )}
    </ModalShell>
  );
}
