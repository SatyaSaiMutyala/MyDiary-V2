import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AlarmClock, Pencil, Trash2 } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { Eyebrow } from '../components/Eyebrow';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { forLabel, statusTone, whenLabel } from '../model/reminder';
import { errorMessage } from '../store';
import {
  useGetReminderQuery,
  useRemoveReminderMutation,
} from '../store/api/remindersApi';
import { initialsOf } from '../utils/people';
import { longDate } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

/** One reminder in full. Only the person who set it can change it, and only before it fires. */
export function ReminderDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: r, error, isLoading, refetch } = useGetReminderQuery(id);
  const [removeReminder, removing] = useRemoveReminderMutation();
  const [problem, setProblem] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="Reminder">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }

  if (error || !r) {
    return (
      <FormScreen title="Reminder">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That reminder could not be found.'}
        />
      </FormScreen>
    );
  }

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this reminder?',
      text:
        r.status === 'scheduled'
          ? 'It will not go off, and everyone it was set for is told it is off.'
          : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeReminder(id).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const people = r.recipients ?? [];

  return (
    <FormScreen
      title="Reminder"
      onRefresh={refetch}
      right={
        r.mine ? (
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
        r.mineToEdit ? (
          <Button
            label="Edit"
            iconLeft={Pencil}
            disabled={removing.isLoading}
            onPress={() => nav.navigate('ReminderForm', { id })}
          />
        ) : undefined
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="meta" color={colors.inkFaint}>
            {r.mine ? 'You set this' : `Set by ${r.creator}`}
          </AppText>
          <Pill
            label={r.late ? 'Due now' : r.statusLabel}
            tone={r.late ? 'watch' : statusTone[r.status] ?? 'low'}
          />
        </View>
        <AppText variant="heading" style={styles.heroName}>
          {r.title}
        </AppText>

        <View style={styles.when}>
          <AlarmClock size={s(16)} color={colors.teal} strokeWidth={2} />
          <AppText variant="metaStrong" color={colors.tealDeep}>
            {whenLabel(r)}
          </AppText>
        </View>

        <View style={styles.heroInfo}>
          <InfoRow label="Date" value={longDate(r.date)} />
          <InfoRow label="Time" value={r.time} />
          <InfoRow label="For" value={forLabel(r)} />
          <InfoRow
            label="Sent"
            value={r.sentAt ? longDate(String(r.sentAt).slice(0, 10)) : ''}
          />
        </View>
      </Card>

      {r.note ? (
        <FormCard title="Note">
          <AppText variant="bodyRegular" style={styles.note}>
            {r.note}
          </AppText>
        </FormCard>
      ) : null}

      <Eyebrow label={`Who gets it · ${people.length}`} />
      <Card style={styles.list}>
        {people.map((p, i) => (
          <View
            key={`${p.name}-${i}`}
            style={[styles.person, i === people.length - 1 && styles.lastRow]}
          >
            <Avatar label={initialsOf(p.name)} size={32} />
            <AppText variant="body" style={styles.personName} numberOfLines={1}>
              {p.name}
            </AppText>
            {p.name === r.creator ? <Pill label="Who set it" tone="low" /> : null}
          </View>
        ))}
      </Card>

      {!r.mineToEdit && r.mine ? (
        <AppText variant="meta" color={colors.inkFaint} style={styles.foot}>
          This one has already gone off, so it can no longer be changed.
        </AppText>
      ) : null}
      {!r.mine ? (
        <AppText variant="meta" color={colors.inkFaint} style={styles.foot}>
          {r.creator} set this reminder. Only they can change it.
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  hero: { padding: s(14), gap: vs(5) },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  heroName: { marginTop: vs(2) },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(6),
  },
  heroInfo: { marginTop: vs(8) },
  note: { marginBottom: vs(10) },
  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  personName: { flex: 1 },
  foot: { marginTop: vs(14), paddingHorizontal: s(4) },
});
