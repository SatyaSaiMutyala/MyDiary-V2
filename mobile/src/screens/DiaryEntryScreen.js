import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { DIARY_CATS, REMINDERS } from '../model/diaryLines';
import { errorMessage } from '../store';
import {
  useGetDiaryEntryQuery,
  useRemoveDiaryEntryMutation,
} from '../store/api/diaryApi';
import { longDate } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

const labelOf = (list, id) => list.find(x => x.id === id)?.label ?? id;

const CAT_TONE = {
  meeting: 'info',
  focus: 'good',
  personal: 'teal',
  travel: 'watch',
  ooo: 'critical',
  reminder: 'watch',
};

/** One diary entry in full. */
export function DiaryEntryScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: e, error, isLoading, refetch } = useGetDiaryEntryQuery(id);
  const [removeEntry, removing] = useRemoveDiaryEntryMutation();
  const [problem, setProblem] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="Diary entry">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !e) {
    return (
      <FormScreen title="Diary entry">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That entry could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this entry?',
      text: `"${e.title}" is removed from your diary. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeEntry(id).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const when = e.allDay
    ? 'All day'
    : [e.startTime, e.endTime].filter(Boolean).join(' – ');

  return (
    <FormScreen
      title="Diary entry"
      onRefresh={refetch}
      right={
        <IconButton
          icon={Trash2}
          label="Delete entry"
          iconSize={20}
          color={colors.red}
          onPress={remove}
        />
      }
      footer={
        <Button
          label="Edit"
          iconLeft={Pencil}
          disabled={removing.isLoading}
          onPress={() => nav.navigate('DiaryEntryForm', { id: e.id })}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard style={styles.card}>
        <View style={styles.tags}>
          <Pill
            label={labelOf(DIARY_CATS, e.cat)}
            tone={CAT_TONE[e.cat] ?? 'low'}
          />
          {e.addedBy === 'ea' ? <Pill label="Added by your EA" tone="yellow" /> : null}
        </View>
        <AppText variant="heading" style={styles.title}>
          {e.title}
        </AppText>
        <View style={styles.info}>
          <InfoRow label="Date" value={longDate(e.date)} />
          <InfoRow label="Ends" value={e.endDate ? longDate(e.endDate) : ''} />
          <InfoRow label="Time" value={when} />
          <InfoRow label="Where" value={e.loc} />
          <InfoRow label="Reminder" value={labelOf(REMINDERS, e.reminder)} />
          <InfoRow label="Whose diary" value={e.owner} />
        </View>
      </FormCard>

      {e.notes ? (
        <FormCard title="Notes" style={styles.card}>
          <AppText variant="bodyRegular" style={styles.notes}>
            {e.notes}
          </AppText>
        </FormCard>
      ) : null}

      {e.attendees?.length || e.external?.length ? (
        <FormCard
          title={`Invited · ${(e.attendees?.length ?? 0) + (e.external?.length ?? 0)}`}
          style={styles.card}
        >
          {(e.attendees ?? []).map(name => (
            <View key={name} style={styles.person}>
              <AppText variant="body">{name}</AppText>
            </View>
          ))}
          {(e.external ?? []).map(x => (
            <View key={x.name} style={styles.person}>
              <AppText variant="body" style={styles.personName}>
                {x.name}
              </AppText>
              <Pill label="External" tone="low" />
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
  notes: { marginBottom: vs(10) },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(9),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  personName: { flex: 1 },
});
