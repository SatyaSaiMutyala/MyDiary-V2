import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Inbox, Plus } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import { FilterBar, FilterButton } from '../components/FilterBar';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { MeetingRow } from '../components/MeetingRow';
import { SearchField } from '../components/SearchField';
import { Stat } from '../components/Stat';
import { ShimmerRows } from '../components/Shimmer';
import { Notice } from '../components/Notice';
import { meetingStatuses, meetingTypes } from '../model/meeting';
import { errorMessage } from '../store';
import {
  useLazyListMeetingsQuery,
  useListMeetingsQuery,
} from '../store/api/meetingsApi';
import { realToday } from '../utils/dates';
import { useDebounced } from '../utils/useDebounced';
import { LoadMore } from '../components/LoadMore';
import { usePagedQuery } from '../utils/usePagedQuery';
import { colors, hairline, s, vs } from '../theme';

const blank = { type: 'all', status: 'all', from: '', to: '' };

const typeOptions = [
  { id: 'all', label: 'Any kind' },
  ...meetingTypes.map(t => ({ id: t.id, label: t.label })),
];
const statusOptions = [
  { id: 'all', label: 'Any status' },
  ...meetingStatuses.map(t => ({ id: t.id, label: t.label })),
];

/**
 * My Meetings — the list, with the same tools the website has: a search box, a filter drawer and
 * the upcoming / past / all chips. Reading from sample data until the meetings API is wired.
 */
export function MeetingsScreen() {
  const nav = useNavigation();
  const [view, setView] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [f, setF] = useState(blank);

  const set = patch => setF(v => ({ ...v, ...patch }));
  const active =
    (f.type !== 'all' ? 1 : 0) +
    (f.status !== 'all' ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0);

  // Every filter travels to the server as its own query parameter, the way the website sends them.
  const term = useDebounced(search.trim());
  const params = useMemo(
    () => ({
      sort: view === 'past' ? '-date' : 'date',
      mine: true,
      ...(term ? { search: term } : null),
      ...(f.type !== 'all' ? { type: f.type } : null),
      ...(f.status !== 'all' ? { status: f.status } : null),
      ...(f.from ? { date_from: f.from } : null),
      ...(f.to ? { date_to: f.to } : null),
      ...(view === 'upcoming' ? { date_from: f.from || realToday() } : null),
      ...(view === 'past' ? { date_to: f.to || realToday() } : null),
    }),
    [view, term, f],
  );

  // A page at a time, rather than fifty meetings on every load.
  const paged = usePagedQuery(
    useListMeetingsQuery,
    useLazyListMeetingsQuery,
    params,
  );
  const { error, isLoading, refetch } = paged;
  const rows = paged.items;

  // The counts come from their own small queries, so they do not change as the list is filtered.
  const upcoming = useListMeetingsQuery({
    limit: 1,
    mine: true,
    status: 'upcoming',
    fields: 'title',
  });
  const completed = useListMeetingsQuery({
    limit: 1,
    mine: true,
    status: 'completed',
    fields: 'title',
  });
  const counts = {
    upcoming: upcoming.data?.total,
    completed: completed.data?.total,
    openActions: rows.reduce(
      (n, m) => n + (m.actions ?? []).filter(a => !a.done).length,
      0,
    ),
  };

  const filtering = active > 0 || Boolean(term);

  return (
    <FormScreen
      title="My meetings"
      onRefresh={refetch}
      right={
        <IconButton
          icon={Inbox}
          label="Meeting requests"
          iconSize={20}
          onPress={() => nav.navigate('MeetingRequests')}
        />
      }
      footer={
        <Button
          label="Plan a meeting"
          iconLeft={Plus}
          onPress={() => nav.navigate('MeetingForm', {})}
        />
      }
    >
      <Card style={styles.summary}>
        <Stat
          value={counts.upcoming ?? '–'}
          label="Upcoming"
          style={styles.stat}
        />
        <View style={styles.rule} />
        <Stat
          value={counts.completed ?? '–'}
          label="Completed"
          style={styles.stat}
        />
        <View style={styles.rule} />
        <Stat
          value={counts.openActions}
          label="Open actions"
          tone={counts.openActions ? colors.amberInk : colors.ink}
          style={styles.stat}
        />
      </Card>

      <View style={styles.tools}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search meetings"
          style={styles.search}
        />
        <FilterButton
          active={active}
          open={filtersOpen}
          onPress={() => setFiltersOpen(true)}
        />
      </View>

      <FilterBar
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        active={active}
        onClear={() => setF(blank)}
        doneLabel="Show meetings"
      >
        <Dropdown
          label="Kind"
          options={typeOptions}
          value={f.type}
          onChange={type => set({ type })}
        />
        <Dropdown
          label="Status"
          options={statusOptions}
          value={f.status}
          onChange={status => set({ status })}
        />
        <DateField
          clearable
          label="From"
          placeholder="Any date"
          value={f.from}
          onChange={from => set({ from })}
        />
        <DateField
          clearable
          label="Until"
          placeholder="Any date"
          value={f.to}
          onChange={to => set({ to })}
        />
      </FilterBar>

      <View style={styles.chips}>
        <FilterChips
          value={view}
          onChange={setView}
          options={[
            { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { key: 'past', label: 'Past' },
            { key: 'all', label: 'All' },
          ]}
        />
      </View>

      <View style={styles.list}>
        {error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : isLoading ? (
          <Card>
            <ShimmerRows rows={4} icon={false} />
          </Card>
        ) : rows.length ? (
          <>
            {rows.map(m => (
              <MeetingRow
                key={m.id}
                meeting={m}
                onPress={() => nav.navigate('MeetingDetail', { id: m.id })}
              />
            ))}
            <LoadMore paged={paged} />
          </>
        ) : (
          <EmptyState
            text={
              filtering
                ? 'No meetings match.'
                : view === 'upcoming'
                ? 'Nothing planned. Tap "Plan a meeting" to start.'
                : 'No meetings here yet.'
            }
          />
        )}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', marginTop: vs(6) },
  stat: { paddingHorizontal: s(14), paddingVertical: vs(9) },
  rule: { width: hairline, backgroundColor: colors.line },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginTop: vs(10),
  },
  search: { flex: 1 },
  chips: { marginTop: vs(10) },
  list: { marginTop: vs(12) },
  note: { textAlign: 'center', marginTop: vs(4) },
});
