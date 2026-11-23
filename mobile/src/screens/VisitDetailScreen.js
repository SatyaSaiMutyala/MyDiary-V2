import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ProgressBar } from '../components/ProgressBar';
import { ShimmerRows } from '../components/Shimmer';
import { StarRating } from '../components/StarRating';
import {
  assessmentLabel,
  assessmentTone,
  avgRating,
  ratingAreas,
  statusTone,
  visitTypeLabel,
} from '../model/visit';
import { errorMessage } from '../store';
import {
  useGetVisitQuery,
  useRemoveVisitMutation,
  useSetVisitStatusMutation,
} from '../store/api/visitsApi';
import { dueDate, longDate } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

/**
 * A submitted visit report, read the way it was signed off.
 *
 * Nothing is edited here. Reopening it as a draft is a deliberate step — the server un-stamps the
 * sign-off — and then the editor has it again.
 */
export function VisitDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const confirm = useConfirm();

  const { data: v, error, isLoading, refetch } = useGetVisitQuery(id);
  const [setStatus, changing] = useSetVisitStatusMutation();
  const [removeVisit] = useRemoveVisitMutation();
  const [problem, setProblem] = useState('');

  if (isLoading) {
    return (
      <FormScreen title="Visit report">
        <Card style={styles.loading}>
          <ShimmerRows rows={5} icon={false} />
        </Card>
      </FormScreen>
    );
  }

  if (error || !v) {
    return (
      <FormScreen title="Visit report">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'That report could not be found.'}
         
        />
      </FormScreen>
    );
  }

  const rating = avgRating(v);
  const rated = ratingAreas.filter(a => (v.ratings?.[a.id] ?? 0) > 0);

  const reopen = async () => {
    const yes = await confirm({
      title: 'Reopen as a draft?',
      text: 'The sign-off is withdrawn and the report becomes editable again.',
      confirmLabel: 'Reopen',
      icon: RotateCcw,
    });
    if (!yes) {
      return;
    }
    try {
      await setStatus({ id, status: 'draft' }).unwrap();
      nav.replace('VisitForm', { id });
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this visit report?',
      text: `"${v.title}" and everything in it is removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeVisit(id).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={v.status === 'draft' ? 'Draft visit' : 'Visit report'}
      onRefresh={refetch}
      right={
        <IconButton
          icon={Trash2}
          label="Delete report"
          iconSize={20}
          color={colors.red}
          onPress={remove}
        />
      }
      footer={
        v.status === 'submitted' ? (
          <Button
            label={changing.isLoading ? 'Reopening…' : 'Reopen as draft'}
            variant="plain"
            iconLeft={RotateCcw}
            disabled={changing.isLoading}
            onPress={reopen}
          />
        ) : (
          <Button
            label="Continue editing"
            iconLeft={Pencil}
            onPress={() => nav.replace('VisitForm', { id })}
          />
        )
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="meta" color={colors.inkFaint} numberOfLines={1}>
            {visitTypeLabel(v.type)}
          </AppText>
          <Pill
            label={v.status === 'draft' ? 'Draft' : 'Submitted'}
            tone={statusTone[v.status] ?? 'low'}
          />
        </View>
        <AppText variant="heading" style={styles.heroName}>
          {v.title}
        </AppText>

        {v.overallAssessment ? (
          <View style={styles.verdict}>
            <Pill
              label={assessmentLabel(v.overallAssessment)}
              tone={assessmentTone[v.overallAssessment] ?? 'low'}
            />
          </View>
        ) : null}

        <View style={styles.heroInfo}>
          <InfoRow label="Date" value={longDate(v.date)} />
          <InfoRow
            label="Time"
            value={[v.timeIn, v.timeOut].filter(Boolean).join(' – ')}
          />
          <InfoRow label="Owner" value={v.owner} />
          <InfoRow
            label="Submitted"
            value={v.submittedAt ? longDate(String(v.submittedAt).slice(0, 10)) : ''}
          />
        </View>
      </Card>

      <FormCard title="Where">
        <InfoRow label="Organisation" value={v.org?.name} />
        <InfoRow label="Branch" value={v.org?.branch} />
        <InfoRow label="Address" value={v.org?.address} />
        <InfoRow
          label="City"
          value={[v.org?.city, v.org?.state].filter(Boolean).join(', ')}
        />
        <InfoRow label="GPS" value={v.org?.gps} />
      </FormCard>

      <FormCard title="Who met you">
        <InfoRow label="Host" value={v.host?.name} />
        <InfoRow label="Designation" value={v.host?.designation} />
        <InfoRow label="Phone" value={v.host?.phone} />
        <InfoRow label="Email" value={v.host?.email} />
      </FormCard>

      {v.team?.length || v.externalParticipants ? (
        <FormCard title="Our side">
          {v.team?.length ? (
            <InfoRow label="Team" value={v.team.join(', ')} />
          ) : null}
          {v.externalParticipants ? (
            <InfoRow label="External" value={v.externalParticipants} />
          ) : null}
        </FormCard>
      ) : null}

      {v.purpose || v.scope || v.references ? (
        <FormCard title="Why we went">
          {v.purpose ? (
            <>
              <AppText variant="meta" color={colors.inkFaint}>
                Purpose
              </AppText>
              <AppText variant="bodyRegular" style={styles.para}>
                {v.purpose}
              </AppText>
            </>
          ) : null}
          {v.scope ? (
            <>
              <AppText variant="meta" color={colors.inkFaint}>
                Scope
              </AppText>
              <AppText variant="bodyRegular" style={styles.para}>
                {v.scope}
              </AppText>
            </>
          ) : null}
          {v.references ? (
            <>
              <AppText variant="meta" color={colors.inkFaint}>
                References
              </AppText>
              <AppText variant="bodyRegular" style={styles.para}>
                {v.references}
              </AppText>
            </>
          ) : null}
          {v.tags?.length ? (
            <View style={styles.tags}>
              {v.tags.map(t => (
                <Pill key={t} label={t} tone="low" />
              ))}
            </View>
          ) : null}
        </FormCard>
      ) : null}

      {rated.length ? (
        <FormCard title={rating ? `Ratings · ${rating} / 5` : 'Ratings'}>
          {rating ? (
            <ProgressBar
              value={(Number(rating) / 5) * 100}
              style={styles.ratingBar}
            />
          ) : null}
          {rated.map(a => (
            <StarRating
              key={a.id}
              label={a.label}
              value={v.ratings[a.id]}
            />
          ))}
        </FormCard>
      ) : null}

      {v.executiveSummary ? (
        <FormCard title="Executive summary">
          <AppText variant="bodyRegular" style={styles.para}>
            {v.executiveSummary}
          </AppText>
        </FormCard>
      ) : null}

      <Eyebrow label={`Observations · ${v.observations?.length ?? 0}`} />
      {v.observations?.length ? (
        v.observations.map((o, i) => (
          <Card key={`obs-${i}`} style={styles.obs}>
            <View style={styles.obsHead}>
              <Pill label={o.category || 'Other'} tone="low" />
              <AppText variant="meta" color={colors.inkFaint}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
            </View>
            <AppText variant="bodyRegular">{o.observation}</AppText>
            {o.evidence ? (
              <AppText variant="meta" color={colors.inkMuted}>
                Evidence: {o.evidence}
              </AppText>
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState text="No observations recorded." />
      )}

      <Eyebrow label={`Follow-up actions · ${v.actionItems?.length ?? 0}`} />
      {v.actionItems?.length ? (
        <Card style={styles.list}>
          {v.actionItems.map((a, i) => (
            <View
              key={`act-${i}`}
              style={[
                styles.actionRow,
                i === v.actionItems.length - 1 && styles.lastRow,
              ]}
            >
              <AppText variant="body">{a.text}</AppText>
              <AppText variant="meta" color={colors.inkMuted}>
                {[a.owner, a.deadline ? `by ${dueDate(a.deadline)}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState text="No follow-up actions." />
      )}

      {v.followUpRequired || v.nextVisitDate || v.additionalRemarks ? (
        <FormCard title="Afterwards">
          <InfoRow
            label="Follow-up"
            value={v.followUpRequired ? 'Needed' : 'Not needed'}
          />
          <InfoRow
            label="Next visit"
            value={v.nextVisitDate ? longDate(v.nextVisitDate) : ''}
          />
          {v.additionalRemarks ? (
            <AppText variant="bodyRegular" style={styles.para}>
              {v.additionalRemarks}
            </AppText>
          ) : null}
        </FormCard>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  hero: { padding: s(14), gap: vs(5) },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
  },
  heroName: { marginTop: vs(2) },
  verdict: { flexDirection: 'row', marginTop: vs(6) },
  heroInfo: { marginTop: vs(8) },
  para: { marginBottom: vs(10) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  ratingBar: { marginBottom: vs(12) },
  obs: { padding: s(14), gap: vs(5), marginBottom: vs(8) },
  obsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  actionRow: {
    paddingVertical: vs(10),
    gap: vs(2),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
});
