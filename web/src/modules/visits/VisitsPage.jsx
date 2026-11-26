import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAppStore } from '../../store/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { VISIT_TYPES, VISIT_TEMPLATES } from '../../data/visits';
import { PageHeader, Btn, DmsCard, EmptyState, TabBar, Icon } from '../../components';
import { errorMessage } from '../../store/api/baseApi';
import { useCreateVisitMutation, useListVisitsQuery, useUpdateVisitMutation } from '../../store/api/visitsApi';
import { ApiError, Fetching, PAGE_SIZE, Pager } from '../settings/components/listUi';
import { newVisitDraft, applyVisitTemplate, samePerson, visitBody } from './utils';
import VisitCard from './components/VisitCard';
import VisitModal from './modals/VisitModal';
import VisitDetailModal from './modals/VisitDetailModal';
import { useDialog } from '../../components/Dialogs';

/** One page of reports is plenty for the type tabs and the four summary cards, which count the whole list. */

export default function VisitsPage() {
  const dlg = useDialog();
  const { state } = useAppStore();
  const { user } = useAuth();
  const viewer = state.viewer.name;
  const [tab, setTab] = useState('all');      // VISITS_TAB
  const [draft, setDraft] = useState(null);   // VISIT_DRAFT (editor open while non-null)
  const [detailId, setDetailId] = useState(null);

  // GET /api/visits — my reports only. `mine=true` is relative to the signed-in person, so a "View as"
  // demo switch falls back to filtering by that person's name.
  const viewingSelf = !!user && samePerson(user.name, viewer);
  /**
   * One page of visits at a time, filtered by the server.
   *
   * The tab used to be applied here, over every visit ever logged, which meant the whole history
   * travelled on every load just to draw one tab of it.
   */
  const whose = viewingSelf ? { mine: 'true' } : { owner: viewer };
  const sig = `${tab}|${viewingSelf}|${viewer}`;
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const { data, error, isLoading, isFetching, refetch } = useListVisitsQuery({
    ...whose, ...(tab === 'all' ? null : { type: tab }),
    page, limit: PAGE_SIZE, sort: '-date',
  });

  // The strip above the list counts everything, not just this page: one `limit=1` call each, so
  // only the totals travel.
  const totalCt = useListVisitsQuery({ ...whose, limit: 1, fields: 'title' }).data?.total ?? 0;
  const submittedCt = useListVisitsQuery({ ...whose, status: 'submitted', limit: 1, fields: 'title' }).data?.total ?? 0;
  const draftCt = useListVisitsQuery({ ...whose, status: 'draft', limit: 1, fields: 'title' }).data?.total ?? 0;
  const followUpCt = useListVisitsQuery({ ...whose, status: 'submitted', followUpRequired: 'true', limit: 1, fields: 'title' }).data?.total ?? 0;
  const [createVisit] = useCreateVisitMutation();
  const [updateVisit] = useUpdateVisitMutation();

  const visits = data?.items || [];
  const filtered = visits;
  const detailVisit = detailId ? visits.find(v => v.id === detailId) : null;

  const openVisitModal = (editId) => {
    if (editId) {
      const existing = visits.find(v => v.id === editId);
      if (!existing) return;
      setDraft(JSON.parse(JSON.stringify(existing)));
    } else {
      setDraft(newVisitDraft(viewer));
    }
  };

  const pickVisitTemplate = async () => {
    const menu = VISIT_TEMPLATES.map((t, i) => (i + 1) + '. ' + t.name).join('\n');
    const pick = await dlg.prompt('Which visit template?\n\n' + menu + '\n\nEnter a number, or blank to cancel.');
    if (!pick) return;
    const idx = parseInt(pick.trim(), 10) - 1;
    if (idx < 0 || idx >= VISIT_TEMPLATES.length) return;
    setDraft(applyVisitTemplate(newVisitDraft(viewer), VISIT_TEMPLATES[idx]));
  };

  const openVisitDetail = (id) => {
    const v = visits.find(x => x.id === id);
    if (!v) return;
    if (v.status === 'draft') { openVisitModal(id); return; }  // drafts open the editor directly
    setDetailId(id);
  };

  const saveVisit = async (targetStatus, d) => {
    if (!d.title.trim()) { await dlg.alert('Please enter a visit title.'); return; }
    if (targetStatus === 'submitted') {
      if (!d.org.name.trim()) { await dlg.alert('Organisation name required to submit.'); return; }
      if (!d.purpose.trim()) { await dlg.alert('Purpose of visit required to submit.'); return; }
      if (!d.overallAssessment) { await dlg.alert('Overall Assessment required to submit.'); return; }
    }
    // The server stamps submittedAt, writes the Activity Log line and notifies the follow-up owners.
    const body = visitBody(d, targetStatus);
    try {
      if (d.id) await updateVisit({ id: d.id, ...body }).unwrap();
      else await createVisit(body).unwrap();
    } catch (err) {
      await dlg.alert(errorMessage(err));   // the server's wording, shown as-is
      return;
    }
    setDraft(null);
    setTimeout(() => dlg.alert(targetStatus === 'submitted' ? '✓ Visit report submitted. Action items dispatched to owners.' : 'Draft saved.'), 100);
  };

  // Every type is offered, with no count on it: counting each one would mean a query per type on
  // every load, and the number beside a tab is not worth that. The chosen tab's own total is on
  // the strip above, and in the pager below the list.
  const tabs = [
    { key: 'all', icon: '', label: 'All Visits', count: totalCt },
    ...Object.entries(VISIT_TYPES).map(([k, t]) => ({ key: k, icon: <Icon name={t.icon} />, label: t.label })),
  ];

  return (
    <Box>
      <PageHeader parts={['MyDiary · Field Log', 'Site Observations']} icon={<Icon name="note" />} title="My Visit Observations"
        sub="Log any site visit — supplier audits, branch inspections, new premises walks, customer sites, regulatory visits. Structured observations, ratings, photos, action items that flow to My To-Do."
        actions={<>
          <Btn size="lg" onClick={pickVisitTemplate}><Icon name="clipboard" />Use Template</Btn>
          <Btn variant="primary" size="lg" onClick={() => openVisitModal()}>+ New Visit</Btn>
        </>} />

      {/* .visits-meta-strip */}
      <Grid container spacing="12px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard label="Total Visits" value={totalCt} sub="All time · all types" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard label="Submitted" value={submittedCt} sub="Signed off" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard accent="yellow" label="Drafts" value={draftCt} sub="Waiting to submit" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard accent="red" label="Follow-ups Open" value={followUpCt} sub="Next visits scheduled" /></Grid>
      </Grid>

      <ApiError error={error} onRetry={refetch} sx={{ mb: 1.5 }} />
      <Fetching on={isFetching && !isLoading} />

      <TabBar tabs={tabs} value={tab} onChange={setTab} sx={{ mb: '14px' }} />

      {isLoading
        ? <EmptyState icon="⏳" title="Loading your visits…" desc="Fetching your visit observations from the server." />
        : filtered.length === 0
          ? !error && <EmptyState icon={<Icon name="note" />} title="No visits logged" desc="Click + New Visit above to log your first site observation." />
          : <>
            {filtered.map(v => <VisitCard key={v.id} visit={v} onOpen={openVisitDetail} />)}
            <Pager data={data} page={page} onPage={setPage} loading={isFetching} />
          </>}

      <VisitModal open={!!draft} draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={saveVisit} />
      <VisitDetailModal visit={detailVisit} onClose={() => setDetailId(null)} onEdit={(id) => { setDetailId(null); openVisitModal(id); }} />
    </Box>
  );
}
