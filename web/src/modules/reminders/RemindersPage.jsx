import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { PageHeader, Btn, SearchBox, DmsCard, EmptyState, TabBar, Pill, Card } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthContext';
import { useDialog } from '../../components/Dialogs';
import { errorMessage } from '../../store/api/baseApi';
import { ApiError, Fetching } from '../settings/components/listUi';
import { useDebounced } from '../../utils/useDebounced';
import {
  useCreateReminderMutation, useListRemindersQuery, useRemoveReminderMutation, useUpdateReminderMutation,
} from '../../store/api/remindersApi';
import { STATUS_PILL, draftFrom, forLabel, newReminderDraft, toReminderBody, whenLabel } from './utils';
import ReminderModal from './modals/ReminderModal';

const LIMIT = 100;

/** One reminder: what, when, for whom — and who set it, when that was not you. */
function ReminderCard({ r, onEdit, onDelete }) {
  const pill = r.late ? { bg: 'rgba(240,180,41,0.18)', color: '#92400E' } : STATUS_PILL[r.status] || STATUS_PILL.cancelled;
  return (
    <Card sx={{ p: '14px 18px', mb: '8px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{r.title}</Typography>
          {r.note && <Typography sx={{ fontSize: 12.5, color: tokens.slate, mt: '4px', lineHeight: 1.5 }}>{r.note}</Typography>}
          <Box sx={{ display: 'flex', gap: '14px', flexWrap: 'wrap', mt: '8px', fontSize: 11.5, fontFamily: fonts.mono, letterSpacing: '0.04em', color: tokens.slate }}>
            <Box component="span" sx={{ fontWeight: 700, color: r.status === 'scheduled' ? tokens.tealDark : tokens.slate }}>
              ⏰ {whenLabel(r)}
            </Box>
            <Box component="span">👥 {forLabel(r)}</Box>
            {!r.mine && <Box component="span">Set by <strong>{r.creator}</strong></Box>}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Pill bg={pill.bg} color={pill.color}>{r.late ? 'Due now' : r.statusLabel}</Pill>
          {r.mineToEdit && <Btn size="sm" onClick={() => onEdit(r)}>✎ Edit</Btn>}
          {r.mine && <Btn size="sm" variant="danger" onClick={() => onDelete(r)}>Delete</Btn>}
        </Box>
      </Box>
    </Card>
  );
}

/**
 * Reminders — a note that fires at a chosen minute, for chosen people.
 *
 * The server decides what this person may see (what they set, and what was set for them) and sends
 * the three counts with the page, so the cards, the tabs and the list all read from one answer.
 */
export default function RemindersPage() {
  const dlg = useDialog();
  const { user } = useAuth();
  const me = user?.name;
  const [box, setBox] = useState('upcoming');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null);

  const search = useDebounced(q.trim(), 300);
  const args = useMemo(() => ({ box, limit: LIMIT, search }), [box, search]);
  const { data, error, isLoading, isFetching, refetch } = useListRemindersQuery(args);

  const [createReminder, creating] = useCreateReminderMutation();
  const [updateReminder, updating] = useUpdateReminderMutation();
  const [removeReminder] = useRemoveReminderMutation();

  const rows = data?.items || [];
  const counts = data?.counts || { upcoming: 0, sent: 0, forMe: 0 };

  const save = async (d) => {
    const body = toReminderBody(d);
    try {
      if (d.id) await updateReminder({ id: d.id, ...body }).unwrap();
      else await createReminder(body).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err)); // the server's wording, as it came
      return;
    }
    setDraft(null);
    dlg.toast(d.id ? '✓ Reminder updated.' : '✓ Reminder set.');
  };

  const remove = async (r) => {
    const why = r.status === 'scheduled'
      ? `Delete "${r.title}"? It will not go off, and everyone it was set for is told it is off.`
      : `Delete "${r.title}"? This cannot be undone.`;
    if (!(await dlg.confirm(why))) return;
    try {
      await removeReminder(r.id).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  const tabs = [
    { key: 'upcoming', icon: '⏰', label: 'Upcoming', count: counts.upcoming },
    { key: 'sent', icon: '✓', label: 'Sent', count: counts.sent },
    { key: 'all', icon: '📋', label: 'All' },
  ];

  return (
    <Box>
      <PageHeader
        parts={['MyDiary · Personal', 'Reminders']}
        icon="⏰"
        title="Reminders"
        sub="A note that goes off at the minute you choose — for you, for a colleague, or both. Everyone named is told when it is set and again when it fires."
        actions={<Btn size="lg" variant="primary" onClick={() => setDraft(newReminderDraft())}>+ Set a Reminder</Btn>}
      />

      <Grid container spacing="12px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard label="Upcoming" value={counts.upcoming} sub="Still to go off" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="yellow" label="For me" value={counts.forMe} sub="Waiting on you" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard label="Sent" value={counts.sent} sub="Already fired" /></Grid>
      </Grid>

      <Box sx={{ mb: '14px' }}>
        <SearchBox value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reminders and people..." sx={{ maxWidth: { sm: 360 } }} />
      </Box>

      <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />
      <Fetching on={isFetching && !isLoading} />

      <TabBar tabs={tabs} value={box} onChange={setBox} sx={{ mb: '14px' }} />

      {isLoading ? (
        <Box sx={{ p: '60px 20px', textAlign: 'center', color: tokens.slate, fontFamily: fonts.mono, fontSize: 12, letterSpacing: '0.08em' }}>Loading reminders…</Box>
      ) : error ? null : rows.length === 0 ? (
        <EmptyState
          icon="⏰"
          title={search ? 'No reminder matches' : box === 'sent' ? 'Nothing has been sent yet' : 'No reminders coming up'}
          desc={search ? 'Try a broader search.' : 'Set one for yourself or a colleague — it goes off at the minute you choose.'}
        />
      ) : (
        rows.map((r) => (
          <ReminderCard key={r.id} r={r} onEdit={(x) => setDraft(draftFrom(x, me))} onDelete={remove} />
        ))
      )}

      <ReminderModal
        open={!!draft}
        draft={draft}
        setDraft={setDraft}
        me={me}
        saving={creating.isLoading || updating.isLoading}
        onClose={() => setDraft(null)}
        onSave={save}
      />
    </Box>
  );
}
