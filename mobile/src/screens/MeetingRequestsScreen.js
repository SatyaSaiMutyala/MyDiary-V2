import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, Clock, Plus, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { errorMessage } from '../store';
import {
  useAcceptRequestMutation,
  useDeclineRequestMutation,
  useListRequestsQuery,
} from '../store/api/meetingRequestsApi';
import { colors, s, vs } from '../theme';

const statusTone = {
  pending: 'watch',
  accepted: 'good',
  declined: 'critical',
  countered: 'info',
};

/**
 * Meeting requests: what people have asked me for, and what I have asked others for.
 *
 * Accepting one creates the meeting on the server — the phone does not build it. A request for
 * the CMD is routed to their EA by the server, so `routedTo` is shown rather than assumed.
 */
export function MeetingRequestsScreen() {
  const nav = useNavigation();
  const confirm = useConfirm();
  const [box, setBox] = useState('inbox');
  const [problem, setProblem] = useState('');

  const { data, error, isLoading, refetch } = useListRequestsQuery({
    box,
    limit: 50,
    sort: '-createdAt',
  });
  const [accept, accepting] = useAcceptRequestMutation();
  const [decline, declining] = useDeclineRequestMutation();

  const rows = data?.items ?? [];
  const busy = accepting.isLoading || declining.isLoading;

  const say = async (r, kind) => {
    const yes = await confirm({
      title: kind === 'accept' ? 'Accept this request?' : 'Decline this request?',
      text:
        kind === 'accept'
          ? `A meeting is created for ${r.proposedDate} at ${r.proposedTime}, and ${r.from} is told.`
          : `${r.from} is told that "${r.topic}" will not go ahead.`,
      confirmLabel: kind === 'accept' ? 'Accept' : 'Decline',
      tone: kind === 'accept' ? 'ask' : 'danger',
    });
    if (!yes) {
      return;
    }
    setProblem('');
    try {
      if (kind === 'accept') {
        await accept({ id: r.id }).unwrap();
      } else {
        await decline({ id: r.id, note: 'Not going ahead.' }).unwrap();
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="Meeting requests"
      onRefresh={refetch}
      footer={
        <Button
          label="Ask for a meeting"
          iconLeft={Plus}
          onPress={() => nav.navigate('RequestMeeting')}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <View style={styles.chips}>
        <FilterChips
          value={box}
          onChange={setBox}
          options={[
            { key: 'inbox', label: 'Asked of me' },
            { key: 'sent', label: 'I asked' },
          ]}
        />
      </View>

      {isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={3} icon={false} />
        </Card>
      ) : error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : rows.length ? (
        rows.map(r => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.cardHead}>
              <AppText variant="heading" style={styles.topic}>
                {r.topic}
              </AppText>
              <Pill
                label={r.status[0].toUpperCase() + r.status.slice(1)}
                tone={statusTone[r.status] ?? 'low'}
              />
            </View>
            <AppText variant="meta" color={colors.inkMuted}>
              {box === 'inbox' ? `From ${r.from}` : `To ${r.routedTo || r.to}`}
              {r.onBehalfOf ? ` · for ${r.onBehalfOf}` : ''}
            </AppText>
            <View style={styles.when}>
              <Clock size={s(14)} color={colors.inkMuted} strokeWidth={1.9} />
              <AppText variant="meta" color={colors.inkMuted}>
                {r.proposedDate} · {r.proposedTime} · {r.durationMin} min
              </AppText>
            </View>
            {r.notes ? (
              <AppText variant="bodyRegular" style={styles.notes}>
                {r.notes}
              </AppText>
            ) : null}

            {box === 'inbox' && r.status === 'pending' ? (
              <View style={styles.actions}>
                <Button
                  label="Decline"
                  variant="outline"
                  size="sm"
                  iconLeft={X}
                  disabled={busy}
                  style={styles.action}
                  onPress={() => say(r, 'decline')}
                />
                <Button
                  label="Accept"
                  size="sm"
                  iconLeft={Check}
                  disabled={busy}
                  style={styles.action}
                  onPress={() => say(r, 'accept')}
                />
              </View>
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState
          text={
            box === 'inbox'
              ? 'Nobody has asked you for a meeting.'
              : 'You have not asked anyone for a meeting.'
          }
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  chips: { marginBottom: vs(4) },
  loading: { padding: s(14) },
  card: { padding: s(14), marginTop: vs(10) },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  topic: { flex: 1 },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(8),
  },
  notes: { marginTop: vs(8) },
  actions: { flexDirection: 'row', gap: s(10), marginTop: vs(12) },
  action: { flex: 1 },
});
