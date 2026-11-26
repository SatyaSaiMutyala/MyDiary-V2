import { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { PageHeader, Icon } from '../../components';
import { tokens } from '../../theme/tokens';
import { useAppStore } from '../../store/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { hasModule } from '../../data/users';
import { TODAY } from '../../utils/dates';
import { errorMessage } from '../../store/api/baseApi';
import { useCreateDiaryEntryMutation, useListDiaryQuery, useRemoveDiaryEntryMutation } from '../../store/api/diaryApi';
import { useListMeetingsQuery } from '../../store/api/meetingsApi';
import { useListRequestsQuery } from '../../store/api/meetingRequestsApi';
import { ApiError, Fetching } from '../settings/components/listUi';
import { apiToEntry, calendarWindow, canEditDiary, entryToApiBody, filterVisible, getDiaryEntries } from './utils';
import EaBanner from './components/EaBanner';
import DiaryToolbar from './components/DiaryToolbar';
import SidePanel from './components/SidePanel';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import MonthView from './components/MonthView';
import AgendaView from './components/AgendaView';
import EntryModal from './modals/EntryModal';
import EntryDetailModal from './modals/EntryDetailModal';
import { useDialog } from '../../components/Dialogs';

/** One window's worth of calendar rows (the list contract's ceiling). */
const WINDOW_LIMIT = 200;
const EMPTY = [];

/**
 * MY DIARY module — renderDiary() 9732–9806.
 *
 * The screen shows two kinds of thing side by side and each has exactly one home: diary entries come
 * from GET /api/diary (this module owns them) and meetings from GET /api/meetings, merged in the
 * browser by getDiaryEntries(). Pending meeting requests become the tentative blocks the same way.
 * All three are asked for one window at a time (calendarWindow), so paging the calendar is one
 * request per month and moving inside a month is answered from the RTK Query cache.
 */
export default function DiaryPage() {
  const dlg = useDialog();
  const { state } = useAppStore();
  const { user } = useAuth();
  const me = user?.name || state.viewer.name;
  const viewer = useMemo(() => ({ name: me, role: user?.title || user?.role || state.viewer.role }), [me, user?.title, user?.role, state.viewer.role]);

  // CURRENT_DIARY_DATE / VIEW / OWNER / VISIBLE_CALS
  const [date, setDate] = useState(() => new Date(TODAY));
  const [view, setView] = useState('week');
  const [owner, setOwner] = useState(me);
  const [visibleCals, setVisibleCals] = useState({ own: true, meetings: true, delegated: true });
  const [entryModal, setEntryModal] = useState(null);   // { preset, key } | null
  const [detailId, setDetailId] = useState(null);

  const canEdit = canEditDiary(viewer.name, owner);
  const seesMeetings = hasModule(user, 'meetings');
  const win = useMemo(() => calendarWindow(date), [date]);
  // Someone else's diary is read through `owner=` (the server checks the delegation).
  const ownerArgs = useMemo(() => (owner === me ? {} : { mine: 'false', owner }), [owner, me]);

  const entriesQ = useListDiaryQuery({ ...win, ...ownerArgs, limit: WINDOW_LIMIT });
  const meetingsQ = useListMeetingsQuery({ ...win, status: 'upcoming,completed', limit: WINDOW_LIMIT }, { skip: !seesMeetings });
  const requestsQ = useListRequestsQuery({ status: 'pending', from: win.from, to: win.to, limit: WINDOW_LIMIT }, { skip: !seesMeetings });
  // Side-panel totals: one limit=1 call each, so only the counts travel.
  const ownCountQ = useListDiaryQuery({ ...ownerArgs, limit: 1, fields: 'title' });
  const upcomingQ = useListMeetingsQuery({ status: 'upcoming', limit: 1, fields: 'title' }, { skip: !seesMeetings });

  const [createEntry] = useCreateDiaryEntryMutation();
  const [removeEntry] = useRemoveDiaryEntryMutation();

  const diaryEntries = useMemo(() => (entriesQ.data?.items ?? EMPTY).map(apiToEntry), [entriesQ.data]);
  const meetings = useMemo(() => meetingsQ.data?.items ?? EMPTY, [meetingsQ.data]);
  const meetingRequests = useMemo(() => requestsQ.data?.items ?? EMPTY, [requestsQ.data]);
  const allEntries = useMemo(() => getDiaryEntries(owner, { diaryEntries, meetings, meetingRequests }), [owner, diaryEntries, meetings, meetingRequests]);
  const visible = useMemo(() => filterVisible(allEntries, visibleCals), [allEntries, visibleCals]);
  const ownCount = ownCountQ.data?.total ?? 0;
  const upcomingMtgs = upcomingQ.data?.total ?? 0;

  const loading = entriesQ.isLoading || (seesMeetings && meetingsQ.isLoading);
  const fetching = entriesQ.isFetching || meetingsQ.isFetching || requestsQ.isFetching;
  // The diary itself first: a missing Meetings module must not hide the person's own entries.
  const error = entriesQ.error || meetingsQ.error || requestsQ.error;
  const retry = useCallback(() => {
    if (entriesQ.error) entriesQ.refetch();
    if (meetingsQ.error) meetingsQ.refetch();
    if (requestsQ.error) requestsQ.refetch();
  }, [entriesQ, meetingsQ, requestsQ]);

  const navigateBy = (dir) => setDate(prev => {
    const d = new Date(prev);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    return d;
  });
  const jumpToDate = (dateStr) => {
    setDate(new Date(dateStr + 'T00:00:00'));
    if (view === 'month') setView('day');
  };
  const toggleCal = (key) => setVisibleCals(v => ({ ...v, [key]: !v[key] }));

  const openEntryModal = async (preset) => {
    if (!canEdit) { await dlg.alert('You have view-only access to this diary.'); return; }
    setEntryModal({ preset: preset || null, key: Date.now() });
  };

  const saveEntry = async (newEntry) => {
    let saved;
    try {
      saved = await createEntry(entryToApiBody(newEntry, { owner, me })).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err));   // the server's words, so the person can fix the entry
      return;
    }
    const extCount = saved.external.filter(e => e.email).length;
    const intCount = saved.attendees.length;
    setEntryModal(null);
    if (extCount || intCount) {
      setTimeout(() => dlg.alert("✓ Entry added to " + saved.owner + "'s diary. Calendar invites dispatched to " + (intCount + extCount) + ' people.'), 100);
    } else {
      setTimeout(() => dlg.alert('✓ Entry added.'), 100);
    }
  };

  const deleteEntry = async (id) => {
    if (!await dlg.confirm('Delete this diary entry? This cannot be undone.')) return;
    try {
      await removeEntry(id).unwrap();
      setDetailId(null);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  // Entry for the detail popover: own entries, meeting-derived and request-derived entries all live in allEntries
  const detailEntry = detailId ? (allEntries.find(e => e.id === detailId) || null) : null;

  const viewProps = { date, entries: visible, onOpenEntry: setDetailId, onNewEntry: openEntryModal, loading };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['MyDiary · Calendar', 'Personal + Team']} icon={<Icon name="weekly" />} title="My Diary"
        sub="Every meeting, focus block, travel plan, reminder — one calendar. Delegate access to your EA so they can fill it in for you. Invite anyone, inside or outside TrustLab." />

      <EaBanner viewer={viewer} owner={owner} canEdit={canEdit} onSwitchOwner={setOwner} />
      <DiaryToolbar view={view} date={date} canEdit={canEdit} onView={setView} onNavigate={navigateBy} onToday={() => setDate(new Date(TODAY))} onNewEntry={openEntryModal} />

      <ApiError error={error} onRetry={retry} sx={{ mb: '14px' }} />

      {/* .diary-grid — main 1fr + 260px side; stacks below lg */}
      <Grid container spacing="14px" alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 'grow' }} sx={{ minWidth: 0 }}>
          <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, overflow: 'hidden', boxShadow: tokens.shadowSm }}>
            <Fetching on={fetching && !loading} />
            {view === 'week' && <WeekView {...viewProps} />}
            {view === 'day' && <DayView {...viewProps} />}
            {view === 'month' && <MonthView {...viewProps} onJump={jumpToDate} />}
            {view === 'agenda' && <AgendaView {...viewProps} />}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, lg: 'auto' }} sx={{ width: { lg: 260 }, flexShrink: 0 }}>
          <SidePanel date={date} entries={allEntries} ownCount={ownCount} upcomingMtgs={upcomingMtgs} visibleCals={visibleCals} viewer={viewer} owner={owner}
            onToggleCal={toggleCal} onJump={jumpToDate} onSwitchOwner={setOwner} onNewEntry={openEntryModal} />
        </Grid>
      </Grid>

      {entryModal && (
        <EntryModal key={entryModal.key} open onClose={() => setEntryModal(null)} owner={owner} viewer={viewer} date={date} preset={entryModal.preset} onSave={saveEntry} />
      )}
      {detailEntry && (
        <EntryDetailModal entry={detailEntry} canEdit={canEditDiary(viewer.name, detailEntry.owner || owner)} onClose={() => setDetailId(null)} onDelete={deleteEntry} />
      )}
    </Box>
  );
}
