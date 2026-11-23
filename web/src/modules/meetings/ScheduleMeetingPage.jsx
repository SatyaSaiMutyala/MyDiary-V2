import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { tokens, fonts, TYPE_COLORS } from '../../theme/tokens';
import { PageHeader, Btn, TextLink, AddBtn, Card, Field, FieldLabel, TextInput, TextArea, SelectInput, Segmented, ToggleRow, Chip, DelBtn } from '../../components';
import { useCrumbs } from '../../store/CrumbsContext';
import { errorMessage } from '../../store/api/baseApi';
import { useCreateMeetingMutation, useGetMeetingQuery, useUpdateMeetingMutation } from '../../store/api/meetingsApi';
import { useGetTemplateQuery } from '../../store/api/templatesApi';
import { TYPES } from '../../data/meetings';
import { parseDate, formatDate, formatTime } from '../../utils/dates';
import ScheduleStepper from './components/scheduleStepper';
import ScheduleTypePicker from './components/scheduleTypePicker';
import ScheduleTypeFields, { Row, col1, col2, col3 } from './components/scheduleTypeFields';
import { useDialog } from '../../components/Dialogs';

const DURATIONS = { '30 minutes': '30m', '45 minutes': '45m', '1 hour': '1h', '1 hour 30 minutes': '1h 30m', '2 hours': '2h', 'Half day': '4h', 'Full day': '8h' };
const MODES = ['📍 In-person', '💻 Virtual', '🔀 Hybrid'];
const DURATION_LABEL = Object.fromEntries(Object.entries(DURATIONS).map(([label, v]) => [v, label]));

/** The type-specific field that becomes the meeting's `subBadge`, and the one that becomes `clientName`. */
const SUB_BADGE = { internal: 'subType', customer: 'purpose', supplier: 'topic', consultants: 'engArea', board: 'classification', other: 'category' };
const CLIENT_NAME = { customer: 'customer', supplier: 'supplier', consultants: 'consultant', other: 'host' };
const SUB_BADGE_DEFAULT = { internal: 'Ops Review', customer: 'New Business Pitch', supplier: 'Price Negotiation', consultants: 'QMS / NABL', board: 'Board Meeting (Ordinary)' };

/** One .agenda-item row (editable) */
function AgendaItem({ idx, item, onChange, onDelete, autoFocus }) {
  const dlg = useDialog();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '6px', sm: '10px' }, p: '10px 12px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: tokens.radiusSm }}>
      <Box component="span" sx={{ color: tokens.slateSofter, cursor: 'grab', p: '2px', fontSize: 14, userSelect: 'none' }}>⋮⋮</Box>
      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: tokens.greenDeep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{String(idx + 1).padStart(2, '0')}</Box>
      <Box component="input" type="text" autoFocus={autoFocus} value={item.text} placeholder="Agenda item..." onChange={e => onChange({ ...item, text: e.target.value })}
        sx={{ flex: 1, minWidth: 0, bgcolor: 'transparent', border: 'none', fontSize: 13, outline: 'none', p: '2px 4px', borderRadius: '3px', fontFamily: 'inherit', color: tokens.ink, '&:focus': { bgcolor: '#fff', boxShadow: `0 0 0 2px ${tokens.teal}` }, '&::placeholder': { color: tokens.slateSoft } }} />
      <Box component="input" type="text" value={item.time} onChange={e => onChange({ ...item, time: e.target.value })}
        sx={{ width: 60, bgcolor: '#fff', border: `1px solid ${tokens.line}`, borderRadius: '4px', p: '4px 6px', fontSize: 11, textAlign: 'center', fontFamily: fonts.mono, color: tokens.ink, flexShrink: 0 }} />
      <DelBtn onClick={onDelete} />
    </Box>
  );
}

