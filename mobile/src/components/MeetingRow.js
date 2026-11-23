import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Calendar, ListChecks, MapPin, Users } from 'lucide-react-native';
import {
  attendeeCount,
  labelOf,
  meetingStatuses,
  meetingTypes,
  statusTone,
  whenLabel,
} from '../model/meeting';

import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconText } from './IconText';
import { Pill } from './Pill';

// One meeting in the list.
export function MeetingRow({ meeting: m, onPress }) {
  const open = (m.actions ?? []).filter(a => !a.done).length;
  const people = attendeeCount(m);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.head}>
          <AppText variant="heading" style={styles.title}>
            {m.title}
          </AppText>
          <Pill label={labelOf(meetingStatuses, m.status)} tone={statusTone[m.status]} />
        </View>
        <AppText variant="meta" color={colors.inkMuted}>
          {labelOf(meetingTypes, m.type)} · {m.chair}
        </AppText>
        <View style={styles.meta}>
          <IconText icon={Calendar} text={whenLabel(m)} />
          {m.loc ? <IconText icon={MapPin} text={m.loc} /> : null}
          {people ? <IconText icon={Users} text={String(people)} /> : null}
          {open ? (
            <IconText
              icon={ListChecks}
              text={`${open} open`}
              color={colors.amberInk}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: s(14), marginBottom: vs(12) },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  title: { flex: 1 },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: s(14),
    rowGap: vs(4),
    marginTop: vs(8),
  },
});
