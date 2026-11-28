import { Box, InputBase } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { VISIT_TYPES, RATING_AREAS, OBS_CATEGORIES, OVERALL_OPTIONS } from '../../../data/visits';
import { ModalShell, FootNote, Btn, TextLink, Chip, FieldLabel, Field, TextInput, TextArea, SelectInput, VSection, DelBtn, Icon, PeoplePicker } from '../../../components';
import { usePeopleOptions } from '../../../data/people';
import { DateInput, TimeInput } from '../../../components/DateTimeInput';

// .obs-row input/select/textarea + .v-action-row input
const smallInput = { p: '7px 9px', border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.cream, fontSize: 12, fontFamily: 'inherit', height: 'auto', boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal } };
const smallSelectSx = { p: '7px 28px 7px 9px', borderRadius: '4px', fontSize: 12, backgroundPosition: 'right 8px center' };
const row = { mb: '12px' };

/** .area-rating-row + .star-row */
function AreaRating({ label, value, onPick }) {
  return (
    <Box sx={{ bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '6px', p: '10px 14px', height: '100%' }}>
      <Box sx={{ fontSize: 13, fontWeight: 700, mb: '5px' }}>{label}</Box>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(n => {
          const filled = value >= n;
          return <Box key={n} component="span" onClick={() => onPick(n)} sx={{ fontSize: 22, cursor: 'pointer', color: filled ? tokens.yellow : tokens.slateSofter, transition: 'all 0.1s', userSelect: 'none', lineHeight: 1, transform: filled ? 'scale(1.1)' : 'none', '&:hover': { color: tokens.yellow, transform: 'scale(1.1)' } }}>{filled ? '★' : '☆'}</Box>;
        })}
        {value > 0 && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, letterSpacing: '0.04em', ml: '10px', fontWeight: 700 }}>{value} / 5</Box>}
      </Box>
    </Box>
  );
}

