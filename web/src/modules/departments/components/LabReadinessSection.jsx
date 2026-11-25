import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, SelectInput, DelBtn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import DeptSection, { SectionNote, EmptyLine } from './DeptSection';
import { PosChips } from './Chips';
import { useListAssignmentsQuery } from '../../../store/api/departmentsApi';
import LabActivityModal from '../modals/LabActivityModal';
import LiveInput, { TimeInput } from './LiveInput';
import { taskTextSx } from './styles';

const KINDS = [
  { value: 'nrl', label: 'NRL department' },
  { value: 'regional', label: 'Regional lab' },
  { value: 'satellite', label: 'Satellite / collection' },
];
const SCOPES = [
  { value: 'all', label: 'Every unit' },
  { value: 'nrl', label: 'NRL only' },
  { value: 'field', label: 'Field labs only' },
];
const PHASES = [
  { key: 'opening', label: '🌅 Opening round', colour: tokens.teal },
  { key: 'closing', label: '🌙 Closing round', colour: tokens.orange },
];

const selectSx = { minHeight: 30, p: '4px 26px 4px 8px', fontSize: 11.5, backgroundPosition: 'right 8px center' };

/** A small on/off pill, used for "active" and "photo required". */
function Flag({ on, onClick, title, children, colour = tokens.teal, soft = tokens.tealSoft }) {
  return (
    <ButtonBase
      onClick={onClick}
      title={title}
      sx={{
        p: '3px 9px', borderRadius: '10px', fontFamily: fonts.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
        bgcolor: on ? colour : tokens.card, color: on ? '#fff' : tokens.slateSoft,
        border: `1px solid ${on ? colour : tokens.line}`, whiteSpace: 'nowrap',
        '&:hover': { bgcolor: on ? colour : soft, borderColor: colour, color: on ? '#fff' : colour },
      }}
    >
      {children}
    </ButtonBase>
  );
}

/**
 * Lab Readiness, inside Department Master — the master checklist behind the daily board.
 *
 * This is the only place the board's content is decided: which units run one, which activities each
 * round asks for, which of those need a photograph, and the two cut-off times after which a sign-off
 * counts as late. Nothing is hard-coded in the board itself.
 *
 * A unit or activity that already appears on a completed record is switched off rather than deleted,
 * because those records are the laboratory's evidence; the API does that and says so, and the message
 * it sends back is what the person is shown.
 */
