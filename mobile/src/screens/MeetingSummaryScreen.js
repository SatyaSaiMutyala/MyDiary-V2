import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Sparkles } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconTile } from '../components/IconTile';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { errorMessage } from '../store';
import { useGetMeetingQuery } from '../store/api/meetingsApi';
import { colors, hairline, s, vs } from '../theme';

/**
 * The AI summary and the transcript, read-only.
 *
 * Both are produced on the website — the phone shows what is there rather than offering to
 * generate it, because that is a long job better started at a desk.
 */
export function MeetingSummaryScreen() {
  const route = useRoute();
  const id = route.params?.id;
  const { data: m, error, isLoading, refetch } = useGetMeetingQuery(id);

  if (isLoading) {
    return (
      <FormScreen title="Summary">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} icon={false} />
        </Card>
      </FormScreen>
    );
  }
  if (error || !m) {
    return (
      <FormScreen title="Summary">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That meeting could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const ai = m.aiSummary;
  const transcript = m.transcript ?? [];

  if (!ai && !transcript.length) {
    return (
      <FormScreen title="Summary" onRefresh={refetch}>
        <EmptyState text="No summary or transcript for this meeting. Both are produced on the website." />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Summary" onRefresh={refetch}>
      <View style={styles.head}>
        <AppText variant="heading">{m.title}</AppText>
        <AppText variant="meta" color={colors.inkMuted}>
          {m.date} · {m.time}
        </AppText>
      </View>

      {ai?.overview ? (
        <FormCard title="Overview" style={styles.card}>
          <View style={styles.overview}>
            <IconTile bg={colors.tealTint} size={34}>
              <Sparkles size={s(16)} color={colors.teal} strokeWidth={2} />
            </IconTile>
            <AppText variant="bodyRegular" style={styles.overviewText}>
              {ai.overview}
            </AppText>
          </View>
        </FormCard>
      ) : null}

      {ai?.decisions?.length ? (
        <FormCard
          title={`Decisions found · ${ai.decisions.length}`}
          style={styles.card}
        >
          {ai.decisions.map((d, i) => (
            <View key={i} style={styles.row}>
              <AppText variant="body">{d.text}</AppText>
              {d.owner || d.deadline ? (
                <AppText variant="meta" color={colors.inkMuted}>
                  {[d.owner, d.deadline].filter(Boolean).join(' · ')}
                </AppText>
              ) : null}
            </View>
          ))}
        </FormCard>
      ) : null}

      {ai?.actions?.length ? (
        <FormCard
          title={`Commitments found · ${ai.actions.length}`}
          style={styles.card}
        >
          {ai.actions.map((a, i) => (
            <View key={i} style={styles.row}>
              <AppText variant="body">{a.desc}</AppText>
              <AppText variant="meta" color={colors.inkMuted}>
                {[a.owner, a.deadline].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          ))}
        </FormCard>
      ) : null}

      {transcript.length ? (
        <FormCard
          title={`Transcript · ${transcript.length} lines`}
          style={styles.card}
        >
          {transcript.map((t, i) => (
            <View key={i} style={styles.line}>
              <View style={styles.speaker}>
                <AppText variant="metaStrong">{t.speaker || 'Someone'}</AppText>
                {t.chip ? <Pill label={t.chip} tone="low" /> : null}
                {t.time ? (
                  <AppText variant="meta" color={colors.inkFaint}>
                    {t.time}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="bodyRegular">{t.text}</AppText>
            </View>
          ))}
        </FormCard>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  head: { marginTop: vs(14) },
  card: { marginBottom: vs(2) },
  overview: { flexDirection: 'row', gap: s(12), marginBottom: vs(10) },
  overviewText: { flex: 1 },
  row: {
    paddingVertical: vs(9),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  line: {
    paddingVertical: vs(9),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  speaker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(3),
  },
});
