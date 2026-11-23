import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScroll } from '../components/ScreenScroll';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { errorMessage, useMe } from '../store';
import {
  useGetActivityQuery,
  useGetDepartmentQuery,
  useListAssignmentsQuery,
  useSetActivityTickMutation,
} from '../store/api/departmentsApi';
import {
  assignmentFor,
  getTaskStatus,
  shiftStats,
  todayFacts,
} from '../utils/departments';
import { longDate, realToday } from '../utils/dates';
import { colors, hairline, radius, s, vs } from '../theme';

const LANES = [
  { key: 'opening', label: 'Opening' },
  { key: 'closing', label: 'Closing' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

/** One tickable line of the shift checklist. */
function ShiftRow({ task, on, busy, last, onToggle }) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={busy}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: busy }}
      style={({ pressed }) => [
        styles.row,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.box, on && styles.boxOn]}>
        {on ? (
          <Check size={s(13)} color={colors.white} strokeWidth={3} />
        ) : null}
      </View>
      <View style={styles.rowText}>
        <AppText
          variant={on ? 'bodyRegular' : 'body'}
          color={on ? colors.inkMuted : colors.ink}
          style={on ? styles.struck : undefined}
        >
          {task.text}
        </AppText>
        {task.defaultTime ? (
          <AppText variant="meta" color={colors.inkFaint}>
            {task.defaultTime}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * My Activity — the checklist for today's shift, lane by lane.
 *
 * The same three reads the website makes: which department and position I hold, that department's
 * four lanes of tasks, and today's ticks. What falls due today is worked out on the phone by the
 * same rules the website uses (src/utils/departments.js), so both agree.
 */
export function ActivityScreen() {
  const me = useMe();
  const today = realToday();
  const facts = useMemo(() => todayFacts(today), [today]);
  const [pending, setPending] = useState({});
  const [problem, setProblem] = useState('');

  const assignmentsQ = useListAssignmentsQuery();
  const assignment = assignmentFor(assignmentsQ.data, me?.name);

  const deptQ = useGetDepartmentQuery(assignment.departmentId, {
    skip: !assignment.departmentId,
  });
  const activityQ = useGetActivityQuery({ date: today, scope: 'me' });
  const [tick] = useSetActivityTickMutation();

  const dept = deptQ.data;
  // Kept stable so the stats below are not recomputed on every render.
  const log = useMemo(() => activityQ.data?.log ?? {}, [activityQ.data]);
  const person = activityQ.data?.person ?? me?.name;

  const { lists, total, done, pct } = useMemo(
    () =>
      shiftStats(
        log,
        person,
        dept,
        assignment.positionId,
        assignment.role,
        facts,
      ),
    [log, person, dept, assignment.positionId, assignment.role, facts],
  );

  const loading =
    assignmentsQ.isLoading || deptQ.isLoading || activityQ.isLoading;
  const error = assignmentsQ.error || deptQ.error || activityQ.error;

  const refresh = async () => {
    await Promise.all(
      [assignmentsQ, deptQ, activityQ].map(q => q.refetch?.()).filter(Boolean),
    );
  };

  /** Ticked state with the tap the user just made laid over it, so the box moves at once. */
  const isOn = (kind, taskId) => {
    const key = `${kind}:${taskId}`;
    return key in pending
      ? pending[key]
      : getTaskStatus(log, person, today, kind, taskId) === 'done';
  };

  const toggle = async (kind, task) => {
    const key = `${kind}:${task.id}`;
    const next = !isOn(kind, task.id);
    setPending(p => ({ ...p, [key]: next }));
    setProblem('');
    try {
      await tick({
        departmentId: assignment.departmentId,
        kind,
        taskId: task.id,
        done: next,
        date: today,
      }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setPending(p => {
        const { [key]: _gone, ...rest } = p;
        return rest;
      });
    }
  };

  const body = () => {
    if (error) {
      return <Notice tone="error" title={errorMessage(error)} />;
    }
    if (loading) {
      return (
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      );
    }
    if (!assignment.departmentId) {
      return (
        <EmptyState text="You are not in a department yet, so there is no shift checklist. Ask an admin to add you to one." />
      );
    }
    if (!total) {
      return <EmptyState text="Nothing due today. Enjoy the quiet one." />;
    }

    return (
      <>
        <Card style={styles.glance}>
          <View style={styles.stat}>
            <Stat value={`${done}/${total}`} label="Ticked" />
          </View>
          <View style={styles.glanceRule} />
          <View style={styles.stat}>
            <Stat value={`${pct}%`} label="Done" />
          </View>
          <View style={styles.glanceRule} />
          <View style={styles.stat}>
            <Stat
              value={total - done}
              label="To go"
              tone={total - done ? colors.ink : colors.green}
            />
          </View>
        </Card>

        <Card style={styles.progress}>
          <View style={styles.progressTop}>
            <AppText variant="label">Today's shift</AppText>
            <AppText
              variant="metaStrong"
              color={pct === 100 ? colors.green : colors.inkMuted}
            >
              {pct === 100 ? 'Clean close' : `${total - done} left`}
            </AppText>
          </View>
          <ProgressBar
            value={pct}
            color={pct === 100 ? colors.green : colors.teal}
          />
        </Card>

        {LANES.map(lane => {
          const tasks = lists[lane.key];
          if (!tasks.length) {
            return null;
          }
          const laneDone = tasks.filter(t => isOn(lane.key, t.id)).length;
          return (
            <View key={lane.key}>
              <Eyebrow label={`${lane.label} · ${laneDone}/${tasks.length}`} />
              <Card style={styles.lane}>
                {tasks.map((task, i) => (
                  <ShiftRow
                    key={task.id}
                    task={task}
                    on={isOn(lane.key, task.id)}
                    busy={`${lane.key}:${task.id}` in pending}
                    last={i === tasks.length - 1}
                    onToggle={() => toggle(lane.key, task)}
                  />
                ))}
              </Card>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader eyebrow={longDate(today)} title="My Activity">
        <View style={styles.headline}>
          <AppText variant="heading" color={colors.white}>
            {loading ? '—' : `${done} of ${total} done`}
          </AppText>
          <AppText variant="meta" color={colors.onTealSoft}>
            {dept?.name ??
              (loading ? 'Loading your shift…' : 'No department yet')}
          </AppText>
        </View>
      </ScreenHeader>

      <ScreenScroll onRefresh={refresh}>
        {problem ? (
          <Notice tone="error" title={problem} style={styles.notice} />
        ) : null}
        {body()}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  headline: { gap: vs(2) },
  notice: { marginBottom: vs(10) },
  loading: { padding: s(14) },
  glance: { flexDirection: 'row', borderRadius: radius.sm, marginBottom: vs(10) },
  glanceRule: { width: hairline, backgroundColor: colors.line },
  stat: { flex: 1, paddingHorizontal: s(10), paddingVertical: vs(9) },
  progress: { padding: s(14), gap: vs(10) },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lane: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: vs(1) },
  pressed: { opacity: 0.7 },
  box: {
    width: s(20),
    height: s(20),
    borderRadius: radius.xs,
    borderWidth: hairline * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  struck: { textDecorationLine: 'line-through' },
});