export default function LabReadinessSection({ dept, lab }) {
  const lr = dept.labReadiness ?? { enabled: false, units: [], activities: [], openingCutoff: '09:30', closingCutoff: '22:30' };
  const [open, setOpen] = useState({ units: true, people: false });
  const units = lr.units ?? [];
  const activities = lr.activities ?? [];

  const byPhase = {
    opening: activities.filter((a) => a.phase === 'opening'),
    closing: activities.filter((a) => a.phase === 'closing'),
  };
  const photoCount = activities.filter((a) => a.photoRequired && a.active !== false).length;

  const positionName = (id) => (dept.positions ?? []).find((p) => p.id === id)?.name ?? '';

  /**
   * Everyone in this department, from both places a person can belong to one: the department's own
   * people list, and the department chosen on their account in Settings. Listing only the first
   * left anyone who belongs by their account alone with no row here — and so no way to be given a
   * unit, which is the one thing this block exists to do.
   */
  const { data: orgMap } = useListAssignmentsQuery();
  const stored = new Map((dept.assignments ?? []).map((a) => [a.name, a]));
  const names = new Set(stored.keys());
  Object.entries(orgMap ?? {}).forEach(([name, a]) => { if (a.departmentId === dept.id) names.add(name); });
  const people = [...names]
    .map((name) => {
      const own = stored.get(name);
      const acct = orgMap?.[name];
      const positionId = own?.positionId ?? acct?.positionId ?? null;
      return {
        name,
        positionId,
        role: own?.role ?? acct?.role ?? 'member',
        unitKey: own?.unitKey ?? acct?.unitKey ?? '',
        positionName: positionName(positionId),
        listed: Boolean(own),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const head = (
    <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Btn size="sm" onClick={lab.restore} title="Put back anything missing from the standard sheet, without touching what is here">⟲ Restore standard</Btn>
      <Btn
        size="sm"
        variant={lr.enabled ? 'danger' : 'primary'}
        onClick={() => lab.setEnabled(!lr.enabled)}
      >
        {lr.enabled ? 'Switch off' : 'Switch on'}
      </Btn>
    </Box>
  );

  return (
    <DeptSection
      title={<>🔬 Lab Readiness · daily board</>}
      titleColor={tokens.tealDark}
      count={lr.enabled ? `${units.filter((u) => u.active !== false).length} units · ${activities.filter((a) => a.active !== false).length} activities · ${photoCount} need a photo` : 'off'}
      action={head}
    >
      <SectionNote>
        The board behind this department's opening and closing tasks, which are edited in the two sections
        above. Here are the things the rounds themselves need: which units run a board, who works in which
        unit, and the time after which a sign-off counts as late.
      </SectionNote>

      {!lr.enabled ? (
        <Box sx={{ p: '16px', bgcolor: tokens.creamWarm, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '8px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: tokens.ink, mb: '4px', fontWeight: 600 }}>The daily board is switched off for {dept.name}.</Typography>
          <Typography sx={{ fontSize: 12, color: tokens.slate, mb: '12px' }}>
            {units.length === 0
              ? 'Restore the standard checklist to bring in the 14 units and 52 activities of TDPL-LAB-SOP-014, then switch it on.'
              : `${units.length} unit${units.length === 1 ? '' : 's'} and ${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} are configured and ready. Switch it on when the laboratory should start recording.`}
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {units.length === 0 && <Btn size="sm" onClick={lab.restore}>⟲ Restore the standard checklist</Btn>}
            <Btn size="sm" variant="primary" onClick={() => lab.setEnabled(true)} disabled={units.length === 0}>Switch the board on</Btn>
          </Box>
        </Box>
      ) : (
        <>
          {/* Cut-offs */}
          <Grid container spacing="12px" sx={{ mb: '14px' }}>
            {PHASES.map((p) => (
              <Grid key={p.key} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ p: '10px 14px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '8px', borderLeft: `4px solid ${p.colour}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.ink }}>{p.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: tokens.slate, mt: '1px' }}>
                      Signed after this time is recorded as late · {byPhase[p.key].length} activities
                    </Typography>
                  </Box>
                  <Box sx={{ width: 128 }}>
                    <TimeInput
                      value={p.key === 'opening' ? lr.openingCutoff : lr.closingCutoff}
                      onCommit={(v) => lab.setCutoff(p.key, v)}
                      sx={{ width: '100%' }}
                    />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* UNITS */}
          <Lane
            label="🏥 Units"
            count={`${units.length} · ${units.filter((u) => u.active !== false).length} active`}
            colour={tokens.tealDark}
            open={open.units}
            onToggle={() => toggle('units')}
            action={<Btn size="sm" variant="primary" onClick={lab.addUnit}>+ Add unit</Btn>}
          >
            {units.length === 0 ? <EmptyLine>No units yet.</EmptyLine> : units.map((u) => (
              <Box key={u.id} sx={{ p: '8px 10px', m: '4px 0', bgcolor: u.active === false ? tokens.creamWarm : tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '7px', opacity: u.active === false ? 0.7 : 1 }}>
                <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, color: tokens.slateSoft, width: 150, flexShrink: 0, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`Key: ${u.key} — this is what every past record points at, so it never changes`}>
                    {u.key}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <LiveInput value={u.name} onCommit={(v) => lab.updateUnit(u.id, 'name', v)} sx={taskTextSx} />
                  </Box>
                  <Box sx={{ width: 150 }}>
                    <SelectInput value={u.kind} sx={selectSx} onChange={(e) => lab.updateUnit(u.id, 'kind', e.target.value)}>
                      {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </SelectInput>
                  </Box>
                  <Flag on={u.active !== false} onClick={() => lab.updateUnit(u.id, 'active', u.active === false)} title={u.active === false ? 'Switched off — it does not appear on the board' : 'On the board'}>
                    {u.active === false ? 'OFF' : 'ON'}
                  </Flag>
                  <DelBtn onClick={() => lab.removeUnit(u)} title={`Remove ${u.name}`} />
                </Box>
              </Box>
            ))}
          </Lane>

          {/* WHO WORKS WHERE — the other half of "whose line is this" */}
          <Lane
            label="👥 Who works where"
            count={`${people.filter((p) => p.unitKey).length} of ${people.length} placed`}
            colour={tokens.purple}
            open={open.people}
            onToggle={() => toggle('people')}
          >
            <SectionNote sx={{ mb: '8px' }}>
              The unit a person works in is how <strong>My Activity</strong> knows which board is theirs. Their
              position comes from Settings · Users; set the unit here. Somebody with no unit still sees the
              board — they just get no lines of their own on My Activity, and the app tells them to ask you.
            </SectionNote>
            {people.length === 0 ? <EmptyLine>Nobody is in this department yet.</EmptyLine> : people.map((p) => (
              <Box key={p.name} sx={{ p: '8px 10px', m: '4px 0', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '7px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink, flex: 1, minWidth: 160 }}>{p.name}</Typography>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '3px 9px', borderRadius: '10px', bgcolor: p.positionName ? tokens.tealSoft : tokens.creamWarm, color: p.positionName ? tokens.tealDark : tokens.slateSoft, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {p.positionName || (p.role === 'head' ? 'DEPARTMENT HEAD' : 'NO POSITION')}
                </Box>
                <Box sx={{ width: 210 }}>
                  <SelectInput value={p.unitKey} sx={selectSx} onChange={(e) => lab.setPeople(people.map((x) => (x.name === p.name ? { ...x, unitKey: e.target.value } : x)))}>
                    <option value="">— no unit —</option>
                    {units.filter((u) => u.active !== false).map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
                  </SelectInput>
                </Box>
              </Box>
            ))}
          </Lane>

        </>
      )}
    </DeptSection>
  );
}

/** A collapsible block inside the section — 52 activities do not belong on screen all at once. */
function Lane({ label, count, colour, open, onToggle, action, children }) {
  return (
    <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: '8px', mb: '10px', overflow: 'hidden', borderLeft: `4px solid ${colour}` }}>
      <Box sx={{ p: '9px 12px', bgcolor: tokens.cream, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <ButtonBase onClick={onToggle} sx={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-start', fontFamily: 'inherit', borderRadius: '6px', p: '2px 4px' }}>
          <Box sx={{ fontSize: 11, color: tokens.slate, width: 12 }}>{open ? '▾' : '▸'}</Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>{label}</Typography>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, color: tokens.slate, letterSpacing: '0.06em', fontWeight: 700 }}>{count}</Typography>
        </ButtonBase>
        {action}
      </Box>
      {open && <Box sx={{ p: '8px 10px' }}>{children}</Box>}
    </Box>
  );
}

/** Activities under their section heading — one block per heading, as the board groups them. */
function groupBySection(list) {
  const groups = new Map();
  for (const a of list) {
    const heading = a.section || 'Other checks';
    if (!groups.has(heading)) groups.set(heading, { heading, items: [] });
    groups.get(heading).items.push(a);
  }
  return [...groups.values()];
}

/**
 * The laboratory's opening and closing rounds, drawn where a department's shift tasks would be.
 *
 * A department that runs a readiness board has no separate tick list: these ARE its opening and
 * closing tasks (DepartmentDetailPage decides which of the two a department gets). Everything a
 * shift task has is here — the time, who it belongs to — plus what the sheet adds: which branches
 * it applies to, and whether it needs a photograph.
 */
export function LabRounds({ dept, lab }) {
  const activities = dept.labReadiness?.activities ?? [];
  // `{ phase }` opens the form empty for a new line; `{ phase, activity }` opens it on that line.
  const [editing, setEditing] = useState(null);

  return (<>
    {PHASES.map((p) => {
    const items = activities.filter((a) => a.phase === p.key);
    return (
      <DeptSection
        key={p.key}
        title={<>{p.key === 'opening' ? '🌅 Opening Shift Tasks' : '🌙 Closing Shift Tasks'}</>}
        titleColor={p.colour}
        count={`${items.length} activities`}
        action={<Btn size="sm" variant="primary" sx={{ bgcolor: p.colour, borderColor: p.colour, '&:hover': { bgcolor: p.colour } }} onClick={() => setEditing({ phase: p.key })}>+ Add activity</Btn>}
      >
        <SectionNote>
          This department records its {p.key} round on the <strong>Lab Readiness</strong> board — every line
          answered, a remark where it deviates, a photograph where one is asked for, then a signature.
          Tag a line to a position and it becomes that person's on My Activity; leave it untagged and it
          belongs to everyone in the department.
        </SectionNote>
              {items.length === 0 ? <EmptyLine>No activities in this round yet.</EmptyLine> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 1060 }}>
    {groupBySection(items).map((g) => (
      <Box key={g.heading} sx={{ mb: '10px' }}>
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slateSoft, p: '8px 4px 4px' }}>
          {g.heading} · {g.items.length}
        </Typography>
        {g.items.map((a) => (
          <Box key={a.id} sx={{ p: '8px 10px', m: '3px 0', bgcolor: a.active === false ? tokens.creamWarm : tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '7px', opacity: a.active === false ? 0.65 : 1 }}>
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, fontWeight: 700, color: tokens.slateSoft, width: 34, flexShrink: 0 }}>{a.key.toUpperCase()}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LiveInput value={a.text} onCommit={(v) => lab.updateActivity(a.id, 'text', v)} sx={taskTextSx} />
              </Box>
              <Box sx={{ width: 116, flexShrink: 0 }}>
                <TimeInput value={a.scheduledTime} onCommit={(v) => lab.updateActivity(a.id, 'scheduledTime', v)} sx={{ width: '100%' }} />
              </Box>
              <Box sx={{ width: 130, flexShrink: 0 }}>
                <SelectInput value={a.scope} sx={selectSx} onChange={(e) => lab.updateActivity(a.id, 'scope', e.target.value)}>
                  {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </SelectInput>
              </Box>
              {/* Scope says which branches the line appears on; this says whose
                  line it is once it is there. Both are applied. */}
              <PosChips
                positions={dept.positions ?? []}
                positionIds={a.positionIds ?? []}
                onToggle={(pid) => lab.toggleActivityPosition(a, pid)}
                onClear={() => lab.updateActivity(a.id, 'positionIds', [])}
              />
              <Flag
                on={a.photoRequired}
                colour={tokens.amber}
                soft={tokens.yellowSoft}
                onClick={() => lab.updateActivity(a.id, 'photoRequired', !a.photoRequired)}
                title={a.photoRequired ? 'A photograph is required before sign-off' : 'No photograph required'}
              >
                📷 {a.photoRequired ? 'REQUIRED' : 'NO'}
              </Flag>
              <Flag on={a.active !== false} onClick={() => lab.updateActivity(a.id, 'active', a.active === false)} title={a.active === false ? 'Switched off — it does not appear on the board' : 'On the board'}>
                {a.active === false ? 'OFF' : 'ON'}
              </Flag>
              {/* Everything about the line in one form — quicker than hunting across the row,
                  and it is the same form "+ Add activity" opens. */}
              <Btn size="sm" onClick={() => setEditing({ phase: p.key, activity: a })} title="Open this line in a form" sx={{ minHeight: 28, px: '9px', fontSize: 12.5, flexShrink: 0 }}>✎</Btn>
              <DelBtn onClick={() => lab.removeActivity(a)} title="Remove this activity" />
            </Box>
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', mt: '5px', pl: '42px' }}>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slateSofter, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Section</Typography>
              <Box sx={{ flex: 1, maxWidth: 360 }}>
                <LiveInput value={a.section} onCommit={(v) => lab.updateActivity(a.id, 'section', v)} sx={{ ...taskTextSx, fontSize: 11.5 }} placeholder="Group heading on the board" />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    ))}
          </Box>
        </Box>
      )}
      </DeptSection>
      );
    })}

    <LabActivityModal
      open={Boolean(editing)}
      dept={dept}
      phase={editing?.phase ?? 'opening'}
      activity={editing?.activity}
      onClose={() => setEditing(null)}
    />
  </>);
}
