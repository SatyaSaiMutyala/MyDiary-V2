import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { SwitchRow } from '../components/SwitchRow';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { DIARY_CATS, REMINDERS } from '../model/diaryLines';
import { errorMessage } from '../store';
import {
  useCreateDiaryEntryMutation,
  useGetDiaryEntryQuery,
  useUpdateDiaryEntryMutation,
} from '../store/api/diaryApi';
import { realToday } from '../utils/dates';

/**
 * A new diary entry, or a change to one.
 *
 * Meetings are not edited here — they belong to the meetings module, and the diary only shows
 * them. The form matches what the API stores (Backend/src/models/DiaryEntry.js).
 */
export function DiaryEntryFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const editId = route.params?.id;

  const { data: existing } = useGetDiaryEntryQuery(editId, { skip: !editId });
  const [createEntry, creating] = useCreateDiaryEntryMutation();
  const [updateEntry, updating] = useUpdateDiaryEntryMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('personal');
  const [date, setDate] = useState(route.params?.date ?? realToday());
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [loc, setLoc] = useState('');
  const [reminder, setReminder] = useState('15 min before');
  const [notes, setNotes] = useState('');
  const [problem, setProblem] = useState('');

  // Fill the form once, when the entry being edited arrives.
  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setTitle(existing.title ?? '');
    setCat(existing.cat ?? 'personal');
    setDate(existing.date ?? realToday());
    setEndDate(existing.endDate ?? '');
    setAllDay(Boolean(existing.allDay));
    setStartTime(existing.startTime ?? '09:00');
    setEndTime(existing.endTime ?? '');
    setLoc(existing.loc ?? '');
    setReminder(existing.reminder ?? '15 min before');
    setNotes(existing.notes ?? '');
  }, [existing]);

  const save = async () => {
    if (!title.trim()) {
      setProblem('Give the entry a title.');
      return;
    }
    if (!date) {
      setProblem('Pick the date.');
      return;
    }
    if (!allDay && !startTime) {
      setProblem('Give it a start time, or mark it all day.');
      return;
    }
    setProblem('');

    const body = {
      title: title.trim(),
      cat,
      date,
      allDay,
      reminder,
      ...(endDate ? { endDate } : null),
      ...(allDay ? null : { startTime }),
      ...(!allDay && endTime ? { endTime } : null),
      ...(loc.trim() ? { loc: loc.trim() } : null),
      ...(notes.trim() ? { notes: notes.trim() } : null),
    };

    try {
      if (editId) {
        await updateEntry({ id: editId, ...body }).unwrap();
        nav.goBack();
      } else {
        const saved = await createEntry(body).unwrap();
        nav.replace('DiaryEntry', { id: saved.id });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit entry' : 'New diary entry'}
      footer={
        <Button
          label={saving ? 'Saving…' : editId ? 'Save changes' : 'Add to diary'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="What">
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Deep focus — audit readiness"
        />
        <Dropdown
          label="Kind"
          options={DIARY_CATS}
          value={cat}
          onChange={setCat}
        />
      </FormCard>

      <FormCard title="When">
        <DateField label="Date" value={date} onChange={setDate} />
        <SwitchRow label="All day" value={allDay} onChange={setAllDay} />
        {allDay ? null : (
          <>
            <TimeField
              label="Starts"
              value={startTime}
              onChange={setStartTime}
            />
            <TimeField label="Ends" value={endTime} onChange={setEndTime} />
          </>
        )}
        <DateField
          clearable
          label="Runs until (for something spanning days)"
          placeholder="Same day"
          value={endDate}
          onChange={setEndDate}
        />
      </FormCard>

      <FormCard title="Anything else">
        <TextField
          label="Where"
          value={loc}
          onChangeText={setLoc}
          placeholder="Room, branch or address"
        />
        <Dropdown
          label="Reminder"
          options={REMINDERS}
          value={reminder}
          onChange={setReminder}
        />
        <TextArea
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering"
          rows={3}
        />
      </FormCard>
    </FormScreen>
  );
}

