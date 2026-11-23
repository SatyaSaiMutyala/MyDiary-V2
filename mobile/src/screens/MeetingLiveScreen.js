import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Plus, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { TextField } from '../components/TextField';
import { errorMessage } from '../store';
import {
  useAddParkingMutation,
  useCyclePresenceMutation,
  useGetMeetingQuery,
  useRemoveParkingMutation,
} from '../store/api/meetingsApi';
import { colors, hairline, radius, s, vs } from '../theme';

/** The pill for each presence state, in the words the API uses. */
const PRESENCE = {
  tbd: { label: 'To be confirmed', tone: 'low' },
  present: { label: 'Present', tone: 'good' },
  late: { label: 'Late', tone: 'watch' },
  absent: { label: 'Absent', tone: 'critical' },
};

/**
 * The meeting while it runs: who turned up, and what got parked.
 *
 * Tapping a person cycles them through to-be-confirmed → present → late → absent, which is one
 * call to the server (`POST /presence/cycle`) rather than a picker to open and close. In a room,
 * with a phone in one hand, a tap is the whole interaction.
 */
export function MeetingLiveScreen() {
  const route = useRoute();
  const id = route.params?.id;

  const { data: m, error, isLoading, refetch } = useGetMeetingQuery(id);
  const [cycle, cycling] = useCyclePresenceMutation();
  const [addParking, adding] = useAddParkingMutation();
  const [removeParking] = useRemoveParkingMutation();

  const [parked, setParked] = useState('');
  const [problem, setProblem] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="In the room">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !m) {
    return (
      <FormScreen title="In the room">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That meeting could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const tap = async name => {
    setProblem('');
    try {
      await cycle({ id, name }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const park = async () => {
    const text = parked.trim();
    if (!text) {
      return;
    }
    setProblem('');
    try {
      await addParking({ id, text }).unwrap();
      setParked('');
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const unpark = async index => {
    setProblem('');
    try {
      await removeParking({ id, index }).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const people = m.attendees ?? [];
  const here = people.filter(n => m.presence?.[n] === 'present').length;

  return (
    <FormScreen title="In the room" onRefresh={refetch}>
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <View style={styles.head}>
        <AppText variant="heading">{m.title}</AppText>
        <AppText variant="meta" color={colors.inkMuted}>
          {here} of {people.length} present · tap a name to change it
        </AppText>
      </View>

      <FormCard title="Attendance" style={styles.card}>
        {people.length ? (
          people.map(name => {
            const state = PRESENCE[m.presence?.[name] ?? 'tbd'];
            return (
              <Pressable
                key={name}
                onPress={() => tap(name)}
                disabled={cycling.isLoading}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${state.label}. Tap to change.`}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
              >
                <AppText variant="body" style={styles.personName}>
                  {name}
                </AppText>
                <Pill label={state.label} tone={state.tone} />
              </Pressable>
            );
          })
        ) : (
          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.none}
          >
            Nobody is on this meeting yet.
          </AppText>
        )}
      </FormCard>

      <FormCard title="Parking lot" style={styles.card}>
        <AppText variant="meta" color={colors.inkMuted} style={styles.hint}>
          Anything raised that is not for this meeting.
        </AppText>
        {(m.parkingLot ?? []).map((text, i) => (
          <View key={`${text}-${i}`} style={styles.parkedRow}>
            <View style={styles.bullet} />
            <AppText variant="bodyRegular" style={styles.parkedText}>
              {text}
            </AppText>
            <Pressable
              onPress={() => unpark(i)}
              hitSlop={s(8)}
              accessibilityRole="button"
              accessibilityLabel={`Remove "${text}" from the parking lot`}
            >
              <X size={s(16)} color={colors.inkMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField
              value={parked}
              onChangeText={setParked}
              placeholder="Park something for later…"
              onSubmitEditing={park}
            />
          </View>
          <Button
            label="Park"
            size="sm"
            variant="outline"
            iconLeft={Plus}
            disabled={adding.isLoading || !parked.trim()}
            onPress={park}
          />
        </View>
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  head: { marginTop: vs(14) },
  card: { marginBottom: vs(2) },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  pressed: { opacity: 0.6 },
  personName: { flex: 1 },
  none: { marginBottom: vs(10) },
  hint: { marginBottom: vs(10) },
  parkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginBottom: vs(10),
  },
  bullet: {
    width: s(6),
    height: s(6),
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  parkedText: { flex: 1 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginTop: vs(2),
  },
  addField: { flex: 1 },
});
