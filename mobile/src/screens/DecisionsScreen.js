import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { SearchField } from '../components/SearchField';
import { ShimmerRows } from '../components/Shimmer';
import { meetingTypes } from '../model/meeting';
import { errorMessage } from '../store';
import {
  useLazyListDecisionsQuery,
  useListDecisionsQuery,
} from '../store/api/decisionsApi';
import { LoadMore } from '../components/LoadMore';
import { usePagedQuery } from '../utils/usePagedQuery';
import { useListMeetingsQuery } from '../store/api/meetingsApi';
import { longDate } from '../utils/dates';
import { useDebounced } from '../utils/useDebounced';
import { colors, s, vs } from '../theme';

/** The tags the website offers. A decision can carry more than one. */
const TAGS = [
  { id: '', label: 'All tags' },
  { id: 'approved', label: 'Approved' },
  { id: 'policy', label: 'Policy' },
  { id: 'financial', label: 'Financial' },
  { id: 'operational', label: 'Operational' },
  { id: 'governance', label: 'Governance' },
];

const TYPES = [
  { id: '', label: 'All meeting types' },
  ...meetingTypes.map(t => ({ id: t.id, label: t.label })),
];

const TAG_TONE = {
  governance: 'yellow',
  financial: 'info',
  approved: 'good',
  policy: 'teal',
  operational: 'low',
};

/**
 * The decisions registry — every decision made in every meeting, and the meeting it came from.
 *
 * Read-only, as it is on the website: a decision is made in a meeting and recorded there, so it is
 * changed there too. Tapping one opens the meeting that produced it.
 *
 * The meeting-type filter works the way the website works it: decisions are filtered by meeting,
 * not by meeting type, so a chosen type is resolved to that type's meeting ids first and sent as
 * `meetingId=a,b,c`.
 */
export function DecisionsScreen() {
  const nav = useNavigation();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [tag, setTag] = useState('');

  const term = useDebounced(search.trim());

  const typedMeetings = useListMeetingsQuery(
    { type, limit: 200, fields: 'title' },
    { skip: !type },
  );
  const typeIds = type
    ? (typedMeetings.data?.items ?? []).map(m => m.id)
    : null;
  const waitingForTypes = Boolean(type) && !typedMeetings.data;

  const listQ = usePagedQuery(
    useListDecisionsQuery,
    useLazyListDecisionsQuery,
    {
      sort: '-createdAt',
      ...(term ? { search: term } : null),
      ...(tag ? { tag } : null),
      ...(typeIds ? { meetingId: typeIds.join(',') } : null),
    },
    // No meeting of that type means no decision can match — asking would be a wasted request.
    { skip: waitingForTypes || (Boolean(typeIds) && typeIds.length === 0) },
  );

  const rows = listQ.items;
  const total = listQ.total;
  const loading = listQ.isLoading || waitingForTypes;
  const error = listQ.error || typedMeetings.error;
  const noMeetingsOfType = Boolean(typeIds) && typeIds.length === 0;

  const refresh = async () => {
    await Promise.all(
      [listQ.refetch?.(), type && typedMeetings.refetch?.()].filter(Boolean),
    );
  };

  return (
    <FormScreen title="Decisions registry" onRefresh={refresh}>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search decisions, people, departments"
        style={styles.search}
      />

      <Dropdown
        label="Meeting type"
        options={TYPES}
        value={type}
        onChange={setType}
        placeholder="All meeting types"
        style={styles.filter}
      />
      <Dropdown
        label="Tag"
        options={TAGS}
        value={tag}
        onChange={setTag}
        placeholder="All tags"
        style={styles.filter}
      />

      {error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : loading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      ) : noMeetingsOfType || rows.length === 0 ? (
        <EmptyState text="No decision matches. Try a broader search, or clear the filters." />
      ) : (
        <>
          <Eyebrow
            label={`${total} ${total === 1 ? 'decision' : 'decisions'}`}
            style={styles.head}
          />
          {rows.map(d => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`${d.text}. Opens ${
                d.meetingTitle || 'the meeting'
              }.`}
              onPress={() =>
                d.meetingId
                  ? nav.navigate('MeetingDetail', { id: d.meetingId })
                  : undefined
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.card}>
                <View style={styles.body}>
                  <AppText variant="body">{d.text}</AppText>

                  {d.tags?.length ? (
                    <View style={styles.tags}>
                      {d.tags.map(t => (
                        <Pill key={t} label={t} tone={TAG_TONE[t] ?? 'low'} />
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.meta}>
                    <AppText variant="meta" color={colors.inkMuted}>
                      {[d.decidedBy, d.department].filter(Boolean).join(' · ')}
                    </AppText>
                    <AppText variant="meta" color={colors.inkFaint}>
                      {longDate(String(d.createdAt).slice(0, 10))}
                    </AppText>
                  </View>

                  <View style={styles.from}>
                    <AppText
                      variant="metaStrong"
                      color={colors.teal}
                      numberOfLines={1}
                      style={styles.flex}
                    >
                      {d.meetingTitle || 'Unknown meeting'}
                    </AppText>
                    <ChevronRight size={s(15)} color={colors.inkFaint} />
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
          <LoadMore paged={listQ} />
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: vs(10) },
  filter: { marginBottom: vs(10) },
  head: { marginTop: vs(8) },
  loading: { padding: s(14) },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  card: { marginBottom: vs(8) },
  body: { padding: s(14), gap: vs(6) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
    flexWrap: 'wrap',
  },
  from: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
});
