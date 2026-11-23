import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { meetingTypes } from '../model/meeting';
import { errorMessage } from '../store';
import { useListTemplatesQuery } from '../store/api/templatesApi';
import { colors, s, vs } from '../theme';

const typeLabel = id => meetingTypes.find(t => t.id === id)?.label ?? id;

/**
 * Pick an agenda template for the meeting being planned.
 *
 * Choosing one hands its id back to the form, which fills in the meeting type and the agenda
 * lines — the same thing the website's "Load from template…" link does. The library itself is
 * managed on the website; here it is only read.
 */
export function MeetingTemplatesScreen() {
  const nav = useNavigation();
  const { data, error, isLoading, refetch } = useListTemplatesQuery({
    limit: 50,
  });
  const templates = data?.items ?? [];

  const choose = t =>
    // Goes back to the form already on the stack and hands it the choice.
    nav.navigate('MeetingForm', { templateId: t.id });

  return (
    <FormScreen title="Agenda templates" onRefresh={refetch}>
      {error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      ) : templates.length ? (
        <>
          <Eyebrow label={`${templates.length} templates`} />
          {templates.map(t => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${t.name}, ${(t.agenda ?? []).length} agenda items`}
              onPress={() => choose(t)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.card}>
                <View style={styles.top}>
                  <AppText variant="meta" color={colors.inkFaint}>
                    {typeLabel(t.type)}
                  </AppText>
                  <Pill
                    label={`${(t.agenda ?? []).length} items`}
                    tone="low"
                  />
                </View>

                <View style={styles.titleRow}>
                  <AppText variant="label" style={styles.flex} numberOfLines={2}>
                    {t.name}
                  </AppText>
                  <ChevronRight size={s(18)} color={colors.inkFaint} />
                </View>

                {t.desc ? (
                  <AppText variant="meta" color={colors.inkMuted} numberOfLines={2}>
                    {t.desc}
                  </AppText>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <EmptyState text="No agenda templates in the library." />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },

  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  card: { padding: s(14), gap: vs(5), marginBottom: vs(8) },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
});
