import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Check,
  ClipboardPen,
  ListChecks,
  Pencil,
  Scale,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card, Divider } from '../components/Card';
import { CheckLine } from '../components/CheckLine';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { InfoRow } from '../components/InfoRow';
import { CardList } from '../components/CardList';
import { IconButton } from '../components/IconButton';
import { MenuRow } from '../components/MenuRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { StatusDot } from '../components/StatusDot';
import { ShimmerRows } from '../components/Shimmer';
import { errorMessage } from '../store';
import {
  useGetMeetingQuery,
  useRemoveMeetingMutation,
  useSetMeetingStatusMutation,
} from '../store/api/meetingsApi';
import { useListActionItemsQuery } from '../store/api/actionItemsApi';
import {
  attendeeCount,
  labelOf,
  meetingStatuses,
  meetingTypes,
  presenceStates,
  statusTone,
  whenLabel,
} from '../model/meeting';
import { useConfirm } from '../components/ConfirmDialog';
import { colors, s, vs } from '../theme';

/** The agenda, with whatever was written against each item in the minutes. */
function AgendaBlock({ m }) {
  if (!m.agenda?.length) {
    return null;
  }
  return (
    <FormCard title={`Agenda · ${m.agenda.length}`} style={styles.card}>
      {m.agenda.map((item, i) => {
        const note = m.minutes?.[`ag${i}`];
        // What was written when the meeting was planned, as against `note`, which is what happened.
        const plan = m.agendaNotes?.[i];
        return (
          <View key={`${item}-${i}`} style={styles.agendaItem}>
            <View style={styles.agendaHead}>
              <View style={styles.number}>
                <AppText variant="metaStrong" color={colors.white}>
                  {String(i + 1).padStart(2, '0')}
                </AppText>
              </View>
              <AppText variant="body" style={styles.agendaTitle}>
                {item}
              </AppText>
              {m.agendaTimes?.[i] ? (
                <Pill label={m.agendaTimes[i]} tone="low" />
              ) : null}
            </View>
            {plan ? (
              <AppText
                variant="meta"
                color={colors.inkMuted}
                style={styles.plan}
              >
                {plan}
              </AppText>
            ) : null}
            {note?.disc ? (
              <AppText
                variant="bodyRegular"
                color={colors.inkMuted}
                style={styles.note}
              >
                {note.disc}
              </AppText>
            ) : null}
            {note?.dec ? (
              <AppText
                variant="metaStrong"
                color={colors.greenInk}
                style={styles.note}
              >
                Decided: {note.dec}
              </AppText>
            ) : null}
            {i < m.agenda.length - 1 ? <Divider style={styles.divider} /> : null}
          </View>
        );
      })}
    </FormCard>
  );
}

/**
 * One meeting in full: what it is, who is coming, the agenda with its minutes, the action items
 * it raised, and anything parked. Reading from sample data until the meetings API is wired.
 */
