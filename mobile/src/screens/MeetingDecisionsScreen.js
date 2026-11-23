import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Check, Plus, Scale } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconTile } from '../components/IconTile';
import { Notice } from '../components/Notice';
import { ShimmerRows } from '../components/Shimmer';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { errorMessage, useMe } from '../store';
import {
  useCreateDecisionMutation,
  useGetMeetingQuery,
} from '../store/api/meetingsApi';
import { useListDecisionsQuery } from '../store/api/decisionsApi';
import { colors, hairline, s, vs } from '../theme';

/**
 * Decisions made in this meeting, and logging a new one.
 *
 * A decision can be pinned to an agenda item, which is how the website files it — that is what
 * makes the register searchable later by what was being discussed at the time.
 */
export function MeetingDecisionsScreen() {
  const route = useRoute();
  const id = route.params?.id;
  const me = useMe();

  const { data: m } = useGetMeetingQuery(id);
  const { data, error, isLoading, refetch } = useListDecisionsQuery({
    meetingId: id,
    limit: 100,
    sort: '-createdAt',
  });
  const [createDecision, creating] = useCreateDecisionMutation();

  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [agendaIdx, setAgendaIdx] = useState('none');
  const [department, setDepartment] = useState(me?.department ?? '');
  const [problem, setProblem] = useState('');

  const rows = data?.items ?? [];

  const agendaOptions = [
    { id: 'none', label: 'Not tied to an agenda item' },
    ...(m?.agenda ?? []).map((a, i) => ({
      id: String(i),
      label: `${String(i + 1).padStart(2, '0')} · ${a}`,
    })),
  ];

  const log = async () => {
    if (!text.trim()) {
      setProblem('Write down what was decided.');
      return;
    }
    setProblem('');
    try {
      await createDecision({
        id,
        text: text.trim(),
        ...(agendaIdx !== 'none' ? { agendaIdx: Number(agendaIdx) } : null),
        ...(department.trim() ? { department: department.trim() } : null),
      }).unwrap();
      setText('');
      setAgendaIdx('none');
      setAdding(false);
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="Decisions"
      onRefresh={refetch}
      footer={
        <Button
          label={adding ? 'Close' : 'Log a decision'}
          iconLeft={adding ? undefined : Plus}
          variant={adding ? 'outline' : 'primary'}
          onPress={() => setAdding(v => !v)}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <View style={styles.head}>
        <AppText variant="heading">{m?.title ?? 'Decisions'}</AppText>
        <AppText variant="meta" color={colors.inkMuted}>
          {rows.length} on record from this meeting
        </AppText>
      </View>

      {adding ? (
        <FormCard title="New decision" style={styles.card}>
          <TextArea
            label="What was decided"
            value={text}
            onChangeText={setText}
            placeholder="e.g. Close the nine document gaps before 30 November."
            rows={3}
          />
          <Dropdown
            label="Against which agenda item"
            options={agendaOptions}
            value={agendaIdx}
            onChange={setAgendaIdx}
          />
          <TextField
            label="Department"
            value={department}
            onChangeText={setDepartment}
            placeholder="Who owns it"
          />
          <Button
            label={creating.isLoading ? 'Logging…' : 'Log decision'}
            iconLeft={Check}
            disabled={creating.isLoading}
            onPress={log}
            style={styles.addButton}
          />
        </FormCard>
      ) : null}

      <FormCard title={`On record · ${rows.length}`} style={styles.card}>
        {isLoading ? (
          <ShimmerRows rows={2} icon={false} />
        ) : error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : rows.length ? (
          rows.map(d => (
            <View key={d.id} style={styles.row}>
              <IconTile bg={colors.tealTint} size={32}>
                <Scale size={s(15)} color={colors.teal} strokeWidth={2} />
              </IconTile>
              <View style={styles.rowText}>
                <AppText variant="body">{d.text}</AppText>
                <AppText variant="meta" color={colors.inkMuted}>
                  {[d.decidedBy, d.department].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.none}
          >
            Nothing has been decided here yet.
          </AppText>
        )}
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: vs(14) },
  card: { marginBottom: vs(2) },
  addButton: { marginBottom: vs(12) },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  rowText: { flex: 1 },
  none: { marginBottom: vs(10) },
});
