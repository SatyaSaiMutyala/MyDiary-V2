import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Calendar, Check, CircleDot, MessageSquare, Plus, TriangleAlert, Users } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DateField } from '../components/DateField';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { PriorityPicker } from '../components/PriorityPicker';
import { ShimmerRows } from '../components/Shimmer';
import { StatusDot } from '../components/StatusDot';
import { TextField } from '../components/TextField';
import { errorMessage } from '../store';
import {
  useAddCommentMutation,
  useAddSubtaskMutation,
  useGetActionItemQuery,
  useSetSubtaskMutation,
  useUpdateActionItemMutation,
} from '../store/api/actionItemsApi';
import { initialsOf } from '../utils/people';
import { longDate } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

const PRIORITY_TONE = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};
const STATUS_TONE = {
  open: 'low',
  'in-progress': 'info',
  blocked: 'critical',
  done: 'good',
};

/**
 * One action item in full: who owes it, by when, what is left to do inside it, and what people
 * have said about it.
 *
 * Every change is its own small call, so a tapped sub-task saves on its own rather than waiting
 * for a Save button — on a phone, in the middle of something else, that is the right trade.
 */
export function TaskDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;

  const { data: t, error, isLoading, refetch } = useGetActionItemQuery(id);
  const [updateAction, updating] = useUpdateActionItemMutation();
  const [addSubtask, addingSub] = useAddSubtaskMutation();
  const [setSubtask] = useSetSubtaskMutation();
  const [addComment, commenting] = useAddCommentMutation();

  const [sub, setSub] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [problem, setProblem] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="Task">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !t) {
    return (
      <FormScreen title="Task">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That task could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const done = t.status === 'done';
  const started = t.status === 'in-progress';
  const blocked = t.status === 'blocked';

  /**
   * Moves the task and, when something was typed, puts that on its trail.
   *
   * The website has had these two since the beginning; the phone only had "Mark complete", so
   * somebody held up had no way to say so from the one device they had with them. Whoever set the
   * task is told, which is the point of raising a blocker at all.
   */
  const setStatus = (status) =>
    run(
      () => updateAction({ id: t.id, meetingId: t.meetingId, status }),
      async () => {
        const text = note.trim();
        if (!text) return;
        setNote('');
        await addComment({ id: t.id, meetingId: t.meetingId, text }).unwrap().catch(() => {});
      },
    );

  const run = async (fn, after) => {
    setProblem('');
    try {
      await fn().unwrap();
      after?.();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const openEditor = () => {
    setDeadline(t.deadline ?? '');
    setPriority(t.priority ?? 'medium');
    setEditing(true);
  };

  return (
    <FormScreen
      title="Task"
      onRefresh={refetch}
      footer={
        <Button
          label={
            updating.isLoading
              ? 'Saving…'
              : done
              ? 'Reopen this task'
              : 'Mark complete'
          }
          variant={done ? 'outline' : 'primary'}
          iconLeft={done ? undefined : Check}
          disabled={updating.isLoading}
          onPress={() =>
            run(() =>
              updateAction({
                id: t.id,
                meetingId: t.meetingId,
                status: done ? 'open' : 'done',
              }),
            )
          }
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard style={styles.card}>
        <View style={styles.tags}>
          <Pill
            label={t.status.replace('-', ' ')}
            tone={STATUS_TONE[t.status] ?? 'low'}
          />
          <Pill
            label={t.priority[0].toUpperCase() + t.priority.slice(1)}
            tone={PRIORITY_TONE[t.priority] ?? 'low'}
          />
          {t.isOverdue && !done ? <Pill label="Overdue" tone="critical" /> : null}
        </View>
        <AppText variant="heading" style={styles.title}>
          {t.desc}
        </AppText>
        <View style={styles.info}>
          <InfoRow label="Owner" value={t.owner || 'Unassigned'} />
          <InfoRow label="Due" value={t.deadline ? longDate(t.deadline) : ''} />
          <InfoRow label="From" value={t.meetingTitle} />
          <InfoRow label="Raised by" value={t.createdBy?.name} />
        </View>
        {t.meetingId ? (
          <Button
            label="Open the meeting"
            variant="outline"
            size="sm"
            iconLeft={Calendar}
            style={styles.openMeeting}
            onPress={() => nav.navigate('MeetingDetail', { id: t.meetingId })}
          />
        ) : null}
      </FormCard>

      {/* A finished task needs neither, so they are only offered while there is work left. */}
      {done ? null : (
        <FormCard title="Where are you with it?" style={styles.card}>
          <TextField
            label="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder={blocked ? 'What would unblock you?' : 'Where you are, anything in the way…'}
            accessibilityLabel="Note for this status change"
          />
          <View style={styles.statusActions}>
            <Button
              label={started ? 'Already in progress' : 'In progress'}
              variant="outline"
              size="sm"
              iconLeft={CircleDot}
              disabled={started || updating.isLoading}
              style={styles.statusAction}
              onPress={() => setStatus('in-progress')}
            />
            <Button
              label={blocked ? 'Blocker raised' : 'Raise a blocker'}
              variant="outline"
              size="sm"
              iconLeft={TriangleAlert}
              iconColor={blocked ? colors.inkFaint : colors.red}
              disabled={blocked || updating.isLoading}
              style={styles.statusAction}
              onPress={() => setStatus('blocked')}
            />
          </View>
          <AppText variant="meta" color={colors.inkMuted} style={styles.statusHint}>
            {blocked
              ? 'Whoever set this task has been told you are blocked.'
              : 'Whoever set this task is told when you move it.'}
          </AppText>
        </FormCard>
      )}

      {editing ? (
        <FormCard title="Change the deadline or priority" style={styles.card}>
          <DateField label="Due" value={deadline} onChange={setDeadline} />
          <PriorityPicker value={priority} onChange={setPriority} />
          <View style={styles.editActions}>
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              style={styles.editAction}
              onPress={() => setEditing(false)}
            />
            <Button
              label={updating.isLoading ? 'Saving…' : 'Save'}
              size="sm"
              style={styles.editAction}
              disabled={updating.isLoading}
              onPress={() =>
                run(
                  () =>
                    updateAction({
                      id: t.id,
                      meetingId: t.meetingId,
                      deadline,
                      priority,
                    }),
                  () => setEditing(false),
                )
              }
            />
          </View>
        </FormCard>
      ) : (
        <Button
          label="Change deadline or priority"
          variant="outline"
          size="sm"
          style={styles.editButton}
          onPress={openEditor}
        />
      )}

      <FormCard
        title={`Sub-tasks · ${(t.subtasks ?? []).filter(x => x.done).length}/${
          (t.subtasks ?? []).length
        }`}
        style={styles.card}
      >
        {(t.subtasks ?? []).map((x, i) => (
          <Pressable
            key={`${x.text}-${i}`}
            onPress={() =>
              run(() =>
                setSubtask({
                  id: t.id,
                  meetingId: t.meetingId,
                  index: i,
                  done: !x.done,
                }),
              )
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: x.done }}
            style={({ pressed }) => [styles.subRow, pressed && styles.pressed]}
          >
            <StatusDot status={x.done ? 'done' : 'open'} />
            <AppText
              variant="body"
              color={x.done ? colors.inkMuted : colors.ink}
              style={[styles.subText, x.done && styles.struck]}
            >
              {x.text}
            </AppText>
          </Pressable>
        ))}
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField
              value={sub}
              onChangeText={setSub}
              placeholder="Break it into a step…"
              onSubmitEditing={() =>
                sub.trim() &&
                run(
                  () =>
                    addSubtask({
                      id: t.id,
                      meetingId: t.meetingId,
                      text: sub.trim(),
                    }),
                  () => setSub(''),
                )
              }
            />
          </View>
          <Button
            label="Add"
            size="sm"
            variant="outline"
            iconLeft={Plus}
            disabled={addingSub.isLoading || !sub.trim()}
            onPress={() =>
              run(
                () =>
                  addSubtask({
                    id: t.id,
                    meetingId: t.meetingId,
                    text: sub.trim(),
                  }),
                () => setSub(''),
              )
            }
          />
        </View>
      </FormCard>

      {t.dependencies?.length ? (
        <FormCard title="Waiting on" style={styles.card}>
          {t.dependencies.map(d => (
            <View key={d.id} style={styles.subRow}>
              <StatusDot status={d.status === 'done' ? 'done' : 'open'} />
              <AppText variant="body" style={styles.subText}>
                {d.desc}
              </AppText>
            </View>
          ))}
        </FormCard>
      ) : null}

      <FormCard
        title={`Comments · ${(t.comments ?? []).length}`}
        style={styles.card}
      >
        {(t.comments ?? []).map((c, i) => (
          <View key={i} style={styles.comment}>
            <Avatar label={c.ini || initialsOf(c.user)} size={30} />
            <View style={styles.commentBody}>
              <AppText variant="metaStrong">{c.user}</AppText>
              <AppText variant="bodyRegular">{c.text}</AppText>
            </View>
          </View>
        ))}
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="Say something about this…"
            />
          </View>
          <Button
            label="Post"
            size="sm"
            variant="outline"
            iconLeft={MessageSquare}
            disabled={commenting.isLoading || !note.trim()}
            onPress={() =>
              run(
                () =>
                  addComment({
                    id: t.id,
                    meetingId: t.meetingId,
                    text: note.trim(),
                  }),
                () => setNote(''),
              )
            }
          />
        </View>
      </FormCard>

      {t.history?.length ? (
        <FormCard title="History" style={styles.card}>
          {t.history.map((h, i) => (
            <View key={i} style={styles.historyRow}>
              <Users size={s(13)} color={colors.inkFaint} strokeWidth={1.9} />
              <AppText variant="meta" color={colors.inkMuted}>
                {h.user} · {h.action}
              </AppText>
            </View>
          ))}
        </FormCard>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  card: { marginBottom: vs(2) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  title: { marginTop: vs(8), marginBottom: vs(12) },
  info: { marginTop: vs(2) },
  openMeeting: { alignSelf: 'flex-start', marginBottom: vs(12) },
  editButton: { alignSelf: 'flex-start', marginTop: vs(12) },
  statusActions: { flexDirection: 'row', gap: s(8), marginTop: vs(4) },
  statusAction: { flex: 1 },
  statusHint: { marginTop: vs(8) },
  editActions: { flexDirection: 'row', gap: s(10), marginBottom: vs(12) },
  editAction: { flex: 1 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(9),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  pressed: { opacity: 0.6 },
  subText: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginTop: vs(10),
  },
  addField: { flex: 1 },
  comment: {
    flexDirection: 'row',
    gap: s(10),
    paddingVertical: vs(9),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  commentBody: { flex: 1 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingVertical: vs(7),
  },
});
