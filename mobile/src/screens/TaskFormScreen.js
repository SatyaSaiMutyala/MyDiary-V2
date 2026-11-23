import React, { useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { PriorityPicker } from '../components/PriorityPicker';
import { TextField } from '../components/TextField';
import { errorMessage, useMe } from '../store';
import { useCreateActionItemMutation, useListMeetingsQuery } from '../store/api/meetingsApi';
import { whenLabel } from '../model/meeting';

/**
 * A new task.
 *
 * Every action item belongs to a meeting — that is how the API stores them
 * (Backend/src/models/ActionItem.js: `meetingId` is required), and it is what makes a commitment
 * traceable back to the room it was made in. So the form asks which meeting, rather than inventing
 * a home for it.
 */
export function TaskFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const [createAction, creating] = useCreateActionItemMutation();

  // The meetings this can hang off: the most recent first, which is nearly always the right one.
  const meetings = useListMeetingsQuery({
    limit: 50,
    sort: '-date',
    mine: true,
    fields: 'title,date,time,status',
  });

  const [meetingId, setMeetingId] = useState(route.params?.meetingId ?? '');
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState(me?.name ?? '');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [problem, setProblem] = useState('');

  const meetingOptions = useMemo(
    () =>
      (meetings.data?.items ?? []).map(m => ({
        id: m.id,
        label: m.title,
        detail: whenLabel(m),
      })),
    [meetings.data],
  );

  const save = async () => {
    if (!meetingId) {
      setProblem('Choose the meeting this came out of.');
      return;
    }
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
      await createAction({
        id: meetingId,
        desc: desc.trim(),
        ...(owner.trim() ? { owner: owner.trim() } : null),
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
          label={creating.isLoading ? 'Adding…' : 'Add task'}
          iconLeft={Check}
          disabled={creating.isLoading}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      {!meetings.isLoading && !meetingOptions.length ? (
        <Notice
          tone="warn"
          title="No meetings yet"
          text="A task belongs to a meeting, so plan one first and the task can hang off it."
         
        />
      ) : null}

      <FormCard title="What">
        <TextField
          label="What has to be done"
          value={desc}
          onChangeText={setDesc}
          placeholder="e.g. Pull the validation records"
        />
        <Dropdown
          label="Which meeting it came out of"
          options={meetingOptions}
          value={meetingId}
          onChange={setMeetingId}
          placeholder={
            meetings.isLoading ? 'Loading meetings…' : 'Choose a meeting'
          }
        />
      </FormCard>

      <FormCard title="Who and when">
        <TextField
          label="Owner"
          value={owner}
          onChangeText={setOwner}
          placeholder="Who owes it"
        />
        <DateField label="Deadline" value={deadline} onChange={setDeadline} />
        <PriorityPicker value={priority} onChange={setPriority} />
      </FormCard>
    </FormScreen>
  );
}

