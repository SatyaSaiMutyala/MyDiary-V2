import { useState } from 'react';
import { Box, ButtonBase, InputBase } from '@mui/material';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthContext';
import { useAppStore } from '../../store/AppStore';
import { LOG_TEMPLATES } from '../../data/logs';
import { PageHeader, TabBar } from '../../components';
import { errorMessage } from '../../store/api/baseApi';
import {
  useCreateLogMutation, useGetLogQuery, useListLogsQuery, useLogFollowUpsQuery, useLogPeopleQuery,
  useRemoveLogMutation, useToggleLogFollowUpMutation, useUpdateLogMutation,
} from '../../store/api/logsApi';
import { newLogDraft, toLogBody } from './utils';
import LogsListView from './components/LogsListView';
import PeopleGrid from './components/PeopleGrid';
import PersonTimeline from './components/PersonTimeline';
import FollowupsView from './components/FollowupsView';
import LogModal from './modals/LogModal';
import LogDetailModal from './modals/LogDetailModal';
import { useDialog } from '../../components/Dialogs';

const quickBtnSx = { p: '11px 18px', bgcolor: tokens.yellow, color: tokens.greenDeep, border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', letterSpacing: '0.02em', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#fff' } };

/** Every read is the signed-in person's own logs — the prototype's myLogs(), done by the server. */
const MINE = { mine: 'true' };
/** One page of the people grid / follow-up feed (the API's maximum). */
const GRID_LIMIT = 200;

