import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Check,
  Copy,
  Pencil,
  Send,
  TriangleAlert,
  Trash2,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ProgressBar } from '../components/ProgressBar';
import { ShimmerRows } from '../components/Shimmer';
import { TextArea } from '../components/TextArea';
import {
  acceptanceProgress,
  barColor,
  categoryLabel,
  daysLeftLabel,
  isOverdue,
  kpiProgress,
  milestoneRiskCount,
  milestoneTaskProgress,
  priorityLabel,
  priorityTone,
  projectProgress,
  sortedMilestones,
  statusLabel,
  statusTone,
  taskStatusLabel,
} from '../model/project';
import { errorMessage } from '../store';
import {
  useAddProjectCommentMutation,
  useDuplicateProjectMutation,
  useGetProjectQuery,
  useRemoveProjectMutation,
  useUpdateCriterionMutation,
  useUpdateMilestoneMutation,
  useUpdateProjectRiskMutation,
  useUpdateProjectTaskMutation,
} from '../store/api/projectsApi';
import { initialsOf } from '../utils/people';
import { dueDate, longDate } from '../utils/dates';
import { colors, hairline, radius, s, vs } from '../theme';

const PANES = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'team', label: 'Team' },
  { key: 'kpis', label: 'KPIs' },
  { key: 'risks', label: 'Risks' },
  { key: 'activity', label: 'Activity' },
];

