import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { UserRound } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { ChecklistItemRow } from '../components/ChecklistItemRow';
import { EmptyState } from '../components/EmptyState';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { LabSections } from '../components/LabSections';
import { Notice } from '../components/Notice';
import { PhotoViewer } from '../components/PhotoViewer';
import { ReopenLog } from '../components/ReopenLog';
import { ShimmerRows } from '../components/Shimmer';
import { SignerCard } from '../components/SignerCard';
import { Stat } from '../components/Stat';
import { clock, emptyItem, groupRecord, selfieSource } from '../lab/model';
import { errorMessage } from '../store';
import { useLabRecordQuery } from '../store/api/labReadinessApi';
import { useFresh } from '../store/useFresh';
import { longDate } from '../utils/dates';
import { colors, hairline, radius, s, vs } from '../theme';

// What this screen shows; fetched again when it comes back into view.
const FRESH = ['LabRecord'];

/** One past record, read-only — opened from Past records. */
export function LabRecordScreen() {
  const fresh = useFresh(FRESH);
  const id = useRoute().params?.id;
  const query = useLabRecordQuery(id);
  const payload = query.data;
  const run = payload?.run;
  const [selfieOpen, setSelfieOpen] = useState(false);

  const { sections, items } = useMemo(() => groupRecord(payload), [payload]);

  if (!run) {
    return (
      <FormScreen title="Record">
        {query.error ? (
          <Notice
            tone="error"
            title={errorMessage(query.error)}
            style={styles.notice}
          />
        ) : query.isLoading ? (
          <Card style={styles.notice}>
            <ShimmerRows rows={6} icon={false} />
          </Card>
        ) : (
          <EmptyState text="This record is no longer available." />
        )}
      </FormScreen>
    );
  }

  const opening = run.phase === 'opening';
  const counts = run.items.reduce(
    (n, i) => {
      if (i.status === 'done') {
        n.done += 1;
      } else if (i.status === 'deviation') {
        n.dev += 1;
      } else if (i.status === 'na') {
        n.na += 1;
      }
      return n;
    },
    { done: 0, dev: 0, na: 0 },
  );
  const target = { unitKey: run.unitKey, date: run.date, phase: run.phase };

  return (
    <FormScreen
      title={`${opening ? 'Opening' : 'Closing'} record`}
      onRefresh={fresh}
    >
      <FormCard title={`${run.unitName} · ${longDate(run.date)}`}>
        <View style={styles.stats}>
          <Stat
            size="sm"
            value={counts.done}
            label="Done"
            dot={{ color: colors.green }}
          />
          <Stat
            size="sm"
            value={counts.dev}
            label="Deviation"
            dot={{ color: colors.amber }}
          />
          <Stat
            size="sm"
            value={counts.na}
            label="N/A"
            dot={{ color: colors.slate }}
          />
          <Stat
            size="sm"
            value={run.photos.length}
            label="Photos"
            dot={{ color: colors.blue }}
          />
        </View>
        {run.startedAt ? (
          <AppText variant="meta" color={colors.inkMuted} style={styles.last}>
            {opening ? 'Opening time' : 'Round started'} {clock(run.startedAt)}
            {run.startedBy ? ` · ${run.startedBy}` : ''}
          </AppText>
        ) : null}
      </FormCard>

      {run.signedAt ? (
        <FormCard title={run.late ? 'Signed off · late' : 'Signed off'}>
          <View style={styles.signed}>
            <Pressable
              accessibilityLabel="Open the sign-off photograph"
              onPress={() => setSelfieOpen(true)}
              style={styles.selfie}
            >
              {run.hasSelfie ? (
                <Image source={selfieSource(target)} style={styles.photo} />
              ) : (
                <UserRound
                  size={s(30)}
                  color={colors.inkFaint}
                  strokeWidth={1.4}
                />
              )}
            </Pressable>
            <View style={styles.signedText}>
              <SignerCard
                name={run.signedBy?.name ?? ''}
                role={run.signedBy?.role ?? ''}
                note={`${opening ? 'Signed' : 'Closing time'} ${clock(
                  run.signedAt,
                )}`}
              />
            </View>
          </View>
          {run.declaration ? (
            <AppText variant="meta" color={colors.inkSoft} style={styles.last}>
              {run.declaration}
            </AppText>
          ) : null}
        </FormCard>
      ) : (
        <Notice
          tone="info"
          title="This record was never signed off"
          style={styles.notice}
        />
      )}

      <ReopenLog log={run.reopenLog ?? []} />

      <LabSections
        onlyActioned
        sections={sections}
        items={items}
        renderRow={a => (
          <ChecklistItemRow
            key={a.key}
            activity={a}
            item={items[a.key] ?? emptyItem}
            locked
          />
        )}
      />

      <PhotoViewer
        photo={
          selfieOpen && run.hasSelfie
            ? { source: selfieSource(target) }
            : undefined
        }
        caption={`${run.signedBy?.name ?? ''} · ${clock(run.signedAt)}`}
        onClose={() => setSelfieOpen(false)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: vs(14) },
  stats: { flexDirection: 'row', marginBottom: vs(10) },
  last: { marginBottom: vs(14) },
  signed: { flexDirection: 'row', gap: s(12) },
  signedText: { flex: 1 },
  selfie: {
    width: s(66),
    height: s(66),
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
});
