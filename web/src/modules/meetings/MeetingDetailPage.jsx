import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { Btn, EmptyState, TabBar } from '../../components';
import { useAppStore } from '../../store/AppStore';
import { useCrumbs } from '../../store/CrumbsContext';
import { errorCode } from '../../store/api/baseApi';
import {
  useAddParkingMutation, useAppendTranscriptMutation, useApplyAiActionsMutation, useCirculateMinutesMutation,
  useCreateActionItemMutation, useCreateDecisionMutation, useCyclePresenceMutation, useDuplicateMeetingMutation,
  useExtractActionsMutation, useFinaliseMinutesMutation, useGetMeetingQuery, useLogAiDecisionsMutation,
  usePatchExternalMutation, usePutAiSummaryMutation, usePutMinutesMutation, useRemindOwnersMutation,
  useRemoveMeetingMutation, useRemoveParkingMutation, useReopenMinutesMutation, useRsvpMutation,
  useSetMeetingStatusMutation,
} from '../../store/api/meetingsApi';
import {
  useAddCommentMutation, useAddDependencyMutation, useAddSubtaskMutation,
  useRemoveActionItemMutation, useSetSubtaskMutation, useUpdateActionItemMutation,
} from '../../store/api/actionItemsApi';
import { useListDecisionsQuery } from '../../store/api/decisionsApi';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import { TRANSCRIPT_DEMO, AI_SUMMARY_DEMO } from '../../data/meetings';
import { TDPL_LOGO_FULL } from '../../data/logos';
import { parseDate, formatDateLong, formatTime } from '../../utils/dates';
import { normExt, tdplEmail } from '../../utils/people';
import DetailHead from './components/DetailHead';
import DetailAgendaPane from './components/DetailAgendaPane';
import DetailLivePane from './components/DetailLivePane';
import DetailAIPane from './components/DetailAIPane';
import DetailDecisionsPane from './components/DetailDecisionsPane';
import DetailMinutesPane from './components/DetailMinutesPane';
import DetailActionsPane from './components/DetailActionsPane';
import DetailCirculateModal from './modals/DetailCirculateModal';
import { previewMinutes } from './modals/detailPreviewMinutes';
import { exportMinutes, downloadTranscript } from './components/detailShared';
import { openRsvpPreview } from './rsvpPreview';
import { useDialog } from '../../components/Dialogs';

const NO_CANDIDATES = 'No commitment-language sentences found in Decisions text. Try writing more explicit commitments (e.g. "CFO to send report by Friday").';
/** Fields the action table edits inline; text ones are written back after a pause, selects immediately. */
const ACTION_DEBOUNCE = { desc: 700, deadline: 0, priority: 0, status: 0, owner: 0, ownerType: 0 };

/** The web's extractActionsFromMinutes() preview — the same scan the server runs, used for the confirm box. */
function minutesCandidates(minutes) {
  const candidates = [];
  Object.values(minutes || {}).forEach(mins => {
    if (!mins || !mins.dec) return;
    mins.dec.split(/[.!?](\s|$)/).filter(s => s && s.trim().length > 10).forEach(s => {
      const txt = s.trim();
      if (/\b(to |will |should |must |by |owner|deadline|follow[- ]up)\b/i.test(txt)) candidates.push(txt);
    });
  });
  return candidates;
}

/** Meeting detail — port of renderDetail(), now reading GET /api/meetings/:id. Route: /meetings/:id */
export default function MeetingDetailPage() {
  const { id } = useParams();
  // key={id} remounts the view when navigating between meetings (openDetail() reset CURRENT_DETAIL_TAB etc.)
  return <MeetingDetail key={id} id={id} />;
}

