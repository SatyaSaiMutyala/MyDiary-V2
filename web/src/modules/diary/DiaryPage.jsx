import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { PageHeader } from '../../components';
import { tokens } from '../../theme/tokens';
import { useAppStore } from '../../store/AppStore';
import { TODAY } from '../../utils/dates';
import { canEditDiary, getDiaryEntries, filterVisible } from './utils';
import EaBanner from './components/EaBanner';
import DiaryToolbar from './components/DiaryToolbar';
import SidePanel from './components/SidePanel';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import MonthView from './components/MonthView';
import AgendaView from './components/AgendaView';
import EntryModal from './modals/EntryModal';
import EntryDetailModal from './modals/EntryDetailModal';

/** MY DIARY module — renderDiary() 9732–9806 */
export default function DiaryPage() {
  const { state, mutate, notify } = useAppStore();
  const viewer = state.viewer;

  // CURRENT_DIARY_DATE / VIEW / OWNER / VISIBLE_CALS
  const [date, setDate] = useState(() => new Date(TODAY));
  const [view, setView] = useState('week');
  const [owner, setOwner] = useState('Venkata Cherukuri');
  const [visibleCals, setVisibleCals] = useState({ own: true, meetings: true, delegated: true });
  const [entryModal, setEntryModal] = useState(null);   // { preset, key } | null
  const [detailId, setDetailId] = useState(null);

  const canEdit = canEditDiary(viewer.name, owner);
  const allEntries = useMemo(() => getDiaryEntries(owner, state), [owner, state.diaryEntries, state.meetings, state.meetingRequests]);
  const visible = useMemo(() => filterVisible(allEntries, visibleCals), [allEntries, visibleCals]);
  const ownCount = state.diaryEntries.filter(e => e.owner === owner).length;
  const upcomingMtgs = state.meetings.filter(m => m.status === 'upcoming').length;

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

  const openEntryModal = (preset) => {
    if (!canEdit) { window.alert('You have view-only access to this diary.'); return; }
    setEntryModal({ preset: preset || null, key: Date.now() });
  };

  const saveEntry = (newEntry) => {
    mutate('diaryEntries', list => { list.push(newEntry); });
    const extCount = newEntry.external.filter(e => e.email).length;
    const intCount = newEntry.attendees.length;
    setEntryModal(null);
    if (extCount || intCount) {
      notify({ type: 'meeting', icon: '📧', text: '<strong>Invites sent:</strong> "' + newEntry.title + '" on ' + newEntry.date + ' — ' + intCount + ' internal + ' + extCount + ' external.' });
      setTimeout(() => window.alert("✓ Entry added to " + newEntry.owner + "'s diary. Calendar invites dispatched to " + (intCount + extCount) + ' people.'), 100);
    } else {
      setTimeout(() => window.alert('✓ Entry added.'), 100);
    }
  };

  const deleteEntry = (id) => {
    if (!window.confirm('Delete this diary entry? This cannot be undone.')) return;
    mutate('diaryEntries', list => list.filter(e => e.id !== id));
    setDetailId(null);
  };

  // Entry for the detail popover: own entries, meeting-derived and request-derived entries all live in allEntries
  const detailEntry = detailId ? (allEntries.find(e => e.id === detailId) || state.diaryEntries.find(e => e.id === detailId) || null) : null;

  const viewProps = { date, entries: visible, onOpenEntry: setDetailId, onNewEntry: openEntryModal };

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['MyDiary · Calendar', 'Personal + Team']} icon="📅" title="My Diary"
        sub="Every meeting, focus block, travel plan, reminder — one calendar. Delegate access to your EA so they can fill it in for you. Invite anyone, inside or outside TrustLab." />

      <EaBanner viewer={viewer} owner={owner} canEdit={canEdit} onSwitchOwner={setOwner} />
      <DiaryToolbar view={view} date={date} canEdit={canEdit} onView={setView} onNavigate={navigateBy} onToday={() => setDate(new Date(TODAY))} onNewEntry={openEntryModal} />

      {/* .diary-grid — main 1fr + 260px side; stacks below lg */}
      <Grid container spacing="14px" alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 'grow' }} sx={{ minWidth: 0 }}>
          <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, overflow: 'hidden', boxShadow: tokens.shadowSm }}>
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
