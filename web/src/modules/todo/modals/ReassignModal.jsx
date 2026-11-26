import { useState } from 'react';
import { Box } from '@mui/material';
import { ModalShell, Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useListPeopleQuery } from '../../../store/api/usersApi';
import PersonPicker from './PersonPicker';

/**
 * Hand a task to somebody else.
 *
 * This used to ask for the new owner as typed text, which meant a task could be handed to a
 * misspelling — "N Sharma" is not "N. Sharma", and the task would then sit in nobody's inbox at
 * all. The list is the same one the composer offers, so the name that is saved is always a name
 * the server knows.
 *
 * @param {object} props
 * @param {{ desc: string, owner: string }} props.task the task being handed over
 * @param {string} props.me the signed-in person's name
 * @param {(name: string) => Promise<void> | void} props.onSubmit
 * @param {() => void} props.onClose
 */
export default function ReassignModal({ task, me, onSubmit, onClose }) {
  const { data: people, isLoading } = useListPeopleQuery();
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);

  // Everybody except whoever holds it now (handing it back to them does nothing) and the signed-in
  // person, who is already pinned at the top as "Myself" and must not appear twice.
  const others = (people ?? []).filter((u) => u.name !== task.owner && u.name !== me);
  const chosen = owner || me;

  const save = async () => {
    setBusy(true);
    try {
      await onSubmit(chosen);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={busy ? () => {} : onClose}
      width={560}
      icon="↺"
      title="Reassign this task"
      sub={task.desc}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
          {chosen === task.owner ? 'Already theirs' : <>Moves to <strong>{chosen}</strong>, who is told</>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={busy || chosen === task.owner}>
            {busy ? 'Moving…' : '↺ Reassign'}
          </Btn>
        </Box>
      </>}
    >
      <Box sx={{ mb: '12px', p: '10px 12px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '7px', fontSize: 12.5, color: tokens.slate }}>
        Currently with <strong style={{ color: tokens.ink }}>{task.owner}</strong>. Whoever you choose gets it on
        their own To-Do, and is told — on screen and on their phone.
      </Box>

      <Box component="label" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: '6px' }}>
        Hand it to
      </Box>
      <PersonPicker value={owner} onChange={setOwner} people={others} me={me} loading={isLoading} />
    </ModalShell>
  );
}
