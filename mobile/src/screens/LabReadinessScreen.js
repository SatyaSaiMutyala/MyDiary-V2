import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Lock,
  Pencil,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChecklistItemRow } from '../components/ChecklistItemRow';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { EmptyState } from '../components/EmptyState';
import { FooterBar } from '../components/FooterBar';
import { IconTile } from '../components/IconTile';
import { KeyboardAvoider } from '../components/KeyboardAvoider';
import { LabSections } from '../components/LabSections';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ProgressHeader } from '../components/ProgressHeader';
import { ReopenLog } from '../components/ReopenLog';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScroll } from '../components/ScreenScroll';
import { SegmentedControl } from '../components/SegmentedControl';
import { Shimmer, ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { clock, emptyItem, groupBoard, unitKinds } from '../lab/model';
import { errorMessage, useAppDispatch, useAppSelector } from '../store';
import {
  useAddLabPhotoMutation,
  useLabBoardQuery,
  useLabDayQuery,
  useRemoveLabPhotoMutation,
  useSetLabItemMutation,
  useSetLabRemarkMutation,
} from '../store/api/labReadinessApi';
import {
  dateChosen,
  phaseChosen,
  todayIso,
  unitChosen,
} from '../store/slices/labSlice';
import { useFresh } from '../store/useFresh';
import { longDate, shortDate } from '../utils/dates';
import { colors, radius, s, vs } from '../theme';

// What this screen shows; fetched again when it comes back into view.
const FRESH = ['LabBoard', 'LabDay'];

/**
 * Lab Readiness — the opening and closing round for one laboratory unit on one day.
 *
 * Every activity is answered here, a deviation or an N/A says why, and the activities that have to
 * be evidenced carry a photograph. When nothing is outstanding the round is signed off, which locks
 * the record; reopening it afterwards is itself recorded.
 */
export function LabReadinessScreen() {
  const fresh = useFresh(FRESH);
  const nav = useNavigation();
  const route = useRoute();
  const isTab = route.name === 'Lab';
  const dispatch = useAppDispatch();
  const { date, phase, unit: chosen } = useAppSelector(st => st.lab);
  const TODAY = todayIso();

  // Opened from somewhere that knows which round it wants (the Home cards, a notification).
  // Read once, on the way in: after that the person's own choice of unit, day and round stands.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) {
      return;
    }
    opened.current = true;
    const { phase: p, unit: u, date: d } = route.params ?? {};
    if (p) {
      dispatch(phaseChosen(p));
    }
    if (u) {
      dispatch(unitChosen(u));
    }
    if (d) {
      dispatch(dateChosen(d));
    }
  }, [route.params, dispatch]);

  const day = useLabDayQuery({ date });
  const units = useMemo(() => day.data?.units ?? [], [day.data]);

  // Until a unit is picked, land on the first one that still has this round to do.
  useEffect(() => {
    if (chosen || !units.length) {
      return;
    }
    const pending = units.find(u => !u.phases[phase].signedAt) ?? units[0];
    dispatch(unitChosen(pending.key));
  }, [chosen, units, phase, dispatch]);

  const unit = units.find(u => u.key === chosen) ?? units[0];
  const target = unit ? { unitKey: unit.key, date, phase } : undefined;
  const boardQ = useLabBoardQuery(target, { skip: !target });
  const board = target ? boardQ.data : undefined;

  const [setItem, itemCall] = useSetLabItemMutation();
  const [setRemark] = useSetLabRemarkMutation();
  const [addPhoto, photoCall] = useAddLabPhotoMutation();
  const [removePhoto, removeCall] = useRemoveLabPhotoMutation();

  const { sections, items } = useMemo(() => groupBoard(board), [board]);

  const run = board?.run ?? null;
  const progress = board?.progress;
  const locked = !!run?.signedAt;
  const actionError = itemCall.error ?? photoCall.error ?? removeCall.error;

  const stillOpen = sections
    .filter(sec => sec.complete < sec.rows.length)
    .map(sec => `${sec.title} (${sec.rows.length - sec.complete})`);

  const unitOptions = units.map(u => ({
    id: u.key,
    label: u.name,
    tag: unitKinds[u.kind]?.tag ?? u.kind,
    detail: unitKinds[u.kind]?.detail ?? '',
  }));

  const cutoff =
    phase === 'opening' ? day.data?.openingCutoff : day.data?.closingCutoff;

  return (
    <KeyboardAvoider style={styles.root}>
      <ScreenHeader
        eyebrow={
          date === TODAY
            ? `Today, ${shortDate(date).slice(5)}`
            : date.slice(0, 4) === TODAY.slice(0, 4)
            ? shortDate(date)
            : longDate(date)
        }
        title="Lab readiness"
        // It is a tab for laboratory people and a pushed screen for everyone else; an arrow only
        // belongs on the second kind, which has somewhere to go back to.
        onBack={
          isTab
            ? undefined
            : () => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))
        }
        eyebrowAction={
          <DateField
            value={date}
            onChange={d => dispatch(dateChosen(d || TODAY))}
            renderTrigger={() => (
              <AppText variant="metaStrong" color={colors.yellow}>
                Change
              </AppText>
            )}
          />
        }
        right={
          <SegmentedControl
            compact
            style={styles.phases}
            value={phase}
            onChange={p => dispatch(phaseChosen(p))}
            options={[
              { key: 'opening', label: 'Opening' },
              { key: 'closing', label: 'Closing' },
            ]}
          />
        }
      >
        <View style={styles.row}>
          <Dropdown
            style={styles.unit}
            options={unitOptions}
            value={unit?.key ?? ''}
            onChange={k => dispatch(unitChosen(k))}
            renderTrigger={(u, open) => (
              <View style={styles.unitBox}>
                <View style={styles.unitText}>
                  <View style={styles.unitName}>
                    {!u && day.isLoading ? (
                      <Shimmer width="60%" height={vs(13)} onTeal />
                    ) : (
                      <AppText
                        variant="label"
                        color={colors.white}
                        numberOfLines={1}
                        style={styles.unitTitle}
                      >
                        {u?.label ?? 'Choose a unit'}
                      </AppText>
                    )}
                    {u?.tag ? <Pill label={u.tag} tone="yellow" /> : null}
                  </View>
                  <AppText
                    variant="meta"
                    color={colors.onTealSoft}
                    numberOfLines={1}
                  >
                    {u?.detail ?? ' '}
                  </AppText>
                </View>
                {open ? (
                  <ChevronUp
                    size={s(19)}
                    color={colors.white}
                    strokeWidth={2}
                  />
                ) : (
                  <ChevronDown
                    size={s(19)}
                    color={colors.white}
                    strokeWidth={2}
                  />
                )}
              </View>
            )}
          />
          <Pressable
            accessibilityLabel="Past records"
            onPress={() => nav.navigate('LabHistory')}
          >
            <IconTile size={44} bg={colors.tealDeep}>
              <History size={s(20)} color={colors.white} strokeWidth={1.75} />
            </IconTile>
          </Pressable>
        </View>
      </ScreenHeader>

      <ScreenScroll
        bottomGap={24}
        contentContainerStyle={styles.scroll}
        onRefresh={fresh}
      >
        {day.error ? (
          <Notice
            tone="error"
            title={errorMessage(day.error)}
            style={styles.notice}
          />
        ) : null}
        {boardQ.error ? (
          <Notice
            tone="error"
            title={errorMessage(boardQ.error)}
            style={styles.notice}
          />
        ) : null}
        {actionError ? (
          <Notice
            tone="error"
            title={errorMessage(actionError)}
            style={styles.notice}
          />
        ) : null}

        {progress ? (
          <>
            {/* Complete means nothing outstanding on that line: every activity that is still
                missing an answer, a remark or a photograph is listed once in `missing`. */}
            <ProgressHeader
              done={progress.total - progress.missing.length}
              total={progress.total}
              unit="complete"
              due={cutoff}
              caption={
                run?.startedAt
                  ? `${
                      phase === 'opening' ? 'Opening time' : 'Round started'
                    } ${clock(run.startedAt)} · ${run.startedBy}`
                  : 'Not started yet'
              }
              parts={[
                { count: progress.completed, color: colors.teal },
                { count: progress.deviations, color: colors.amber },
                { count: progress.na, color: colors.slate },
                { count: progress.pending, color: colors.line },
              ]}
            />
            <View style={styles.legend}>
              <Stat
                size="sm"
                value={progress.completed}
                label="Done"
                dot={{ color: colors.green }}
              />
              <Stat
                size="sm"
                value={progress.deviations}
                label="Deviation"
                dot={{ color: colors.amber }}
              />
              <Stat
                size="sm"
                value={progress.na}
                label="N/A"
                dot={{ color: colors.slate }}
              />
              <Stat
                size="sm"
                value={progress.pending}
                label="Open"
                dot={{ color: colors.inkFaint, hollow: true }}
              />
            </View>
            <ReopenLog log={run?.reopenLog ?? []} />
          </>
        ) : boardQ.isLoading || day.isLoading ? (
          <View>
            <Shimmer width="55%" height={vs(34)} style={styles.skeletonTitle} />
            <Shimmer height={vs(10)} round />
            <Card style={styles.skeletonCard}>
              <ShimmerRows rows={5} />
            </Card>
          </View>
        ) : day.data && !units.length ? (
          <EmptyState text="No units are set up for Lab Readiness yet. An admin adds them in Department Master on the website." />
        ) : null}

        {target && board ? (
          <LabSections
            key={`${target.unitKey}|${target.date}|${target.phase}`}
            sections={sections}
            items={items}
            renderRow={a => {
              const item = items[a.key] ?? emptyItem;
              return (
                <ChecklistItemRow
                  key={a.key}
                  activity={a}
                  item={item}
                  locked={locked}
                  onStatus={st =>
                    setItem({ ...target, taskKey: a.key, status: st ?? null })
                  }
                  onRemark={text =>
                    setRemark({ ...target, taskKey: a.key, remark: text })
                  }
                  // One at a time: two uploads of the same activity finishing out of order
                  // would leave the strip showing the wrong one until the next refresh.
                  onAddPhotos={async photos => {
                    for (const photo of photos) {
                      await addPhoto({ ...target, taskKey: a.key, photo });
                    }
                  }}
                  onRemovePhoto={id =>
                    removePhoto({ ...target, taskKey: a.key, photoId: id })
                  }
                />
              );
            }}
          />
        ) : null}
      </ScreenScroll>

      {progress && target ? (
        <FooterBar inTabs>
          {locked ? (
            <View style={styles.footRow}>
              <IconTile size={36} bg={colors.teal}>
                <Check size={s(18)} color={colors.white} strokeWidth={2.75} />
              </IconTile>
              <View style={styles.footText}>
                <AppText variant="label">
                  {phase === 'opening' ? 'Opening' : 'Closing'} round signed
                  {run?.late ? ' · late' : ''}
                </AppText>
                <AppText variant="meta" color={colors.inkMuted}>
                  {clock(run?.signedAt)} · {run?.signedBy?.name}
                </AppText>
              </View>
              <Pressable
                hitSlop={s(10)}
                onPress={() => nav.navigate('LabReopen', target)}
              >
                <AppText variant="label" color={colors.teal}>
                  Reopen
                </AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.footRow}>
                <IconTile size={36}>
                  {progress.complete ? (
                    <Check
                      size={s(18)}
                      color={colors.tealDeep}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Lock
                      size={s(17)}
                      color={colors.inkSoft}
                      strokeWidth={1.9}
                    />
                  )}
                </IconTile>
                <View style={styles.footText}>
                  <AppText variant="label">
                    {progress.complete
                      ? 'Ready to sign'
                      : progress.pending
                      ? `${progress.pending} ${
                          progress.pending === 1 ? 'item' : 'items'
                        } still open`
                      : `${progress.missing.length} ${
                          progress.missing.length === 1
                            ? 'item needs'
                            : 'items need'
                        } a remark or photograph`}
                  </AppText>
                  <AppText
                    variant="meta"
                    color={colors.inkMuted}
                    numberOfLines={3}
                  >
                    {progress.complete
                      ? 'Take the sign-off photograph to lock this record.'
                      : progress.pending
                      ? `Answer every activity to sign off. Still open: ${stillOpen.join(
                          ' · ',
                        )}`
                      : progress.missing.join(' · ')}
                  </AppText>
                </View>
              </View>
              <Button
                label={`Sign off ${phase} round`}
                iconLeft={Pencil}
                disabled={!progress.complete}
                onPress={() => nav.navigate('LabSignOff', target)}
                style={styles.footBtn}
              />
            </>
          )}
        </FooterBar>
      ) : null}
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  phases: { width: s(156) },
  scroll: { paddingTop: vs(6) },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  unit: { flex: 1 },
  unitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    height: vs(52),
    paddingHorizontal: s(12),
    borderRadius: radius.md,
    backgroundColor: colors.tealDeep,
  },
  unitText: { flex: 1 },
  unitName: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  unitTitle: { flexShrink: 1 },
  notice: { marginBottom: vs(10) },
  skeletonTitle: { marginTop: vs(10), marginBottom: vs(12) },
  skeletonCard: { marginTop: vs(20) },
  legend: { flexDirection: 'row', marginTop: vs(12), marginBottom: vs(6) },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  footText: { flex: 1 },
  footBtn: { marginTop: vs(10) },
});
