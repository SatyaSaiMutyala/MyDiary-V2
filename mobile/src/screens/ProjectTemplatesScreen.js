import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { categoryLabel } from '../model/project';
import { errorMessage, useMe } from '../store';
import {
  useListProjectTemplatesQuery,
  useStartProjectFromTemplateMutation,
} from '../store/api/projectsApi';
import { realToday } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

/**
 * The project template library.
 *
 * A template is a kit: milestones with their acceptance criteria, tasks, KPIs and risks, each
 * carrying a day-offset. Picking one asks the server to build a real project from it — the dates
 * are worked out from the start date, which is today unless the project is edited afterwards.
 */
export function ProjectTemplatesScreen() {
  const nav = useNavigation();
  const me = useMe();
  const confirm = useConfirm();
  const [problem, setProblem] = useState('');
  const [busyId, setBusyId] = useState('');

  const { data, error, isLoading, refetch } = useListProjectTemplatesQuery({
    limit: 50,
    sort: 'order',
  });
  const [startFromTemplate] = useStartProjectFromTemplateMutation();

  const templates = data?.items ?? [];

  const start = async t => {
    const yes = await confirm({
      title: `Start from "${t.name}"?`,
      text: `A new project is created with ${(t.milestones ?? []).length} milestones, ${(t.tasks ?? []).length} tasks, ${(t.kpis ?? []).length} KPIs and ${(t.risks ?? []).length} risks already in it.`,
      confirmLabel: 'Create project',
    });
    if (!yes) {
      return;
    }
    setBusyId(t.id);
    setProblem('');
    try {
      const project = await startFromTemplate({
        id: t.id,
        owner: me?.name ?? '',
        startDate: realToday(),
      }).unwrap();
      nav.replace('ProjectDetail', { id: project.id });
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  return (
    <FormScreen title="Project templates" onRefresh={refetch}>
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      {error ? (
        <Notice
          tone="error"
          title={errorMessage(error)}
         
        />
      ) : isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      ) : templates.length ? (
        <>
          <Eyebrow label={`${templates.length} templates`} />
          {templates.map(t => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Start a project from ${t.name}`}
              disabled={Boolean(busyId)}
              onPress={() => start(t)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.card}>
                <View style={styles.top}>
                  <AppText variant="meta" color={colors.inkFaint}>
                    {categoryLabel(t.category)}
                  </AppText>
                  <Pill
                    label={`${t.suggestedDurationDays ?? 0} days`}
                    tone="low"
                  />
                </View>

                <View style={styles.titleRow}>
                  <AppText variant="label" style={styles.flex} numberOfLines={2}>
                    {busyId === t.id ? 'Creating…' : t.name}
                  </AppText>
                  <ChevronRight size={s(18)} color={colors.inkFaint} />
                </View>

                {t.description ? (
                  <AppText variant="meta" color={colors.inkMuted} numberOfLines={3}>
                    {t.description}
                  </AppText>
                ) : null}

                <View style={styles.counts}>
                  <AppText variant="meta" color={colors.inkMuted}>
                    {(t.milestones ?? []).length} milestones ·{' '}
                    {(t.tasks ?? []).length} tasks · {(t.kpis ?? []).length} KPIs
                    · {(t.risks ?? []).length} risks
                  </AppText>
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <EmptyState text="No templates in the library." />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  card: { padding: s(14), gap: vs(5), marginBottom: vs(8) },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  counts: {
    marginTop: vs(6),
    paddingTop: vs(8),
    borderTopWidth: hairline,
    borderTopColor: colors.lineSoft,
  },
});