/** #view-schedule — Schedule a Meeting (selectType / changeType / addAgenda / addChip / saveNewMeeting …) */
export default function ScheduleMeetingPage() {
  const navigate = useNavigate();
  // "📋 Load from template…" sends the person to /templates; picking a card comes back here with
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
  const [duration, setDuration] = useState('1 hour');
  const [mode, setMode] = useState(MODES[0]);
  const [loc, setLoc] = useState('');
  const [vlink, setVlink] = useState('');
  const [ts, setTsState] = useState({});
  const [tg, setTgState] = useState({});
  const setTs = (k, v) => setTsState(s => ({ ...s, [k]: v }));
  const setTg = (k, v) => setTgState(s => ({ ...s, [k]: v }));

  // Card 3 — agenda
  const [agenda, setAgenda] = useState([{ text: 'Opening & context setting', time: '5m' }, { text: '', time: '15m' }, { text: '', time: '10m' }]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [outcome, setOutcome] = useState('');
  const addAgenda = () => { setAgenda(a => [...a, { text: '', time: '10m' }]); setFocusIdx(agenda.length); };
  const delAgenda = (i) => { setAgenda(a => a.filter((_, j) => j !== i)); setFocusIdx(-1); };

  // Card 4 — attendees
  const [internals, setInternals] = useState(['Venkata Cherukuri', 'N. Sharma (CFO)', 'Pallavi (EA)']);
  const [externals, setExternals] = useState([]);
  const [intAdd, setIntAdd] = useState('');
  const [extAdd, setExtAdd] = useState('');
  const [chair, setChair] = useState('Venkata Cherukuri (CMD)');
  const [minuteTaker, setMinuteTaker] = useState('Pallavi (EA)');

  const addChip = async (kind) => {
    const v = (kind === 'ext' ? extAdd : intAdd).trim();
    if (!v) return;
    if (kind === 'ext') {
      // Try to parse "Name <email>" format, otherwise prompt
      let email = '';
      const emailMatch = v.match(/^(.*?)\s*<\s*([^@<>]+@[^@<>]+\.[a-z]{2,})\s*>?\s*$/i);
      let name = v;
      if (emailMatch) { name = emailMatch[1].trim(); email = emailMatch[2].trim(); }
      if (!email) {
        email = (await dlg.prompt('Email address for ' + name + ' (so minutes reach them):', '') || '').trim();
        if (!email) {
          if (!await dlg.confirm('Add ' + name + ' without an email? They won\'t receive circulated minutes until an email is added.')) return;
        }
      }
      setExternals(x => [...x, { name, email }]);
      setExtAdd('');
    } else {
      setInternals(x => [...x, v]);
      setIntAdd('');
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
    setDuration(DURATION_LABEL[existing.dur] || '1 hour');
    setMode(MODES.includes(existing.mode) ? existing.mode : MODES[0]);
    setLoc(existing.loc && existing.loc !== 'TBD' ? existing.loc : '');
    setChair(existing.chair || '');
    setInternals(existing.attendees ?? []);
    setExternals((existing.external ?? []).map((e) => ({ name: e.name, email: e.email || '' })));
    const items = existing.agenda ?? [];
    setAgenda(items.length ? items.map((t, i) => ({ text: t, time: existing.agendaTimes?.[i] || '10m' })) : [{ text: '', time: '10m' }]);
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
    if (template.agenda?.length) setAgenda(template.agenda.map(a => ({ text: a.text, time: a.time || '10m' })));
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
    const subBadge = (ts[SUB_BADGE[type]] ?? SUB_BADGE_DEFAULT[type] ?? '').replace('— Select —', '').trim();
    const clientName = (ts[CLIENT_NAME[type]] || '').trim();
    const body = {
      type,
      title: title.trim() || 'New ' + TYPES[type].name,
      date, time,
      dur: DURATIONS[duration] || '1h',
      mode,
      // Everything left blank is omitted so the API's own defaults apply (chair = me, loc = TBD, agenda times 10m,
      // presence / pre-read built from the attendee list).
      ...(chair.startsWith('Venkata Cherukuri') ? { chair: 'Venkata Cherukuri' } : {}),
      ...(loc.trim() ? { loc: loc.trim() } : {}),
      ...(internals.length ? { attendees: internals } : {}),
      ...(externals.length ? { external: externals.map(e => ({ name: e.name, email: e.email || '' })) } : {}),
      ...(agendaItems.length ? { agenda: agendaItems, agendaTimes } : {}),
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
        <PageHeader parts={['Meeting Management', 'Edit']} icon="✎" title="Edit Meeting" />
        <Card><Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.bad, fontSize: 13 }}>{errorMessage(loadError)}</Box></Card>
      </Box>
    );
  }
  if (isEdit && (loadingExisting || !existing)) {
    return (
      <Box>
        <PageHeader parts={['Meeting Management', 'Edit']} icon="✎" title="Edit Meeting" />
        <Card><Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.slate, fontSize: 13 }}>Loading the meeting…</Box></Card>
      </Box>
    );
  }

  return (
    <Box>
      {isEdit ? (
        <PageHeader parts={['Meeting Management', 'Edit']} icon="✎" title="Edit Meeting"
          sub="Change the details of this meeting. Saving overwrites the existing meeting — it does not create a duplicate." />
      ) : (
        <PageHeader parts={['Meeting Management', 'Schedule New']} icon="📅" title="Schedule a Meeting"
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
              <Grid size={col3}><Field label="Date" req><TextInput type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></Grid>
              <Grid size={col3}><Field label="Start Time" req><TextInput type="time" value={time} onChange={e => setTime(e.target.value)} /></Field></Grid>
              <Grid size={col3}><Field label="Duration"><SelectInput value={duration} onChange={e => setDuration(e.target.value)}>{Object.keys(DURATIONS).map(d => <option key={d}>{d}</option>)}</SelectInput></Field></Grid>
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
          <Card num={3} title="Agenda Items" sub="What we're meeting about · ordered list">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', mb: '12px' }}>
              {agenda.map((it, i) => (
                <AgendaItem key={i} idx={i} item={it} autoFocus={i === focusIdx} onChange={n => setAgenda(a => a.map((x, j) => j === i ? n : x))} onDelete={() => delAgenda(i)} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              <TextLink onClick={addAgenda}>+ Add agenda item</TextLink>
              <TextLink sx={{ ml: '14px' }} onClick={() => navigate('/templates')}>📋 Load from template…</TextLink>
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
                <Box sx={{ display: 'flex', gap: '6px', mt: 1 }}>
                  <TextInput value={intAdd} onChange={e => setIntAdd(e.target.value)} onKeyDown={onEnter('int')} placeholder="Search employee..." sx={{ flex: 1 }} />
                  <AddBtn onClick={() => addChip('int')}>+ Add</AddBtn>
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
            <Row sx={{ mt: '20px', mb: 0 }}>
              <Grid size={col2}><Field label="Chair / Lead"><SelectInput value={chair} onChange={e => setChair(e.target.value)}><option>Venkata Cherukuri (CMD)</option><option>Rotating</option><option>External facilitator</option></SelectInput></Field></Grid>
              <Grid size={col2}><Field label="Minute Taker"><SelectInput value={minuteTaker} onChange={e => setMinuteTaker(e.target.value)}><option>Pallavi (EA)</option><option>Self</option><option>Nominated per meeting</option></SelectInput></Field></Grid>
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
              {!isEdit && <Btn onClick={saveDraft}>💾 Save as Draft</Btn>}
              <Btn variant="primary" onClick={saveNewMeeting} disabled={saving}>{saving ? (isEdit ? 'Saving…' : 'Scheduling…') : (isEdit ? 'Save Changes →' : 'Schedule Meeting →')}</Btn>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
