import { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { tokens, fonts } from '../../theme/tokens';
import { PageHeader, Btn, Avatar, EmptyState, MonoHeading, TabBar, FilterPill } from '../../components';
import { isOverdue } from '../../utils/dates';
import { errorMessage } from '../../store/api/baseApi';
import { useAllocateTaskMutation, useLazyListActionItemsQuery, useListActionItemsQuery, useUpdateActionItemMutation } from '../../store/api/actionItemsApi';
import { ApiError, Fetching } from '../settings/components/listUi';
import { actionToTodo, collectTodoItems, samePerson } from './utils';
import TodoCard from './components/TodoCard';
import ReassignModal from './modals/ReassignModal';
import StandaloneTaskModal from './modals/StandaloneTaskModal';
import CompleteDialog from './modals/CompleteDialog';
import { useDialog } from '../../components/Dialogs';

function BannerStat({ val, lbl, valColor, sx }) {
  return (
    <Box sx={{ textAlign: 'center', ...sx }}>
      <Box sx={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 700, lineHeight: 1, color: valColor }}>{val}</Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, mt: '4px' }}>{lbl}</Box>
    </Box>
  );
}

/** How many rows a screenful holds. "Load more" fetches the next page of the same size. */
const PAGE = 15;

export default function MyTodoPage() {
  const dlg = useDialog();
  const { state, mutate, notify } = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState('owed');   // 'all' | 'owed' | 'delegated' | 'overdue' | 'done'
  const [srcFilter, setSrcFilter] = useState('all');      // 'all' | 'meetings' | 'visits' | 'standalone'
  const [standaloneOpen, setStandaloneOpen] = useState(false);
  const [reassigning, setReassigning] = useState(null);
  const [editing, setEditing] = useState(null);
  const [compCtx, setCompCtx] = useState(null);

  const me = state.viewer.name;
  const viewingSelf = !!user && samePerson(user.name, me);
  /**
   * Who may change a task after it was written: whoever wrote it, and an admin.
   *
   * The person it was given to is deliberately not on that list — they can tick it, comment on it
   * and hand it on, but rewording somebody else's instruction or moving its date is not theirs to
   * do quietly.
   */
  const canEdit = (t) => user?.role === 'admin' || samePerson(t.creator, me);

  /**
   * The two lists, each narrowed by the server.
   *
   * `delegated=true` used to be done here instead: the page fetched every action item in the
   * company and picked out its own. That put other people's tasks on the wire, and it lost rows —
   * one page holds at most 200, which ran out long before it reached the ones that were yours.
   *
   * `limit` grows by a screenful at a time when "Load more" is pressed, and the server's `total`
   * is what the counts are drawn from, so nothing is ever hidden without saying so.
   */
  const mineArgs = viewingSelf ? { mine: 'true' } : { owner: me };
  const mineQ = useListActionItemsQuery({ ...mineArgs, limit: PAGE, sort: 'deadline' });
  // Items I created and handed to someone else — /api/action-items has no creator filter, so the page
  // takes one list and keeps the rows whose createdBy is me.
  const allQ = useListActionItemsQuery({ delegated: 'true', limit: PAGE, sort: 'deadline' });

  /**
   * Pages beyond the first, kept here and added to the two lists.
   *
   * It has to be page-by-page rather than one ever-larger request: the server will not return
   * more than 200 rows at once, so asking for 300 fails and the screen is left showing what it
   * already had, with no sign that anything is missing.
   */
  const [pages, setPages] = useState(1);
  const [moreMine, setMoreMine] = useState([]);
  const [moreDelegated, setMoreDelegated] = useState([]);
  const [fetchPage, { isFetching: loadingMore }] = useLazyListActionItemsQuery();

  const loadMore = async () => {
    const next = pages + 1;
    const want = (held) => held > PAGE * pages;
    try {
      if (want(mineQ.data?.total ?? 0)) {
        const r = await fetchPage({ ...mineArgs, limit: PAGE, page: next, sort: 'deadline' }).unwrap();
        setMoreMine(x => [...x, ...(r.items ?? [])]);
      }
      if (want(allQ.data?.total ?? 0)) {
        const r = await fetchPage({ delegated: 'true', limit: PAGE, page: next, sort: 'deadline' }).unwrap();
        setMoreDelegated(x => [...x, ...(r.items ?? [])]);
      }
      setPages(next);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };
  const [updateActionItem] = useUpdateActionItemMutation();
  const [allocateTask] = useAllocateTaskMutation();

  const mineFromApi = [...(mineQ.data?.items || []), ...moreMine].map(actionToTodo).filter(x => x.ownerType !== 'external');
  const delegatedFromApi = [...(allQ.data?.items || []), ...moreDelegated].map(actionToTodo);
  // What the server holds in total, against what this page has actually been given.
  const heldOwed = mineQ.data?.total ?? 0;
  const heldDelegated = allQ.data?.total ?? 0;
  const gotOwed = (mineQ.data?.items?.length ?? 0) + moreMine.length;
  const gotDelegated = (allQ.data?.items?.length ?? 0) + moreDelegated.length;
  const loaded = gotOwed + gotDelegated;
  const leftOwed = Math.max(0, heldOwed - gotOwed);
  const leftDelegated = Math.max(0, heldDelegated - gotDelegated);
  const more = leftOwed + leftDelegated;
  // One press fetches the next page of each list that still has one, so this is what will arrive.
  const nextBatch = Math.min(leftOwed, PAGE) + Math.min(leftDelegated, PAGE);

  const apiExtras = {};
  [...(mineQ.data?.items || []), ...(allQ.data?.items || [])].forEach(a => { apiExtras[a.id] = { subtasks: a.subtasks || [], dependencies: a.dependencies || [], comments: a.comments || [], history: a.history || [] }; });

  // Visits and standalone tasks are still the in-memory demo data.
  const local = collectTodoItems(state);

  const owedByMe = [...mineFromApi, ...local.filter(x => x.owner === me && x.ownerType !== 'external')];
  const delegatedByMe = [...delegatedFromApi, ...local.filter(x => x.creator === me && x.owner !== me)];

  let roleScope;
  if (roleFilter === 'owed') roleScope = owedByMe;
  else if (roleFilter === 'delegated') roleScope = delegatedByMe;
  else if (roleFilter === 'overdue') roleScope = owedByMe.filter(x => x.status !== 'done' && isOverdue(x.deadline));
  else if (roleFilter === 'done') roleScope = owedByMe.filter(x => x.status === 'done');
  else roleScope = [...owedByMe, ...delegatedByMe.filter(x => !owedByMe.some(o => o.id === x.id))];

  const scoped = (srcFilter === 'all' ? roleScope : roleScope.filter(x => x.source === srcFilter)).slice();
  scoped.sort((a, b) => {
    const ao = a.status === 'done' ? 2 : (isOverdue(a.deadline) ? 0 : 1);
    const bo = b.status === 'done' ? 2 : (isOverdue(b.deadline) ? 0 : 1);
    if (ao !== bo) return ao - bo;
    return (a.deadline || '').localeCompare(b.deadline || '');
  });

  const open = owedByMe.filter(t => t.status !== 'done');
  const overdueCt = owedByMe.filter(t => t.status !== 'done' && isOverdue(t.deadline)).length;
  const doneCt = owedByMe.filter(t => t.status === 'done').length;
  const srcCt = (src) => roleScope.filter(x => x.source === src).length;

  // ---- mutations (setSimpleTodoStatus / nudgeOwner / reassignTodo / submitStandaloneTask) ----
  const setSimpleTodoStatus = (src, srcId, tid, newStatus) => {
    if (src === 'standalone') {
      mutate('standaloneTasks', ts => { const t = ts.find(x => x.id === tid); if (t) t.status = newStatus; });
    } else if (src === 'visits') {
      mutate('visits', vs => {
        const v = vs.find(x => x.id === srcId); if (!v) return;
        const parts = tid.split('-'); const idx = parseInt(parts[parts.length - 1], 10);
        const ai = v.actionItems && v.actionItems[idx]; if (ai) ai.status = newStatus;
      });
    }
  };
  const nudgeOwner = async (owner) => {
    notify({ type: 'action', icon: '🔔', text: `Nudge sent to <strong>${owner}</strong> re: a task you delegated.` });
    await dlg.alert('🔔 Nudge sent to ' + owner + ". They'll see it in their inbox and get a push notification.");
  };
  /** Hand a task to somebody else — the picker chooses the name, so it is always one that exists. */
  const reassignTo = async (t, name) => {
    if (t.fromApi) {
      try {
        await updateActionItem({ id: t.id, meetingId: t.meetingId, owner: name }).unwrap();
      } catch (err) {
        await dlg.alert(errorMessage(err));
        return;
      }
    } else if (t.source === 'visits') {
      mutate('visits', vs => {
        const v = vs.find(x => x.id === t.sourceId); if (!v) return;
        const parts = t.id.split('-'); const idx = parseInt(parts[parts.length - 1], 10);
        const ai = v.actionItems && v.actionItems[idx]; if (ai) ai.owner = name;
      });
    }
    notify({ type: 'action', icon: '↺', text: `Reassigned to <strong>${name}</strong> — "${t.desc.slice(0, 60)}${t.desc.length > 60 ? '…' : ''}"` });
    setReassigning(null);
  };

  /** Change a task already written. Only the real ones can be edited; the demo rows cannot. */
  const saveEdit = async ({ desc, owner, deadline, priority }) => {
    const t = editing;
    try {
      await updateActionItem({ id: t.id, meetingId: t.meetingId, desc, owner: owner || me, deadline, priority }).unwrap();
      notify({ type: 'action', icon: '✎', text: `Updated — "${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}"` });
      setEditing(null);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };
  /**
   * Saves the task on the server, where the person it is for can see it. It used to be kept in
   * this browser alone, so an "allocated" task never reached anybody — the owner's own To-Do read
   * the real list and found nothing.
   */
  const submitStandalone = async ({ desc, owner, deadline, priority }) => {
    try {
      const saved = await allocateTask({ desc, owner: owner || undefined, deadline, priority }).unwrap();
      notify({
        type: 'action',
        icon: '⚡',
        text: saved.owner === me
          ? `New task on your list — "${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}"`
          : `Allocated to <strong>${saved.owner}</strong> — "${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}". They have been told.`,
      });
      setStandaloneOpen(false);
    } catch (err) {
      await dlg.alert(errorMessage(err));
      return;
    }
  };

  const card = (t, od) => (
    <TodoCard key={t.source + ':' + t.id} t={t} isOverdueFlag={od} me={me}
      extras={t.source === 'meetings' ? (apiExtras[t.id] || {}) : {}}
      onOpenSource={() => (t.source === 'meetings' ? navigate(`/meetings/${t.sourceId}`) : navigate('/visits'))}
      onComplete={(mode) => setCompCtx({ action: t.raw, mode })}
      onSimple={(status) => setSimpleTodoStatus(t.source, t.sourceId, t.id, status)}
      onNudge={() => nudgeOwner(t.owner)}
      onReassign={() => setReassigning(t)}
      onEdit={t.fromApi && canEdit(t) ? () => setEditing(t) : undefined} />
  );

  let body;
  if (scoped.length === 0) {
    body = <EmptyState icon="✅" title="Clean inbox" desc="Nothing in this view." />;
  } else if (roleFilter === 'owed' || roleFilter === 'all') {
    const overdueGroup = scoped.filter(t => t.status !== 'done' && isOverdue(t.deadline));
    const openGroup = scoped.filter(t => t.status !== 'done' && !isOverdue(t.deadline));
    const doneGroup = scoped.filter(t => t.status === 'done');
    body = <>
      {overdueGroup.length > 0 && <><MonoHeading color={tokens.red} sx={{ m: '14px 0 10px' }}>⚠ Overdue · needs attention now</MonoHeading>{overdueGroup.map(t => card(t, true))}</>}
      {openGroup.length > 0 && <><MonoHeading color={tokens.tealDark} sx={{ m: '20px 0 10px' }}>⌛ Open · by deadline</MonoHeading>{openGroup.map(t => card(t, false))}</>}
      {doneGroup.length > 0 && <><MonoHeading color={tokens.slate} sx={{ m: '20px 0 10px' }}>✓ Recently completed</MonoHeading>{doneGroup.slice(0, 10).map(t => card(t, false))}</>}
    </>;
  } else {
    body = scoped.map(t => card(t, t.status !== 'done' && isOverdue(t.deadline)));
  }

  return (
    <Box>
      <PageHeader code="TL-OPS-DRM-001" parts={['MyDiary · Unified Inbox', 'Personal Queue']} icon="✅" title="My To-Do"
        sub="Every action owed by you or delegated by you — from meetings, visits, workflows or ad-hoc — in one deadline-sorted inbox. Complete here and the source updates automatically."
        actions={<Btn variant="primary" size="lg" onClick={() => setStandaloneOpen(true)}>+ New Task</Btn>} />

      {/* .mt-banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', p: { xs: '16px 18px', md: '20px 24px' }, borderRadius: tokens.radius, mb: '20px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
        <Avatar name={me} size={60} fontSize={20} sx={{ border: '3px solid rgba(255,255,255,0.3)' }} />
        <Box>
          <Box sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{me === 'Venkata Cherukuri' ? 'Your To-Do inbox' : `${me}'s To-Do inbox`}</Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, mt: '3px' }}>{state.viewer.role}{me !== (user?.name ?? me) ? ' · Viewing as another user' : ''}</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: '20px', ml: { xs: 0, md: 'auto' }, flexWrap: 'wrap', alignItems: 'center' }}>
          <BannerStat val={open.length} lbl="Open" />
          <BannerStat val={overdueCt} lbl="Overdue" valColor="#FBD5D5" />
          <BannerStat val={doneCt} lbl="Done" valColor={tokens.yellow} />
          <BannerStat val={delegatedByMe.length} lbl="I Delegated" sx={{ bgcolor: '#EEF2FF', color: '#3730A3', p: '6px 12px', borderRadius: '8px' }} />
        </Box>
      </Box>

      {/* .my-actions-tabs → shared GateBook TabBar */}
      <TabBar value={roleFilter} onChange={setRoleFilter} sx={{ mb: '16px' }} tabs={[
        { key: 'owed', icon: '⚡', label: 'Owed by Me', count: owedByMe.length },
        { key: 'delegated', icon: '🔁', label: 'Delegated by Me', count: delegatedByMe.length },
        { key: 'overdue', icon: '⚠', label: 'Overdue', count: overdueCt },
        { key: 'done', icon: '✓', label: 'Done', count: doneCt },
        { key: 'all', icon: '📋', label: 'Everything', count: [...owedByMe, ...delegatedByMe.filter(x => !owedByMe.some(o => o.id === x.id))].length },
      ]} />

      <Box sx={{ display: 'flex', gap: 1, m: '12px 0 18px', p: '10px 14px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', color: tokens.slate, fontWeight: 700, mr: '4px' }}>SOURCE:</Box>
        <FilterPill active={srcFilter === 'all'} onClick={() => setSrcFilter('all')} count={roleScope.length}>All</FilterPill>
        <FilterPill active={srcFilter === 'meetings'} onClick={() => setSrcFilter('meetings')} count={srcCt('meetings')}>📅 From Meetings</FilterPill>
        <FilterPill active={srcFilter === 'visits'} onClick={() => setSrcFilter('visits')} count={srcCt('visits')}>📝 From Visits</FilterPill>
        <FilterPill active={srcFilter === 'standalone'} onClick={() => setSrcFilter('standalone')} count={srcCt('standalone')}>⚡ Standalone</FilterPill>
      </Box>

      <ApiError error={mineQ.error || allQ.error} onRetry={() => { mineQ.refetch(); allQ.refetch(); }} sx={{ mb: 1.5 }} />
      <Fetching on={mineQ.isFetching || allQ.isFetching} />

      {body}

      {/* Nothing is hidden silently: if the server holds more than this page was given, it says
          so and offers the rest. */}
      {more > 0 && (
        <Box sx={{ textAlign: 'center', mt: '18px' }}>
          <Btn onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load ${nextBatch} more`}
          </Btn>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, mt: '7px', letterSpacing: '0.06em' }}>
            SHOWING {loaded} OF {heldOwed + heldDelegated}
          </Box>
        </Box>
      )}

      {scoped.length > 0 && (
        <Box sx={{ mt: '20px', p: '14px 18px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, fontSize: 12, color: tokens.slate, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Box component="span" sx={{ fontSize: 16 }}>🔁</Box>
          <span><strong style={{ color: tokens.ink }}>Round-trip:</strong> When you complete, defer or block a task here, the source meeting / visit updates automatically with your comment, status change, and timestamp — logged in the action's history and visible to the originator.</span>
        </Box>
      )}

      {standaloneOpen && <StandaloneTaskModal open me={me} onClose={() => setStandaloneOpen(false)} onSubmit={submitStandalone} />}
      {editing && <StandaloneTaskModal open me={me} task={editing} onClose={() => setEditing(null)} onSubmit={saveEdit} />}
      {reassigning && <ReassignModal task={reassigning} me={me} onClose={() => setReassigning(null)} onSubmit={(name) => reassignTo(reassigning, name)} />}
      {compCtx && <CompleteDialog key={compCtx.action.id + compCtx.mode} ctx={compCtx} onClose={() => setCompCtx(null)} />}
    </Box>
  );
}
