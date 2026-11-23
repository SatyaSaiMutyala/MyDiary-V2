import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { SegmentedControl } from '../components/SegmentedControl';
import { IconTile } from '../components/IconTile';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScroll } from '../components/ScreenScroll';
import { SearchField } from '../components/SearchField';
import { ShimmerRows } from '../components/Shimmer';
import { StatusDot } from '../components/StatusDot';
import { errorMessage, useMe } from '../store';
import {
  useListActionItemsQuery,
  useUpdateActionItemMutation,
} from '../store/api/actionItemsApi';
import { dueDate } from '../utils/dates';
import { useDebounced } from '../utils/useDebounced';
import { colors, hairline, s, shadow, vs } from '../theme';

const PRIORITY_TONE = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

/** One task row: tap the dot to tick it, tap the row to open it. */
function TodoRow({ task, onToggle, onOpen, showOwner, last }) {
  const done = task.status === 'done';
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Pressable
        onPress={onToggle}
        hitSlop={s(8)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Mark "${task.desc}" ${done ? 'not done' : 'done'}`}
      >
        <StatusDot status={done ? 'done' : 'open'} />
      </Pressable>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={task.desc}
      >
        <View style={styles.rowTop}>
          <AppText
            variant="body"
            color={done ? colors.inkMuted : colors.ink}
            style={[styles.rowTitle, done && styles.struck]}
            numberOfLines={2}
          >
            {task.desc}
          </AppText>
          {!done && task.priority !== 'medium' ? (
            <Pill
              label={task.priority[0].toUpperCase() + task.priority.slice(1)}
              tone={PRIORITY_TONE[task.priority] ?? 'low'}
            />
          ) : null}
        </View>
        <AppText
          variant="meta"
          color={task.isOverdue && !done ? colors.redInk : colors.inkMuted}
          numberOfLines={1}
        >
          {showOwner ? `${task.owner || 'Unassigned'} · ` : ''}
          due {dueDate(task.deadline)}
          {task.isOverdue && !done ? ' · overdue' : ''}
          {task.meetingTitle ? ` · ${task.meetingTitle}` : ''}
        </AppText>
      </Pressable>
      <ChevronRight size={s(16)} color={colors.inkFaint} strokeWidth={2} />
    </View>
  );
}

/**
 * My To-Do — every action owed by me, from whichever meeting it was committed in.
 *
 * The API ties an action item to the meeting it came from, so everything here has a meeting
 * behind it. Ticking one off here updates it everywhere, including on that meeting's screen.
 */
export function TodoScreen() {
  const nav = useNavigation();
  const me = useMe();
  const [box, setBox] = useState('owed');
  // Refines the "owed by me" list only; the other two views are already narrow.
  const [scope, setScope] = useState('open');
  const [search, setSearch] = useState('');

  const term = useDebounced(search.trim());

  // Everything owed by me, and everything I handed out, in two queries.
  const mineQ = useListActionItemsQuery({
    mine: 'true',
    limit: 200,
    sort: 'deadline',
    ...(term ? { search: term } : null),
  });
  const allQ = useListActionItemsQuery({
    limit: 200,
    sort: 'deadline',
    ...(term ? { search: term } : null),
  });
  const [updateAction] = useUpdateActionItemMutation();

  const mine = useMemo(() => mineQ.data?.items ?? [], [mineQ.data]);
  const all = useMemo(() => allQ.data?.items ?? [], [allQ.data]);

  const delegated = useMemo(
    () =>
      all.filter(
        a => a.createdBy?.name === me?.name && a.owner !== me?.name,
      ),
    [all, me?.name],
  );

  const counts = {
    owed: mine.filter(a => a.status !== 'done').length,
    delegated: delegated.filter(a => a.status !== 'done').length,
    overdue: mine.filter(a => a.status !== 'done' && a.isOverdue).length,
    done: mine.filter(a => a.status === 'done').length,
  };

  const rows = useMemo(() => {
    if (box === 'delegated') {
      return delegated;
    }
    if (box === 'done') {
      return mine.filter(a => a.status === 'done');
    }
    if (scope === 'overdue') {
      return mine.filter(a => a.status !== 'done' && a.isOverdue);
    }
    if (scope === 'all') {
      return mine;
    }
    return mine.filter(a => a.status !== 'done');
  }, [box, scope, mine, delegated]);

  const loading = mineQ.isLoading || allQ.isLoading;
  const error = mineQ.error || allQ.error;

  const toggle = async task => {
    await updateAction({
      id: task.id,
      meetingId: task.meetingId,
      status: task.status === 'done' ? 'open' : 'done',
    })
      .unwrap()
      .catch(() => {});
  };

  const refresh = async () => {
    await Promise.all([mineQ.refetch(), allQ.refetch()]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={`${counts.owed} open · ${counts.overdue} overdue`}
        title="My To-Do"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New task"
            onPress={() => nav.navigate('TaskForm')}
          >
            <IconTile size={38} bg={colors.yellow} style={styles.add}>
              <Plus size={s(20)} color={colors.yellowInk} strokeWidth={2.25} />
            </IconTile>
          </Pressable>
        }
      >
        <SegmentedControl
          compact
          value={box}
          onChange={setBox}
          options={[
            { key: 'owed', label: 'Owed by me', count: counts.owed },
            { key: 'delegated', label: 'Delegated', count: counts.delegated },
            { key: 'done', label: 'Done', count: counts.done },
          ]}
        />
      </ScreenHeader>

      <ScreenScroll onRefresh={refresh}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by task, owner or meeting"
          style={styles.search}
        />

        {box === 'owed' ? (
          <View style={styles.chips}>
            <FilterChips
              value={scope}
              onChange={setScope}
              options={[
                { key: 'open', label: 'Open', count: counts.owed },
                {
                  key: 'overdue',
                  label: 'Overdue',
                  count: counts.overdue,
                  alert: true,
                },
                { key: 'all', label: 'Everything' },
              ]}
            />
          </View>
        ) : null}

        {error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : loading ? (
          <Card style={styles.loading}>
            <ShimmerRows rows={4} icon={false} />
          </Card>
        ) : rows.length ? (
          <>
            <Eyebrow
              label={`${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}
            />
            <Card style={styles.list}>
              {rows.map((task, i) => (
                <TodoRow
                  key={task.id}
                  task={task}
                  last={i === rows.length - 1}
                  showOwner={box === 'delegated'}
                  onToggle={() => toggle(task)}
                  onOpen={() => nav.navigate('TaskDetail', { id: task.id })}
                />
              ))}
            </Card>
          </>
        ) : (
          <EmptyState
            text={
              term
                ? 'Nothing matches. Try a different word.'
                : box === 'done'
                ? 'Nothing finished yet.'
                : box === 'delegated'
                ? 'You have not handed anything to anyone.'
                : scope === 'overdue'
                ? 'Nothing is overdue. Good.'
                : 'Nothing owed by you. When something is committed to in a meeting, it lands here.'
            }
          />
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  add: { ...shadow.action },
  search: { marginBottom: vs(4) },
  chips: { marginBottom: vs(6) },
  loading: { padding: s(14) },
  list: { paddingHorizontal: s(14) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  rowBody: { flex: 1 },
  pressed: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  rowTitle: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
});