function MeetingDetail({ id }) {
  const dlg = useDialog();
  const navigate = useNavigate();
  const { state, set } = useAppStore();
  const { toast, show } = useToast();

  const { data: m, error, isLoading, isFetching, refetch } = useGetMeetingQuery(id);
  const { data: decisionPage } = useListDecisionsQuery({ meetingId: id, limit: 200, sort: 'agendaIdx' }, { skip: !m });
  const myDecisions = decisionPage?.items || [];

  // Local UI state (CURRENT_DETAIL_TAB, EXPANDED_ACTION, ACTION_EXPAND_TAB, modals)
  const [tab, setTab] = useState('agenda');
  const [expandedId, setExpandedId] = useState(null);
  const [expandTab, setExpandTab] = useState('subtasks');
  const [aiLoading, setAiLoading] = useState(false);
  const [circOpen, setCircOpen] = useState(false);
  const [focusActionId, setFocusActionId] = useState(null);

  // Mutations
  const [setStatus] = useSetMeetingStatusMutation();
  const [duplicate] = useDuplicateMeetingMutation();
  const [removeMeeting] = useRemoveMeetingMutation();
  const [putMinutes] = usePutMinutesMutation();
  const [finalise] = useFinaliseMinutesMutation();
  const [reopen] = useReopenMinutesMutation();
  const [circulate] = useCirculateMinutesMutation();
  const [cyclePresenceApi] = useCyclePresenceMutation();
  const [addParkingApi] = useAddParkingMutation();
  const [removeParkingApi] = useRemoveParkingMutation();
  const [patchExternal] = usePatchExternalMutation();
  const [rsvpApi] = useRsvpMutation();
  const [appendTranscript] = useAppendTranscriptMutation();
  const [putAiSummary] = usePutAiSummaryMutation();
  const [applyAi] = useApplyAiActionsMutation();
  const [logAi] = useLogAiDecisionsMutation();
  const [extract] = useExtractActionsMutation();
  const [remind] = useRemindOwnersMutation();
  const [createAction] = useCreateActionItemMutation();
  const [createDecision] = useCreateDecisionMutation();
  const [updateActionItem] = useUpdateActionItemMutation();
  const [removeActionItem] = useRemoveActionItemMutation();
  const [addSubtaskApi] = useAddSubtaskMutation();
  const [setSubtaskApi] = useSetSubtaskMutation();
  const [addCommentApi] = useAddCommentMutation();
  const [addDependencyApi] = useAddDependencyMutation();

  useCrumbs([{ label: 'Meetings', to: '/' }, { label: 'My Meetings', to: '/meetings' }, { label: m ? m.title : 'Meeting' }]);

  // ---- minutes: typed into locally, written back with PUT after a short pause ("auto-saves as you type") ----
  const [minutesDraft, setMinutesDraft] = useState(null);
  const minutesTimer = useRef(null);
  const minutes = minutesDraft ?? m?.minutes ?? {};
  useEffect(() => () => clearTimeout(minutesTimer.current), []);

  // ---- action-item inline edits: optimistic drafts, dropped once the server has caught up ----
  const [drafts, setDrafts] = useState({});
  const actionTimers = useRef({});
  useEffect(() => () => Object.values(actionTimers.current).forEach(clearTimeout), []);
  useEffect(() => {
    if (!m) return;
    setDrafts(prev => {
      if (!Object.keys(prev).length) return prev;
      const next = {};
      Object.entries(prev).forEach(([aid, fields]) => {
        const server = (m.actions || []).find(a => a.id === aid);
        if (!server) return;
        const keep = {};
        Object.entries(fields).forEach(([f, v]) => { if (server[f] !== v) keep[f] = v; });
        if (Object.keys(keep).length) next[aid] = keep;
      });
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [m]);

  // ============ LIVE TRANSCRIPTION — 1s ticker, feeds one TRANSCRIPT_DEMO line every 2s ============
  const recording = state.recording;
  const recordingRef = useRef(recording);
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => {
    if (!recording.active || recording.meetingId !== id) return;
    const t = setInterval(() => {
      const r = recordingRef.current;
      const elapsed = r.elapsed + 1;
      const feed = elapsed % 2 === 0 && r.feedIdx < TRANSCRIPT_DEMO.length;
      const line = feed ? TRANSCRIPT_DEMO[r.feedIdx] : null;
      set('recording', { ...r, elapsed, feedIdx: feed ? r.feedIdx + 1 : r.feedIdx });
      // The captured line is persisted, so the transcript survives a reload like any other server data.
      if (line) appendTranscript({ id, lines: [{ speaker: line.speaker, chip: line.chip, time: line.time, text: line.text }] })
        .unwrap().catch(err => show(err, 'error'));
    }, 1000);
    return () => clearInterval(t);
  }, [recording.active, recording.meetingId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && errorCode(error) === 'not_found') {
    return (
      <Box>
        <EmptyState icon="📅" title="Meeting not found" desc={<>This meeting does not exist (or was removed).<Box sx={{ mt: 2 }}><Btn onClick={() => navigate('/meetings')}>← Back to My Meetings</Btn></Box></>} />
      </Box>
    );
  }
  if (!m) {
    return (
      <Box>
        <Fetching on={isLoading || isFetching} />
        <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />
        {!error && <EmptyState icon="📅" title="Loading meeting…" desc="Fetching the meeting from the server." />}
      </Box>
    );
  }

  const run = async (promise, okMsg) => {
    try { const r = await promise.unwrap(); if (okMsg) show(okMsg); return r; }
    catch (err) { show(err, 'error'); return null; }
  };

  const openActions = (m.actions || []).filter(a => a.status !== 'done').length;
  const totalActions = (m.actions || []).length;
  const transcriptLen = (m.transcript || []).length;

  // ============ HEAD BUTTONS ============
  // Opens the Schedule form pre-filled with this meeting; saving overwrites it rather than duplicating.
  const editMeeting = () => navigate(`/meetings/${id}/edit`);
  const duplicateMeeting = async () => {
    if (!await dlg.confirm('Duplicate "' + m.title + '" as a new upcoming meeting?')) return;
    const copy = await run(duplicate(m.id));
    if (!copy) return;
    await dlg.alert('✓ Duplicated. Opening the new meeting.');
    navigate('/meetings/' + copy.id);
  };
  const markCompleted = async () => { if (!await dlg.confirm('Mark this meeting as completed? You can still edit minutes and action items afterwards.')) return; run(setStatus({ id: m.id, status: 'completed' })); };
  const cancelMeeting = async () => { const reason = await dlg.prompt('Why is this meeting being cancelled?', 'Rescheduling to a later date'); if (reason === null) return; run(setStatus({ id: m.id, status: 'cancelled', cancelReason: reason })); };
  const restoreMeeting = async () => { if (!await dlg.confirm('Restore this meeting to upcoming?')) return; run(setStatus({ id: m.id, status: 'upcoming' })); };
  const deleteMeeting = async () => {
    if (!await dlg.confirm('Delete "' + m.title + '" permanently? Its action items and decisions go with it. This cannot be undone.')) return;
    const ok = await run(removeMeeting(m.id));
    if (ok) navigate('/meetings');
  };

  const editExternalEmail = async (idx) => {
    if (!m.external || !m.external[idx]) return;
    const cur = normExt(m.external[idx]);
    const newEmail = await dlg.prompt('Email for ' + cur.name + ' (so minutes reach them):', cur.email);
    if (newEmail === null) return;
    run(patchExternal({ id: m.id, index: idx, email: newEmail.trim() }));
  };

  const openRsvp = (idx) => {
    if (!m.external || !m.external[idx]) return;
    const invitee = normExt(m.external[idx]);
    const subject = m.title;
    openRsvpPreview({
      dlg,
      subject, dateStr: formatDateLong(parseDate(m.date)), timeStr: formatTime(m.time), dur: m.dur, location: m.loc, modeStr: m.mode,
      organizer: m.chair, orgEmail: tdplEmail(m.chair), invitee, agenda: m.agenda || [], notes: '', logoDataUrl: TDPL_LOGO_FULL,
      // POST /rsvp records the answer and notifies the chair.
      onRespond: (resp, note) => run(rsvpApi({ id: m.id, index: idx, rsvp: resp, note: note || '' })),
    });
  };

  // ============ AGENDA PANE ============
  const addParkingItem = (text) => run(addParkingApi({ id: m.id, text }));
  const rmParkingItem = (idx) => run(removeParkingApi({ id: m.id, index: idx }));
  const cyclePresence = (attendee) => run(cyclePresenceApi({ id: m.id, name: attendee }));

  // ============ LIVE ============
  const toggleRecording = async () => {
    if (recording.active) {
      set('recording', { active: false, meetingId: null, elapsed: 0, feedIdx: 0 });
      await dlg.alert('Recording stopped. ' + transcriptLen + ' transcript lines captured. Click "Generate AI Summary" on the AI Summary tab to process.');
    } else {
      set('recording', { active: true, meetingId: m.id, elapsed: 0, feedIdx: 0 });
    }
  };

  // ============ AI SUMMARY ============
  const generateAISummary = () => {
    setAiLoading(true);
    setTimeout(async () => {
      await run(putAiSummary({ id: m.id, aiSummary: JSON.parse(JSON.stringify(AI_SUMMARY_DEMO)) }));
      setAiLoading(false);
    }, 2200);
  };
  const logAllAIDecisions = async () => {
    if (!m.aiSummary) return;
    if (!await dlg.confirm('Log all ' + m.aiSummary.decisions.length + ' AI-detected decision(s) to the Decisions Registry?')) return;
    const res = await run(logAi(m.id));
    if (res) await dlg.alert('✓ ' + (res.created?.length ?? 0) + ' decisions logged to the registry.');
  };
  const applyAIActions = async () => {
    if (!m.aiSummary) return;
    const res = await run(applyAi(m.id));
    if (!res) return;
    await dlg.alert((res.created?.length ?? 0) + ' AI-extracted action items added to Action Items.');
    setTab('actions');
  };

  // ============ MINUTES ============
  const updateMinutes = (agendaKey, field, val) => {
    const next = { ...minutes, [agendaKey]: { ...(minutes[agendaKey] || {}), [field]: val } };
    setMinutesDraft(next);
    clearTimeout(minutesTimer.current);
    minutesTimer.current = setTimeout(async () => {
      try { await putMinutes({ id: m.id, minutes: next }).unwrap(); setMinutesDraft(null); }
      catch (err) { show(err, 'error'); }
    }, 700);
  };
  const addActionFromMinutes = async (agendaText) => {
    const a = await run(createAction({ id: m.id, desc: 'Follow-up from: ' + agendaText }));
    if (a) { setFocusActionId(a.id); setTab('actions'); }
  };
  const attachFile = () => dlg.alert('File picker would open here. In production: attach image, PDF, document to this agenda item. Stored with the meeting and re-opened on review.');
  const linkDecision = async (agendaIdx) => {
    const decText = await dlg.prompt('Enter the decision text to log in the Decisions Registry:');
    if (!decText || !decText.trim()) return;
    const dept = await dlg.prompt('Department (e.g. Accounts, Operations, Board):', 'Operations') || 'General';
    const d = await run(createDecision({ id: m.id, agendaIdx, text: decText.trim(), department: dept }));
    if (d) await dlg.alert('✓ Decision logged to the registry.');
  };
  const finaliseMinutes = async () => {
    if (m.minutesFinalised) {
      if (!await dlg.confirm('Minutes are finalised and locked.\n\nRe-open them for editing?')) return;
      run(reopen(m.id), '✓ Minutes re-opened for editing.');
      return;
    }
    if (!await dlg.confirm('Finalise minutes and circulate?\n\nOnce finalised, edits require explicit re-open. Draft will be locked.')) return;
    const ok = await run(finalise(m.id));
    if (ok) setCircOpen(true);
  };
  const confirmCirculate = async () => {
    setCircOpen(false);
    const res = await run(circulate(m.id));
    if (!res) return;
    const total = res.recipients?.total ?? 0;
    setTimeout(() => dlg.alert('✓ Minutes dispatched to ' + total + ' recipients. Delivery receipts will post to Notifications as they land.'), 150);
  };
  const circAddEmail = (idx) => { setCircOpen(false); editExternalEmail(idx); setTimeout(() => setCircOpen(true), 100); };

  // ============ ACTIONS ============
  const addAction = async () => {
    const a = await run(createAction({ id: m.id }));
    if (a) setFocusActionId(a.id);
  };
  const patchAction = (actionId, body) => updateActionItem({ id: actionId, meetingId: m.id, ...body }).unwrap().catch(err => show(err, 'error'));
  const updateAction = (actionId, field, val) => {
    setDrafts(d => ({ ...d, [actionId]: { ...(d[actionId] || {}), [field]: val } }));
    const key = actionId + ':' + field;
    clearTimeout(actionTimers.current[key]);
    actionTimers.current[key] = setTimeout(() => patchAction(actionId, { [field]: val }), ACTION_DEBOUNCE[field] ?? 0);
  };
  const deleteAction = (actionId) => { removeActionItem({ id: actionId, meetingId: m.id }).unwrap().catch(err => show(err, 'error')); };
  const selectOwner = (actionId, name, isExternal) => {
    setDrafts(d => ({ ...d, [actionId]: { ...(d[actionId] || {}), owner: name, ownerType: isExternal ? 'external' : 'internal' } }));
    patchAction(actionId, { owner: name, ownerType: isExternal ? 'external' : 'internal' });
  };
  const extractActionsFromMinutes = async () => {
    const candidates = minutesCandidates(minutes);
    if (candidates.length === 0) { await dlg.alert(NO_CANDIDATES); return; }
    if (!await dlg.confirm('Found ' + candidates.length + ' candidate action(s) in the minutes:\n\n' + candidates.slice(0, 5).map((c, i) => (i + 1) + '. ' + c.slice(0, 80)).join('\n') + (candidates.length > 5 ? '\n…and ' + (candidates.length - 5) + ' more.' : '') + '\n\nAdd them all to Action Items?')) return;
    const res = await run(extract(m.id));
    if (res && !res.count) await dlg.alert(res.message || NO_CANDIDATES);
  };
  const remindOwnersNow = async () => {
    const open = (m.actions || []).filter(a => a.status !== 'done' && a.owner);
    if (open.length === 0) { await dlg.alert('No open actions with assigned owners to remind.'); return; }
    if (!await dlg.confirm('Send immediate reminder to ' + open.length + ' owner(s) with open actions?\n\nChannels: Email + MyDiary notification + WhatsApp (if integration connected).')) return;
    const res = await run(remind(m.id));
    if (res) await dlg.alert('✓ Reminders dispatched to ' + (res.count ?? open.length) + ' owner(s).');
  };
  const toggleActionExpand = (actionId) => { if (expandedId === actionId) setExpandedId(null); else { setExpandedId(actionId); setExpandTab('subtasks'); } };
  const addSubtask = async (actionId) => {
    const text = await dlg.prompt('Sub-task description:');
    if (!text || !text.trim()) return;
    run(addSubtaskApi({ id: actionId, meetingId: m.id, text: text.trim() }));
  };
  const toggleSubtask = (actionId, idx) => {
    const a = (m.actions || []).find(x => x.id === actionId);
    const s = a && a.subtasks[idx];
    if (!s) return;
    run(setSubtaskApi({ id: actionId, meetingId: m.id, index: idx, done: !s.done }));
  };
  const addComment = (actionId, text) => run(addCommentApi({ id: actionId, meetingId: m.id, text }));
  const addDependency = async (actionId) => {
    const others = (m.actions || []).filter(a => a.id !== actionId);
    if (others.length === 0) { await dlg.alert('No other action items in this meeting to depend on. Create one first.'); return; }
    const pick = await dlg.prompt('Which action does this depend on? Enter the row number (1–' + others.length + '):\n\n' + others.map((a, i) => (i + 1) + '. ' + a.desc.slice(0, 60)).join('\n'));
    const idx = parseInt(pick, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= others.length) return;
    run(addDependencyApi({ id: actionId, meetingId: m.id, dependsOn: others[idx].id }));
  };

  // The panes still read `m.minutes` and an `actionExtras` map keyed by action id — both are derived here
  // from the server record (the action item carries its own sub-tasks / comments / history).
  const view = { ...m, minutes, actions: (m.actions || []).map(a => ({ ...a, ...(drafts[a.id] || {}) })) };
  const actionExtras = {};
  (m.actions || []).forEach(a => { actionExtras[a.id] = { subtasks: a.subtasks || [], dependencies: a.dependencies || [], comments: a.comments || [], history: a.history || [] }; });

  const tabs = [
    { key: 'agenda', icon: '📋', label: 'Agenda', count: m.agenda.length },
    { key: 'live', icon: '🎙️', label: 'Live', count: transcriptLen ? transcriptLen : undefined },
    { key: 'minutes', icon: '📝', label: 'Minutes' },
    { key: 'ai', icon: '✨', label: 'AI Summary', count: m.aiSummary ? 'Ready' : undefined },
    { key: 'actions', icon: '✓', label: 'Actions', count: `${openActions}/${totalActions}` },
    { key: 'decisions', icon: '⚖️', label: 'Decisions', count: myDecisions.length ? myDecisions.length : undefined },
  ];

  return (
    <Box>
      <Fetching on={isFetching} />
      {error ? <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} /> : null}

      <DetailHead m={view} onEdit={editMeeting} onDuplicate={duplicateMeeting} onMarkCompleted={markCompleted} onCancel={cancelMeeting} onRestore={restoreMeeting} onDelete={deleteMeeting}
        onPreview={() => previewMinutes(view, myDecisions, dlg)} onExport={() => exportMinutes(view)} onCirculate={() => setCircOpen(true)} onOpenRsvp={openRsvp} onEditEmail={editExternalEmail} />

      <TabBar tabs={tabs} value={tab} onChange={setTab} sx={{ mb: '18px' }} />

      {tab === 'agenda' && <DetailAgendaPane m={view} onEdit={editMeeting} onAddParking={addParkingItem} onRmParking={rmParkingItem} onCyclePresence={cyclePresence} />}
      {tab === 'live' && <DetailLivePane m={view} recording={recording} onToggleRecording={toggleRecording} onDownload={() => downloadTranscript(view, dlg)} onGenerateAI={() => { setTab('ai'); setTimeout(generateAISummary, 100); }} />}
      {tab === 'ai' && <DetailAIPane m={view} loading={aiLoading} onGoLive={() => setTab('live')} onGenerate={generateAISummary} onLogDecisions={logAllAIDecisions} onApplyActions={applyAIActions} />}
      {tab === 'decisions' && <DetailDecisionsPane m={view} decisions={myDecisions} onViewRegistry={() => navigate('/decisions')} />}
      {tab === 'minutes' && <DetailMinutesPane m={view} onUpdateMinutes={updateMinutes} onConvertToAction={addActionFromMinutes} onAttachFile={attachFile} onLinkDecision={linkDecision}
        onPreview={() => previewMinutes(view, myDecisions, dlg)} onExport={() => exportMinutes(view)} onFinalise={finaliseMinutes} />}
      {tab === 'actions' && <DetailActionsPane m={view} actionExtras={actionExtras} expandedId={expandedId} expandTab={expandTab} onToggleExpand={toggleActionExpand} onExpandTab={setExpandTab} focusActionId={focusActionId}
        onAdd={addAction} onUpdate={updateAction} onDelete={deleteAction} onSelectOwner={selectOwner} onExtract={extractActionsFromMinutes} onRemind={remindOwnersNow}
        onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onAddDependency={addDependency} onAddComment={addComment} />}

      <DetailCirculateModal open={circOpen} m={view} onClose={() => setCircOpen(false)} onConfirm={confirmCirculate} onAddEmail={circAddEmail} />
      {toast}
    </Box>
  );
}
