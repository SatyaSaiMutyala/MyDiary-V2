import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens } from '../../theme/tokens';
import { useAppStore } from '../../store/AppStore';
import { VISIT_TYPES, VISIT_TEMPLATES } from '../../data/visits';
import { PageHeader, Btn, DmsCard, EmptyState, TabBar } from '../../components';
import { myVisits, newVisitDraft, applyVisitTemplate } from './utils';
import VisitCard from './components/VisitCard';
import VisitModal from './modals/VisitModal';
import VisitDetailModal from './modals/VisitDetailModal';

export default function VisitsPage() {
  const { state, mutate, notify } = useAppStore();
  const viewer = state.viewer.name;
  const [tab, setTab] = useState('all');      // VISITS_TAB
  const [draft, setDraft] = useState(null);   // VISIT_DRAFT (editor open while non-null)
  const [detailId, setDetailId] = useState(null);

  const visits = myVisits(state.visits, viewer);
  const submitted = visits.filter(v => v.status === 'submitted');
  const drafts = visits.filter(v => v.status === 'draft');
  const counts = {};
  Object.keys(VISIT_TYPES).forEach(k => { counts[k] = visits.filter(v => v.type === k).length; });
  const filtered = (tab === 'all' ? visits : visits.filter(v => v.type === tab)).sort((a, b) => b.date.localeCompare(a.date));
  const detailVisit = detailId ? state.visits.find(v => v.id === detailId) : null;

  const openVisitModal = (editId) => {
    if (editId) {
      const existing = state.visits.find(v => v.id === editId);
      if (!existing) return;
      setDraft(JSON.parse(JSON.stringify(existing)));
    } else {
      setDraft(newVisitDraft(viewer));
    }
  };

  const pickVisitTemplate = () => {
    const menu = VISIT_TEMPLATES.map((t, i) => (i + 1) + '. ' + t.emoji + ' ' + t.name).join('\n');
    const pick = window.prompt('Which visit template?\n\n' + menu + '\n\nEnter a number, or blank to cancel.');
    if (!pick) return;
    const idx = parseInt(pick.trim(), 10) - 1;
    if (idx < 0 || idx >= VISIT_TEMPLATES.length) return;
    setDraft(applyVisitTemplate(newVisitDraft(viewer), VISIT_TEMPLATES[idx]));
  };

  const openVisitDetail = (id) => {
    const v = state.visits.find(x => x.id === id);
    if (!v) return;
    if (v.status === 'draft') { openVisitModal(id); return; }  // drafts open the editor directly
    setDetailId(id);
  };

  const saveVisit = (targetStatus, d) => {
    if (!d.title.trim()) { window.alert('Please enter a visit title.'); return; }
    if (targetStatus === 'submitted') {
      if (!d.org.name.trim()) { window.alert('Organisation name required to submit.'); return; }
      if (!d.purpose.trim()) { window.alert('Purpose of visit required to submit.'); return; }
      if (!d.overallAssessment) { window.alert('Overall Assessment required to submit.'); return; }
    }
    const rec = { ...d, status: targetStatus };
    if (targetStatus === 'submitted' && !rec.submittedAt) rec.submittedAt = new Date().toISOString();
    mutate('visits', vs => {
      const i = vs.findIndex(v => v.id === rec.id);
      if (i >= 0) vs[i] = rec; else vs.unshift(rec);
    });
    if (targetStatus === 'submitted' && rec.actionItems.length) {
      notify({ type: 'action', icon: '📝', text: '<strong>Visit submitted:</strong> "' + rec.title + '" — ' + rec.actionItems.length + ' action item' + (rec.actionItems.length > 1 ? 's' : '') + ' auto-synced to My To-Do of assigned owners.' });
    }
    setDraft(null);
    setTimeout(() => window.alert(targetStatus === 'submitted' ? '✓ Visit report submitted. Action items dispatched to owners.' : '💾 Draft saved.'), 100);
  };

  const tabs = [
    { key: 'all', icon: '📝', label: 'All Visits', count: visits.length },
    ...Object.entries(VISIT_TYPES).filter(([k]) => counts[k] > 0).map(([k, t]) => ({ key: k, icon: t.emoji, label: t.label, count: counts[k] })),
  ];

  return (
    <Box>
      <PageHeader parts={['MyDiary · Field Log', 'Site Observations']} icon="📝" title="My Visit Observations"
        sub="Log any site visit — supplier audits, branch inspections, new premises walks, customer sites, regulatory visits. Structured observations, ratings, photos, action items that flow to My To-Do."
        actions={<>
          <Btn size="lg" onClick={pickVisitTemplate}>📋 Use Template</Btn>
          <Btn variant="primary" size="lg" onClick={() => openVisitModal()}>+ New Visit</Btn>
        </>} />

      {/* .visits-meta-strip */}
      <Grid container spacing="12px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard label="Total Visits" value={visits.length} sub="All time · all types" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard label="Submitted" value={submitted.length} sub="Signed off" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard accent="yellow" label="Drafts" value={drafts.length} sub="Waiting to submit" /></Grid>
        <Grid size={{ xs: 6, lg: 3 }}><DmsCard accent="red" label="Follow-ups Open" value={submitted.filter(v => v.followUpRequired).length} sub="Next visits scheduled" /></Grid>
      </Grid>

      <TabBar tabs={tabs} value={tab} onChange={setTab} sx={{ mb: '14px' }} />

      {filtered.length === 0
        ? <EmptyState icon="📝" title="No visits logged" desc="Click + New Visit above to log your first site observation." />
        : filtered.map(v => <VisitCard key={v.id} visit={v} onOpen={openVisitDetail} />)}

      <VisitModal open={!!draft} draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={saveVisit} />
      <VisitDetailModal visit={detailVisit} onClose={() => setDetailId(null)} onEdit={(id) => { setDetailId(null); openVisitModal(id); }} />
    </Box>
  );
}
