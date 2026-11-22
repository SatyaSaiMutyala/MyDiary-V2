import { useState } from 'react';
import { Box, Modal, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, TextLink, VSection, Field, TextInput, TextArea, SelectInput, DelBtn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useAppStore } from '../../../store/AppStore';
import { PROJ_CATEGORIES, PROJ_STATUSES } from '../../../data/projects';
import { EMPLOYEES } from '../../../data/employees';
import { WIZ_STEPS, newId } from '../utils';

const DATALIST_ID = 'proj-emp-datalist';
const listProps = { inputProps: { list: DATALIST_ID } };
const hint = (txt) => <Box sx={{ fontSize: 12, color: tokens.slate, mb: '10px' }}>{txt}</Box>;
const rowSx = (bg = tokens.cream) => ({ p: '6px 10px', bgcolor: bg, borderRadius: '5px', alignItems: 'center' });
const PRI_OPTS = [['low', 'Low'], ['medium', 'Med'], ['high', 'High'], ['critical', 'Crit']];

/**
 * New / Edit Project wizard (prototype 15911–16238). 780px, gradient head, 4-step stepper.
 * Mount with key={draft.id} so state resets per draft. onSaved() after a successful upsert.
 */
export default function ProjectWizardModal({ draft: initialDraft, onClose, onSaved }) {
  const { state, mutate, notify } = useAppStore();
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(initialDraft)));
  const [step, setStep] = useState(1);
  const isEdit = state.projects.some(p => p.id === d.id);

  // imperative-style draft edit (PROJ_DRAFT.x = v; renderProjectModal())
  const ed = (fn) => setD(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });

  const wizNext = () => {
    if (step === 1) {
      if (!d.name.trim()) { window.alert('Project Name is required.'); return; }
      if (!d.description.trim()) { window.alert('Project Description is required.'); return; }
    }
    if (step < 4) setStep(step + 1);
  };
  const wizPrev = () => { if (step > 1) setStep(step - 1); };
  const wizGoTo = (s) => { if (isEdit || s <= step + 1) setStep(s); };

  const saveProject = () => {
    if (!d.name.trim()) { window.alert('Project name required.'); return; }
    if (!d.description.trim()) { window.alert('Project description required.'); return; }
    const existing = state.projects.findIndex(p => p.id === d.id);
    const me = state.viewer.name;
    const final = JSON.parse(JSON.stringify(d));
    final.updatedAt = new Date().toISOString().slice(0, 10);
    if (existing >= 0) {
      final.activity.unshift({ user: me, action: 'updated the project', at: 'Just now' });
      mutate('projects', ps => { ps[existing] = final; });
    } else {
      final.activity = [{ user: me, action: 'created the project', at: 'Just now' }];
      mutate('projects', ps => { ps.unshift(final); });
    }
    notify({ type: 'meeting', icon: '📁', text: '<strong>Project ' + (existing >= 0 ? 'updated' : 'created') + ':</strong> "' + final.name + '" — ' + (final.team.length + final.external.length) + ' people notified.' });
    onClose();
    if (onSaved) onSaved(final, existing >= 0);
    setTimeout(() => window.alert('✓ Project saved.'), 100);
  };

  const msOpts = [<option key="" value="">— None (project-wide) —</option>, ...(d.milestones || []).map(m => <option key={m.id} value={m.id}>🏁 {m.name || '(unnamed)'}</option>)];

  const footNote = step === 1 ? '📋 Fill the basics — name & description required'
    : step === 2 ? `👥 ${d.team.length} internal + ${d.external.length} external will be notified`
    : step === 3 ? `🏁 ${d.milestones.length} milestone${d.milestones.length !== 1 ? 's' : ''} planned (can add more later)`
    : `✓ ${d.tasks.length} tasks · 📈 ${d.kpis.length} KPIs · ⚠ ${d.risks.length} risks — all optional`;

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1.5, md: 2.5 } }} slotProps={{ backdrop: { sx: { bgcolor: 'rgba(26,58,47,0.6)', backdropFilter: 'blur(4px)' } } }}>
      <Box sx={{ bgcolor: tokens.card, borderRadius: '14px', boxShadow: tokens.shadowLg, width: 780, maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}>
        <datalist id={DATALIST_ID}>{EMPLOYEES.flatMap(g => g.people).map(e => <option key={e.name} value={e.name} />)}</datalist>

        {/* .visit-modal-head */}
        <Box sx={{ p: { xs: '16px 18px', md: '20px 28px' }, background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📁</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, m: 0, letterSpacing: '-0.01em' }}>{isEdit ? 'Edit Project' : 'New Project'}</Typography>
            <Box sx={{ fontSize: 12, opacity: 0.85, mt: '3px', fontFamily: fonts.mono, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d.code} · Step {step} of 4 — {WIZ_STEPS[step - 1].label}</Box>
          </Box>
          <Box component="button" type="button" onClick={onClose} sx={{ ml: 'auto', width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</Box>
        </Box>

        {/* .wiz-stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: { xs: '12px 16px', md: '16px 28px' }, bgcolor: tokens.creamWarm, borderBottom: `1px solid ${tokens.line}` }}>
          {WIZ_STEPS.map((s, i) => {
            const active = step === s.n, done = step > s.n;
            return [
              <Box key={s.n} onClick={() => wizGoTo(s.n)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 4px', cursor: 'pointer', fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: done ? tokens.greenDeep : active ? tokens.tealDark : tokens.slateSoft, transition: 'color 0.15s', whiteSpace: 'nowrap', '&:hover': { color: tokens.tealDark } }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: done ? tokens.greenDeep : active ? tokens.teal : tokens.card, border: `2px solid ${done ? tokens.greenDeep : active ? tokens.teal : tokens.line}`, color: done || active ? '#fff' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, boxSizing: 'border-box' }}>{done ? '✓' : s.n}</Box>
                <Box component="span" sx={{ display: { xs: active ? 'inline' : 'none', sm: 'inline' } }}>{s.label}</Box>
              </Box>,
              i < WIZ_STEPS.length - 1 && <Box key={'sep' + s.n} sx={{ flex: 1, height: 2, bgcolor: done ? tokens.teal : tokens.line, mx: '10px', borderRadius: '1px' }} />,
            ];
          })}
        </Box>

        {/* .visit-modal-body */}
        <Box sx={{ p: { xs: '16px', md: '20px 28px' }, overflowY: 'auto', flex: 1, bgcolor: tokens.creamWarm }}>
          {step === 1 && (
            <VSection head="📋 Project Details">
              <Grid container spacing="12px" sx={{ mb: '12px' }}>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Project Code"><TextInput value={d.code} onChange={e => ed(x => { x.code = e.target.value; })} /></Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Owner"><TextInput value={d.owner} onChange={e => ed(x => { x.owner = e.target.value; })} {...listProps} /></Field></Grid>
              </Grid>
              <Field label="Project Name" req sx={{ mb: '12px' }}><TextInput value={d.name} onChange={e => ed(x => { x.name = e.target.value; })} placeholder="e.g. NABL Surveillance Audit — Dec 2026 Prep" /></Field>
              <Field label="Description" req sx={{ mb: '12px' }}><TextArea value={d.description} onChange={e => ed(x => { x.description = e.target.value; })} placeholder="What is this project about? Scope, objectives, success criteria..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 80, resize: 'vertical', lineHeight: 1.5 } }} /></Field>
              <Grid container spacing="12px" sx={{ mb: '12px' }}>
                <Grid size={{ xs: 12, sm: 4 }}><Field label="Category"><SelectInput value={d.category} onChange={e => ed(x => { x.category = e.target.value; })}>{Object.entries(PROJ_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</SelectInput></Field></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label="Priority"><SelectInput value={d.priority} onChange={e => ed(x => { x.priority = e.target.value; })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></SelectInput></Field></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><Field label="Status"><SelectInput value={d.status} onChange={e => ed(x => { x.status = e.target.value; })}>{Object.entries(PROJ_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectInput></Field></Grid>
              </Grid>
              <Grid container spacing="12px">
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Start Date"><TextInput type="date" value={d.startDate} onChange={e => ed(x => { x.startDate = e.target.value; })} /></Field></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="End Date"><TextInput type="date" value={d.endDate} onChange={e => ed(x => { x.endDate = e.target.value; })} /></Field></Grid>
              </Grid>
            </VSection>
          )}

          {step === 2 && (
            <>
              <VSection head="👥 Internal Team" meta={`${d.team.length} member${d.team.length !== 1 ? 's' : ''}`}>
                {hint('TDPL staff who will be part of this project — assign a role each.')}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                  {d.team.map((t, i) => (
                    <Grid container key={i} spacing={1} sx={rowSx()}>
                      <Grid size={{ xs: 12, sm: 'grow' }}><TextInput value={t.name} onChange={e => ed(x => { x.team[i].name = e.target.value; })} placeholder="Name" {...listProps} /></Grid>
                      <Grid size={{ xs: 10, sm: 'grow' }}><TextInput value={t.role || ''} onChange={e => ed(x => { x.team[i].role = e.target.value; })} placeholder="Role (e.g. Project Lead, Analyst)" /></Grid>
                      <Grid size="auto"><DelBtn onClick={() => ed(x => { x.team.splice(i, 1); })} /></Grid>
                    </Grid>
                  ))}
                </Box>
                <TextLink onClick={() => ed(x => { x.team.push({ name: '', role: '' }); })}>+ Add Team Member</TextLink>
              </VSection>
              <VSection head="🌐 External Collaborators" meta={d.external.length}>
                {hint("Consultants, vendors, auditors, partners — they'll receive updates by email.")}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                  {d.external.map((e, i) => (
                    <Grid container key={i} spacing={1} sx={rowSx(tokens.blueSoft)}>
                      <Grid size={{ xs: 12, sm: 'grow' }}><TextInput value={e.name} onChange={ev => ed(x => { x.external[i].name = ev.target.value; })} placeholder="Name" /></Grid>
                      <Grid size={{ xs: 12, sm: 'grow' }}><TextInput type="email" value={e.email} onChange={ev => ed(x => { x.external[i].email = ev.target.value; })} placeholder="Email" /></Grid>
                      <Grid size={{ xs: 10, sm: 'grow' }}><TextInput value={e.role || ''} onChange={ev => ed(x => { x.external[i].role = ev.target.value; })} placeholder="Role / Org" /></Grid>
                      <Grid size="auto"><DelBtn onClick={() => ed(x => { x.external.splice(i, 1); })} /></Grid>
                    </Grid>
                  ))}
                </Box>
                <TextLink onClick={() => ed(x => { x.external.push({ name: '', email: '', role: '' }); })}>+ Add External Collaborator</TextLink>
              </VSection>
            </>
          )}

          {step === 3 && (
            <VSection head="🏁 Project Milestones" meta={`${d.milestones.length} planned`}>
              {hint('Major checkpoints or gates for this project. You can set acceptance criteria later.')}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                {d.milestones.map((m, i) => (
                  <Grid container key={m.id || i} spacing={1} sx={rowSx()}>
                    <Grid size={{ xs: 12, sm: 'grow' }}><TextInput value={m.name || ''} onChange={e => ed(x => { x.milestones[i].name = e.target.value; })} placeholder="Milestone name" /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><TextInput type="date" value={m.dueDate || ''} onChange={e => ed(x => { x.milestones[i].dueDate = e.target.value; })} /></Grid>
                    <Grid size={{ xs: 5, sm: 3 }}><TextInput value={m.owner || ''} onChange={e => ed(x => { x.milestones[i].owner = e.target.value; })} placeholder="Owner" {...listProps} /></Grid>
                    <Grid size="auto"><DelBtn onClick={() => ed(x => { x.milestones.splice(i, 1); })} /></Grid>
                  </Grid>
                ))}
              </Box>
              <TextLink onClick={() => ed(x => { x.milestones.push({ id: newId('m'), name: '', dueDate: '', status: 'todo', owner: x.owner, description: '', acceptanceCriteria: [] }); })}>+ Add Milestone</TextLink>
              {d.milestones.length === 0 && <Box sx={{ mt: '12px', p: '10px 12px', bgcolor: tokens.creamWarm, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '6px', fontSize: 12, color: tokens.slate }}>💡 No milestones yet. Skip this step and add them later from the project detail view, or add at least one now so tasks and risks in the next step can link to it.</Box>}
            </VSection>
          )}

          {step === 4 && (
            <>
              <Box sx={{ fontSize: 12, color: tokens.slate, mb: '14px', p: '10px 12px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '6px' }}>
                💡 This step is entirely optional — all three sections can be added or edited later from the project detail view. Fill in whatever you already know.
              </Box>

              <VSection head="✓ Initial Tasks" meta={`${d.tasks.length} task${d.tasks.length !== 1 ? 's' : ''}`}>
                {hint('Specific work items. Link each to a milestone (optional) so progress rolls up.')}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                  {d.tasks.map((t, i) => (
                    <Grid container key={t.id || i} spacing="6px" sx={rowSx()}>
                      <Grid size={{ xs: 12, md: 'grow' }}><TextInput value={t.title || ''} onChange={e => ed(x => { x.tasks[i].title = e.target.value; })} placeholder="Task title" /></Grid>
                      <Grid size={{ xs: 6, md: 2 }}><TextInput value={t.assignee || ''} onChange={e => ed(x => { x.tasks[i].assignee = e.target.value; })} placeholder="Assignee" {...listProps} /></Grid>
                      <Grid size={{ xs: 6, md: 2 }}><TextInput type="date" value={t.dueDate || ''} onChange={e => ed(x => { x.tasks[i].dueDate = e.target.value; })} /></Grid>
                      <Grid size={{ xs: 5, md: 1.5 }}><SelectInput value={t.priority} onChange={e => ed(x => { x.tasks[i].priority = e.target.value; })}>{PRI_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectInput></Grid>
                      <Grid size={{ xs: 5, md: 2 }}><SelectInput title="Link to milestone" value={t.milestoneId || ''} onChange={e => ed(x => { x.tasks[i].milestoneId = e.target.value || null; })}>{msOpts}</SelectInput></Grid>
                      <Grid size="auto"><DelBtn onClick={() => ed(x => { x.tasks.splice(i, 1); })} /></Grid>
                    </Grid>
                  ))}
                </Box>
                <TextLink onClick={() => ed(x => { x.tasks.push({ id: newId('t'), title: '', assignee: x.owner, status: 'todo', dueDate: '', priority: 'medium', milestoneId: null }); })}>+ Add Task</TextLink>
              </VSection>

              <VSection head="📈 Target KPIs" meta={`${d.kpis.length} KPI${d.kpis.length !== 1 ? 's' : ''}`}>
                {hint('Outcome measures that define success. Project-level only.')}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                  {d.kpis.map((k, i) => (
                    <Grid container key={k.id || i} spacing="6px" sx={rowSx()}>
                      <Grid size={{ xs: 12, md: 'grow' }}><TextInput value={k.name || ''} onChange={e => ed(x => { x.kpis[i].name = e.target.value; })} placeholder="KPI name (e.g. SOPs reviewed)" /></Grid>
                      <Grid size={{ xs: 4, md: 2 }}><TextInput type="number" value={k.current || 0} onChange={e => ed(x => { x.kpis[i].current = +e.target.value; })} placeholder="Current" /></Grid>
                      <Grid size={{ xs: 4, md: 2 }}><TextInput type="number" value={k.target || 100} onChange={e => ed(x => { x.kpis[i].target = +e.target.value; })} placeholder="Target" /></Grid>
                      <Grid size={{ xs: 3, md: 2 }}><TextInput value={k.unit || ''} onChange={e => ed(x => { x.kpis[i].unit = e.target.value; })} placeholder="Unit (%, days...)" /></Grid>
                      <Grid size="auto"><DelBtn onClick={() => ed(x => { x.kpis.splice(i, 1); })} /></Grid>
                    </Grid>
                  ))}
                </Box>
                <TextLink onClick={() => ed(x => { x.kpis.push({ id: newId('k'), name: '', current: 0, target: 100, unit: '' }); })}>+ Add KPI</TextLink>
              </VSection>

              <VSection head="⚠ Known Risks" meta={`${d.risks.length} risk${d.risks.length !== 1 ? 's' : ''}`}>
                {hint('Things that could go wrong. Link to a milestone if specific to one gate.')}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', m: '8px 0' }}>
                  {d.risks.map((r, i) => (
                    <Grid container key={r.id || i} spacing="6px" sx={rowSx()}>
                      <Grid size={{ xs: 12, md: 'grow' }}><TextInput value={r.title || ''} onChange={e => ed(x => { x.risks[i].title = e.target.value; })} placeholder="Risk title" /></Grid>
                      <Grid size={{ xs: 4, md: 1.5 }}><SelectInput value={r.severity} onChange={e => ed(x => { x.risks[i].severity = e.target.value; })}>{PRI_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectInput></Grid>
                      <Grid size={{ xs: 8, md: 3 }}><TextInput value={r.mitigation || ''} onChange={e => ed(x => { x.risks[i].mitigation = e.target.value; })} placeholder="Mitigation plan" /></Grid>
                      <Grid size={{ xs: 5, md: 1.5 }}><TextInput value={r.owner || ''} onChange={e => ed(x => { x.risks[i].owner = e.target.value; })} placeholder="Owner" {...listProps} /></Grid>
                      <Grid size={{ xs: 5, md: 2 }}><SelectInput title="Link to milestone" value={r.milestoneId || ''} onChange={e => ed(x => { x.risks[i].milestoneId = e.target.value || null; })}>{msOpts}</SelectInput></Grid>
                      <Grid size="auto"><DelBtn onClick={() => ed(x => { x.risks.splice(i, 1); })} /></Grid>
                    </Grid>
                  ))}
                </Box>
                <TextLink onClick={() => ed(x => { x.risks.push({ id: newId('r'), title: '', severity: 'medium', mitigation: '', owner: x.owner, status: 'open', milestoneId: null }); })}>+ Add Risk</TextLink>
              </VSection>
            </>
          )}
        </Box>

        {/* .visit-modal-foot */}
        <Box sx={{ p: { xs: '12px 16px', md: '16px 28px' }, borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{footNote}</Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Btn onClick={onClose}>Cancel</Btn>
            {step > 1 && <Btn onClick={wizPrev}>← Back</Btn>}
            {step < 4 && <Btn variant="primary" onClick={wizNext}>Next →</Btn>}
            {(step === 4 || isEdit) && <Btn variant="primary" onClick={saveProject}>💾 Save Project</Btn>}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
