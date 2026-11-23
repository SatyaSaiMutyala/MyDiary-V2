import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { SearchField } from '../components/SearchField';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { VisitCard } from '../components/VisitCard';
import { visitTypes } from '../model/visit';
import { errorMessage } from '../store';
import { useListVisitsQuery } from '../store/api/visitsApi';
import { useDebounced } from '../utils/useDebounced';
import { colors, hairline, radius, s, vs } from '../theme';

/** One page of reports is plenty for the type chips and the four numbers, which count the whole list. */
const LIMIT = 200;

/**
 * My Visit Observations — every site visit this person has logged.
 *
 * The server scopes the list to them (`mine=true`), so the phone never asks whose. A draft opens
 * straight into the editor, because a draft is something half-written; a submitted report opens
 * read-only, as it does on the website.
 */
export function VisitsScreen() {
  const nav = useNavigation();
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');

  const term = useDebounced(search.trim());

  const { data, error, isLoading, refetch } = useListVisitsQuery({
    mine: 'true',
    limit: LIMIT,
    sort: '-date',
    ...(term ? { search: term } : null),
  });

  const visits = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(() => {
    const byType = {};
    visitTypes.forEach(t => {
      byType[t.id] = visits.filter(v => v.type === t.id).length;
    });
    const submitted = visits.filter(v => v.status === 'submitted');
    return {
      all: visits.length,
      submitted: submitted.length,
      drafts: visits.filter(v => v.status === 'draft').length,
      followUps: submitted.filter(v => v.followUpRequired).length,
      byType,
    };
  }, [visits]);

  const rows = useMemo(
    () =>
      (type === 'all' ? visits : visits.filter(v => v.type === type))
        .slice()
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [visits, type],
  );

  // Only the types actually used earn a chip, as on the website.
  const chips = useMemo(
    () => [
      { key: 'all', label: 'All', count: counts.all },
      ...visitTypes
        .filter(t => counts.byType[t.id] > 0)
        .map(t => ({ key: t.id, label: t.label, count: counts.byType[t.id] })),
    ],
    [counts],
  );

  const open = v =>
    v.status === 'draft'
      ? nav.navigate('VisitForm', { id: v.id })
      : nav.navigate('VisitDetail', { id: v.id });

  return (
    <FormScreen
      title="My visits"
      onRefresh={refetch}
      footer={
        <Button
          label="New visit"
          iconLeft={Plus}
          onPress={() => nav.navigate('VisitForm', {})}
        />
      }
    >
      <Card style={styles.glance}>
        <View style={styles.stat}>
          <Stat value={counts.all} label="Visits" size="sm" />
        </View>
        <View style={styles.rule} />
        <View style={styles.stat}>
          <Stat value={counts.submitted} label="Submitted" size="sm" />
        </View>
        <View style={styles.rule} />
        <View style={styles.stat}>
          <Stat
            value={counts.drafts}
            label="Drafts"
            size="sm"
            tone={counts.drafts ? colors.amberInk : colors.ink}
          />
        </View>
        <View style={styles.rule} />
        <View style={styles.stat}>
          <Stat
            value={counts.followUps}
            label="Follow-ups"
            size="sm"
            tone={counts.followUps ? colors.red : colors.ink}
          />
        </View>
      </Card>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search visits, sites, hosts, findings"
        style={styles.search}
      />

      {chips.length > 1 ? (
        <View style={styles.chips}>
          <FilterChips value={type} onChange={setType} options={chips} />
        </View>
      ) : null}

      {error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      ) : rows.length ? (
        <>
          <Eyebrow
            label={`${rows.length} ${rows.length === 1 ? 'report' : 'reports'}`}
            style={styles.head}
          />
          {rows.map(v => (
            <VisitCard key={v.id} visit={v} onPress={() => open(v)} />
          ))}
        </>
      ) : (
        <EmptyState text="No visit logged yet. Tap New visit to write up your first site observation." />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  glance: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    marginBottom: vs(10),
  },
  rule: { width: hairline, backgroundColor: colors.line },
  stat: { flex: 1, paddingHorizontal: s(8), paddingVertical: vs(9) },
  search: { marginBottom: vs(10) },
  chips: { marginBottom: vs(8) },
  head: { marginTop: vs(8) },
  loading: { padding: s(14) },
});
