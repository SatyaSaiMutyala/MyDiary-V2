import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Plus, Trash2, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { SwitchRow } from '../components/SwitchRow';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import {
  blankLog,
  channels,
  logBody,
  personTypes,
  privacies,
  whyNotSavable,
} from '../model/log';
import { errorMessage, useMe } from '../store';
import {
  useCreateLogMutation,
  useGetLogQuery,
  useRemoveLogMutation,
  useUpdateLogMutation,
} from '../store/api/logsApi';
import { colors, hairline, s, vs } from '../theme';

/**
 * A conversation written up, or corrected.
 *
 * The API insists on a topic, at least one person and a summary — the three things that make a log
 * worth keeping — so those are checked here first, with the server's own wording.
 */
export function LogFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const editId = route.params?.id;

  const { data: existing } = useGetLogQuery(editId, { skip: !editId });
  const [createLog, creating] = useCreateLogMutation();
  const [updateLog, updating] = useUpdateLogMutation();
  const [removeLog] = useRemoveLogMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [d, setD] = useState(() => blankLog());
  const [problem, setProblem] = useState('');
  const [personName, setPersonName] = useState('');
  const [personType, setPersonType] = useState('internal');
  const [tagDraft, setTagDraft] = useState('');

  const set = (key, value) => setD(x => ({ ...x, [key]: value }));

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setD({
      ...blankLog(),
      ...existing,
      with: (existing.with ?? []).map(p => ({ ...p })),
      tags: existing.tags ?? [],
      followUps: (existing.followUps ?? []).map(f => ({ ...f })),
    });
  }, [existing]);

  const addPerson = () => {
    const name = personName.trim();
    if (!name || d.with.some(p => p.name === name)) {
      setPersonName('');
      return;
    }
    set('with', [...d.with, { name, type: personType, email: '' }]);
    setPersonName('');
  };

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || d.tags.includes(tag)) {
      setTagDraft('');
      return;
    }
    set('tags', [...d.tags, tag]);
    setTagDraft('');
  };

  const addFollowUp = () =>
    set('followUps', [
      ...d.followUps,
      {
        text: '',
        owner: me?.name ?? '',
        ownerType: 'internal',
        deadline: '',
        done: false,
      },
    ]);
  const patchFollowUp = (i, next) =>
    set(
      'followUps',
      d.followUps.map((f, j) => (j === i ? { ...f, ...next } : f)),
    );
  const dropFollowUp = i =>
    set(
      'followUps',
      d.followUps.filter((_, j) => j !== i),
    );

  const save = async () => {
    const why = whyNotSavable(d);
    if (why) {
      setProblem(why);
      return;
    }
    setProblem('');
    const body = logBody(d);
    try {
      if (editId) {
        await updateLog({ id: editId, ...body }).unwrap();
        nav.goBack();
      } else {
        const saved = await createLog(body).unwrap();
        nav.replace('LogDetail', { id: saved.id });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this log?',
      text: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeLog(editId).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit log' : 'Log a conversation'}
      right={
        editId ? (
          <IconButton
            icon={Trash2}
            label="Delete log"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : editId ? 'Save changes' : 'Save log'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <FormCard title="The conversation">
        <TextField
          label="Topic"
          value={d.topic}
          onChangeText={v => set('topic', v)}
          placeholder='e.g. "Called Arjun re Fernandez follow-up"'
        />
        <Dropdown
          label="How"
          options={channels}
          value={d.channel}
          onChange={v => set('channel', v)}
        />
        <DateField label="When" value={d.date} onChange={v => set('date', v)} />
        <TimeField
          label="Time"
          value={d.time}
          onChange={v => set('time', v)}
        />
        <TextField
          label="How long"
          value={d.duration}
          onChangeText={v => set('duration', v)}
          placeholder="e.g. 10 min"
        />
      </FormCard>

      <FormCard title={`Who you spoke with${d.with.length ? ` · ${d.with.length}` : ''}`}>
        {d.with.length ? (
          <View style={styles.chips}>
            {d.with.map(p => (
              <Pressable
                key={p.name}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${p.name}`}
                onPress={() =>
                  set('with', d.with.filter(x => x.name !== p.name))
                }
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <AppText variant="meta">{p.name}</AppText>
                {p.type === 'external' ? (
                  <AppText variant="meta" color={colors.blueInk}>
                    ·out
                  </AppText>
                ) : null}
                <X size={s(13)} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Dropdown
          label="From"
          options={personTypes}
          value={personType}
          onChange={setPersonType}
        />
        <View style={styles.addRow}>
          {/* TextField spreads its props onto the TextInput, so the row's flex goes on a wrapper. */}
          <View style={styles.flex}>
            <TextField
              label="Name"
              value={personName}
              onChangeText={setPersonName}
              placeholder="Who was it"
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
      </FormCard>

      <FormCard title="What was said">
        <TextArea
          label="Summary"
          value={d.summary}
          onChangeText={v => set('summary', v)}
          placeholder="What was discussed, while it is fresh"
          rows={5}
        />
        <TextArea
          label="Decisions"
          value={d.decisions}
          onChangeText={v => set('decisions', v)}
          placeholder="Anything settled, if it was"
          rows={3}
        />
      </FormCard>

      <FormCard title={`Follow-ups${d.followUps.length ? ` · ${d.followUps.length}` : ''}`}>
        {d.followUps.map((f, i) => (
          <View key={`fu-${i}`} style={styles.block}>
            <View style={styles.blockHead}>
              <AppText variant="metaStrong" color={colors.inkFaint}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <IconButton
                icon={X}
                label={`Remove follow-up ${i + 1}`}
                size={28}
                iconSize={15}
                color={colors.inkFaint}
                onPress={() => dropFollowUp(i)}
              />
            </View>
            <TextArea
              label="What has to happen"
              value={f.text}
              onChangeText={v => patchFollowUp(i, { text: v })}
              rows={2}
            />
            <TextField
              label="Who"
              value={f.owner}
              onChangeText={v => patchFollowUp(i, { owner: v })}
            />
            <DateField
              clearable
              label="By when"
              value={f.deadline}
              onChange={v => patchFollowUp(i, { deadline: v })}
            />
            <SwitchRow
              label="Already done"
              value={Boolean(f.done)}
              onChange={v => patchFollowUp(i, { done: v })}
            />
          </View>
        ))}
        <Button
          label="Add follow-up"
          size="sm"
          variant="outline"
          iconLeft={Plus}
          onPress={addFollowUp}
          style={styles.add}
        />
      </FormCard>

      <FormCard title="Finding it later">
        {d.tags.length ? (
          <View style={styles.chips}>
            {d.tags.map(t => (
              <Pressable
                key={t}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${t}`}
                onPress={() => set('tags', d.tags.filter(x => x !== t))}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Pill label={t} tone="low" icon={X} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <TextField
              label="Tags"
              value={tagDraft}
              onChangeText={setTagDraft}
              placeholder="A word you would search for"
              onSubmitEditing={addTag}
              returnKeyType="done"
              autoCapitalize="none"
            />
          </View>
          <IconButton
            icon={Plus}
            label="Add this tag"
            size={34}
            iconSize={17}
            onPress={addTag}
            style={styles.addButton}
          />
        </View>
        <Dropdown
          label="Who can see it"
          options={privacies}
          value={d.privacy}
          onChange={v => set('privacy', v)}
        />
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginBottom: vs(10),
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
  add: { alignSelf: 'flex-start', marginTop: vs(6) },
  block: {
    paddingTop: vs(8),
    marginTop: vs(8),
    borderTopWidth: hairline,
    borderTopColor: colors.lineSoft,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
