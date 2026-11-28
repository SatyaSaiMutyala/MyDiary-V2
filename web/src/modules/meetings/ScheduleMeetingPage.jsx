import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { tokens, fonts, TYPE_COLORS } from '../../theme/tokens';
import { PageHeader, Btn, TextLink, AddBtn, Card, Field, FieldLabel, TextInput, TextArea, SelectInput, Segmented, ToggleRow, Chip, DelBtn, Icon, PeoplePicker } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { useCrumbs } from '../../store/CrumbsContext';
import { errorMessage } from '../../store/api/baseApi';
import { useCreateMeetingMutation, useGetMeetingQuery, useUpdateMeetingMutation } from '../../store/api/meetingsApi';
import { useGetTemplateQuery } from '../../store/api/templatesApi';
import { useListPeopleQuery } from '../../store/api/usersApi';
import { TYPES } from '../../data/meetings';
import { parseDate, formatDate, formatTime } from '../../utils/dates';
import ScheduleStepper from './components/scheduleStepper';
import ScheduleTypePicker from './components/scheduleTypePicker';
import ScheduleTypeFields, { Row, col1, col2, col3 } from './components/scheduleTypeFields';
import { useDialog } from '../../components/Dialogs';
import { DateInput, DurationInput, TimeInput } from '../../components/DateTimeInput';

const MODES = ['In-person', 'Virtual', 'Hybrid'];

/** The type-specific field that becomes the meeting's `subBadge`, and the one that becomes `clientName`. */
const SUB_BADGE = { internal: 'subType', customer: 'purpose', supplier: 'topic', consultants: 'engArea', board: 'classification', other: 'category' };
const CLIENT_NAME = { customer: 'customer', supplier: 'supplier', consultants: 'consultant', other: 'host' };
const SUB_BADGE_DEFAULT = { internal: 'Ops Review', customer: 'New Business Pitch', supplier: 'Price Negotiation', consultants: 'QMS / NABL', board: 'Board Meeting (Ordinary)' };

/** Reads "5m", "1h", "1h 30m", "90" → minutes, for the running total on the agenda card. */
function toMinutes(v) {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return 0;
  const h = /(\d+(?:\.\d+)?)\s*h/.exec(t);
  const m = /(\d+)\s*m/.exec(t);
  if (!h && !m) return /^\d+$/.test(t) ? Number(t) : 0;
  return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
}

