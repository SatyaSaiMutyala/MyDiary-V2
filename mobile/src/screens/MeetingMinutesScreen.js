import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Lock, LockOpen, Send } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { TextArea } from '../components/TextArea';
import { errorMessage } from '../store';
import {
  useCirculateMinutesMutation,
  useFinaliseMinutesMutation,
  useGetMeetingQuery,
  usePutMinutesMutation,
  useReopenMinutesMutation,
} from '../store/api/meetingsApi';
import { colors, s, vs } from '../theme';

/**
 * Writing the minutes: what was discussed and what was decided, against each agenda item.
 *
 * The whole minutes object is sent at once (`PUT /meetings/:id/minutes`), which is how the website
 * saves them too. Once finalised they are read-only until reopened, so a circulated record cannot
 * quietly change underneath the people who read it.
 */
export function MeetingMinutesScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: m, error, isLoading } = useGetMeetingQuery(id);
  const [putMinutes, saving] = usePutMinutesMutation();
  const [finalise, finalising] = useFinaliseMinutesMutation();
  const [reopen, reopening] = useReopenMinutesMutation();
  const [circulate, circulating] = useCirculateMinutesMutation();

  const [draft, setDraft] = useState({});
  const [problem, setProblem] = useState('');
  const filled = useRef(false);

  // Fill the boxes once, from what is already stored.
  useEffect(() => {
    if (!m || filled.current) {
      return;
    }
    filled.current = true;
    setDraft(m.minutes ?? {});
  }, [m]);

  if (isLoading) {
    return (
      <FormScreen title="Minutes">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !m) {
    return (
      <FormScreen title="Minutes">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That meeting could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const locked = m.minutesFinalised;
  const keys = [...(m.agenda ?? []).map((_, i) => `ag${i}`), 'general'];
  const set = (key, field, value) =>
    setDraft(d => ({ ...d, [key]: { ...(d[key] ?? {}), [field]: value } }));

  const save = async () => {
    setProblem('');
    // Only send the entries that actually carry something.
    const minutes = Object.fromEntries(
      Object.entries(draft).filter(
        ([, v]) => (v?.disc ?? '').trim() || (v?.dec ?? '').trim(),
      ),
    );
    try {
      await putMinutes({ id, minutes }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const lock = async () => {
    const yes = await confirm({
      title: 'Finalise these minutes?',
      text: 'They become read-only. You can reopen them if something needs changing.',
      confirmLabel: 'Finalise',
      icon: Lock,
    });
    if (!yes) {
      return;
    }
    try {
      await finalise(id).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const unlock = async () => {
    try {
      await reopen(id).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const send = async () => {
    const yes = await confirm({
      title: 'Circulate the minutes?',
      text: `Everyone on "${m.title}" is notified that the minutes are ready.`,
      confirmLabel: 'Circulate',
      icon: Send,
    });
    if (!yes) {
      return;
    }
    try {
      await circulate(id).unwrap();
      await confirm({
        title: '✓ Minutes circulated',
        text: 'Everyone on the meeting has been notified.',
        confirmLabel: 'Done',
        single: true,
      });
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const busy =
    saving.isLoading ||
    finalising.isLoading ||
    reopening.isLoading ||
    circulating.isLoading;

  return (
    <FormScreen
      title="Minutes"
      footer={
        locked ? (
          <View style={styles.actions}>
            <Button
              label={reopening.isLoading ? 'Reopening…' : 'Reopen'}
              variant="outline"
              iconLeft={LockOpen}
              style={styles.action}
              disabled={busy}
              onPress={unlock}
            />
            <Button
              label={circulating.isLoading ? 'Sending…' : 'Circulate'}
              iconLeft={Send}
              style={styles.action}
              disabled={busy}
              onPress={send}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              label="Finalise"
              variant="outline"
              iconLeft={Lock}
              style={styles.action}
              disabled={busy}
              onPress={lock}
            />
            <Button
              label={saving.isLoading ? 'Saving…' : 'Save minutes'}
              iconLeft={Check}
              style={styles.action}
              disabled={busy}
              onPress={save}
            />
          </View>
        )
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      {locked ? (
        <Notice
          tone="success"
          title="These minutes are finalised"
          text="Reopen them to make a change."
         
        />
      ) : null}

      <View style={styles.head}>
        <AppText variant="heading">{m.title}</AppText>
        <AppText variant="meta" color={colors.inkMuted}>
          {m.date} · {m.time}
        </AppText>
      </View>

      {keys.map((key, i) => {
        const isGeneral = key === 'general';
        const heading = isGeneral
          ? 'General notes'
          : `${String(i + 1).padStart(2, '0')} · ${m.agenda[i]}`;
        const entry = draft[key] ?? {};
        return (
          <FormCard key={key} title={heading} style={styles.card}>
            {locked ? (
              <View style={styles.readOnly}>
                {entry.disc ? (
                  <AppText variant="bodyRegular" style={styles.text}>
                    {entry.disc}
                  </AppText>
                ) : null}
                {entry.dec ? (
                  <View style={styles.decided}>
                    <Pill label="Decided" tone="good" />
                    <AppText variant="bodyRegular" style={styles.text}>
                      {entry.dec}
                    </AppText>
                  </View>
                ) : null}
                {!entry.disc && !entry.dec ? (
                  <AppText variant="bodyRegular" color={colors.inkMuted}>
                    Nothing was recorded for this item.
                  </AppText>
                ) : null}
              </View>
            ) : (
              <>
                <TextArea
                  label="Discussion"
                  value={entry.disc ?? ''}
                  onChangeText={v => set(key, 'disc', v)}
                  placeholder="What was said, what the room covered…"
                  rows={3}
                />
                <TextArea
                  label="Decision"
                  value={entry.dec ?? ''}
                  onChangeText={v => set(key, 'dec', v)}
                  placeholder="What was agreed…"
                  rows={2}
                />
              </>
            )}
          </FormCard>
        );
      })}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  head: { marginTop: vs(14), marginBottom: vs(2) },
  card: { marginBottom: vs(2) },
  readOnly: { paddingBottom: vs(10) },
  text: { marginBottom: vs(6) },
  decided: { gap: vs(6), marginTop: vs(4) },
  actions: { flexDirection: 'row', gap: s(10) },
  action: { flex: 1 },
});
