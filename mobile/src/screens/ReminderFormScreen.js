import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AlarmClock, Plus, Trash2, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { SwitchRow } from '../components/SwitchRow';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { blankReminder, whenLabel, whyNotSavable } from '../model/reminder';
import { errorMessage, useMe } from '../store';
import {
  useCreateReminderMutation,
  useGetReminderQuery,
  useRemoveReminderMutation,
  useUpdateReminderMutation,
} from '../store/api/remindersApi';
import { colors, hairline, s, vs } from '../theme';

/**
 * Set a reminder, or change one.
 *
 * People are named, not picked from a list: v2 names people everywhere, and the list of users is
 * admin-only, so a picker would be empty for most people. "Remind me too" is on by default — the
 * commonest reminder is one you set for yourself.
 */
export function ReminderFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const editId = route.params?.id;

  const { data: existing, error: loadError } = useGetReminderQuery(editId, {
    skip: !editId,
  });
  const [createReminder, creating] = useCreateReminderMutation();
  const [updateReminder, updating] = useUpdateReminderMutation();
  const [removeReminder] = useRemoveReminderMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [d, setD] = useState(() => blankReminder());
  const [personName, setPersonName] = useState('');
  const [problem, setProblem] = useState('');

  const set = (key, value) => setD(x => ({ ...x, [key]: value }));

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setD({
      title: existing.title ?? '',
      note: existing.note ?? '',
      date: existing.date ?? '',
      time: existing.time ?? '',
      // The person who set it is kept out of the list; "remind me too" stands for them.
      recipients: (existing.recipients ?? [])
        .map(p => p.name)
        .filter(n => n !== me?.name),
      remindMe: existing.forMe,
    });
  }, [existing, me?.name]);

  const addPerson = () => {
    const name = personName.trim();
    if (!name || d.recipients.includes(name) || name === me?.name) {
      setPersonName('');
      return;
    }
    set('recipients', [...d.recipients, name]);
    setPersonName('');
  };

  const save = async () => {
    const why = whyNotSavable(d);
    if (why) {
      setProblem(why);
      return;
    }
    setProblem('');
    const body = {
      title: d.title.trim(),
      note: d.note.trim(),
      date: d.date,
      time: d.time,
      recipients: d.recipients,
      remindMe: d.remindMe,
    };
    try {
      if (editId) {
        await updateReminder({ id: editId, ...body }).unwrap();
        nav.goBack();
      } else {
        const saved = await createReminder(body).unwrap();
        nav.replace('ReminderDetail', { id: saved.id });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this reminder?',
      text: 'It will not go off, and everyone it was set for is told it is off.',
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeReminder(editId).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  if (editId && loadError) {
    return (
      <FormScreen title="Edit reminder">
        <Notice tone="error" title={errorMessage(loadError)} />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={editId ? 'Edit reminder' : 'Set a reminder'}
      right={
        editId ? (
          <IconButton
            icon={Trash2}
            label="Delete reminder"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : editId ? 'Save changes' : 'Set reminder'}
          iconLeft={AlarmClock}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <FormCard title="What to remember">
        <TextField
          label="Title"
          value={d.title}
          onChangeText={v => set('title', v)}
          placeholder="e.g. Review meeting starts"
        />
        <TextArea
          label="Note"
          value={d.note}
          onChangeText={v => set('note', v)}
          placeholder="Anything worth adding"
          rows={3}
        />
      </FormCard>

      <FormCard title="When it goes off">
        <DateField label="Date" value={d.date} onChange={v => set('date', v)} />
        <TimeField label="Time" value={d.time} onChange={v => set('time', v)} />
        {d.date && d.time ? (
          <AppText variant="meta" color={colors.tealDeep} style={styles.preview}>
            Goes off {whenLabel(d).toLowerCase()}
          </AppText>
        ) : null}
      </FormCard>

      <FormCard title={`Who to remind${d.recipients.length ? ` · ${d.recipients.length}` : ''}`}>
        <SwitchRow
          label="Remind me too"
          value={d.remindMe}
          onChange={v => set('remindMe', v)}
        />

        {d.recipients.length ? (
          <View style={styles.chips}>
            {d.recipients.map(name => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                onPress={() =>
                  set('recipients', d.recipients.filter(x => x !== name))
                }
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <AppText variant="meta">{name}</AppText>
                <X size={s(13)} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.addRow}>
          {/* TextField spreads its props onto the TextInput, so the row's flex goes on a wrapper. */}
          <View style={styles.flex}>
            <TextField
              label="Add a colleague"
              value={personName}
              onChangeText={setPersonName}
              placeholder="Their name"
              onSubmitEditing={addPerson}
              returnKeyType="done"
            />
          </View>
          <IconButton
            icon={Plus}
            label="Add this person"
            size={34}
            iconSize={17}
            onPress={addPerson}
            style={styles.addButton}
          />
        </View>

        <AppText variant="meta" color={colors.inkFaint}>
          Everyone named gets a notification the moment it is set, and again when it goes off.
        </AppText>
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  preview: { marginTop: vs(2), marginBottom: vs(8) },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginTop: vs(10),
    marginBottom: vs(4),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: s(14),
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s(8) },
  addButton: { marginBottom: vs(10) },
});
