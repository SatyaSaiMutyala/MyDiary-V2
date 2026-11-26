import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronRight } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { Pill } from '../components/Pill';
import { ScreenScroll } from '../components/ScreenScroll';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { errorMessage, useMe } from '../store';
import { canOpen } from '../store/api/authApi';
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
import { useLabDayQuery, useLabMineQuery } from '../store/api/labReadinessApi';
import { useUpdateMeMutation } from '../store/api/authApi';
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
  const nav = useNavigation();
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
  // The laboratory's readiness lines for this person — nothing for anybody else, and nothing until
  // an admin has put them in a unit.
  const labQ = useLabMineQuery(
    { date: today },
    { skip: !canOpen(me, 'labReadiness') },
  );
  const lab = labQ.data?.unit ? labQ.data : null;

  /**
   * Which unit this person works in, chosen by them and kept on their account.
   *
   * Nobody else can know it — a job title says "Lab Technician", not whether they are in
   * Biochemistry or at Anantapur — so they are asked once and never again.
   */
  const unitsQ = useLabDayQuery(
    { date: today },
    { skip: !canOpen(me, 'labReadiness') },
  );
  const labUnits = unitsQ.data?.units ?? [];
  const [saveMe, savingUnit] = useUpdateMeMutation();
  const rememberUnit = async key => {
    try {
      await saveMe({ labUnit: key }).unwrap();
      labQ.refetch();
    } catch {
      // The question stays on screen; they can pick again.
    }
  };
  const [tick] = useSetActivityTickMutation();

  const dept = deptQ.data;
  // Kept stable so the stats below are not recomputed on every render.
  const log = useMemo(() => activityQ.data?.log ?? {}, [activityQ.data]);
  const person = activityQ.data?.person ?? me?.name;

  const {
    lists,
    total: shiftTotal,
    done: shiftDone,
  } = useMemo(
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

  // Where a readiness board replaces the shift tasks, the day's count is this person's own lines
  // of it — otherwise the page would say "nothing due" with a round still to do.
  const labLines = lab
    ? ['opening', 'closing'].flatMap(k => lab.phases?.[k]?.lines ?? [])
    : [];
  const total = shiftTotal + labLines.length;
  const done = shiftDone + labLines.filter(l => l.complete).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

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
      // The tap stays on screen until the refetched log says the same thing (see the effect
      // below). Dropping it here instead made the box flick back to its old state for the moment
      // between the save finishing and the new log arriving — on, off, on.
    } catch (err) {
      setProblem(errorMessage(err));
      setPending(p => {
        const { [key]: _gone, ...rest } = p;
        return rest;
      });
    }
  };

  // A tap is held over the server's answer only until the two agree, then it is let go of.
  useEffect(() => {
    setPending(p => {
      const keys = Object.keys(p);
      if (!keys.length) {
        return p;
      }
      const waiting = {};
      for (const key of keys) {
        const [kind, taskId] = key.split(':');
        const saved =
          getTaskStatus(log, person, today, kind, taskId) === 'done';
        if (saved !== p[key]) {
          waiting[key] = p[key];
        }
      }
      return Object.keys(waiting).length === keys.length ? p : waiting;
    });
  }, [log, person, today]);

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
    if (!total && !lab?.total) {
      // A lab person with no unit has a board waiting for them but no lines of their own, which
      // "nothing due" would hide. Say what is missing and who fixes it.
      if (labQ.data && !labQ.data.unit) {
        return (
          <UnitQuestion
            units={labUnits}
            onPick={rememberUnit}
            saving={savingUnit}
          />
        );
      }
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
          // A department that runs a readiness board has no shift tasks: its rounds ARE its
          // opening and closing tasks, so they are drawn here, under the same headings.
          const round =
            lab && (lane.key === 'opening' || lane.key === 'closing')
              ? lab.phases?.[lane.key]
              : null;
          if (round) {
            const lines = round.lines ?? [];
            if (!lines.length) {
              return null;
            }
            const doneCt = lines.filter(l => l.complete).length;
            return (
              <View key={lane.key}>
                <Eyebrow label={`${lane.label} · ${doneCt}/${lines.length}`} />
                <Card style={styles.lane}>
                  {lines.map((l, i) => (
                    <Pressable
                      key={l.key}
                      onPress={() =>
                        nav.navigate('LabReadiness', {
                          phase: lane.key,
                          unit: lab.unit.key,
                          date: today,
                        })
                      }
                      style={({ pressed }) => [
                        styles.row,
                        i === lines.length - 1 && styles.lastRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.box, l.complete && styles.boxOn]}>
                        {l.complete ? (
                          <Check
                            size={s(13)}
                            color={colors.white}
                            strokeWidth={3}
                          />
                        ) : null}
                      </View>
                      <View style={styles.rowText}>
                        <AppText
                          variant={l.complete ? 'bodyRegular' : 'body'}
                          color={l.complete ? colors.inkMuted : colors.ink}
                        >
                          {l.text}
                        </AppText>
                        <View style={styles.lineMeta}>
                          {l.scheduledTime ? (
                            <AppText variant="meta" color={colors.inkFaint}>
                              {l.scheduledTime}
                            </AppText>
                          ) : null}
                          {l.photoRequired ? (
                            <Pill
                              label={
                                l.photos ? `${l.photos} photo` : 'Photo needed'
                              }
                              tone={l.photos ? 'signed' : 'low'}
                            />
                          ) : null}
                          {l.status ? (
                            <Pill label={l.status} tone="low" />
                          ) : null}
                        </View>
                      </View>
                      <ChevronRight
                        size={s(18)}
                        color={colors.inkFaint}
                        strokeWidth={2}
                      />
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          }

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
  glance: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    marginBottom: vs(10),
  },
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
  askCard: { padding: s(16), gap: vs(4) },
  askText: { marginBottom: vs(8) },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(13),
    borderTopWidth: hairline,
    borderTopColor: colors.line,
  },
  askRowOn: { opacity: 0.6 },
  askSkip: { paddingTop: vs(14), alignItems: 'center' },
  lineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: s(8),
    marginTop: vs(4),
  },
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

/**
 * The one-time question a laboratory person is asked before their own round can be shown.
 *
 * Offered rather than demanded: somebody who would rather not say can still open the board and
 * pick a unit there, which is what the "Not now" line is for.
 */
export function UnitQuestion({ units, onPick, saving, onSkip }) {
  if (!units.length) {
    return (
      <EmptyState text="No units are set up for Lab Readiness yet. An admin adds them in Department Master on the website." />
    );
  }
  return (
    <Card style={styles.askCard}>
      <AppText variant="h3">Which unit do you work in?</AppText>
      <AppText variant="body" color={colors.inkMuted} style={styles.askText}>
        Nobody else can know this, so pick it once and it is remembered — your
        own round opens here every day after that. An admin can change it later
        in Settings.
      </AppText>
      {units.map(u => (
        <Pressable
          key={u.key}
          onPress={() => onPick(u.key)}
          disabled={saving?.isLoading}
          style={({ pressed }) => [styles.askRow, pressed && styles.askRowOn]}
        >
          <AppText variant="body">{u.name}</AppText>
          <ChevronRight size={s(18)} color={colors.inkFaint} strokeWidth={2} />
        </Pressable>
      ))}
      {onSkip ? (
        <Pressable onPress={onSkip} style={styles.askSkip}>
          <AppText variant="meta" color={colors.inkMuted}>
            Not now — just show me the board
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}