/** .photo-slot (filled / add) */
export function PhotoSlot({ filled, onClick, title }) {
  return (
    <Box onClick={onClick} title={title} sx={filled
      ? { width: 100, height: 100, background: `linear-gradient(135deg, ${tokens.tealSofter}, ${tokens.tealSoft})`, border: `2px solid ${tokens.teal}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: onClick ? 'pointer' : 'default', color: tokens.tealDark, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', position: 'relative', '&::before': { content: '""', fontSize: 28, mb: '4px' } }
      : { width: 100, height: 100, bgcolor: tokens.cream, border: `2px dashed ${tokens.line}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em', '&:hover': { borderColor: tokens.teal, color: tokens.tealDark, bgcolor: tokens.tealSofter } }}>
      {!filled && <><Box sx={{ fontSize: 28, mb: '4px', opacity: 0.6 }}><Icon name="photo" /></Box><div>Add Photo</div></>}
    </Box>
  );
}

const obsHeadCell = { fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 };

/**
 * New / Edit Visit modal (renderVisitModal). `draft` lives in the page; `setDraft` replaces it.
 * onSave(targetStatus, draft) runs validation + upsert in the page.
 */
export default function VisitModal({ open, draft, setDraft, onClose, onSave }) {
  // The real staff list, through the directory every signed-in person may read. It used to come from
  // GET /api/users (admin-only) and fall back to the bundled sample roster, so an employee writing a
  // visit report was offered names that belong to no account.
  const { people, loading: loadingPeople } = usePeopleOptions();
  if (!draft) return null;
  const v = draft;
  const upd = fn => setDraft(prev => { const c = JSON.parse(JSON.stringify(prev)); fn(c); return c; });
  const bind = (path, parse = x => x) => ({
    value: path.split('.').reduce((o, k) => o?.[k], v) ?? '',
    onChange: e => upd(c => { const ks = path.split('.'); const last = ks.pop(); const tgt = ks.reduce((o, k) => o[k], c); tgt[last] = parse(e.target.value); }),
  });
  const setRating = (area, score) => upd(c => { c.ratings[area] = c.ratings[area] === score ? 0 : score; });

  const footer = (
    <>
      <FootNote><Icon name="save" />Draft auto-saves · {v.actionItems.length} action{v.actionItems.length !== 1 ? 's' : ''} will sync to My To-Do on submit</FootNote>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave('draft', v)}><Icon name="save" />Save Draft</Btn>
        <Btn variant="primary" onClick={() => onSave('submitted', v)}>✓ Submit Visit Report</Btn>
      </Box>
    </>
  );

  return (
    <ModalShell open={open} onClose={onClose} width={920} head="gradient" icon={<Icon name="note" />} title="Log Visit Observation"
      sub={<Box component="span" sx={{ fontFamily: fonts.mono, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{v.status === 'draft' ? 'Draft' : '✓ Submitted'} · {v.owner}</Box>}
      footer={footer} bodySx={{ bgcolor: tokens.creamWarm, p: { xs: '16px', md: '20px 28px' } }}>

      <VSection icon={<Icon name="weekly" />} head="VISIT DETAILS">
        <Field label="Visit Title" req sx={row}><TextInput {...bind('title')} placeholder="e.g. Q2 Supplier Audit — Roche Diagnostics, Mumbai" /></Field>
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Visit Type"><SelectInput {...bind('type')}>{Object.entries(VISIT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</SelectInput></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Status"><SelectInput {...bind('status')}><option value="draft"><Icon name="note" />Draft</option><option value="submitted">✓ Submitted</option></SelectInput></Field></Grid>
        </Grid>
        <Grid container spacing="12px">
          <Grid size={{ xs: 12, sm: 4 }}><Field label="Date" req><DateInput {...bind('date')} /></Field></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><Field label="Time In"><TimeInput {...bind('timeIn')} /></Field></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><Field label="Time Out"><TimeInput {...bind('timeOut')} /></Field></Grid>
        </Grid>
      </VSection>

      <VSection icon={<Icon name="department" />} head="VISITED ORGANISATION / LOCATION">
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Organisation / Facility Name" req><TextInput {...bind('org.name')} placeholder="e.g. Roche Diagnostics India Pvt Ltd" /></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Branch / Location Name"><TextInput {...bind('org.branch')} placeholder="e.g. Mumbai Distribution Hub" /></Field></Grid>
        </Grid>
        <Field label="Address" sx={row}><TextArea minRows={2} {...bind('org.address')} placeholder="Full address of the location visited" sx={{ '& textarea.MuiInputBase-input': { minHeight: 60 } }} /></Field>
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 4 }}><Field label="City"><TextInput {...bind('org.city')} placeholder="Hyderabad" /></Field></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><Field label="State"><TextInput {...bind('org.state')} placeholder="Telangana" /></Field></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><Field label="GPS / Google Maps Link"><TextInput {...bind('org.gps')} placeholder="Paste maps link..." /></Field></Grid>
        </Grid>
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Host / Point of Contact"><TextInput {...bind('host.name')} placeholder="Name of person who received the team" /></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Host Designation"><TextInput {...bind('host.designation')} placeholder="e.g. Quality Manager" /></Field></Grid>
        </Grid>
        <Grid container spacing="12px">
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Host Contact Number"><TextInput type="tel" {...bind('host.phone')} placeholder="+91 98765 43210" /></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Host Email"><TextInput type="email" {...bind('host.email')} placeholder="contact@org.com" /></Field></Grid>
        </Grid>
      </VSection>

      <VSection icon={<Icon name="people" />} head="VISIT TEAM" meta={`${v.team.length} member${v.team.length !== 1 ? 's' : ''}`}>
        <FieldLabel>Visited By — TrustLab team members</FieldLabel>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '6px', mb: 1, minHeight: 28 }}>
          {v.team.length ? v.team.map((a, i) => <Chip key={i} onRemove={() => upd(c => c.team.splice(i, 1))}>{a}</Chip>)
            : <Box component="span" sx={{ fontSize: 12, color: tokens.slate, fontStyle: 'italic' }}>No team members added yet.</Box>}
        </Box>
        <PeoplePicker value={v.team} onChange={(names) => upd(c => { c.team = names; })} people={people} loading={loadingPeople}
          placeholder="Add a team member from the staff list…" emptyNote="No staff accounts yet." />
        <FieldLabel hint="if any" sx={{ mt: '14px' }}>External Participants</FieldLabel>
        <TextInput {...bind('externalParticipants')} placeholder="Names of external attendees from the visited organisation" />
      </VSection>

      <VSection icon={<Icon name="target" />} head="PURPOSE & SCOPE">
        <Field label="Purpose of Visit" req sx={row}><TextArea minRows={2} {...bind('purpose')} placeholder="Why was this visit conducted? What was the objective?" sx={{ '& textarea.MuiInputBase-input': { minHeight: 70 } }} /></Field>
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Areas Covered / Scope"><TextArea minRows={2} {...bind('scope')} placeholder="Which areas, processes, or documents were reviewed?" sx={{ '& textarea.MuiInputBase-input': { minHeight: 70 } }} /></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Reference Documents / Standards"><TextArea minRows={2} {...bind('references')} placeholder="e.g. ISO 15189, SOP-PRC-001, NABL criteria..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 70 } }} /></Field></Grid>
        </Grid>
        <Field label="Tags" hint="comma-separated"><TextInput defaultValue={(v.tags || []).join(', ')} onChange={e => upd(c => { c.tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean); })} placeholder="e.g. audit, vendor, Q2, Mumbai, reagent" /></Field>
      </VSection>

      <VSection icon="" head="AREA RATINGS" meta="Click stars to rate 1–5">
        <Grid container spacing={1}>
          {RATING_AREAS.map(a => (
            <Grid key={a.key} size={{ xs: 12, sm: 6 }}><AreaRating label={a.label} value={v.ratings[a.key] || 0} onPick={n => setRating(a.key, n)} /></Grid>
          ))}
        </Grid>
      </VSection>

      <VSection icon={<Icon name="chart" />} head="OVERALL ASSESSMENT">
        <Field label="Overall Assessment" req sx={row}>
          <SelectInput {...bind('overallAssessment')}>
            <option value="">— Select Overall Assessment —</option>
            {OVERALL_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </SelectInput>
        </Field>
        <Field label="Executive Summary"><TextArea minRows={3} {...bind('executiveSummary')} placeholder="Overall summary — key findings, general impression, major outcomes..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 100 } }} /></Field>
      </VSection>

      <VSection icon={<Icon name="search" />} head="DETAILED OBSERVATIONS" meta={`${v.observations.length} item${v.observations.length !== 1 ? 's' : ''}`}>
        <Grid container spacing="10px" sx={{ display: { xs: 'none', md: 'flex' }, p: '8px 12px', bgcolor: tokens.creamWarm, borderRadius: '5px', mb: '6px' }}>
          <Grid size={3} sx={obsHeadCell}>CATEGORY</Grid><Grid size="grow" sx={obsHeadCell}>OBSERVATION</Grid><Grid size={3} sx={obsHeadCell}>EVIDENCE / REF</Grid><Grid size="auto" sx={{ width: 40 }} />
        </Grid>
        {v.observations.map((o, i) => (
          <Grid key={i} container spacing="10px" sx={{ p: '8px 10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '5px', mb: '4px' }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <SelectInput value={o.category} onChange={e => upd(c => { c.observations[i].category = e.target.value; })} sx={smallSelectSx}>
                {!OBS_CATEGORIES.includes(o.category) && <option value={o.category}>{o.category}</option>}
                {OBS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </Grid>
            <Grid size={{ xs: 12, md: 'grow' }}>
              <InputBase multiline minRows={1} value={o.observation || ''} onChange={e => upd(c => { c.observations[i].observation = e.target.value; })} placeholder="What did you observe?" sx={{ width: '100%', p: 0, '& .MuiInputBase-input': { ...smallInput, resize: 'vertical', minHeight: 36 } }} />
            </Grid>
            <Grid size={{ xs: 10, md: 3 }}>
              <InputBase value={o.evidence || ''} onChange={e => upd(c => { c.observations[i].evidence = e.target.value; })} placeholder="Photo, SOP ref..." sx={{ width: '100%' }} inputSx={smallInput} />
            </Grid>
            <Grid size={{ xs: 2, md: 'auto' }} sx={{ width: { md: 40 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DelBtn onClick={() => upd(c => c.observations.splice(i, 1))} />
            </Grid>
          </Grid>
        ))}
        <TextLink sx={{ mt: '4px' }} onClick={() => upd(c => c.observations.push({ category: 'Infrastructure', observation: '', evidence: '' }))}>+ Add Observation</TextLink>
      </VSection>

      <VSection icon={<Icon name="photo" />} head="PHOTOS & EVIDENCE" meta={`${v.photos} / 20 photos`}>
        <Grid container spacing={1}>
          {Array.from({ length: v.photos }).map((_, i) => <Grid key={i} size="auto"><PhotoSlot filled title="Click to remove" onClick={() => upd(c => { c.photos--; })} /></Grid>)}
          {v.photos < 20 && <Grid size="auto"><PhotoSlot onClick={() => upd(c => { c.photos++; })} /></Grid>}
        </Grid>
        <Box component="p" sx={{ fontSize: 11, color: tokens.slate, mt: '10px', mb: 0, fontFamily: fonts.mono, letterSpacing: '0.05em' }}>JPG / PNG / WEBP — up to 5 MB each, 20 max.</Box>
      </VSection>

      <VSection icon={<Icon name="task" />} head="ACTION ITEMS" meta="Auto-syncs to My To-Do on save">
        {v.actionItems.map((a, i) => (
          <Grid key={i} container spacing={1} sx={{ alignItems: 'center', p: '8px 10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${tokens.yellow}`, borderRadius: '5px', mb: '5px' }}>
            <Grid size={{ xs: 12, md: 'grow' }}><InputBase value={a.text || ''} placeholder="Action to be taken" onChange={e => upd(c => { c.actionItems[i].text = e.target.value; })} sx={{ width: '100%' }} inputSx={smallInput} /></Grid>
            {/* The owner is told about this action when the report is submitted, so it has to be an account. */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Box component="select" value={a.owner || ''} onChange={e => upd(c => { c.actionItems[i].owner = e.target.value; })}
                sx={{ width: '100%', ...smallInput, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card, fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="">Owner…</option>
                {people.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </Box>
            </Grid>
            <Grid size={{ xs: 5, md: 3 }}><DateInput value={a.deadline || ''} onChange={e => upd(c => { c.actionItems[i].deadline = e.target.value; })} sx={{ width: '100%' }} inputSx={smallInput} /></Grid>
            <Grid size={{ xs: 1, md: 'auto' }} sx={{ width: { md: 40 }, display: 'flex', justifyContent: 'center' }}><DelBtn onClick={() => upd(c => c.actionItems.splice(i, 1))} /></Grid>
          </Grid>
        ))}
        <TextLink onClick={() => upd(c => c.actionItems.push({ text: '', owner: '', deadline: '' }))}>+ Add Action Item</TextLink>
      </VSection>

      <VSection icon={<Icon name="repeat" />} head="FOLLOW-UP & SIGN-OFF">
        <Grid container spacing="12px" sx={row}>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Next Visit Date" hint="if required"><DateInput {...bind('nextVisitDate')} /></Field></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><Field label="Follow-Up Required?">
            <SelectInput value={v.followUpRequired ? 'true' : 'false'} onChange={e => upd(c => { c.followUpRequired = e.target.value === 'true'; })}>
              <option value="false">No — visit complete</option>
              <option value="true">Yes — scheduled follow-up</option>
            </SelectInput>
          </Field></Grid>
        </Grid>
        <Field label="Additional Remarks"><TextArea minRows={3} {...bind('additionalRemarks')} placeholder="Any other observations, context, or notes for the record..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 80 } }} /></Field>
      </VSection>
    </ModalShell>
  );
}
