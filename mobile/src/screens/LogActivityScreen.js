import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceGroup } from '../components/ChoiceGroup';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { TextArea } from '../components/TextArea';
import { TimeField } from '../components/TimeField';
import { errorMessage, useMe } from '../store';
import {
  useLogActivityMutation,
  useUpdateLoggedActivityMutation,
} from '../store/api/departmentsApi';
import { longDate, realToday } from '../utils/dates';
import { colors, vs } from '../theme';

/** The three lanes the website offers, in the same order and with the same words. */
export const LOG_LANES = [
  { key: 'daily', label: '☀️ Daily' },
  { key: 'weekly', label: '📅 Weekly' },
  { key: 'monthly', label: '📆 Monthly' },
];

/** The eight tags of the website's modal. Nobody is made to pick one. */
export const LOG_TAGS = [
  { key: 'approval', label: '✅ Approval', tone: 'green' },
  { key: 'meeting', label: '👥 Meeting', tone: 'teal' },
  { key: 'review', label: '🔍 Review', tone: 'slate' },
  { key: 'call', label: '📞 Call', tone: 'red' },
  { key: 'decision', label: '⚖️ Decision', tone: 'amber' },
  { key: 'visit', label: '🚗 Visit', tone: 'teal' },
  { key: 'task', label: '📝 Task', tone: 'slate' },
  { key: 'other', label: '💡 Other', tone: 'amber' },
];

const PLACEHOLDER = {
  daily: 'e.g. Signed the Apollo MoU for the shared TB panel',
  weekly: 'e.g. Walked the weekly P&L with the CFO',
  monthly: 'e.g. Closed the November books with Sravan',
};

/**
 * Log activity — what the day actually held, beside the checklist that was planned for it.
 *
 * A ticked task says the agreed thing got done; this says what else happened, which is most of a
 * senior person's day. It is written already done, because it records work that has happened.
 *
 * The same three fields the website's modal asks for, in the same order, so somebody who logs on the
 * phone in the morning and on the desk in the evening is filling in one form, not two.
 *
 * Route params: { lane, departmentId, date } for a new one, plus { entry } to change one.
 */
export function LogActivityScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const entry = route.params?.entry ?? null;
  const editing = Boolean(entry);
  const date = entry?.date ?? route.params?.date ?? realToday();
  const departmentId = route.params?.departmentId ?? null;

  const [lane, setLane] = useState(entry?.lane ?? route.params?.lane ?? 'daily');
  const [text, setText] = useState(entry?.text ?? '');
  const [atTime, setAtTime] = useState(entry?.atTime ?? '');
  const [tag, setTag] = useState(entry?.tag || null);
  const [problem, setProblem] = useState('');

  const [logActivity, logging] = useLogActivityMutation();
  const [updateLogged, updating] = useUpdateLoggedActivityMutation();
  const busy = logging.isLoading || updating.isLoading;

  const save = async () => {
    const t = text.trim();
    if (!t) {
      setProblem('Say what you did.');
      return;
    }
    setProblem('');
    try {
      if (editing) {
        await updateLogged({
          id: entry.id,
          text: t,
          atTime,
          tag: tag ?? '',
        }).unwrap();
      } else {
        await logActivity({
          lane,
          text: t,
          atTime,
          tag: tag ?? '',
          date,
          ...(departmentId ? { departmentId } : null),
        }).unwrap();
      }
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={editing ? 'Edit logged activity' : 'Log activity'}
      footer={
        <Button
          label={busy ? 'Saving…' : editing ? 'Save changes' : "Add to today's log"}
          iconLeft={Check}
          disabled={busy}
          onPress={save}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <FormCard title="What you did">
        {/* Editing leaves the lane alone: moving an entry between lanes is a different thought,
            and the website's modal keeps it on the lane it was logged to as well. */}
        {editing ? (
          <AppText variant="meta" color={colors.inkMuted} style={styles.hint}>
            {LOG_LANES.find(l => l.key === lane)?.label} ·{' '}
            {longDate(date)}
          </AppText>
        ) : (
          <ChoiceGroup
            label="Lane"
            options={LOG_LANES}
            value={lane}
            onChange={setLane}
          />
        )}
        <TextArea
          label="What did you do?"
          value={text}
          onChangeText={v => {
            setText(v);
            if (problem) {
              setProblem('');
            }
          }}
          placeholder={PLACEHOLDER[lane]}
          rows={4}
        />
      </FormCard>

      <FormCard title="Detail (optional)">
        <TimeField
          label="Approximate time"
          value={atTime}
          onChange={setAtTime}
        />
        {/* Tapping the chosen tag again clears it, so a wrong tag needs no "none" option. */}
        <ChoiceGroup
          label="Tag it"
          options={LOG_TAGS}
          value={tag}
          onChange={setTag}
          clearable
          vivid
        />
        <AppText variant="meta" color={colors.inkMuted} style={styles.note}>
          {editing
            ? 'Saved to the day it happened on.'
            : `Saved to ${longDate(date)} as ${me?.name ?? 'you'} — it is your own record, and it is kept out of the shift percentage your HOD rolls up.`}
        </AppText>
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: vs(4) },
  note: { marginTop: vs(2) },
});
