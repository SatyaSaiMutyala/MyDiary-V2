import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useListPeopleQuery } from '../../../store/api/usersApi';
import PersonPicker from './PersonPicker';
import { TODAY } from '../../../utils/dates';
import { useDialog } from '../../../components/Dialogs';
import { DateInput } from '../../../components/DateTimeInput';

const labelSx = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, textTransform: 'uppercase', display: 'block' };
const ctrlSx = { width: '100%', mt: '6px', height: 40, p: '0 12px', border: `1px solid ${tokens.line}`, borderRadius: '6px', fontFamily: 'inherit', fontSize: 13, bgcolor: '#fff', color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: `0 0 0 3px ${tokens.tealSoft}` } };

/** openStandaloneTask / submitStandaloneTask — "⚡ New Ad-hoc Task" composer */
/**
 * The task composer, used both to write a new one and to change one already written.
 *
 * Editing is the same four fields as creating — there is nothing about a task that is only
 * settable at birth — so it is the same form rather than a second one that would drift from it.
 *
 * @param {object} props
 * @param {object} [props.task] the task being changed; omitted means a new one
 */
export default function StandaloneTaskModal({ open, onClose, onSubmit, me, task }) {
  const dlg = useDialog();
  const editing = Boolean(task);
  const today = new Date(TODAY).toISOString().slice(0, 10);
  const in7 = new Date(TODAY.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const [desc, setDesc] = useState(task?.desc ?? '');
  const [owner, setOwner] = useState(task && task.owner !== me ? task.owner : '');
  const [deadline, setDeadline] = useState(task?.deadline ?? in7);
  const [priority, setPriority] = useState(task?.priority ?? 'medium');
  // Real accounts, not the prototype's list of job titles: a task allocated to somebody has to
  // reach a person who can sign in and see it.
  const { data: people, isLoading: loadingPeople } = useListPeopleQuery(undefined, { skip: !open });
  const others = (people ?? []).filter(u => u.name !== me);

  const submit = async () => {
    const d = desc.trim();
    if (!d) { await dlg.alert('Task description is required.'); return; }
    if (!deadline) { await dlg.alert('Please set a deadline.'); return; }
    onSubmit({ desc: d, owner, deadline, priority });
  };

  return (
    <ModalShell open={open} onClose={onClose} width={640} head="gradient" icon={editing ? '✎' : '⚡'}
      title={editing ? 'Edit task' : 'New Ad-hoc Task'}
      sub={editing ? 'Change the wording, the owner, the date or how urgent it is' : 'Allocate a task to anyone — no meeting or visit required'}
      bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}
      footer={<>
        <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
          ↻ {editing ? 'Saved' : 'Lands'} in <strong>{owner ? `${owner}'s` : 'your'} To-Do inbox</strong>{editing ? '' : ' immediately'}{owner ? ', and they are told' : ''}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>{editing ? 'Save changes' : 'Create & Notify'}</Btn>
        </Box>
      </>}>
      <Box sx={{ mb: '14px' }}>
        <Box component="label" sx={labelSx}>Task Description ✱</Box>
        <Box component="textarea" autoFocus rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What needs to be done?" sx={{ ...ctrlSx, resize: 'vertical' }} />
      </Box>
      {/* Both columns use the same control height so their boxes line up, and the note below only
          ever grows the left one. */}
      <Grid container spacing={1.5} alignItems="flex-start" sx={{ mb: '14px' }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box component="label" sx={labelSx}>Allocate To</Box>
          <Box sx={{ mt: '6px' }}>
            <PersonPicker value={owner} onChange={setOwner} people={others} me={me} loading={loadingPeople} />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box component="label" sx={labelSx}>Deadline ✱</Box>
          <DateInput
            value={deadline}
            min={today}
            onChange={e => setDeadline(e.target.value)}
            sx={{ mt: '6px' }}
            inputSx={{ height: 40, minHeight: 40 }}
          />
        </Grid>
      </Grid>

      <Box sx={{ fontSize: 11.5, color: tokens.slate, mb: '14px', mt: '-6px' }}>
        {owner
          ? <>It lands in <strong>{owner}&apos;s</strong> To-Do inbox, and they are told.</>
          : <>Leave it as <strong>Myself</strong> and the task is yours. Pick somebody and it goes to them.</>}
      </Box>
      <Box>
        <Box component="label" sx={labelSx}>Priority</Box>
        <Box component="select" value={priority} onChange={e => setPriority(e.target.value)} sx={ctrlSx}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </Box>
      </Box>
    </ModalShell>
  );
}
