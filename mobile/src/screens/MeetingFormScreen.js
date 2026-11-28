import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronRight,
  ClipboardList,
  MapPin,
  Monitor,
  NotebookPen,
  Plus,
  Shuffle,
  X,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { IconTile } from '../components/IconTile';
import { ChoiceGroup } from '../components/ChoiceGroup';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { errorMessage } from '../store';
import {
  useCreateMeetingMutation,
  useGetMeetingQuery,
  useUpdateMeetingMutation,
} from '../store/api/meetingsApi';
import { useListTemplatesQuery } from '../store/api/templatesApi';
import { durations, meetingTypes, modes } from '../model/meeting';
import { useMe } from '../store';
import { colors, fieldGap, hairline, radius, s, vs } from '../theme';

const typeOptions = meetingTypes.map(t => ({ id: t.id, label: t.label }));
const durationOptions = durations.map(d => ({ id: d.id, label: d.label }));

/**
 * One agenda line being edited: number, text, duration, remove — and a note under it.
 *
 * The note is the half-sentence the chair wants in the room: who presents, what to bring, the figure
 * to have ready. It is kept with the item rather than in one block at the end, so it stays attached
 * when lines are added or removed, and it is the same field the website writes.
 */
function AgendaRow({ index, item, onChange, onRemove }) {
  return (
    <View style={styles.agendaItem}>
      <View style={styles.agendaRow}>
        <View style={styles.number}>
          <AppText variant="metaStrong" color={colors.white}>
            {String(index + 1).padStart(2, '0')}
          </AppText>
        </View>
        <View style={styles.agendaField}>
          <TextField
            value={item.text}
            onChangeText={text => onChange({ ...item, text })}
            placeholder="Agenda item…"
          />
        </View>
        <View style={styles.agendaTime}>
          <TextField
            value={item.time}
            onChangeText={time => onChange({ ...item, time })}
            placeholder="10m"
            textAlign="center"
            maxLength={6}
          />
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={s(8)}
          accessibilityRole="button"
          accessibilityLabel={`Remove agenda item ${index + 1}`}
          style={styles.remove}
        >
          <X size={s(16)} color={colors.inkMuted} strokeWidth={2} />
        </Pressable>
      </View>
      <View style={styles.noteRow}>
        <NotebookPen size={s(14)} color={colors.inkMuted} strokeWidth={2} />
        <View style={styles.noteField}>
          <TextField
            value={item.note ?? ''}
            onChangeText={note => onChange({ ...item, note })}
            placeholder="Note (optional)"
            accessibilityLabel={`Note for agenda item ${index + 1}`}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Plan a meeting, or change one.
 *
 * The form asks for what the website's Schedule page asks for, in the order it asks. A new meeting
 * can start from an agenda template, exactly as "Load from template…" does on the website: the
 * picker hands back a `templateId`, and the type and agenda lines are filled in from it.
 */
export function MeetingFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const editId = route.params?.id;
  // Handed back by the template picker. A meeting being edited keeps its own agenda.
  const templateId = editId ? undefined : route.params?.templateId;
  const { data: editing } = useGetMeetingQuery(editId, { skip: !editId });
  const { data: templates } = useListTemplatesQuery(
    { limit: 50 },
    { skip: !templateId },
  );
  const [createMeeting, creating] = useCreateMeetingMutation();
  const [updateMeeting, updating] = useUpdateMeetingMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [title, setTitle] = useState('');
  const [type, setType] = useState('internal');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [dur, setDur] = useState('1h');
  const [mode, setMode] = useState(modes[0].id);
  const [loc, setLoc] = useState('');
  const [chair, setChair] = useState(me?.name ?? '');
  const [attendees, setAttendees] = useState([]);
  const [person, setPerson] = useState('');
  const [agenda, setAgenda] = useState([{ text: '', time: '10m', note: '' }]);
  const [problem, setProblem] = useState('');

  // Editing: fill every field once, when the meeting arrives.
  const filled = useRef(false);
  useEffect(() => {
    if (!editing || filled.current) {
      return;
    }
    filled.current = true;
    setTitle(editing.title ?? '');
    setType(editing.type ?? 'internal');
    setDate(editing.date ?? '');
    setTime(editing.time ?? '10:00');
    setDur(editing.dur ?? '1h');
    setMode(editing.mode || modes[0].id);
    setLoc(editing.loc && editing.loc !== 'TBD' ? editing.loc : '');
    setChair(editing.chair ?? '');
    setAttendees(editing.attendees ?? []);
    setAgenda(
      editing.agenda?.length
        ? editing.agenda.map((text, i) => ({
            text,
            time: editing.agendaTimes?.[i] ?? '10m',
            note: editing.agendaNotes?.[i] ?? '',
          }))
        : [{ text: '', time: '10m', note: '' }],
    );
  }, [editing]);

  // A chosen template fills the type and the agenda, once, and leaves everything else alone — the
  // title, date and people are this meeting's own.
  const usedTemplate = useRef('');
  useEffect(() => {
    if (!templateId || usedTemplate.current === templateId) {
      return;
    }
    const chosen = (templates?.items ?? []).find(x => x.id === templateId);
    if (!chosen) {
      return;
    }
    usedTemplate.current = templateId;
    if (chosen.type) {
      setType(chosen.type);
    }
    if (chosen.agenda?.length) {
      setAgenda(
        chosen.agenda.map(a => ({
          text: a.text,
          time: a.time || '10m',
          note: a.note ?? '',
        })),
      );
    }
  }, [templateId, templates]);

  // ChoiceGroup draws an icon per option; emoji cannot be used because AppText pins Poppins.
  const modeIcons = { '📍 In-person': MapPin, '💻 Virtual': Monitor, '🔀 Hybrid': Shuffle };
  const modeOptions = useMemo(
    () =>
      modes.map(mo => ({
        key: mo.id,
        label: mo.label,
        icon: modeIcons[mo.id],
        tone: 'teal',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addPerson = () => {
    const name = person.trim();
    if (!name || attendees.includes(name)) {
      setPerson('');
      return;
    }
    setAttendees(list => [...list, name]);
    setPerson('');
  };

  const save = async () => {
    const items = agenda.filter(a => a.text.trim());
    if (!title.trim()) {
      setProblem('Give the meeting a title.');
      return;
    }
    if (!date) {
      setProblem('Pick the date it happens on.');
      return;
    }
    setProblem('');

    // Anything left blank is left out, so the API's own defaults apply.
    const body = {
      title: title.trim(),
      type,
      date,
      time,
      dur,
      mode,
      ...(loc.trim() ? { loc: loc.trim() } : null),
      ...(chair.trim() ? { chair: chair.trim() } : null),
      ...(attendees.length ? { attendees } : null),
      ...(items.length
        ? {
            agenda: items.map(a => a.text.trim()),
            agendaTimes: items.map(a => (a.time || '10m').trim()),
            agendaNotes: items.map(a => (a.note || '').trim()),
          }
        : null),
    };

    try {
      const saved = editId
        ? await updateMeeting({ id: editId, ...body }).unwrap()
        : await createMeeting(body).unwrap();
      if (editId) {
        nav.goBack();
      } else {
        nav.replace('MeetingDetail', { id: saved.id });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit meeting' : 'Plan a meeting'}
      footer={
        <Button
          label={
            saving ? 'Saving…' : editId ? 'Save changes' : 'Create meeting'
          }
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      {editId ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start from an agenda template"
          onPress={() => nav.navigate('MeetingTemplates')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card style={styles.template}>
          <IconTile bg={colors.tealTint} size={34}>
            <ClipboardList size={s(17)} color={colors.teal} strokeWidth={2} />
          </IconTile>
          <View style={styles.templateText}>
            <AppText variant="label">Start from a template</AppText>
            <AppText variant="meta" color={colors.inkMuted}>
              A ready-made agenda for a recurring meeting
            </AppText>
          </View>
            <ChevronRight size={s(18)} color={colors.inkFaint} />
          </Card>
        </Pressable>
      )}

      <FormCard title="What and when">
        <TextField
          label="Meeting title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Q3 Operations Review"
        />
        <Dropdown
          label="Kind"
          options={typeOptions}
          value={type}
          onChange={setType}
        />
        <DateField label="Date" value={date} onChange={setDate} />
        <TimeField label="Start time" value={time} onChange={setTime} />
        <Dropdown
          label="Duration"
          options={durationOptions}
          value={dur}
          onChange={setDur}
        />
      </FormCard>

      <FormCard title="Where">
        <ChoiceGroup
          label="Mode"
          options={modeOptions}
          value={mode}
          onChange={k => k && setMode(k)}
          style={styles.mode}
        />
        <TextField
          label="Location"
          value={loc}
          onChangeText={setLoc}
          placeholder="Meeting room, branch or link"
        />
      </FormCard>

      <FormCard title="Who">
        <TextField
          label="Chair"
          value={chair}
          onChangeText={setChair}
          placeholder="Who runs the meeting"
        />
        <AppText variant="label" color={colors.inkSoft} style={styles.label}>
          Attendees
        </AppText>
        {attendees.length ? (
          <View style={styles.chips}>
            {attendees.map(name => (
              <Pressable
                key={name}
                onPress={() =>
                  setAttendees(list => list.filter(x => x !== name))
                }
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                style={styles.chip}
              >
                <AppText variant="meta" color={colors.tealDeep}>
                  {name}
                </AppText>
                <X size={s(13)} color={colors.tealDeep} strokeWidth={2.4} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField
              value={person}
              onChangeText={setPerson}
              placeholder="Add someone by name"
              onSubmitEditing={addPerson}
            />
          </View>
          <Button
            label="Add"
            size="sm"
            variant="outline"
            iconLeft={Plus}
            onPress={addPerson}
          />
        </View>
      </FormCard>

      <FormCard title="Agenda">
        {agenda.map((item, i) => (
          <AgendaRow
            key={i}
            index={i}
            item={item}
            onChange={next =>
              setAgenda(list => list.map((x, j) => (j === i ? next : x)))
            }
            onRemove={() =>
              setAgenda(list =>
                list.length === 1
                  ? [{ text: '', time: '10m' }]
                  : list.filter((_, j) => j !== i),
              )
            }
          />
        ))}
        <Button
          label="Add agenda item"
          size="sm"
          variant="outline"
          iconLeft={Plus}
          onPress={() =>
            setAgenda(list => [...list, { text: '', time: '10m', note: '' }])
          }
          style={styles.addAgenda}
        />
      </FormCard>

    </FormScreen>
  );
}

const styles = StyleSheet.create({
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: s(12),
  },
  templateText: { flex: 1 },
  pressed: { opacity: 0.7 },
  mode: { marginBottom: fieldGap },
  label: { marginBottom: vs(5) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6), marginBottom: vs(10) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: radius.pill,
    backgroundColor: colors.tealTint,
    borderWidth: hairline,
    borderColor: colors.tealLine,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  addField: { flex: 1 },
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  number: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: colors.tealDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: fieldGap,
  },
  agendaItem: { marginBottom: vs(4) },
  agendaField: { flex: 1 },
  agendaTime: { width: s(54) },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(6),
    marginLeft: s(32),
    marginTop: -vs(4),
  },
  noteField: { flex: 1 },
  remove: { marginBottom: fieldGap },
  addAgenda: { alignSelf: 'flex-start', marginBottom: vs(12) },
});