/** 95 → "1h 35m". */
const fromMinutes = (n) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n}m`);

/**
 * One agenda item being written: the line, how long it gets, and the note that goes with it.
 *
 * Every box here is a labelled, bordered field, the same ones the rest of the form uses. Written as
 * bare text on a tinted row they did not read as something to type into, and people scrolled past
 * the agenda without filling it in.
 *
 * The note is the half-sentence the chair needs in the room and nowhere else: who presents, what to
 * bring, the figure to have ready. It belongs to its item, so it stays attached when items are
 * added, deleted or reordered.
 */
function AgendaItem({ idx, item, onChange, onDelete, canDelete, autoFocus }) {
  const hasText = Boolean((item.text ?? '').trim());
  const hasNote = Boolean((item.note ?? '').trim());
  return (
    <Box sx={{
      bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, overflow: 'hidden',
      transition: 'border-color .15s, box-shadow .15s',
      '&:hover': { borderColor: tokens.slateSofter },
      '&:focus-within': { borderColor: tokens.teal, boxShadow: '0 0 0 3px rgba(15,118,110,.10)' },
    }}>
      {/* The strip says which item this is and gives the one control that is not a field. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 12px', bgcolor: hasText || hasNote ? tokens.tealSofter : tokens.cream, borderBottom: `1px solid ${tokens.lineSoft}` }}>
        <Box component="span" title="Drag to reorder" sx={{ color: tokens.slateSofter, cursor: 'grab', fontSize: 13, userSelect: 'none', display: { xs: 'none', sm: 'block' } }}>⋮⋮</Box>
        <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: hasText ? tokens.teal : tokens.slateSofter, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'background .15s' }}>{String(idx + 1).padStart(2, '0')}</Box>
        <Box sx={{ flex: 1, fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: hasText ? tokens.tealDark : tokens.slateSoft }}>
          Item {idx + 1}
        </Box>
        <DelBtn onClick={onDelete} disabled={!canDelete} title={canDelete ? 'Remove this item' : 'A meeting needs at least one agenda item'} sx={{ opacity: canDelete ? 1 : 0.3, pointerEvents: canDelete ? 'auto' : 'none' }} />
      </Box>

      <Box sx={{ p: { xs: '12px', sm: '14px 16px' } }}>
        <Row sx={{ mb: '10px' }}>
          <Grid size={{ xs: 12, sm: 8, md: 9 }}>
            <Field label="Agenda item" req>
              <TextInput autoFocus={autoFocus} value={item.text} placeholder="e.g. Branch TAT dip in W45–W46"
                onChange={e => onChange({ ...item, text: e.target.value })} />
            </Field>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Field label="Time" hint="how long">
              <DurationInput value={item.time} onChange={e => onChange({ ...item, time: e.target.value })} sx={{ width: '100%' }} />
            </Field>
          </Grid>
        </Row>
        <Field label="Note" hint="optional">
          <TextInput value={item.note ?? ''} placeholder="Who presents · what to bring · numbers to have ready"
            onChange={e => onChange({ ...item, note: e.target.value })} />
        </Field>
      </Box>
    </Box>
  );
}

/** #view-schedule — Schedule a Meeting (selectType / changeType / addAgenda / addChip / saveNewMeeting …) */
export default function ScheduleMeetingPage() {
  const dlg = useDialog();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meName = user?.name || '';
  // "Load from template…" sends the person to /templates; picking a card comes back here with
  // { type, templateId } so the chosen agenda can pre-fill this form.
  const { state: navState } = useLocation();
  // One page, two jobs: /meetings/new schedules a meeting, /meetings/:id/edit changes an existing one.
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const [createMeeting, { isLoading: creating }] = useCreateMeetingMutation();
  const [updateMeeting, { isLoading: updating }] = useUpdateMeetingMutation();
  const saving = creating || updating;
  const { data: existing, isLoading: loadingExisting, error: loadError } = useGetMeetingQuery(editId, { skip: !isEdit });
  useCrumbs(isEdit
    ? [{ label: 'Meetings', to: '/' }, { label: 'My Meetings', to: '/meetings' }, { label: existing?.title || 'Meeting', to: `/meetings/${editId}` }, { label: 'Edit' }]
    : [{ label: 'Meetings', to: '/' }, { label: 'My Meetings', to: '/meetings' }, { label: 'Schedule New' }]);

  // Type picker → form hand-off (selectType shows the form 220ms after the card is highlighted)
  const [selected, setSelected] = useState('');
  const [type, setType] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const selectType = (t) => {
    if (!t) return;
    setSelected(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setType(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 220);
  };
  const changeType = () => { clearTimeout(timer.current); setType(''); setSelected(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Card 2 — basics
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-24');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('1h');
  const [mode, setMode] = useState(MODES[0]);
  const [loc, setLoc] = useState('');
  const [vlink, setVlink] = useState('');
  const [ts, setTsState] = useState({});
  const [tg, setTgState] = useState({});
  const setTs = (k, v) => setTsState(s => ({ ...s, [k]: v }));
  const setTg = (k, v) => setTgState(s => ({ ...s, [k]: v }));

  // Card 3 — agenda
  // Nothing is written for them: an agenda somebody else drafted gets saved unread, and "Opening &
  // context setting" was turning up as item 01 of meetings that never had an opening.
  const [agenda, setAgenda] = useState([{ text: '', time: '10m', note: '' }]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [outcome, setOutcome] = useState('');
  const addAgenda = () => { setAgenda(a => [...a, { text: '', time: '10m', note: '' }]); setFocusIdx(agenda.length); };
  // What the card's header reports: only lines that have been written count, and only their minutes.
  const filledAgenda = agenda.filter(a => a.text.trim()).length;
  const agendaMinutes = agenda.filter(a => a.text.trim()).reduce((n, a) => n + toMinutes(a.time), 0);
  const delAgenda = (i) => { setAgenda(a => a.filter((_, j) => j !== i)); setFocusIdx(-1); };

  // Card 4 — attendees.
  // Colleagues are picked from the real staff directory, never typed: the name stored here is what
  // decides who is shown the meeting and who is notified about it, so it has to be an account.
  const { data: directory, isLoading: loadingPeople } = useListPeopleQuery();
  const people = directory ?? [];
  const [internals, setInternals] = useState([]);
  const [externals, setExternals] = useState([]);
  const [extAdd, setExtAdd] = useState('');
  const [chair, setChair] = useState('');
  const [minuteTaker, setMinuteTaker] = useState('');

  // The person scheduling it is on it and chairs it until they change either — they are a real
  // account, unlike the three names this form used to invent.
  useEffect(() => {
    if (isEdit || !meName) return;
    setInternals(x => (x.length ? x : [meName]));
    setChair(c => c || meName);
  }, [isEdit, meName]);

  /** Who may chair or take the minutes: the colleagues on the meeting, and always the organiser. */
  const candidates = useMemo(() => [...new Set([meName, ...internals].filter(Boolean))], [meName, internals]);

  const addChip = async (kind) => {
    const v = (kind === 'ext' ? extAdd : '').trim();
    if (!v) return;
    if (kind === 'ext') {
      // Try to parse "Name <email>" format, otherwise prompt
      let email = '';
      const emailMatch = v.match(/^(.*?)\s*<\s*([^@<>]+@[^@<>]+\.[a-z]{2,})\s*>?\s*$/i);
      let name = v;
      if (emailMatch) { name = emailMatch[1].trim(); email = emailMatch[2].trim(); }
      if (!email) {
        // Cancel abandons adding them; a blank answer is what triggers the question below.
        const typed = await dlg.prompt('Email address for ' + name + ' (so minutes reach them):', '');
        if (typed === null) return;
        email = typed.trim();
        if (!email) {
          if (!await dlg.confirm('Add ' + name + ' without an email? They won\'t receive circulated minutes until an email is added.')) return;
        }
      }
      setExternals(x => [...x, { name, email }]);
      setExtAdd('');
    }
  };
  const onEnter = (kind) => (e) => { if (e.key === 'Enter') { addChip(kind); e.preventDefault(); } };

  // Card 5 — context
  const [priority, setPriority] = useState('Normal');
  const [confidentiality, setConfidentiality] = useState('Internal');
  const [privateNotes, setPrivateNotes] = useState('');
  const [autoMinutes, setAutoMinutes] = useState(true);
  const [calInvite, setCalInvite] = useState(true);
  const [pinDiary, setPinDiary] = useState(true);

  // Edit mode: fill every field from the meeting the API returned, once per meeting loaded. The type
  // picker is skipped — an existing meeting already knows what kind it is (Change Type still works).
  const filledFor = useRef('');
  useEffect(() => {
    if (!isEdit || !existing || filledFor.current === existing.id) return;
    filledFor.current = existing.id;
    setSelected(existing.type);
    setType(existing.type);
    setTitle(existing.title || '');
    if (existing.date) setDate(existing.date);
    if (existing.time) setTime(existing.time);
    setDuration(existing.dur || '1h');
    setMode(MODES.includes(existing.mode) ? existing.mode : MODES[0]);
    setLoc(existing.loc && existing.loc !== 'TBD' ? existing.loc : '');
    setChair(existing.chair || '');
    setInternals(existing.attendees ?? []);
    setMinuteTaker('');
    setExternals((existing.external ?? []).map((e) => ({ name: e.name, email: e.email || '' })));
    const items = existing.agenda ?? [];
    setAgenda(items.length
      ? items.map((t, i) => ({ text: t, time: existing.agendaTimes?.[i] || '10m', note: existing.agendaNotes?.[i] ?? '' }))
      : [{ text: '', time: '10m', note: '' }]);
    setTsState({
      ...(SUB_BADGE[existing.type] && existing.subBadge ? { [SUB_BADGE[existing.type]]: existing.subBadge } : {}),
      ...(CLIENT_NAME[existing.type] && existing.clientName ? { [CLIENT_NAME[existing.type]]: existing.clientName } : {}),
    });
  }, [isEdit, existing]);

  // Came from the Templates library: skip the type picker and drop the template's agenda items in
  // (GET /api/templates/:id — the library is the only source of templates).
  const templateId = isEdit ? undefined : navState?.templateId;
  const { data: template } = useGetTemplateQuery(templateId, { skip: !templateId });
  useEffect(() => {
    const t = !isEdit && navState?.type;
    if (t && TYPES[t]) { setSelected(t); setType(t); }
  }, [isEdit, navState?.type]);
  const templateFilled = useRef('');
  useEffect(() => {
    if (!template || templateFilled.current === template.id) return;
    templateFilled.current = template.id;
    setSelected(template.type);
    setType(template.type);
    if (template.agenda?.length) setAgenda(template.agenda.map(a => ({ text: a.text, time: a.time || '10m', note: a.note ?? '' })));
  }, [template]);

  const attendeeTotal = internals.length + externals.length;
  const tc = TYPE_COLORS[type] || TYPE_COLORS.internal;

  // saveScheduleDraft()
  const saveDraft = () => dlg.alert('✓ Draft saved. You can resume editing from My Meetings → Drafts section (not shown in this prototype).');

  // POST /api/meetings for a new meeting, PATCH /api/meetings/:id when editing one.
  const saveNewMeeting = async () => {
    if (!type) { await dlg.alert('Please choose a meeting type first.'); return; }
    const agendaItems = agenda.map(a => a.text || '').filter(Boolean);
    const agendaTimes = agenda.filter(a => a.text).map(a => a.time || '10m');
    // Notes travel in the same order as the items they belong to; a dropped (blank) item drops its note.
    const agendaNotes = agenda.filter(a => a.text).map(a => (a.note || '').trim());
    const subBadge = (ts[SUB_BADGE[type]] ?? SUB_BADGE_DEFAULT[type] ?? '').replace('— Select —', '').trim();
    const clientName = (ts[CLIENT_NAME[type]] || '').trim();
    const body = {
      type,
      title: title.trim() || 'New ' + TYPES[type].name,
      date, time,
      dur: duration || '1h',
      mode,
      // Everything left blank is omitted so the API's own defaults apply (chair = me, loc = TBD, agenda times 10m,
      // presence / pre-read built from the attendee list).
      ...(chair.trim() ? { chair: chair.trim() } : {}),
      ...(loc.trim() ? { loc: loc.trim() } : {}),
      ...(internals.length ? { attendees: internals } : {}),
      ...(externals.length ? { external: externals.map(e => ({ name: e.name, email: e.email || '' })) } : {}),
      ...(agendaItems.length ? { agenda: agendaItems, agendaTimes, agendaNotes } : {}),
      ...(subBadge ? { subBadge } : {}),
      ...(clientName ? { clientName } : {}),
    };
    try {
      if (isEdit) {
        // Editing overwrites: send the cleared fields too, so emptying one actually empties it.
        const m = await updateMeeting({
          id: editId,
          ...body,
          chair: chair.trim(),
          loc: loc.trim(),
          attendees: internals,
          external: externals.map((e) => ({ name: e.name, email: e.email || '' })),
          agenda: agendaItems,
          agendaTimes,
          agendaNotes,
        }).unwrap();
        await dlg.alert('✓ Meeting updated.');
        navigate(`/meetings/${m.id}`);
        return;
      }
      const m = await createMeeting(body).unwrap();
      await dlg.alert('✓ Meeting scheduled.\n\nCalendar invites would be dispatched to all attendees.\nPre-read reminder scheduled for 24 hrs before.\nMinutes draft auto-created.');
      navigate(`/meetings/${m.id}`);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  const stepStates = type ? { 1: 'done', 2: 'active' } : { 1: 'active' };
  let dateLabel = 'Tue 24 Nov 2026', timeLabel = '10:00 AM';
  try { if (date) dateLabel = formatDate(parseDate(date)); if (time) timeLabel = formatTime(time); } catch { /* keep defaults */ }

  if (isEdit && loadError) {
    return (
      <Box>
        <PageHeader parts={['Meeting Management', 'Edit']} icon={<Icon name="edit" />} title="Edit Meeting" />
        <Card><Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.bad, fontSize: 13 }}>{errorMessage(loadError)}</Box></Card>
      </Box>
    );
  }
  if (isEdit && (loadingExisting || !existing)) {
    return (
      <Box>
        <PageHeader parts={['Meeting Management', 'Edit']} icon={<Icon name="edit" />} title="Edit Meeting" />
        <Card><Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.slate, fontSize: 13 }}>Loading the meeting…</Box></Card>
      </Box>
    );
  }

  return (
    <Box>
      {isEdit ? (
        <PageHeader parts={['Meeting Management', 'Edit']} icon={<Icon name="edit" />} title="Edit Meeting"
          sub="Change the details of this meeting. Saving overwrites the existing meeting — it does not create a duplicate." />
      ) : (
        <PageHeader parts={['Meeting Management', 'Schedule New']} icon={<Icon name="weekly" />} title="Schedule a Meeting"
          sub="One flow for every meeting type — internal, customer, supplier, consultant, board. Pick what it is, and the form adjusts to ask only what matters for that kind of meeting." />
      )}

      {!isEdit && <ScheduleStepper states={stepStates} />}

      {!type && <ScheduleTypePicker selected={selected} onSelect={selectType} />}

      {type && (
        <Box sx={{ animation: 'slideIn 0.3s ease', '@keyframes slideIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          {/* .type-banner */}
          <Box sx={{ bgcolor: tokens.card, border: `1.5px solid ${tokens.line}`, borderLeft: `4px solid ${tc.line}`, borderRadius: tokens.radius, p: { xs: '14px 16px', md: '16px 20px' }, display: 'flex', alignItems: 'center', gap: { xs: '12px', md: '16px' }, mb: '20px', flexWrap: 'wrap' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, bgcolor: tc.soft, color: tc.color }}>{TYPES[type].icon}</Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.15em', color: tokens.slate, textTransform: 'uppercase', mb: '3px' }}>Meeting Type</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 700, m: 0 }}>{TYPES[type].name}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '2px' }}>{TYPES[type].desc}</Typography>
            </Box>
            <ButtonBase onClick={changeType} sx={{ p: '8px 14px', border: `1px solid ${tokens.line}`, bgcolor: 'transparent', borderRadius: '20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tokens.slate, textTransform: 'uppercase', transition: 'all 0.15s', fontFamily: 'inherit', '&:hover': { borderColor: tokens.teal, color: tokens.tealDark, bgcolor: tokens.tealSofter } }}>Change Type</ButtonBase>
          </Box>

          {/* Card 2 — Meeting Basics */}
          <Card num={2} title="Meeting Basics" sub="When · Where · How long">
            <Row><Grid size={col1}><Field label="Meeting Title" req><TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q3 Operations Review · Hyderabad Hub" /></Field></Grid></Row>
            <Row>
              <Grid size={col3}><Field label="Date" req><DateInput value={date} onChange={e => setDate(e.target.value)} /></Field></Grid>
              <Grid size={col3}><Field label="Start Time" req><TimeInput value={time} onChange={e => setTime(e.target.value)} /></Field></Grid>
              <Grid size={col3}><Field label="Duration"><DurationInput value={duration} onChange={e => setDuration(e.target.value)} /></Field></Grid>
            </Row>
            <Row><Grid size={col1}><Field label="Mode"><Segmented options={MODES} value={mode} onChange={setMode} /></Field></Grid></Row>
            <Row>
              <Grid size={col2}><Field label="Location / Meeting Room"><TextInput value={loc} onChange={e => setLoc(e.target.value)} placeholder="e.g. Begumpet HQ · Board Room" /></Field></Grid>
              <Grid size={col2}><Field label="Virtual Link" hint="if applicable"><TextInput value={vlink} onChange={e => setVlink(e.target.value)} placeholder="Zoom / Teams / Google Meet" /></Field></Grid>
            </Row>
            {/* Type-specific blocks */}
            <ScheduleTypeFields type={type} ts={ts} setTs={setTs} tg={tg} setTg={setTg} />
          </Card>

          {/* Card 3 — Agenda Items */}
          <Card num={3} title="Agenda Items" sub="What we're meeting about · ordered list"
            right={<Box sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(255,255,255,.8)' }}>
              {filledAgenda === 0 ? 'nothing written yet' : <>
                <Box component="strong" sx={{ color: '#fff' }}>{filledAgenda}</Box> item{filledAgenda === 1 ? '' : 's'}
                {agendaMinutes ? <> · <Box component="strong" sx={{ color: tokens.yellow }}>{fromMinutes(agendaMinutes)}</Box> planned</> : null}
              </>}
            </Box>}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '10px', p: '10px 14px', mb: '14px', bgcolor: tokens.tealSofter, border: `1px solid ${tokens.tealSoft}`, borderRadius: tokens.radiusSm }}>
              <Icon name="tip" size={16} sx={{ color: tokens.teal, mt: '1px' }} />
              <Box sx={{ fontSize: 12.5, color: tokens.slate, lineHeight: 1.5 }}>
                One line per thing you will cover, in the order you will cover it. The <Box component="strong" sx={{ color: tokens.tealDark }}>note</Box> under each line is for who presents it, what to bring and the numbers to have ready — it shows up on the agenda and in the minutes.
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', mb: '14px' }}>
              {agenda.map((it, i) => (
                <AgendaItem key={i} idx={i} item={it} autoFocus={i === focusIdx} canDelete={agenda.length > 1} onChange={n => setAgenda(a => a.map((x, j) => j === i ? n : x))} onDelete={() => delAgenda(i)} />
              ))}
            </Box>
            {/* A full-width dashed slot rather than a text link: it is the next thing most people
                want, and as a link among links it was read as a footnote. */}
            <Box component="button" type="button" onClick={addAgenda}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', p: '13px', bgcolor: tokens.card, border: `1.5px dashed ${tokens.slateSofter}`, borderRadius: tokens.radius, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: tokens.teal, transition: 'all .15s', '&:hover': { borderColor: tokens.teal, bgcolor: tokens.tealSofter }, '&:focus-visible': { outline: 'none', borderColor: tokens.teal, boxShadow: '0 0 0 3px rgba(15,118,110,.12)' } }}>
              <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>+</Box> Add another agenda item
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: '10px' }}>
              <TextLink onClick={() => navigate('/templates')}><Icon name="clipboard" />Or load a ready-made agenda from a template…</TextLink>
            </Box>
            <Row sx={{ mt: '14px', mb: 0 }}><Grid size={col1}><Field label="Expected Outcome" hint="what success looks like"><TextArea value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g. Signed MoU · Approved budget · Clarity on next 30-day action plan" /></Field></Grid></Row>
          </Card>

          {/* Card 4 — Attendees */}
          <Card num={4} title="Attendees" sub="Internal team + external participants">
            <Grid container spacing={2.5}>
              <Grid size={col2}>
                <FieldLabel right={<Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, fontWeight: 400, letterSpacing: '0.05em' }}>{internals.length} added</Box>} sx={{ mb: '10px' }}>Internal (TrustLab)</FieldLabel>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
                  {internals.map((n, i) => <Chip key={n + i} onRemove={() => setInternals(x => x.filter((_, j) => j !== i))}>{n}</Chip>)}
                </Box>
                <Box sx={{ mt: 1 }}>
                  <PeoplePicker value={internals} onChange={setInternals} people={people} me={meName} loading={loadingPeople}
                    placeholder="Add a colleague from the staff list…" emptyNote="No staff accounts yet. Add people in Settings → Users." />
                </Box>
                <Box sx={{ fontSize: 11, color: tokens.slate, mt: '6px' }}>
                  Everyone added here is shown the meeting in their own MyDiary and told about it when you save.
                </Box>
              </Grid>
              <Grid size={col2}>
                <FieldLabel right={<Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, fontWeight: 400, letterSpacing: '0.05em' }}>{externals.length} added</Box>} sx={{ mb: '10px' }}>External</FieldLabel>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mt: '10px' }}>
                  {externals.map((e, i) => <Chip key={e.name + i} external noEmail={!e.email} email={e.email || undefined} onRemove={() => setExternals(x => x.filter((_, j) => j !== i))}>{e.name}</Chip>)}
                </Box>
                <Box sx={{ display: 'flex', gap: '6px', mt: 1 }}>
                  <TextInput value={extAdd} onChange={e => setExtAdd(e.target.value)} onKeyDown={onEnter('ext')} placeholder="Name, email or company..." sx={{ flex: 1 }} />
                  <AddBtn ext onClick={() => addChip('ext')}>+ Add</AddBtn>
                </Box>
              </Grid>
            </Grid>
            {/* Both are real people off the list above, not job titles: the chair is shown the meeting
                and is told who has accepted, so "Rotating" would be nobody at all. */}
            <Row sx={{ mt: '20px', mb: 0 }}>
              <Grid size={col2}><Field label="Chair / Lead" hint="runs the meeting">
                <SelectInput value={chair} onChange={e => setChair(e.target.value)}>
                  {candidates.map(n => <option key={n} value={n}>{n === meName ? `${n} (you)` : n}</option>)}
                </SelectInput>
              </Field></Grid>
              <Grid size={col2}><Field label="Minute Taker" hint="writes the minutes">
                <SelectInput value={minuteTaker} onChange={e => setMinuteTaker(e.target.value)}>
                  <option value="">— Nominate on the day —</option>
                  {candidates.map(n => <option key={n} value={n}>{n === meName ? `${n} (you)` : n}</option>)}
                </SelectInput>
              </Field></Grid>
            </Row>
          </Card>

          {/* Card 5 — Pre-Reads, Priority & Confidentiality */}
          <Card num={5} title="Pre-Reads, Priority & Confidentiality" sub="Attachments · urgency · access controls">
            <Row>
              <Grid size={col2}><Field label="Priority"><Segmented options={['Low', 'Normal', 'High', 'Critical']} value={priority} onChange={setPriority} /></Field></Grid>
              <Grid size={col2}><Field label="Confidentiality"><Segmented options={['Open', 'Internal', 'Confidential', 'Board-only']} value={confidentiality} onChange={setConfidentiality} /></Field></Grid>
            </Row>
            <Row sx={{ mt: '14px' }}><Grid size={col1}><Field label="Private Notes for the Chair" hint="only visible to you"><TextArea value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} placeholder="Context, political dynamics, questions to probe..." /></Field></Grid></Row>
            <ToggleRow label="Auto-create post-meeting minutes draft" desc="Draft minutes stub created with agenda items, ready for minute-taker." on={autoMinutes} onChange={setAutoMinutes} />
            <ToggleRow label="Send calendar invite to all attendees" desc="Google Calendar / Outlook invites dispatched on save." on={calInvite} onChange={setCalInvite} />
            <ToggleRow label="Pin to My Diary" desc="Show on your personal diary view for the day of the meeting." on={pinDiary} onChange={setPinDiary} />
          </Card>

          {/* .foot-cta */}
          <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '16px', md: '20px 24px' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, boxShadow: tokens.shadow, gap: 2, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, color: tokens.slate, '& strong': { color: tokens.ink, fontWeight: 700 } }}>
              {isEdit ? 'Editing' : 'Scheduling'}: <strong>{TYPES[type].name}</strong> · <strong>{dateLabel}</strong>, <strong>{timeLabel}</strong> · <strong>{attendeeTotal} attendees</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Btn variant="ghost" onClick={async () => { if (await dlg.confirm(isEdit ? 'Discard your changes to this meeting?' : 'Discard this meeting draft?')) navigate(isEdit ? `/meetings/${editId}` : '/meetings'); }}>Cancel</Btn>
              {!isEdit && <Btn onClick={saveDraft}><Icon name="save" />Save as Draft</Btn>}
              <Btn variant="primary" onClick={saveNewMeeting} disabled={saving}>{saving ? (isEdit ? 'Saving…' : 'Scheduling…') : (isEdit ? 'Save Changes →' : 'Schedule Meeting →')}</Btn>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
