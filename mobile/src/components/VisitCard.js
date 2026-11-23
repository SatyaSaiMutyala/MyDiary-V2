import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Calendar, Clock, Image as ImageIcon, MapPin, Users } from 'lucide-react-native';
import {
  assessmentShort,
  assessmentTone,
  avgRating,
  siteLine,
  statusTone,
  visitTypeLabel,
} from '../model/visit';
import { longDate } from '../utils/dates';
import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconText } from './IconText';
import { Pill } from './Pill';

/** One visit report in the list. */
export function VisitCard({ visit, onPress }) {
  const site = siteLine(visit);
  const rating = avgRating(visit);
  const observations = visit.observations?.length ?? 0;
  const actions = visit.actionItems?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${visit.title}, ${visit.status}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.head}>
          <AppText variant="label" style={styles.title} numberOfLines={2}>
            {visit.title}
          </AppText>
          <Pill
            label={visit.status === 'draft' ? 'Draft' : 'Submitted'}
            tone={statusTone[visit.status] ?? 'low'}
          />
        </View>

        <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
          {[visitTypeLabel(visit.type), site].filter(Boolean).join(' · ')}
        </AppText>

        <View style={styles.meta}>
          <IconText icon={Calendar} text={longDate(visit.date)} />
          {visit.timeIn ? (
            <IconText
              icon={Clock}
              text={
                visit.timeOut ? `${visit.timeIn}–${visit.timeOut}` : visit.timeIn
              }
            />
          ) : null}
          {visit.org?.city ? (
            <IconText icon={MapPin} text={visit.org.city} />
          ) : null}
          {visit.team?.length ? (
            <IconText icon={Users} text={`${visit.team.length}`} />
          ) : null}
        </View>

        {visit.executiveSummary || visit.purpose ? (
          <AppText variant="meta" color={colors.inkSoft} numberOfLines={2}>
            {visit.executiveSummary || visit.purpose}
          </AppText>
        ) : null}

        <View style={styles.tags}>
          {visit.overallAssessment ? (
            <Pill
              label={assessmentShort[visit.overallAssessment]}
              tone={assessmentTone[visit.overallAssessment] ?? 'low'}
            />
          ) : null}
          {rating ? <Pill label={`${rating} / 5`} tone="teal" /> : null}
          {observations ? (
            <Pill
              label={`${observations} observation${observations === 1 ? '' : 's'}`}
              tone="low"
            />
          ) : null}
          {actions ? (
            <Pill label={`${actions} follow-up${actions === 1 ? '' : 's'}`} tone="high" />
          ) : null}
          {visit.followUpRequired ? (
            <Pill label="Follow-up needed" tone="watch" />
          ) : null}
          {visit.photos ? (
            <Pill label={`${visit.photos}`} tone="low" icon={ImageIcon} />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: s(14), marginBottom: vs(10), gap: vs(4) },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  title: { flex: 1 },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: s(14),
    rowGap: vs(4),
    marginTop: vs(4),
    marginBottom: vs(2),
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(6),
  },
});
