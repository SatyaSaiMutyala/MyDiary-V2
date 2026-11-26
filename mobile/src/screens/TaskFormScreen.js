import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { PriorityPicker } from '../components/PriorityPicker';
import { TextField } from '../components/TextField';
import { errorMessage, useMe } from '../store';
import {
  useAllocateTaskMutation,
  useListPeopleQuery,
} from '../store/api/actionItemsApi';
import { colors, vs } from '../theme';

/**
 * A new task — the same four fields the website's composer asks for, in the same order.
 *
 * It asks nothing about meetings. A commitment made in a meeting is added on that meeting's own
 * Action items screen, where it stays traceable to the room it was promised in; this form is for
 * the other kind — a task somebody writes on their own list, or hands to a colleague.
 */
export function TaskFormScreen() {
  const nav = useNavigation();
  const me = useMe();
  const [allocateTask, allocating] = useAllocateTaskMutation();
  // Real accounts, so a task allocated to somebody reaches a person who can sign in and see it.
  const people = useListPeopleQuery();

  const [desc, setDesc] = useState('');
  // Blank means the person is giving it to themselves, which is what most tasks typed into one's
  // own To-Do are. Choosing somebody sends it to them, and tells them.
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [problem, setProblem] = useState('');

  const ownerOptions = useMemo(
    () => [
      {
        id: '',
        label: `Myself (${me?.name ?? 'me'})`,
        detail: 'It stays on your own list',
      },
      ...(people.data ?? [])
        .filter(u => u.name !== me?.name)
        .map(u => ({
          id: u.name,
          label: u.name,
          detail: [u.title, u.department].filter(Boolean).join(' · '),
        })),
    ],
    [people.data, me?.name],
  );

  const save = async () => {
    if (!desc.trim()) {
      setProblem('Say what has to be done.');
      return;
    }
    if (!deadline) {
      setProblem('Give it a deadline — an action without one never gets done.');
      return;
    }
    setProblem('');
    try {
      await allocateTask({
        desc: desc.trim(),
        ...(owner ? { owner } : null),
        deadline,
        priority,
      }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="New task"
      footer={
        <Button
          label={
            allocating.isLoading
              ? 'Adding…'
              : owner
              ? 'Allocate task'
              : 'Add task'
          }
          iconLeft={Check}
          disabled={allocating.isLoading}
          onPress={save}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <FormCard title="What">
        <TextField
          label="What has to be done"
          value={desc}
          onChangeText={setDesc}
          placeholder="e.g. Pull the validation records"
        />
      </FormCard>

      <FormCard title="Who and when">
        <Dropdown
          label="Allocate to"
          options={ownerOptions}
          value={owner}
          onChange={setOwner}
          placeholder={
            people.isLoading
              ? 'Loading people…'
              : `Myself (${me?.name ?? 'me'})`
          }
        />
        <AppText variant="meta" color={colors.inkMuted} style={styles.hint}>
          {owner
            ? `${owner} gets it on their own To-Do, and is told.`
            : 'Leave it as Myself and the task is yours.'}
        </AppText>
        <DateField label="Deadline" value={deadline} onChange={setDeadline} />
        <PriorityPicker value={priority} onChange={setPriority} />
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: vs(-4), marginBottom: vs(4) },
});
