import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CardList } from '../components/CardList';
import { ChoiceGroup } from '../components/ChoiceGroup';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormScreen } from '../components/FormScreen';
import { LabRecordRow } from '../components/LabRecordRow';
import { Notice } from '../components/Notice';
import { ShimmerRows } from '../components/Shimmer';
import { errorMessage, useAppSelector } from '../store';
import {
  useLabDayQuery,
  useLabHistoryQuery,
} from '../store/api/labReadinessApi';
import { useFresh } from '../store/useFresh';
import { todayIso } from '../store/slices/labSlice';
import { colors, s, vs } from '../theme';

const PAGE = 25;

// What this screen shows; fetched again when it comes back into view.
const FRESH = ['LabHistory'];

/** Past records, newest first — the trail an assessor asks for. */
export function LabHistoryScreen() {
  const fresh = useFresh(FRESH);
  const nav = useNavigation();
  const date = useAppSelector(st => st.lab.date);
  const day = useLabDayQuery({ date: date || todayIso() });
  const units = day.data?.units ?? [];

  const [unit, setUnit] = useState('all');
  const [on, setOn] = useState('');
  const [phase, setPhase] = useState('both');
  const [limit, setLimit] = useState(PAGE);

  const query = useLabHistoryQuery({
    ...(unit === 'all' ? {} : { unitKey: unit }),
    ...(phase === 'both' ? {} : { phase }),
    ...(on ? { from: on, to: on } : {}),
    limit,
  });

  const rows = query.currentData ?? [];
  const failed = !query.currentData && !!query.error;
  const firstLoad = !query.currentData && !failed;
  // The API answers with at most `limit` records, so a full page may mean there are more.
  const more = rows.length >= limit;

  const unitOptions = [
    { id: 'all', label: 'All units' },
    ...units.map(u => ({ id: u.key, label: u.name })),
  ];

  const reset = () => setLimit(PAGE);

  return (
    <FormScreen title="Past records" onRefresh={fresh}>
      <View style={styles.filters}>
        <Dropdown
          style={styles.filter}
          options={unitOptions}
          value={unit}
          onChange={k => {
            setUnit(k);
            reset();
          }}
        />
        <DateField
          clearable
          placeholder="All dates"
          value={on}
          onChange={d => {
            setOn(d);
            reset();
          }}
          style={styles.filter}
        />
      </View>
      <ChoiceGroup
        value={phase}
        onChange={k => {
          if (k) {
            setPhase(k);
            reset();
          }
        }}
        options={[
          { key: 'both', label: 'Both' },
          { key: 'opening', label: 'Opening' },
          { key: 'closing', label: 'Closing' },
        ]}
      />

      {failed ? (
        <Notice
          tone="error"
          title={errorMessage(query.error)}
          style={styles.notice}
        />
      ) : null}

      <Eyebrow
        label={
          firstLoad || failed
            ? 'Records'
            : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`
        }
      />
      {firstLoad ? (
        <Card>
          <ShimmerRows rows={6} />
        </Card>
      ) : rows.length ? (
        <CardList inset={50}>
          {rows.map(r => (
            <LabRecordRow
              key={r.id}
              record={r}
              onPress={() => nav.navigate('LabRecord', { id: r.id })}
            />
          ))}
        </CardList>
      ) : failed ? null : (
        <EmptyState text="No records match these filters." />
      )}

      {more ? (
        <Button
          label={query.isFetching ? 'Loading…' : 'Show older records'}
          variant="outline"
          disabled={query.isFetching}
          onPress={() => setLimit(l => l + PAGE)}
          style={styles.more}
        />
      ) : rows.length > PAGE ? (
        <AppText variant="meta" color={colors.inkFaint} style={styles.end}>
          That is all {rows.length} records.
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: s(10),
    marginTop: vs(6),
    marginBottom: vs(10),
  },
  filter: { flex: 1 },
  notice: { marginTop: vs(12) },
  more: { marginTop: vs(16) },
  end: { textAlign: 'center', marginTop: vs(16) },
});