export function MeetingDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { data: m, error, isLoading, refetch } = useGetMeetingQuery(id);
  // Action items live in their own collection, so they are asked for separately.
  const actionsQuery = useListActionItemsQuery(
    { meetingId: id, limit: 100, sort: 'deadline' },
    { skip: !id },
  );
  const [setStatus, closing] = useSetMeetingStatusMutation();
  const [removeMeeting] = useRemoveMeetingMutation();
  const confirm = useConfirm();

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this meeting?',
      text: 'Its action items and decisions go with it. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (yes) {
      await removeMeeting(id).unwrap().catch(() => {});
      nav.goBack();
    }
  };

  if (isLoading) {
    return (
      <FormScreen title="Meeting">
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !m) {
    return (
      <FormScreen title="Meeting">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That meeting could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const actions = actionsQuery.data?.items ?? [];
  const openActions = actions.filter(a => a.status !== 'done');
  const people = attendeeCount(m);

  return (
    <FormScreen
      title="Meeting"
      onRefresh={refetch}
      right={
        <IconButton
          icon={Trash2}
          label="Delete meeting"
          iconSize={20}
          color={colors.red}
          onPress={remove}
        />
      }
      footer={
        m.status !== 'cancelled' ? (
          <View style={styles.actions}>
            <Button
              label={m.status === 'completed' ? 'Edit minutes' : 'Edit'}
              variant={m.status === 'upcoming' ? 'outline' : 'primary'}
              iconLeft={Pencil}
              style={styles.action}
              onPress={() => nav.navigate('MeetingForm', { id: m.id })}
            />
            {m.status === 'upcoming' ? (
              <Button
                label={closing.isLoading ? 'Saving…' : 'Complete'}
                iconLeft={Check}
                style={styles.action}
                disabled={closing.isLoading}
                onPress={() => setStatus({ id: m.id, status: 'completed' })}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {m.status === 'cancelled' && m.cancelReason ? (
        <Notice
          tone="warn"
          title="This meeting was cancelled"
          text={m.cancelReason}
         
        />
      ) : null}

      <FormCard style={styles.card}>
        <View style={styles.tags}>
          <Pill
            label={labelOf(meetingStatuses, m.status)}
            tone={statusTone[m.status]}
          />
          <Pill label={labelOf(meetingTypes, m.type)} tone="low" />
          {m.subBadge ? <Pill label={m.subBadge} tone="teal" /> : null}
        </View>
        <AppText variant="heading" style={styles.title}>
          {m.title}
        </AppText>

        <View style={styles.info}>
          <InfoRow label="When" value={whenLabel(m)} />
          <InfoRow label="Duration" value={m.dur} />
          <InfoRow label="Chair" value={m.chair} />
          <InfoRow label="Where" value={m.loc} />
          <InfoRow label="Mode" value={m.mode} />
          <InfoRow label="Client" value={m.clientName} />
        </View>
      </FormCard>

      <FormCard title={`Attendees · ${people}`} style={styles.card}>
        {(m.attendees ?? []).map(name => (
          <View key={name} style={styles.person}>
            <StatusDot
              status={
                m.presence?.[name] === 'absent'
                  ? 'blocked'
                  : m.presence?.[name] === 'present'
                  ? 'done'
                  : m.presence?.[name] === 'late'
                  ? 'deviation'
                  : 'open'
              }
            />
            <AppText variant="body" style={styles.personName}>
              {name}
            </AppText>
            {m.presence?.[name] ? (
              <AppText variant="meta" color={colors.inkMuted}>
                {labelOf(presenceStates, m.presence[name])}
              </AppText>
            ) : null}
          </View>
        ))}
        {(m.external ?? []).map(e => (
          <View key={e.name} style={styles.person}>
            <StatusDot status={e.rsvp === 'accepted' ? 'done' : 'open'} />
            <AppText variant="body" style={styles.personName}>
              {e.name}
            </AppText>
            <Pill label="External" tone="low" />
          </View>
        ))}
      </FormCard>

      <CardList inset={52}>
        <MenuRow
          item={{
            icon: ClipboardPen,
            title: 'Minutes',
            detail: m.minutesFinalised
              ? 'Finalised — reopen to change'
              : 'Write what was discussed and decided',
          }}
          onPress={() => nav.navigate('MeetingMinutes', { id: m.id })}
        />
        <MenuRow
          item={{
            icon: UsersRound,
            title: 'In the room',
            detail: 'Mark who turned up, park what is not for now',
          }}
          onPress={() => nav.navigate('MeetingLive', { id: m.id })}
        />
        <MenuRow
          item={{
            icon: ListChecks,
            title: 'Action items',
            detail: `${openActions.length} open of ${actions.length}`,
            count: openActions.length || undefined,
          }}
          onPress={() => nav.navigate('MeetingActions', { id: m.id })}
        />
        <MenuRow
          item={{
            icon: Scale,
            title: 'Decisions',
            detail: 'What was decided, on the record',
          }}
          onPress={() => nav.navigate('MeetingDecisions', { id: m.id })}
        />
        <MenuRow
          item={{
            icon: Sparkles,
            title: 'Summary & transcript',
            detail: 'What the website produced',
          }}
          onPress={() => nav.navigate('MeetingSummary', { id: m.id })}
        />
      </CardList>

      <AgendaBlock m={m} />

      {m.preRead?.length ? (
        <FormCard title="Pre-reads" style={styles.card}>
          {m.preRead.map(p => (
            <CheckLine
              key={p.name}
              text={p.name}
              ok={p.opened}
              note={p.opened ? undefined : 'Not opened yet'}
            />
          ))}
        </FormCard>
      ) : null}

      <FormCard title={`Action items · ${actions.length}`} style={styles.card}>
        {actionsQuery.isLoading ? (
          <ShimmerRows rows={2} icon={false} />
        ) : actions.length ? (
          actions.map(a => (
            <View key={a.id} style={styles.actionRow}>
              <StatusDot status={a.status === 'done' ? 'done' : 'open'} />
              <View style={styles.actionText}>
                <AppText variant="body">{a.desc}</AppText>
                <AppText variant="meta" color={colors.inkMuted}>
                  {a.owner} · due {a.deadline}
                </AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.none}
          >
            Nothing was committed to in this meeting.
          </AppText>
        )}
        {openActions.length ? (
          <View style={styles.openNote}>
            <ListChecks size={s(15)} color={colors.amberInk} strokeWidth={2} />
            <AppText variant="metaStrong" color={colors.amberInk}>
              {openActions.length} still open
            </AppText>
          </View>
        ) : null}
      </FormCard>

      {m.parkingLot?.length ? (
        <FormCard title="Parked" style={styles.card}>
          {m.parkingLot.map(p => (
            <AppText key={p} variant="bodyRegular" style={styles.parked}>
              • {p}
            </AppText>
          ))}
        </FormCard>
      ) : null}

    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: vs(2) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  title: { marginTop: vs(8), marginBottom: vs(12) },
  info: { marginTop: vs(2) },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginBottom: vs(10),
  },
  personName: { flex: 1 },
  agendaItem: { marginBottom: vs(10) },
  agendaHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  number: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: colors.tealDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaTitle: { flex: 1 },
  note: { marginTop: vs(6), marginLeft: s(34) },
  plan: { marginTop: vs(4), marginLeft: s(34), fontStyle: 'italic' },
  divider: { marginTop: vs(10) },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    marginBottom: vs(10),
  },
  actionText: { flex: 1 },
  openNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginBottom: vs(10),
  },
  none: { marginBottom: vs(10) },
  parked: { marginBottom: vs(8) },
  actions: { flexDirection: 'row', gap: s(10) },
  action: { flex: 1 },
  loading: { padding: s(14) },
});
