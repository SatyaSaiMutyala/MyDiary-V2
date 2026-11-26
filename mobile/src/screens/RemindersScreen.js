import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { ReminderRow } from '../components/ReminderRow';
import { SearchField } from '../components/SearchField';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { errorMessage } from '../store';
import {
  useLazyListRemindersQuery,
  useListRemindersQuery,
} from '../store/api/remindersApi';
import { LoadMore } from '../components/LoadMore';
import { usePagedQuery } from '../utils/usePagedQuery';
import { useDebounced } from '../utils/useDebounced';
import { colors, hairline, s, vs } from '../theme';

/**
 * Reminders — what will go off, and what already has.
 *
 * The server decides what this person may see (what they set, and what was set for them) and sends
 * the three counts with the page, so the summary, the chips and the list all come from one answer.
 */
export function RemindersScreen() {
  const nav = useNavigation();
  const [box, setBox] = useState('upcoming');
  const [search, setSearch] = useState('');

  const term = useDebounced(search.trim());
  const params = useMemo(
    () => ({ box, ...(term ? { search: term } : null) }),
    [box, term],
  );
  // A page at a time, rather than a hundred reminders on every load.
  const paged = usePagedQuery(
    useListRemindersQuery,
    useLazyListRemindersQuery,
    params,
  );
  const { error, isLoading, refetch } = paged;

  const rows = paged.items;
  // The box counts come from the same answer the first page arrived in.
  const counts = paged.data?.counts;

  return (
    <FormScreen
      title="Reminders"
      onRefresh={refetch}
      footer={
        <Button
          label="Set a reminder"
          iconLeft={Plus}
          onPress={() => nav.navigate('ReminderForm', {})}
        />
      }
    >
      <Card style={styles.summary}>
        <View style={styles.stat}>
          <Stat value={counts?.upcoming ?? '–'} label="Upcoming" size="sm" />
        </View>
        <View style={styles.rule} />
        <View style={styles.stat}>
          <Stat
            value={counts?.forMe ?? '–'}
            label="For me"
            size="sm"
            tone={counts?.forMe ? colors.tealDeep : colors.ink}
          />
        </View>
        <View style={styles.rule} />
        <View style={styles.stat}>
          <Stat value={counts?.sent ?? '–'} label="Sent" size="sm" />
        </View>
      </Card>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search reminders and people"
        style={styles.search}
      />

      <View style={styles.chips}>
        <FilterChips
          value={box}
          onChange={setBox}
          options={[
            { key: 'upcoming', label: 'Upcoming', count: counts?.upcoming },
            { key: 'sent', label: 'Sent', count: counts?.sent },
            { key: 'all', label: 'All' },
          ]}
        />
      </View>

      {error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      ) : rows.length ? (
        <>
          {rows.map(r => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onPress={() => nav.navigate('ReminderDetail', { id: r.id })}
            />
          ))}
          <LoadMore paged={paged} />
        </>
      ) : (
        <EmptyState
          text={
            term
              ? 'No reminder matches.'
              : box === 'sent'
              ? 'Nothing has been sent yet.'
              : 'No reminders coming up. Set one for yourself or a colleague.'
          }
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row' },
  stat: { flex: 1, paddingHorizontal: s(10), paddingVertical: vs(9) },
  rule: { width: hairline, backgroundColor: colors.line },
  search: { marginTop: vs(10), marginBottom: vs(2) },
  chips: { marginBottom: vs(8) },
  loading: { padding: s(14) },
});