export default function DiscussionLogsPage() {
  const dlg = useDialog();
  const { state } = useAppStore();
  const { user } = useAuth();
  const viewer = user?.name || state.viewer.name;
  const [tab, setTab] = useState('all');            // LOGS_TAB: all | people | followups
  const [personFocus, setPersonFocus] = useState(null); // LOGS_PERSON_FOCUS
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [tag, setTag] = useState('');
  const [quick, setQuick] = useState('');
  const [draft, setDraft] = useState(null);         // LOG_DRAFT (modal open while non-null)
  const [detailId, setDetailId] = useState(null);
  const [detailSeed, setDetailSeed] = useState(null); // the row that was clicked, so the modal opens at once

  // Counts for the tab bar: the totals of my logs, the people I have spoken with and my open follow-ups.
  const totals = useListLogsQuery({ ...MINE, limit: 1, fields: 'topic' });
  const peopleQuery = useLogPeopleQuery({ ...MINE, limit: GRID_LIMIT });
  const followUpsQuery = useLogFollowUpsQuery({ ...MINE, limit: GRID_LIMIT });
  const detailQuery = useGetLogQuery(detailId, { skip: !detailId });
  // Whether the detail modal is open is decided here, not by the query: a skipped query still hands
  // back the log it last fetched, so closing used to leave `detailLog` truthy and the modal simply
  // stayed on screen — Close and × looked broken.
  const detailLog = detailId || detailSeed ? (detailQuery.data || detailSeed) : null;

  const [createLog] = useCreateLogMutation();
  const [updateLog] = useUpdateLogMutation();
  const [removeLog] = useRemoveLogMutation();
  const [toggleFollowUp] = useToggleLogFollowUpMutation();

  const setLogsTab = t => { setTab(t); setPersonFocus(null); };
  const focusPerson = name => { setPersonFocus(name); setTab('people'); };
  const openLogModal = preset => setDraft(newLogDraft(preset));
  const openDetail = (log) => {
    setDetailSeed(typeof log === 'string' ? null : log);
    setDetailId(typeof log === 'string' ? log : log.id);
  };
  const closeDetail = () => { setDetailId(null); setDetailSeed(null); };

  const quickLogExpand = () => {
    const quickText = quick.trim();
    openLogModal(quickText ? { topic: quickText } : undefined);
    setQuick('');
  };

  const pickLogTemplate = async () => {
    const menu = LOG_TEMPLATES.map((t, i) => (i + 1) + '. ' + t.emoji + ' ' + t.name).join('\n');
    const pick = await dlg.prompt('Which discussion log template?\n\n' + menu + '\n\nEnter a number, or blank to cancel.');
    if (!pick) return;
    const idx = parseInt(pick.trim(), 10) - 1;
    if (idx < 0 || idx >= LOG_TEMPLATES.length) return;
    openLogModal(LOG_TEMPLATES[idx].preset);
  };

  const toggleLogFU = async (logId, fuId) => {
    try { await toggleFollowUp({ id: logId, fuId }).unwrap(); }
    catch (err) { await dlg.alert(errorMessage(err)); }
  };

  const saveLog = async (d) => {
    if (!d.topic.trim()) { await dlg.alert('Please enter a topic (short title for the log).'); return; }
    if (d.with.length === 0) { await dlg.alert('Please add at least one person you spoke with.'); return; }
    if (!d.summary.trim()) { await dlg.alert('Please capture what was discussed.'); return; }
    const body = toLogBody(d);
    let saved;
    try {
      saved = d.id ? await updateLog({ id: d.id, ...body }).unwrap() : await createLog(body).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err));   // the server's words, as they came
      return;
    }
    setDraft(null);
    setTimeout(() => dlg.alert('✓ Log saved. ' + (saved.followUps.length ? saved.followUps.length + ' follow-up(s) tracked. ' : '') + 'Find it later via My Discussion Logs or by searching for "' + saved.tags.slice(0, 2).join(', ') + '".'), 100);
  };

  const deleteLog = async (id) => {
    if (!await dlg.confirm('Delete this log? This cannot be undone.')) return;
    try { await removeLog(id).unwrap(); closeDetail(); }
    catch (err) { await dlg.alert(errorMessage(err)); }
  };

  const allFUs = followUpsQuery.data?.items || [];
  const fuCounts = followUpsQuery.data?.counts || { open: 0, done: 0, total: 0 };

  const tabs = [
    { key: 'all', icon: '💬', label: 'All Logs', count: totals.data?.total ?? 0 },
    { key: 'people', icon: '👥', label: 'By Person', count: peopleQuery.data?.total ?? 0 },
    { key: 'followups', icon: '⚡', label: 'Open Follow-ups', count: fuCounts.open },
  ];

  return (
    <Box>
      <PageHeader parts={['MyDiary · Discussion Log', 'Informal Conversations']} icon="💬" title="My Discussion Logs"
        sub="Capture the informal — phone calls, corridor chats, WhatsApp exchanges — so you never forget what was said. Searchable, person-centric, and private by default." />

      {/* .logs-quickbar */}
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', p: '16px 20px', borderRadius: tokens.radius, mb: '18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: tokens.shadow, flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
        <Box sx={{ fontSize: 24, flexShrink: 0 }}>💬</Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Box sx={{ fontWeight: 700, fontSize: 14 }}>Just had a conversation?</Box>
          <Box sx={{ fontSize: 12, opacity: 0.85, mt: '2px' }}>Capture it in 10 seconds while it's fresh.</Box>
        </Box>
        <InputBase value={quick} onChange={e => setQuick(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') quickLogExpand(); }} placeholder='Type a quick summary... e.g. "Called Arjun re Fernandez follow-up"'
          sx={{ flex: 1, minWidth: { xs: '100%', lg: 0 }, color: '#fff', fontSize: 14, '& .MuiInputBase-input': { p: '11px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.1)', height: 'auto', boxSizing: 'border-box', '&::placeholder': { color: 'rgba(255,255,255,0.65)', opacity: 1 }, '&:focus': { bgcolor: 'rgba(255,255,255,0.18)', borderColor: tokens.yellow } } }} />
        <ButtonBase onClick={pickLogTemplate} sx={{ ...quickBtnSx, bgcolor: tokens.card, color: tokens.tealDark, border: `1px solid ${tokens.line}` }}>📋 Template</ButtonBase>
        <ButtonBase onClick={() => openLogModal()} sx={quickBtnSx}>+ New Log</ButtonBase>
      </Box>

      <TabBar tabs={tabs} value={tab} onChange={setLogsTab} sx={{ mb: '14px' }} />

      {tab === 'all' && <LogsListView mine={MINE} search={search} setSearch={setSearch} channel={channel} setChannel={setChannel} tag={tag} setTag={setTag} onOpen={openDetail} onFocusPerson={focusPerson} />}
      {tab === 'people' && (personFocus
        ? <PersonTimeline name={personFocus} mine={MINE} onBack={() => setPersonFocus(null)} onOpen={openDetail} onFocusPerson={focusPerson} />
        : <PeopleGrid query={peopleQuery} onFocusPerson={focusPerson} />)}
      {tab === 'followups' && <FollowupsView query={followUpsQuery} allFUs={allFUs} counts={fuCounts} onToggle={toggleLogFU} onOpenLog={openDetail} />}

      <LogModal open={!!draft} draft={draft} setDraft={setDraft} viewer={viewer} onClose={() => setDraft(null)} onSave={saveLog} />
      <LogDetailModal log={detailLog} onClose={closeDetail} onToggleFU={toggleLogFU} onDelete={deleteLog} onFocusPerson={focusPerson}
        onEdit={(log) => { closeDetail(); openLogModal(log); }} />
    </Box>
  );
}
