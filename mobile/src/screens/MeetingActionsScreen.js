import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Bell, Check, Plus, Wand } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { PriorityPicker } from '../components/PriorityPicker';
import { ShimmerRows } from '../components/Shimmer';
import { StatusDot } from '../components/StatusDot';
import { TextField } from '../components/TextField';
import { errorMessage } from '../store';
import {
  useCreateActionItemMutation,
  useExtractActionsMutation,
  useGetMeetingQuery,
  useRemindOwnersMutation,
} from '../store/api/meetingsApi';
import {
  useListActionItemsQuery,
  useUpdateActionItemMutation,
} from '../store/api/actionItemsApi';
import { colors, hairline, s, vs } from '../theme';

/**
 * The action items a meeting raised: what was committed to, by whom, by when.
 *
 * Ticking one off is the common act, so it is a single tap on the row. Adding one asks for the
 * four things the website asks for and nothing more.
 */
export function MeetingActionsScreen() {
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: m } = useGetMeetingQuery(id);
  const { data, error, isLoading, refetch } = useListActionItemsQuery({
    meetingId: id,
    limit: 100,
    sort: 'deadline',
  });
  const [createAction, creating] = useCreateActionItemMutation();
  const [updateAction] = useUpdateActionItemMutation();
  const [extract, extracting] = useExtractActionsMutation();
  const [remind, reminding] = useRemindOwnersMutation();

  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [problem, setProblem] = useState('');

  const rows = data?.items ?? [];
  const open = rows.filter(a => a.status !== 'done');

  const add = async () => {
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
        id,
        desc: desc.trim(),
        ...(owner.trim() ? { owner: owner.trim() } : null),
        deadline,
        priority,
      }).unwrap();
      setDesc('');
      setOwner('');
      setDeadline('');
      setPriority('medium');
      setAdding(false);
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const toggle = async a => {
    setProblem('');
    try {
      await updateAction({
        id: a.id,
        meetingId: id,
        status: a.status === 'done' ? 'open' : 'done',
      }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const fromMinutes = async () => {
    setProblem('');
    try {
      const r = await extract(id).unwrap();
      await confirm({
        title: r.count
          ? `✓ ${r.count} action${r.count === 1 ? '' : 's'} added`
          : 'Nothing found',
        text:
          r.message ??
          'The decisions written in the minutes were turned into action items.',
        confirmLabel: 'Done',
        single: true,
      });
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const nudge = async () => {
    setProblem('');
    try {
      await remind(id).unwrap();
      await confirm({
        title: '✓ Owners reminded',
        text: 'Everyone with something open has been notified.',
        confirmLabel: 'Done',
        single: true,
      });
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="Action items"
      onRefresh={refetch}
      footer={
        <Button
          label={adding ? 'Close' : 'Add action item'}
          iconLeft={adding ? undefined : Plus}
          variant={adding ? 'outline' : 'primary'}
          onPress={() => setAdding(v => !v)}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <View style={styles.head}>
        <AppText variant="heading">{m?.title ?? 'Action items'}</AppText>
        <AppText variant="meta" color={colors.inkMuted}>
          {open.length} open of {rows.length}
        </AppText>
      </View>

      {adding ? (
        <FormCard title="New action item" style={styles.card}>
          <TextField
            label="What has to be done"
            value={desc}
            onChangeText={setDesc}
            placeholder="e.g. Pull the validation records"
          />
          <TextField
            label="Owner"
            value={owner}
            onChangeText={setOwner}
            placeholder="Who owes it — blank means you"
          />
          <DateField label="Deadline" value={deadline} onChange={setDeadline} />
          <PriorityPicker value={priority} onChange={setPriority} />
          <Button
            label={creating.isLoading ? 'Adding…' : 'Add'}
            iconLeft={Check}
            disabled={creating.isLoading}
            onPress={add}
            style={styles.addButton}
          />
        </FormCard>
      ) : null}

      <FormCard title={`Committed · ${rows.length}`} style={styles.card}>
        {isLoading ? (
          <ShimmerRows rows={3} icon={false} />
        ) : error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : rows.length ? (
          rows.map(a => (
            <Pressable
              key={a.id}
              onPress={() => toggle(a)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: a.status === 'done' }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <StatusDot status={a.status === 'done' ? 'done' : 'open'} />
              <View style={styles.rowText}>
                <AppText
                  variant="body"
                  color={a.status === 'done' ? colors.inkMuted : colors.ink}
                  style={a.status === 'done' ? styles.struck : undefined}
                >
                  {a.desc}
                </AppText>
                <AppText
                  variant="meta"
                  color={a.isOverdue ? colors.redInk : colors.inkMuted}
                >
                  {a.owner || 'Unassigned'} · due {a.deadline}
                  {a.isOverdue ? ' · overdue' : ''}
                </AppText>
              </View>
            </Pressable>
          ))
        ) : (
          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.none}
          >
            Nothing was committed to in this meeting yet.
          </AppText>
        )}
      </FormCard>

      <Card style={styles.tools}>
        <Button
          label={extracting.isLoading ? 'Reading…' : 'From the minutes'}
          variant="outline"
          size="sm"
          iconLeft={Wand}
          disabled={extracting.isLoading}
          onPress={fromMinutes}
          style={styles.tool}
        />
        <Button
          label={reminding.isLoading ? 'Sending…' : 'Remind owners'}
          variant="outline"
          size="sm"
          iconLeft={Bell}
          disabled={reminding.isLoading || !open.length}
          onPress={nudge}
          style={styles.tool}
        />
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: vs(14) },
  card: { marginBottom: vs(2) },
  addButton: { marginBottom: vs(12) },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  none: { marginBottom: vs(10) },
  tools: {
    flexDirection: 'row',
    gap: s(10),
    padding: s(12),
    marginTop: vs(14),
  },
  tool: { flex: 1 },
});
