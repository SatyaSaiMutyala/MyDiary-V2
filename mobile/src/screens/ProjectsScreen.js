import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LayoutGrid, Plus, TriangleAlert } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { IconTile } from '../components/IconTile';
import { Notice } from '../components/Notice';
import { Dropdown } from '../components/Dropdown';
import { Pill } from '../components/Pill';
import { ProgressBar } from '../components/ProgressBar';
import { SearchField } from '../components/SearchField';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import {
  barColor,
  categories,
  categoryLabel,
  isMine,
  overdueMilestones,
  projectProgress,
  statusLabel,
  statusTone,
} from '../model/project';
import { errorMessage, useMe } from '../store';
import { useListProjectsQuery } from '../store/api/projectsApi';
import { useDebounced } from '../utils/useDebounced';
import { colors, hairline, radius, s, vs } from '../theme';

/** The portfolio is read in one go, the way the website reads it — the counts come off the whole list. */
const PORTFOLIO_LIMIT = 200;

/** What each pill asks the server for. */
const FILTER_PARAMS = {
  all: {},
  mine: { mine: 'true' },
  active: { status: 'active,at-risk' },
  overdue: { overdue: 'true' },
  completed: { status: 'completed' },
};

/** One project in the portfolio. */
function ProjectCard({ p, onPress }) {
  const pct = projectProgress(p);
  const late = overdueMilestones(p).length;
  const done = (p.milestones ?? []).filter(m => m.status === 'done').length;
  const total = (p.milestones ?? []).length;
  const people = (p.team ?? []).length + (p.external ?? []).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${statusLabel(p.status)}, ${pct}% done`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <AppText variant="meta" color={colors.inkFaint} numberOfLines={1}>
              {p.code ? `${p.code} · ` : ''}
              {categoryLabel(p.category)}
            </AppText>
            <Pill label={statusLabel(p.status)} tone={statusTone[p.status] ?? 'low'} />
          </View>

          <AppText variant="label" numberOfLines={2} style={styles.cardName}>
            {p.name}
          </AppText>

          {p.description ? (
            <AppText variant="meta" color={colors.inkMuted} numberOfLines={2}>
              {p.description}
            </AppText>
          ) : null}

          <View style={styles.barRow}>
            <ProgressBar value={pct} color={barColor(pct)} style={styles.bar} />
            <AppText variant="metaStrong" color={colors.inkSoft}>
              {pct}%
            </AppText>
          </View>

          <View style={styles.cardFoot}>
            <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
              {p.owner || 'Unassigned'} · {done}/{total} milestones · {people}{' '}
              {people === 1 ? 'person' : 'people'}
            </AppText>
            {late ? (
              <View style={styles.late}>
                <TriangleAlert size={s(12)} color={colors.red} strokeWidth={2.4} />
                <AppText variant="meta" color={colors.redInk}>
                  {late} overdue
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * My Projects — the portfolio.
 *
 * Two reads, exactly as the website does it: the whole portfolio for the numbers at the top and the
 * counts on the pills, and a second, filtered read for the list itself. The filtering is the
 * server's job, so the phone and the desk can never disagree about what "overdue" means.
 */
export function ProjectsScreen() {
  const nav = useNavigation();
  const me = useMe();
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const term = useDebounced(search.trim());

  const allQ = useListProjectsQuery({
    limit: PORTFOLIO_LIMIT,
    sort: '-createdAt',
  });
  const listQ = useListProjectsQuery({
    limit: PORTFOLIO_LIMIT,
    sort: '-createdAt',
    ...(term ? { search: term } : null),
    ...(category ? { category } : null),
    ...FILTER_PARAMS[filter],
  });

  const all = useMemo(() => allQ.data?.items ?? [], [allQ.data]);
  const rows = listQ.data?.items ?? [];

  const counts = useMemo(() => {
    const active = all.filter(
      p => p.status === 'active' || p.status === 'at-risk',
    ).length;
    const milestones = all.flatMap(p => p.milestones ?? []);
    return {
      all: all.length,
      mine: all.filter(p => isMine(p, me?.name)).length,
      active,
      atRisk: all.filter(p => p.status === 'at-risk').length,
      overdue: all.filter(p => overdueMilestones(p).length > 0).length,
      completed: all.filter(p => p.status === 'completed').length,
      lateMilestones: all.flatMap(p => overdueMilestones(p)).length,
      milestones: milestones.length,
      milestonesDone: milestones.filter(m => m.status === 'done').length,
    };
  }, [all, me?.name]);

  const loading = listQ.isLoading || allQ.isLoading;
  const error = listQ.error || allQ.error;

  const refresh = async () => {
    await Promise.all([allQ.refetch(), listQ.refetch()]);
  };

  return (
    <FormScreen
      title="My projects"
      onRefresh={refresh}
      footer={
        <Button
          label="New project"
          iconLeft={Plus}
          onPress={() => nav.navigate('ProjectForm', {})}
        />
      }
    >
        <Card style={styles.glance}>
          <View style={styles.stat}>
            <Stat value={counts.all} label="Projects" size="sm" />
          </View>
          <View style={styles.rule} />
          <View style={styles.stat}>
            <Stat
              value={counts.active}
              label="Active"
              size="sm"
              sub={counts.atRisk ? `${counts.atRisk} at risk` : undefined}
            />
          </View>
          <View style={styles.rule} />
          <View style={styles.stat}>
            <Stat
              value={counts.lateMilestones}
              label="Late"
              size="sm"
              tone={counts.lateMilestones ? colors.red : colors.ink}
            />
          </View>
          <View style={styles.rule} />
          <View style={styles.stat}>
            <Stat
              value={counts.milestones}
              label="Milestones"
              size="sm"
              sub={`${counts.milestonesDone} done`}
            />
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Project templates"
          onPress={() => nav.navigate('ProjectTemplates')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card style={styles.templates}>
            <IconTile bg={colors.tealTint} size={34}>
              <LayoutGrid size={s(17)} color={colors.teal} strokeWidth={2} />
            </IconTile>
            <View style={styles.templatesText}>
              <AppText variant="label">Start from a template</AppText>
              <AppText variant="meta" color={colors.inkMuted}>
                Milestones, tasks, KPIs and risks already filled in
              </AppText>
            </View>
          </Card>
        </Pressable>

        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search projects, owners, teams"
          style={styles.search}
        />

        <View style={styles.chips}>
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'mine', label: 'Mine', count: counts.mine },
              { key: 'active', label: 'Active', count: counts.active },
              {
                key: 'overdue',
                label: 'Overdue',
                count: counts.overdue,
                alert: true,
              },
              { key: 'completed', label: 'Completed', count: counts.completed },
            ]}
          />
        </View>

        <Dropdown
          label="Category"
          value={category}
          onChange={setCategory}
          placeholder="All categories"
          options={[
            { id: '', label: 'All categories' },
            ...categories.map(c => ({
              id: c.id,
              label: `${c.label} (${all.filter(p => p.category === c.id).length})`,
            })),
          ]}
          style={styles.picker}
        />

        {error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : loading ? (
          <Card style={styles.loading}>
            <ShimmerRows rows={4} icon={false} />
          </Card>
        ) : rows.length ? (
          <>
            <Eyebrow
              label={`${rows.length} ${rows.length === 1 ? 'project' : 'projects'}`}
            />
            {rows.map(p => (
              <ProjectCard
                key={p.id}
                p={p}
                onPress={() => nav.navigate('ProjectDetail', { id: p.id })}
              />
            ))}
          </>
        ) : (
          <EmptyState text="No project matches. Clear the filters, or start a new one below." />
        )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  glance: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    marginBottom: vs(10),
  },
  rule: { width: hairline, backgroundColor: colors.line },
  stat: { flex: 1, paddingHorizontal: s(8), paddingVertical: vs(9) },
  templates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: s(12),
    marginBottom: vs(10),
  },
  templatesText: { flex: 1 },
  search: { marginBottom: vs(10) },
  chips: { marginBottom: vs(8) },
  picker: { marginBottom: vs(10) },
  loading: { padding: s(14) },
  card: { marginBottom: vs(10) },
  cardBody: { padding: s(14), gap: vs(5) },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  cardName: { marginTop: vs(1) },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginTop: vs(4),
  },
  bar: { flex: 1 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
    marginTop: vs(2),
  },
  late: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
});
