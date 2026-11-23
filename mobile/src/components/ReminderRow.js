import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AlarmClock, UserRound, Users } from 'lucide-react-native';
import { forLabel, statusTone, whenLabel } from '../model/reminder';
import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconText } from './IconText';
import { Pill } from './Pill';

/** One reminder in the list: what, when, and for whom. */
export function ReminderRow({ reminder: r, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${r.title}, ${whenLabel(r)}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.head}>
          <AppText variant="label" style={styles.title} numberOfLines={2}>
            {r.title}
          </AppText>
          <Pill
            label={r.late ? 'Due now' : r.statusLabel}
            tone={r.late ? 'watch' : statusTone[r.status] ?? 'low'}
          />
        </View>

        {r.note ? (
          <AppText
            variant="meta"
            color={colors.inkSoft}
            numberOfLines={2}
            style={styles.note}
          >
            {r.note}
          </AppText>
        ) : null}

        <View style={styles.meta}>
          <IconText
            icon={AlarmClock}
            text={whenLabel(r)}
            color={r.status === 'scheduled' ? colors.tealDeep : colors.inkMuted}
          />
          <IconText
            icon={r.recipients?.length > 1 ? Users : UserRound}
            text={forLabel(r)}
          />
          {!r.mine ? (
            <IconText icon={UserRound} text={`Set by ${r.creator}`} />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: s(14), marginBottom: vs(10) },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  title: { flex: 1 },
  note: { marginTop: vs(6) },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: s(14),
    rowGap: vs(4),
    marginTop: vs(8),
  },
});