/** A round tick, the one the milestone and task rows share. */
function Tick({ on, onPress, label, busy }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: busy }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tick,
        on && styles.tickOn,
        pressed && styles.pressed,
      ]}
    >
      {on ? <Check size={s(13)} color={colors.white} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function SectionHead({ label, action, onAction }) {
  return <Eyebrow label={label} action={action} onAction={onAction} />;
}

/**
 * One project, with everything that hangs off it.
 *
 * The website spreads this over eight tabs; the phone keeps the same eight, because people move
 * between the desk and the phone on the same project and the words have to match. Every edit goes
 * to its own endpoint and the whole project comes back, so each pane is always in step.
 */
export function ProjectDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const [pane, setPane] = useState('overview');
  const [riskScope, setRiskScope] = useState('all');
  const [comment, setComment] = useState('');
  const [problem, setProblem] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const { data: p, error, isLoading, refetch } = useGetProjectQuery(id);

  const [updateMilestone] = useUpdateMilestoneMutation();
  const [updateCriterion] = useUpdateCriterionMutation();
  const [updateTask] = useUpdateProjectTaskMutation();
  const [updateRisk] = useUpdateProjectRiskMutation();
  const [addComment, posting] = useAddProjectCommentMutation();
  const [duplicate, duplicating] = useDuplicateProjectMutation();
  const [removeProject, removing] = useRemoveProjectMutation();

  const milestones = useMemo(() => sortedMilestones(p), [p]);

  /** Runs one edit, shows the server's own words if it refuses, and locks only the row touched. */
  const run = async (key, fn) => {
    setBusyKey(key);
    setProblem('');
    try {
      await fn().unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusyKey('');
    }
  };

  if (isLoading) {
    return (
      <FormScreen title="Project">
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      </FormScreen>
    );
  }

  if (error || !p) {
    return (
      <FormScreen title="Project">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That project could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const pct = projectProgress(p);
  const doneMs = (p.milestones ?? []).filter(m => m.status === 'done').length;
  const openRisks = (p.risks ?? []).filter(r => r.status !== 'mitigated');
  const people = [...(p.team ?? []), ...(p.external ?? [])];

  const remove = async () => {
    if (removing.isLoading) {
      return;
    }
    const yes = await confirm({
      title: 'Delete this project?',
      text: `"${p.name}" and everything in it is removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeProject(id).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const duplicateIt = async () => {
    const yes = await confirm({
      title: 'Duplicate this project?',
      text: `A copy of "${p.name}" is created, with its milestones, tasks, KPIs and risks.`,
      confirmLabel: 'Duplicate',
      icon: Copy,
    });
    if (!yes) {
      return;
    }
    try {
      const copy = await duplicate(id).unwrap();
      nav.replace('ProjectDetail', { id: copy.id });
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const post = async () => {
    const text = comment.trim();
    if (!text) {
      return;
    }
    try {
      await addComment({ id, text }).unwrap();
      setComment('');
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  // ------------------------------------------------------------------ panes

  const overview = () => {
    const upcoming = milestones.filter(m => m.status !== 'done').slice(0, 3);
    return (
      <>
        <SectionHead label={`Next milestones · ${upcoming.length}`} />
        {upcoming.length ? (
          upcoming.map(m => {
            const late = isOverdue(m.dueDate);
            return (
              <Card key={m.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <AppText variant="body" numberOfLines={2}>
                    {m.name}
                  </AppText>
                  <AppText
                    variant="meta"
                    color={late ? colors.redInk : colors.inkMuted}
                  >
                    {late ? 'Overdue · ' : 'Due '}
                    {dueDate(m.dueDate)}
                    {m.owner ? ` · ${m.owner}` : ''}
                  </AppText>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState text="No pending milestones." />
        )}

        <SectionHead label={`Team · ${people.length}`} />
        {people.length ? (
          <Card style={styles.list}>
            {people.map((x, i) => (
              <View
                key={`${x.name}-${i}`}
                style={[styles.person, i === people.length - 1 && styles.lastRow]}
              >
                <Avatar label={initialsOf(x.name)} size={30} />
                <View style={styles.personText}>
                  <AppText variant="body">{x.name}</AppText>
                  <AppText variant="meta" color={colors.inkMuted}>
                    {x.role || 'Team member'}
                  </AppText>
                </View>
                {x.email ? <Pill label="External" tone="info" /> : null}
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState text="Nobody on this project yet." />
        )}

        {openRisks.length ? (
          <>
            <SectionHead label={`Top risks · ${openRisks.length} open`} />
            {openRisks.slice(0, 3).map(r => (
              <Card key={r.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <AppText variant="body" numberOfLines={2}>
                    {r.title}
                  </AppText>
                  <AppText variant="meta" color={colors.inkMuted}>
                    {priorityLabel(r.severity)}
                    {r.owner ? ` · ${r.owner}` : ''}
                  </AppText>
                </View>
              </Card>
            ))}
          </>
        ) : null}
      </>
    );
  };

  /** The Gantt, read the way a phone can read it: every milestone on one track, today marked. */
  const timeline = () => {
    const start = p.startDate;
    const end = p.endDate;
    const span =
      start && end
        ? Math.max(
            1,
            (new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) /
              86400000,
          )
        : 0;
    const atPct = date => {
      if (!span || !date) {
        return null;
      }
      const d =
        (new Date(`${date}T00:00:00`) - new Date(`${start}T00:00:00`)) /
        86400000;
      return Math.max(0, Math.min(100, Math.round((d / span) * 100)));
    };

    return (
      <>
        <Card style={styles.pad}>
          <InfoRow label="Starts" value={start ? longDate(start) : ''} />
          <InfoRow label="Ends" value={end ? longDate(end) : ''} />
          <InfoRow label="Left" value={daysLeftLabel(end)} />
        </Card>

        <SectionHead label={`Milestones on the clock · ${milestones.length}`} />
        {milestones.length && span ? (
          <Card style={styles.pad}>
            {milestones.map((m, i) => {
              const at = atPct(m.dueDate);
              const late = m.status !== 'done' && isOverdue(m.dueDate);
              const colour =
                m.status === 'done'
                  ? colors.green
                  : late
                  ? colors.red
                  : colors.teal;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.trackRow,
                    i === milestones.length - 1 && styles.lastRow,
                  ]}
                >
                  <AppText variant="meta" numberOfLines={1}>
                    {m.name}
                  </AppText>
                  <View style={styles.track}>
                    {at === null ? null : (
                      <View
                        style={[
                          styles.marker,
                          { left: `${at}%`, backgroundColor: colour },
                        ]}
                      />
                    )}
                  </View>
                  <AppText
                    variant="meta"
                    color={late ? colors.redInk : colors.inkMuted}
                  >
                    {dueDate(m.dueDate) || 'No date'}
                  </AppText>
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState text="Give the project a start and end date, and add milestones, to see them on the clock." />
        )}
      </>
    );
  };

  const milestonesPane = () => (
    <>
      <SectionHead
        label={`${doneMs} of ${milestones.length} done`}
        action="Add"
        onAction={() => nav.navigate('MilestoneForm', { projectId: id })}
      />
      {milestones.length ? (
        milestones.map(m => {
          const done = m.status === 'done';
          const late = !done && isOverdue(m.dueDate);
          const tp = milestoneTaskProgress(p, m.id);
          const ap = acceptanceProgress(m);
          const rc = milestoneRiskCount(p, m.id);
          return (
            <Card key={m.id} style={styles.msCard}>
              <View style={styles.msTop}>
                <Tick
                  on={done}
                  busy={busyKey === `ms:${m.id}`}
                  label={`${m.name}, ${done ? 'done' : 'not done'}`}
                  onPress={() =>
                    run(`ms:${m.id}`, () =>
                      updateMilestone({
                        id,
                        milestoneId: m.id,
                        status: done ? 'todo' : 'done',
                      }),
                    )
                  }
                />
                <Pressable
                  style={styles.msText}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${m.name}`}
                  onPress={() =>
                    nav.navigate('MilestoneForm', {
                      projectId: id,
                      milestoneId: m.id,
                    })
                  }
                >
                  <AppText
                    variant="body"
                    color={done ? colors.inkMuted : colors.ink}
                    style={done ? styles.struck : undefined}
                  >
                    {m.name}
                  </AppText>
                  <AppText
                    variant="meta"
                    color={late ? colors.redInk : colors.inkMuted}
                  >
                    {late ? 'Overdue · ' : ''}
                    {dueDate(m.dueDate) || 'No date'}
                    {m.owner ? ` · ${m.owner}` : ''}
                  </AppText>
                </Pressable>
              </View>

              {m.description ? (
                <AppText
                  variant="meta"
                  color={colors.inkMuted}
                  style={styles.msDesc}
                >
                  {m.description}
                </AppText>
              ) : null}

              <View style={styles.msBar}>
                <AppText variant="meta" color={colors.inkFaint}>
                  Tasks
                </AppText>
                {tp.total ? (
                  <>
                    <ProgressBar
                      value={tp.pct}
                      color={barColor(tp.pct)}
                      style={styles.flex}
                    />
                    <AppText variant="meta" color={colors.inkSoft}>
                      {tp.done}/{tp.total}
                    </AppText>
                  </>
                ) : (
                  <AppText variant="meta" color={colors.inkFaint}>
                    none linked yet
                  </AppText>
                )}
                {rc ? (
                  <Pill label={`${rc} risk${rc > 1 ? 's' : ''}`} tone="critical" />
                ) : null}
              </View>

              <View style={styles.criteria}>
                <View style={styles.criteriaHead}>
                  <AppText variant="meta" color={colors.inkFaint}>
                    Acceptance criteria{ap.total ? ` · ${ap.done}/${ap.total}` : ''}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add an acceptance criterion"
                    onPress={() =>
                      nav.navigate('MilestoneForm', {
                        projectId: id,
                        milestoneId: m.id,
                        focus: 'criteria',
                      })
                    }
                  >
                    <AppText variant="metaStrong" color={colors.teal}>
                      Add
                    </AppText>
                  </Pressable>
                </View>
                {(m.acceptanceCriteria ?? []).length ? (
                  (m.acceptanceCriteria ?? []).map((c, i) => (
                    <Pressable
                      key={`${m.id}-c${i}`}
                      disabled={busyKey === `cr:${m.id}:${i}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: Boolean(c.done) }}
                      onPress={() =>
                        run(`cr:${m.id}:${i}`, () =>
                          updateCriterion({
                            id,
                            milestoneId: m.id,
                            index: i,
                            done: !c.done,
                          }),
                        )
                      }
                      style={({ pressed }) => [
                        styles.criterion,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.box, c.done && styles.boxOn]}>
                        {c.done ? (
                          <Check size={s(11)} color={colors.white} strokeWidth={3} />
                        ) : null}
                      </View>
                      <AppText
                        variant="meta"
                        color={c.done ? colors.inkFaint : colors.ink}
                        style={[styles.flex, c.done && styles.struck]}
                      >
                        {c.text}
                      </AppText>
                    </Pressable>
                  ))
                ) : (
                  <AppText variant="meta" color={colors.inkFaint}>
                    None yet. Add the pass/fail tests that decide "done".
                  </AppText>
                )}
              </View>
            </Card>
          );
        })
      ) : (
        <EmptyState text="No milestones yet. Add the first one to start tracking progress." />
      )}
    </>
  );

  const tasksPane = () => {
    const tasks = p.tasks ?? [];
    const msName = mid => (p.milestones ?? []).find(m => m.id === mid)?.name;
    return (
      <>
        <SectionHead
          label={`${tasks.filter(t => t.status === 'done').length} of ${tasks.length} done`}
          action="Add"
          onAction={() => nav.navigate('ProjectTaskForm', { projectId: id })}
        />
        {tasks.length ? (
          <Card style={styles.list}>
            {tasks.map((t, i) => {
              const done = t.status === 'done';
              const late = !done && isOverdue(t.dueDate);
              return (
                <View
                  key={t.id}
                  style={[styles.taskRow, i === tasks.length - 1 && styles.lastRow]}
                >
                  <Tick
                    on={done}
                    busy={busyKey === `tk:${t.id}`}
                    label={`${t.title}, ${done ? 'done' : 'not done'}`}
                    onPress={() =>
                      run(`tk:${t.id}`, () =>
                        updateTask({
                          id,
                          taskId: t.id,
                          status: done ? 'todo' : 'done',
                        }),
                      )
                    }
                  />
                  <Pressable
                    style={styles.flex}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${t.title}`}
                    onPress={() =>
                      nav.navigate('ProjectTaskForm', {
                        projectId: id,
                        taskId: t.id,
                      })
                    }
                  >
                    <AppText
                      variant="body"
                      color={done ? colors.inkMuted : colors.ink}
                      style={done ? styles.struck : undefined}
                      numberOfLines={2}
                    >
                      {t.title}
                    </AppText>
                    <AppText
                      variant="meta"
                      color={late ? colors.redInk : colors.inkMuted}
                      numberOfLines={1}
                    >
                      {t.assignee || 'Unassigned'}
                      {t.dueDate ? ` · ${late ? 'overdue ' : 'due '}${dueDate(t.dueDate)}` : ''}
                      {/* The tick already says todo or done — only the middle states add anything. */}
                      {t.status === 'in-progress' || t.status === 'review'
                        ? ` · ${taskStatusLabel(t.status)}`
                        : ''}
                      {msName(t.milestoneId) ? ` · ${msName(t.milestoneId)}` : ''}
                    </AppText>
                  </Pressable>
                  <Pill
                    label={priorityLabel(t.priority)}
                    tone={priorityTone[t.priority] ?? 'low'}
                  />
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState text="No tasks on this project yet." />
        )}
      </>
    );
  };

  const teamPane = () => (
    <>
      <SectionHead
        label={`Internal · ${(p.team ?? []).length}`}
        action="Add"
        onAction={() => nav.navigate('ProjectMemberForm', { projectId: id })}
      />
      {(p.team ?? []).length ? (
        <Card style={styles.list}>
          {(p.team ?? []).map((t, i) => (
            <Pressable
              key={t.id ?? `${t.name}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${t.name}`}
              onPress={() =>
                nav.navigate('ProjectMemberForm', {
                  projectId: id,
                  memberId: t.id,
                })
              }
              style={({ pressed }) => [
                styles.person,
                i === (p.team ?? []).length - 1 && styles.lastRow,
                pressed && styles.pressed,
              ]}
            >
              <Avatar label={initialsOf(t.name)} size={34} />
              <View style={styles.personText}>
                <AppText variant="body">{t.name}</AppText>
                <AppText variant="meta" color={colors.inkMuted}>
                  {t.role || 'Team member'}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : (
        <EmptyState text="Nobody on the internal team yet." />
      )}

      <SectionHead
        label={`External · ${(p.external ?? []).length}`}
        action="Add"
        onAction={() =>
          nav.navigate('ProjectMemberForm', { projectId: id, external: true })
        }
      />
      {(p.external ?? []).length ? (
        <Card style={styles.list}>
          {(p.external ?? []).map((x, i) => (
            <Pressable
              key={x.id ?? `${x.name}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${x.name}`}
              onPress={() =>
                nav.navigate('ProjectMemberForm', {
                  projectId: id,
                  memberId: x.id,
                  external: true,
                })
              }
              style={({ pressed }) => [
                styles.person,
                i === (p.external ?? []).length - 1 && styles.lastRow,
                pressed && styles.pressed,
              ]}
            >
              <Avatar label={initialsOf(x.name)} size={34} bg={colors.blueTint} />
              <View style={styles.personText}>
                <AppText variant="body">{x.name}</AppText>
                <AppText variant="meta" color={colors.inkMuted}>
                  {x.role || 'External'}
                  {x.email ? ` · ${x.email}` : ''}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : (
        <EmptyState text="No external collaborators on this project." />
      )}
    </>
  );

  const kpisPane = () => (
    <>
      <SectionHead
        label={`KPIs · ${(p.kpis ?? []).length}`}
        action="Add"
        onAction={() => nav.navigate('ProjectKpiForm', { projectId: id })}
      />
      {(p.kpis ?? []).length ? (
        (p.kpis ?? []).map(k => {
          const { pct: kpiPct, bar } = kpiProgress(k);
          return (
            <Pressable
              key={k.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${k.name}`}
              onPress={() =>
                nav.navigate('ProjectKpiForm', { projectId: id, kpiId: k.id })
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.kpi}>
                <AppText variant="meta" color={colors.inkFaint}>
                  {k.name}
                </AppText>
                <View style={styles.kpiFigures}>
                  <AppText variant="heading">{k.current}</AppText>
                  <AppText variant="meta" color={colors.inkMuted}>
                    / {k.target}
                    {k.unit || ''}
                  </AppText>
                </View>
                <ProgressBar value={bar} color={barColor(kpiPct)} />
                <AppText variant="meta" color={colors.inkMuted}>
                  {kpiPct}% of target
                </AppText>
              </Card>
            </Pressable>
          );
        })
      ) : (
        <EmptyState text="No KPIs yet. Add the numbers this project is judged on." />
      )}
    </>
  );

  const risksPane = () => {
    const all = p.risks ?? [];
    const linked = all.filter(r => r.milestoneId);
    const wide = all.filter(r => !r.milestoneId);
    const shown =
      riskScope === 'milestone' ? linked : riskScope === 'project' ? wide : all;
    return (
      <>
        <SectionHead
          label={`${openRisks.length} open · ${all.length - openRisks.length} mitigated`}
          action="Add"
          onAction={() => nav.navigate('ProjectRiskForm', { projectId: id })}
        />
        <View style={styles.chips}>
          <FilterChips
            value={riskScope}
            onChange={setRiskScope}
            options={[
              { key: 'all', label: 'All', count: all.length },
              { key: 'milestone', label: 'Milestone', count: linked.length },
              { key: 'project', label: 'Project-wide', count: wide.length },
            ]}
          />
        </View>
        {shown.length ? (
          shown.map(r => {
            const mit = r.status === 'mitigated';
            const ms = (p.milestones ?? []).find(m => m.id === r.milestoneId);
            return (
              <Card key={r.id} style={styles.row}>
                <View style={styles.riskBody}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${r.title}`}
                    onPress={() =>
                      nav.navigate('ProjectRiskForm', {
                        projectId: id,
                        riskId: r.id,
                      })
                    }
                  >
                    <View style={styles.riskTop}>
                      <AppText
                        variant="body"
                        color={mit ? colors.inkMuted : colors.ink}
                        style={[styles.flex, mit && styles.struck]}
                        numberOfLines={2}
                      >
                        {r.title}
                      </AppText>
                      <Pill
                        label={priorityLabel(r.severity)}
                        tone={priorityTone[r.severity] ?? 'low'}
                      />
                    </View>
                    <AppText variant="meta" color={colors.inkMuted}>
                      {ms ? `Threatens: ${ms.name}` : 'Project-wide'}
                      {r.owner ? ` · ${r.owner}` : ''}
                    </AppText>
                    {r.mitigation ? (
                      <AppText
                        variant="meta"
                        color={colors.inkMuted}
                        style={styles.mitigation}
                      >
                        Mitigation: {r.mitigation}
                      </AppText>
                    ) : null}
                  </Pressable>
                  <Button
                    label={mit ? 'Re-open' : 'Mark mitigated'}
                    variant="plain"
                    size="sm"
                    iconLeft={mit ? TriangleAlert : Check}
                    disabled={busyKey === `rk:${r.id}`}
                    onPress={() =>
                      run(`rk:${r.id}`, () =>
                        updateRisk({
                          id,
                          riskId: r.id,
                          status: mit ? 'open' : 'mitigated',
                        }),
                      )
                    }
                    style={styles.riskButton}
                  />
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState text="No risks in this view." />
        )}
      </>
    );
  };

  const activityPane = () => {
    const feed = p.activity ?? [];
    return (
      <>
        <SectionHead label={`Activity · ${feed.length}`} />
        {feed.length ? (
          <Card style={styles.list}>
            {feed.map((a, i) => (
              <View
                key={`${a.at}-${i}`}
                style={[styles.person, i === feed.length - 1 && styles.lastRow]}
              >
                <Avatar label={initialsOf(a.user)} size={30} />
                <View style={styles.personText}>
                  <AppText variant="meta">
                    <AppText variant="metaStrong">{a.user}</AppText> {a.action}
                  </AppText>
                  <AppText variant="meta" color={colors.inkFaint}>
                    {a.at}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState text="Nothing has happened on this project yet." />
        )}

        <SectionHead label="Add a comment" />
        <Card style={styles.pad}>
          <TextArea
            value={comment}
            onChangeText={setComment}
            placeholder="An update, a note, anything worth recording"
            rows={3}
          />
          <Button
            label={posting.isLoading ? 'Posting…' : 'Post comment'}
            iconLeft={Send}
            size="sm"
            disabled={posting.isLoading || !comment.trim()}
            onPress={post}
            style={styles.postButton}
          />
        </Card>
      </>
    );
  };

  const body = {
    overview,
    timeline,
    milestones: milestonesPane,
    tasks: tasksPane,
    team: teamPane,
    kpis: kpisPane,
    risks: risksPane,
    activity: activityPane,
  }[pane];

  return (
    <FormScreen
      title={p.code || 'Project'}
      onRefresh={refetch}
      right={
        <IconButton
          icon={Trash2}
          label="Delete project"
          iconSize={20}
          color={colors.red}
          onPress={remove}
        />
      }
      footer={
        <View style={styles.footer}>
          <Button
            label="Duplicate"
            variant="plain"
            size="md"
            iconLeft={Copy}
            disabled={duplicating.isLoading}
            onPress={duplicateIt}
            style={styles.flex}
          />
          <Button
            label="Edit"
            size="md"
            iconLeft={Pencil}
            onPress={() => nav.navigate('ProjectForm', { id })}
            style={styles.flex}
          />
        </View>
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="meta" color={colors.inkFaint} numberOfLines={1}>
            {categoryLabel(p.category)}
          </AppText>
          <Pill label={statusLabel(p.status)} tone={statusTone[p.status] ?? 'low'} />
        </View>
        <AppText variant="heading" style={styles.heroName}>
          {p.name}
        </AppText>
        {p.description ? (
          <AppText variant="meta" color={colors.inkMuted}>
            {p.description}
          </AppText>
        ) : null}

        <View style={styles.heroBar}>
          <ProgressBar value={pct} color={barColor(pct)} style={styles.flex} />
          <AppText variant="metaStrong" color={colors.inkSoft}>
            {pct}%
          </AppText>
        </View>

        <View style={styles.heroInfo}>
          <InfoRow label="Owner" value={p.owner} />
          <InfoRow label="Priority" value={priorityLabel(p.priority)} />
          <InfoRow label="Timeline" value={daysLeftLabel(p.endDate)} />
          <InfoRow
            label="Milestones"
            value={`${doneMs} of ${(p.milestones ?? []).length} done`}
          />
        </View>
      </Card>

      <View style={styles.chips}>
        <FilterChips
          value={pane}
          onChange={setPane}
          options={PANES.map(x =>
            x.key === 'milestones'
              ? { ...x, count: (p.milestones ?? []).length }
              : x.key === 'tasks'
              ? { ...x, count: (p.tasks ?? []).length }
              : x.key === 'team'
              ? { ...x, count: people.length }
              : x.key === 'kpis'
              ? { ...x, count: (p.kpis ?? []).length }
              : x.key === 'risks'
              ? { ...x, count: openRisks.length, alert: true }
              : x,
          )}
        />
      </View>

      {body()}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  struck: { textDecorationLine: 'line-through' },
  lastRow: { borderBottomWidth: 0 },

  hero: { padding: s(14), gap: vs(5) },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  heroName: { marginTop: vs(2) },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginTop: vs(8),
  },
  heroInfo: { marginTop: vs(6) },

  chips: { marginTop: vs(12), marginBottom: vs(4) },

  row: { marginBottom: vs(8) },
  rowBody: { padding: s(12), gap: vs(2) },

  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  pad: { padding: s(14) },

  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  personText: { flex: 1, gap: vs(1) },

  tick: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    borderWidth: hairline * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.teal, borderColor: colors.teal },

  msCard: { padding: s(14), gap: vs(8), marginBottom: vs(8) },
  msTop: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  msText: { flex: 1, gap: vs(2) },
  msDesc: { marginTop: vs(-2) },
  msBar: { flexDirection: 'row', alignItems: 'center', gap: s(8) },

  criteria: {
    backgroundColor: colors.ground,
    borderRadius: radius.xs,
    padding: s(10),
    gap: vs(4),
  },
  criteriaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  criterion: { flexDirection: 'row', alignItems: 'center', gap: s(8), paddingVertical: vs(3) },
  box: {
    width: s(17),
    height: s(17),
    borderRadius: radius.xs,
    borderWidth: hairline * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },

  kpi: { padding: s(14), gap: vs(4), marginBottom: vs(8) },
  kpiFigures: { flexDirection: 'row', alignItems: 'baseline', gap: s(6) },

  riskBody: { padding: s(12), gap: vs(4) },
  riskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: s(8) },
  mitigation: { marginTop: vs(2) },
  riskButton: { alignSelf: 'flex-start', marginTop: vs(4) },

  postButton: { alignSelf: 'flex-end', marginTop: vs(10) },

  trackRow: {
    paddingVertical: vs(9),
    gap: vs(4),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  track: {
    height: vs(6),
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    width: s(9),
    height: s(9),
    borderRadius: s(5),
    marginLeft: s(-4),
  },

  footer: { flexDirection: 'row', gap: s(10) },
});
