import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { SearchField } from '../components/SearchField';
import { SegmentedControl } from '../components/SegmentedControl';
import { ShimmerRows } from '../components/Shimmer';
import {
  channelLabel,
  channels,
  followUpLabel,
  followUpTone,
  groupByDay,
  openFollowUps,
  relativeDay,
  withLine,
} from '../model/log';
import { errorMessage } from '../store';
import {
  useListLogFollowUpsQuery,
  useListLogPeopleQuery,
  useListLogsQuery,
  useToggleFollowUpMutation,
} from '../store/api/logsApi';
import { initialsOf } from '../utils/people';
import { dueDate, longDate } from '../utils/dates';
import { useDebounced } from '../utils/useDebounced';
import { colors, hairline, s, vs } from '../theme';

/** Every read is this person's own logs — a log is private to whoever wrote it. */
const MINE = { mine: 'true' };
const LIMIT = 200;

/** One log in the day list. */
function LogRow({ log, last, onPress }) {
  const open = openFollowUps(log);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={log.topic}
      style={({ pressed }) => [
        styles.row,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowBody}>
        <AppText variant="body" numberOfLines={2}>
          {log.topic}
        </AppText>
        <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
          {[log.time, channelLabel(log.channel), withLine(log)]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        {log.summary ? (
          <AppText variant="meta" color={colors.inkFaint} numberOfLines={2}>
            {log.summary}
          </AppText>
        ) : null}
        {open ? (
          <View style={styles.rowTags}>
            <Pill label={`${open} open follow-up${open === 1 ? '' : 's'}`} tone="watch" />
          </View>
        ) : null}
      </View>
      <ChevronRight size={s(16)} color={colors.inkFaint} />
    </Pressable>
  );
}

/**
 * My Discussion Logs — the informal record.
 *
 * Three views, the same three the website offers: everything newest-first grouped by day, one row
 * per person spoken with, and every follow-up across every log. The groupings come from the
 * server's own endpoints, so the counts here and on the desk cannot drift apart.
 */
export function LogsScreen() {
  const nav = useNavigation();
  const [view, setView] = useState('all');
  const [person, setPerson] = useState(null);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [fuScope, setFuScope] = useState('open');

  const term = useDebounced(search.trim());

  const logsQ = useListLogsQuery({
    ...MINE,
    limit: LIMIT,
    sort: '-date',
    ...(term ? { search: term } : null),
    ...(channel ? { channel } : null),
    ...(person ? { person } : null),
  });
  const peopleQ = useListLogPeopleQuery({ ...MINE, limit: LIMIT });
  const followUpsQ = useListLogFollowUpsQuery({ ...MINE, limit: LIMIT });
  const [toggleFollowUp] = useToggleFollowUpMutation();

  const [problem, setProblem] = useState('');
  const [busyId, setBusyId] = useState('');

  const logs = useMemo(() => logsQ.data?.items ?? [], [logsQ.data]);
  const days = useMemo(() => groupByDay(logs), [logs]);
  const people = peopleQ.data?.items ?? [];
  // Kept stable so the filtered view below is not rebuilt on every render.
  const allFollowUps = useMemo(
    () => followUpsQ.data?.items ?? [],
    [followUpsQ.data],
  );
  const fuCounts = followUpsQ.data?.counts ?? { open: 0, overdue: 0, done: 0 };

  const followUps = useMemo(
    () =>
      fuScope === 'all'
        ? allFollowUps
        : allFollowUps.filter(f => f.status === fuScope),
    [allFollowUps, fuScope],
  );

  const refresh = async () => {
    await Promise.all([
      logsQ.refetch(),
      peopleQ.refetch(),
      followUpsQ.refetch(),
    ]);
  };

  const flip = async f => {
    setBusyId(f.id);
    setProblem('');
    try {
      await toggleFollowUp({ id: f.logId, fuId: f.id }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const openLog = id => nav.navigate('LogDetail', { id });

  // ------------------------------------------------------------------ views

  const allView = () => (
    <>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search topics, people, what was said"
        style={styles.search}
      />
      <View style={styles.chips}>
        <FilterChips
          value={channel}
          onChange={setChannel}
          options={[
            { key: '', label: 'Every channel' },
            ...channels.map(c => ({ key: c.id, label: c.label })),
          ]}
        />
      </View>

      {logsQ.isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      ) : days.length ? (
        days.map(day => (
          <View key={day.date}>
            <Eyebrow
              label={`${relativeDay(day.date) || longDate(day.date)} · ${day.items.length}`}
            />
            <Card style={styles.list}>
              {day.items.map((l, i) => (
                <LogRow
                  key={l.id}
                  log={l}
                  last={i === day.items.length - 1}
                  onPress={() => openLog(l.id)}
                />
              ))}
            </Card>
          </View>
        ))
      ) : (
        <EmptyState text="No log matches. Clear the filters, or capture a new conversation below." />
      )}
    </>
  );

  const peopleView = () =>
    peopleQ.isLoading ? (
      <Card style={styles.loading}>
        <ShimmerRows rows={5} />
      </Card>
    ) : people.length ? (
      <>
        <Eyebrow label={`${people.length} people`} />
        <Card style={styles.list}>
          {people.map((p, i) => (
            <Pressable
              key={`${p.name}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.count} conversations`}
              onPress={() => {
                setPerson(p.name);
                setView('all');
              }}
              style={({ pressed }) => [
                styles.person,
                i === people.length - 1 && styles.lastRow,
                pressed && styles.pressed,
              ]}
            >
              <Avatar label={initialsOf(p.name)} size={34} />
              <View style={styles.personText}>
                <AppText variant="body" numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
                  {p.count} {p.count === 1 ? 'conversation' : 'conversations'} ·{' '}
                  {relativeDay(p.lastDate) || longDate(p.lastDate)}
                </AppText>
              </View>
              {p.openFollowUps ? (
                <Pill label={`${p.openFollowUps}`} tone="watch" />
              ) : null}
            </Pressable>
          ))}
        </Card>
      </>
    ) : (
      <EmptyState text="Nobody yet. Logs are grouped by the people you spoke with." />
    );

  const followUpsView = () => (
    <>
      <View style={styles.chips}>
        <FilterChips
          value={fuScope}
          onChange={setFuScope}
          options={[
            { key: 'open', label: 'Open', count: fuCounts.open },
            {
              key: 'overdue',
              label: 'Overdue',
              count: fuCounts.overdue,
              alert: true,
            },
            { key: 'done', label: 'Done', count: fuCounts.done },
            { key: 'all', label: 'Everything', count: allFollowUps.length },
          ]}
        />
      </View>

      {followUpsQ.isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      ) : followUps.length ? (
        <Card style={styles.list}>
          {followUps.map((f, i) => (
            <View
              key={f.id}
              style={[
                styles.fuRow,
                i === followUps.length - 1 && styles.lastRow,
              ]}
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
              />
              <Pressable
                style={styles.fuText}
                accessibilityRole="button"
                accessibilityLabel={`Open ${f.log?.topic ?? 'the log'}`}
                onPress={() => openLog(f.logId)}
              >
                <AppText
                  variant="body"
                  color={f.done ? colors.inkMuted : colors.ink}
                  style={f.done ? styles.struck : undefined}
                >
                  {f.text}
                </AppText>
                <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
                  {[
                    f.owner,
                    f.deadline ? `by ${dueDate(f.deadline)}` : '',
                    f.log?.topic,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </Pressable>
              <Pill
                label={followUpLabel[f.status] ?? f.status}
                tone={followUpTone[f.status] ?? 'low'}
              />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState text="Nothing in this view." />
      )}
    </>
  );

  const error = logsQ.error || peopleQ.error || followUpsQ.error;

  return (
    <FormScreen
      title="My discussion logs"
      onRefresh={refresh}
      footer={
        <Button
          label="Log a conversation"
          iconLeft={Plus}
          onPress={() => nav.navigate('LogForm', {})}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}
      {error ? <Notice tone="error" title={errorMessage(error)} /> : null}

      <SegmentedControl
        compact
        value={view}
        onChange={v => {
          setView(v);
          setPerson(null);
        }}
        options={[
          { key: 'all', label: 'All logs', count: logsQ.data?.total ?? 0 },
          { key: 'people', label: 'By person', count: peopleQ.data?.total ?? 0 },
          { key: 'followups', label: 'Follow-ups', count: fuCounts.open },
        ]}
      />

      {person ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show every log again"
          onPress={() => setPerson(null)}
          style={({ pressed }) => [styles.focus, pressed && styles.pressed]}
        >
          <ChevronLeft size={s(16)} color={colors.teal} strokeWidth={2.2} />
          <AppText variant="metaStrong" color={colors.teal}>
            Only {person} — show everything
          </AppText>
        </Pressable>
      ) : null}

      {view === 'all'
        ? allView()
        : view === 'people'
        ? peopleView()
        : followUpsView()}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: vs(10), marginBottom: vs(10) },
  chips: { marginTop: vs(10), marginBottom: vs(8) },
  loading: { padding: s(14) },
  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  pressed: { opacity: 0.7 },
  struck: { textDecorationLine: 'line-through' },
  lastRow: { borderBottomWidth: 0 },
  focus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    marginTop: vs(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  rowBody: { flex: 1, gap: vs(2) },
  rowTags: { flexDirection: 'row', marginTop: vs(4) },
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
  },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
