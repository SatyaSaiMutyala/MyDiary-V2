import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Pencil, Trash2 } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import {
  channelLabel,
  followUpLabel,
  followUpTone,
  privacyLabel,
} from '../model/log';
import { errorMessage } from '../store';
import {
  useGetLogQuery,
  useRemoveLogMutation,
  useToggleFollowUpMutation,
} from '../store/api/logsApi';
import { initialsOf } from '../utils/people';
import { dueDate, longDate } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

/** One logged conversation in full, with its follow-ups tickable in place. */
export function LogDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: l, error, isLoading, refetch } = useGetLogQuery(id);
  const [toggleFollowUp] = useToggleFollowUpMutation();
  const [removeLog] = useRemoveLogMutation();
  const [problem, setProblem] = useState('');
  const [busyId, setBusyId] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="Discussion log">
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      </FormScreen>
    );
  }

  if (error || !l) {
    return (
      <FormScreen title="Discussion log">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That log could not be found.'}
        />
      </FormScreen>
    );
  }

  const flip = async f => {
    setBusyId(f.id);
    setProblem('');
    try {
      await toggleFollowUp({ id, fuId: f.id }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusyId('');
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
      await removeLog(id).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const people = l.with ?? [];
  const followUps = l.followUps ?? [];

  return (
    <FormScreen
      title="Discussion log"
      onRefresh={refetch}
      right={
        <IconButton
          icon={Trash2}
          label="Delete log"
          iconSize={20}
          color={colors.red}
          onPress={remove}
        />
      }
      footer={
        <Button
          label="Edit"
          iconLeft={Pencil}
          onPress={() => nav.navigate('LogForm', { id })}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="meta" color={colors.inkFaint}>
            {channelLabel(l.channel)}
          </AppText>
          <Pill
            label={privacyLabel(l.privacy).split(' —')[0]}
            tone={l.privacy === 'shared' ? 'info' : 'low'}
          />
        </View>
        <AppText variant="heading" style={styles.heroName}>
          {l.topic}
        </AppText>
        <View style={styles.heroInfo}>
          <InfoRow label="When" value={longDate(l.date)} />
          <InfoRow
            label="Time"
            value={[l.time, l.duration].filter(Boolean).join(' · ')}
          />
          <InfoRow label="Logged by" value={l.owner} />
        </View>
      </Card>

      <Eyebrow label={`Spoke with · ${people.length}`} />
      {people.length ? (
        <Card style={styles.list}>
          {people.map((p, i) => (
            <View
              key={`${p.name}-${i}`}
              style={[styles.person, i === people.length - 1 && styles.lastRow]}
            >
              <Avatar label={initialsOf(p.name)} size={32} />
              <View style={styles.personText}>
                <AppText variant="body" numberOfLines={1}>
                  {p.name}
                </AppText>
                {p.email ? (
                  <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
                    {p.email}
                  </AppText>
                ) : null}
              </View>
              {p.type === 'external' ? (
                <Pill label="Outside" tone="info" />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      <FormCard title="What was discussed">
        <AppText variant="bodyRegular" style={styles.para}>
          {l.summary}
        </AppText>
      </FormCard>

      {l.decisions ? (
        <FormCard title="What was decided">
          <AppText variant="bodyRegular" style={styles.para}>
            {l.decisions}
          </AppText>
        </FormCard>
      ) : null}

      <Eyebrow label={`Follow-ups · ${followUps.length}`} />
      {followUps.length ? (
        <Card style={styles.list}>
          {followUps.map((f, i) => (
            <View
              key={f.id}
              style={[styles.fuRow, i === followUps.length - 1 && styles.lastRow]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: f.done }}
                accessibilityLabel={f.text}
                disabled={busyId === f.id}
                onPress={() => flip(f)}
                style={({ pressed }) => [
                  styles.box,
                  f.done && styles.boxOn,
                  pressed && styles.pressed,
                ]}
              >
                {f.done ? (
                  <Check size={s(12)} color={colors.white} strokeWidth={3} />
                ) : null}
              </Pressable>
              <View style={styles.fuText}>
                <AppText
                  variant="body"
                  color={f.done ? colors.inkMuted : colors.ink}
                  style={f.done ? styles.struck : undefined}
                >
                  {f.text}
                </AppText>
                <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
                  {[f.owner, f.deadline ? `by ${dueDate(f.deadline)}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <Pill
                label={followUpLabel[f.status] ?? f.status}
                tone={followUpTone[f.status] ?? 'low'}
              />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState text="Nothing to follow up from this conversation." />
      )}

      {l.tags?.length ? (
        <>
          <Eyebrow label="Tags" />
          <View style={styles.tags}>
            {l.tags.map(t => (
              <Pill key={t} label={t} tone="low" />
            ))}
          </View>
        </>
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
  heroInfo: { marginTop: vs(8) },
  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  para: { marginBottom: vs(10) },
  pressed: { opacity: 0.7 },
  struck: { textDecorationLine: 'line-through' },
  lastRow: { borderBottomWidth: 0 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  personText: { flex: 1, gap: vs(1) },
  fuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  fuText: { flex: 1, gap: vs(2) },
  box: {
    width: s(20),
    height: s(20),
    borderRadius: s(5),
    borderWidth: hairline * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
});
