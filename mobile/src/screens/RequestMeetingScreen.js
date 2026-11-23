import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Send } from 'lucide-react-native';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { errorMessage } from '../store';
import { useCreateRequestMutation } from '../store/api/meetingRequestsApi';

const lengths = [
  { id: '15', label: '15 minutes' },
  { id: '30', label: '30 minutes' },
  { id: '45', label: '45 minutes' },
  { id: '60', label: '1 hour' },
  { id: '90', label: '1 hour 30 minutes' },
];

/**
 * Asking a colleague for time.
 *
 * The server decides who it actually lands with — a request for the CMD goes to their EA — so the
 * form only asks who it is *for*, and the inbox shows where it went.
 */
export function RequestMeetingScreen() {
  const nav = useNavigation();
  const [createRequest, sending] = useCreateRequestMutation();

  const [to, setTo] = useState('');
  const [topic, setTopic] = useState('');
  const [proposedDate, setDate] = useState('');
  const [proposedTime, setTime] = useState('10:00');
  const [durationMin, setLength] = useState('30');
  const [notes, setNotes] = useState('');
  const [problem, setProblem] = useState('');

  const send = async () => {
    if (!to.trim()) {
      setProblem('Choose who the request is for.');
      return;
    }
    if (!topic.trim()) {
      setProblem('Say what the meeting is about.');
      return;
    }
    if (!proposedDate) {
      setProblem('Suggest a date.');
      return;
    }
    setProblem('');
    try {
      await createRequest({
        to: to.trim(),
        topic: topic.trim(),
        proposedDate,
        proposedTime,
        durationMin: Number(durationMin),
        ...(notes.trim() ? { notes: notes.trim() } : null),
      }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="Ask for a meeting"
      footer={
        <Button
          label={sending.isLoading ? 'Sending…' : 'Send request'}
          iconLeft={Send}
          disabled={sending.isLoading}
          onPress={send}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="Who and what">
        <TextField
          label="Who it is for"
          value={to}
          onChangeText={setTo}
          placeholder="Their name"
        />
        <TextField
          label="Topic"
          value={topic}
          onChangeText={setTopic}
          placeholder="What you need to talk about"
        />
      </FormCard>

      <FormCard title="When would suit">
        <DateField label="Date" value={proposedDate} onChange={setDate} />
        <TimeField label="Time" value={proposedTime} onChange={setTime} />
        <Dropdown
          label="How long"
          options={lengths}
          value={durationMin}
          onChange={setLength}
        />
      </FormCard>

      <FormCard title="Anything else">
        <TextArea
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Context that helps them decide"
          rows={3}
        />
      </FormCard>
    </FormScreen>
  );
}

