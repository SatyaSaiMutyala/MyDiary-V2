import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Calendar,
  ChevronRight,
  Moon,
  Plus,
  SquareCheck,
  Sun,
  TriangleAlert,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Eyebrow } from '../components/Eyebrow';
import { IconText } from '../components/IconText';
import { IconTile } from '../components/IconTile';
import { LogoMark } from '../components/Logo';
import { MeetingCard } from '../components/MeetingCard';
import { Notice } from '../components/Notice';
import { ScreenScroll } from '../components/ScreenScroll';
import { ShiftCard } from '../components/ShiftCard';
import { ShimmerRows } from '../components/Shimmer';
import { Stat } from '../components/Stat';
import { StatusDot } from '../components/StatusDot';
import { TealHeader } from '../components/TealHeader';
import { meetingToLine } from '../model/diaryLines';
import { errorMessage, useMe } from '../store';
import { canOpen } from '../store/api/authApi';
import { useListActionItemsQuery } from '../store/api/actionItemsApi';
import { useListDiaryQuery } from '../store/api/diaryApi';
import { useListMeetingsQuery } from '../store/api/meetingsApi';
import { useListNotificationsQuery } from '../store/api/notificationsApi';
import { useLabDayQuery } from '../store/api/labReadinessApi';
import { useListVisitsQuery } from '../store/api/visitsApi';
import { initialsOf } from '../utils/people';
import { dueDate, fullDate, greeting, realToday } from '../utils/dates';
import { colors, hairline, radius, s, shadow, vs } from '../theme';

/**
 * A counting query asks for one row — the total is what matters, not the rows.
 *
 * No `fields` here: the list endpoints reject 'id' in it (every row carries id anyway), and an
 * unknown field is a 400.
 */
const COUNT = { limit: 1 };

/**
 * One row of numbers in a white card, divided by hairlines.
 *
 * Numbers live on a card, never on the teal band: the label under a number is grey, which reads
 * properly on white and badly on teal. The header carries words in white and nothing else.
 */
function GlanceStrip({ title, boxes }) {
  return (
    <View>
      <AppText
        variant="metaStrong"
        color={colors.inkSoft}
        style={styles.stripTitle}
      >
        {title}
      </AppText>
      <Card style={styles.glance}>
        {boxes.map((b, i) => (
          <React.Fragment key={b.label}>
            {i ? <View style={styles.glanceRule} /> : null}
            <Pressable
              style={styles.stat}
              onPress={b.onPress}
              disabled={!b.onPress}
              accessibilityRole={b.onPress ? 'button' : undefined}
              accessibilityLabel={`${b.value ?? 'unknown'} ${b.label}`}
            >
              <Stat value={b.value ?? '–'} label={b.label} />
            </Pressable>
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

/**
 * Home — what needs this person today.
 *
 * There is no dashboard endpoint: the numbers come from the same module endpoints the rest of the
 * app uses, one small counting query each. That way nothing can drift out of step with the screen
 * it links to, and a module this person may not open is simply not asked for.
 */
export function HomeScreen() {
  const nav = useNavigation();
  const me = useMe();
  const today = realToday();
  const sees = key => canOpen(me, key);

  // Due today, and overdue.
  const tasksToday = useListActionItemsQuery(
    { ...COUNT, mine: 'true', from: today, to: today },
    { skip: !sees('todo') },
  );
  const tasksLate = useListActionItemsQuery(
    { limit: 1, mine: 'true', overdue: 'true', sort: 'deadline' },
    { skip: !sees('todo') },
  );
  const meetingsToday = useListMeetingsQuery(
    { ...COUNT, mine: true, date_from: today, date_to: today },
    { skip: !sees('meetings') },
  );
  const diaryToday = useListDiaryQuery(
    { ...COUNT, from: today, to: today },
    { skip: !sees('diary') },
  );
  const visitsToday = useListVisitsQuery(
    { ...COUNT, mine: 'true', from: today, to: today },
    { skip: !sees('visits') },
  );

  // The next meeting, and the three things most owed by me.
  const nextMeetingQ = useListMeetingsQuery(
    {
      limit: 1,
      mine: true,
      status: 'upcoming',
      date_from: today,
      sort: 'date',
    },
    { skip: !sees('meetings') },
  );
  const owedQ = useListActionItemsQuery(
    { limit: 3, mine: 'true', status: 'open', sort: 'deadline' },
    { skip: !sees('todo') },
  );
  const unread = useListNotificationsQuery({ ...COUNT, unread: 'true' });

  // The laboratory's two rounds today, across every unit — only for people who record them.
  const labDay = useLabDayQuery(
    { date: today },
    { skip: !sees('labReadiness') },
  );

  // How far each round has got: how many units are signed off, and whether any is still untouched.
  const rounds = ['opening', 'closing'].map(phase => {
    const units = labDay.data?.units ?? [];
    const signed = units.filter(u => u.phases[phase].signedAt).length;
    const started = units.filter(
      u => !u.phases[phase].signedAt && u.phases[phase].done > 0,
    ).length;
    return { phase, units: units.length, signed, started };
  });

  const nextMeeting = nextMeetingQ.data?.items?.[0];
  const owed = owedQ.data?.items ?? [];
  const lateCount = tasksLate.data?.total ?? 0;
  const unreadCount = unread.data?.total ?? 0;
  const error =
    tasksToday.error || meetingsToday.error || diaryToday.error || owedQ.error;

  const refresh = async () => {
    const all = [
      tasksToday,
      tasksLate,
      meetingsToday,
      diaryToday,
      visitsToday,
      nextMeetingQ,
      owedQ,
      unread,
    ];
    await Promise.all(all.map(q => q.refetch?.()).filter(Boolean));
  };

  return (
    <View style={styles.root}>
      <ScreenScroll padded={false} onRefresh={refresh}>
        <TealHeader arcHeight={vs(250)} topGap={10} style={styles.header}>
          <View style={styles.topRow}>
            <IconTile size={40} bg={colors.white}>
              <LogoMark size={26} />
            </IconTile>
            <View style={styles.unit}>
              <AppText
                variant="meta"
                color={colors.onTealSoft}
                numberOfLines={1}
              >
                {me?.title || 'TrustLab Diagnostics'}
              </AppText>
              <AppText variant="label" color={colors.white} numberOfLines={1}>
                {me?.department || 'MyDiary'}
              </AppText>
            </View>
            <Pressable
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
              accessibilityRole="button"
              onPress={() => nav.navigate('Notifications')}
            >
              <IconTile size={36} bg={colors.tealShade}>
                <Bell size={s(18)} color={colors.white} strokeWidth={1.9} />
              </IconTile>
              {unreadCount ? (
                <View style={styles.bellCount}>
                  <AppText variant="meta" color={colors.white}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => nav.navigate('More')}
              accessibilityLabel="Your profile"
              accessibilityRole="button"
            >
              <Avatar
                label={initialsOf(me?.name)}
                size={36}
                borderColor={colors.tealLine}
              />
            </Pressable>
          </View>

          <AppText
            variant="body"
            color={colors.onTealSoft}
            style={styles.greeting}
          >
            {greeting()}
          </AppText>
          <AppText variant="title" color={colors.white} style={styles.name}>
            {me?.name ?? ''}
          </AppText>
          <IconText
            icon={Calendar}
            text={fullDate(today)}
            variant="label"
            iconSize={16}
            gap={8}
            color={colors.white}
            iconColor={colors.onTealSoft}
            style={styles.date}
          />
          {labDay.data?.units?.length ? (
            <View style={styles.shifts}>
              {rounds.map(r => (
                <ShiftCard
                  key={r.phase}
                  icon={r.phase === 'opening' ? Sun : Moon}
                  name={
                    r.phase === 'opening' ? 'Opening round' : 'Closing round'
                  }
                  state={
                    r.signed === r.units
                      ? 'All signed'
                      : `${r.signed}/${r.units} signed`
                  }
                  detail={
                    r.signed === r.units
                      ? 'Every unit is closed out'
                      : r.started
                      ? `${r.started} in progress`
                      : 'Not started yet'
                  }
                  signed={r.signed === r.units}
                  onPress={() =>
                    nav.navigate('LabReadiness', {
                      phase: r.phase,
                      date: today,
                    })
                  }
                />
              ))}
            </View>
          ) : null}
        </TealHeader>

        <View style={styles.content}>
          {error ? (
            <Notice
              tone="error"
              title={errorMessage(error)}
              style={styles.notice}
            />
          ) : null}

          <View style={styles.pair}>
            <Button
              label="Add task"
              variant="plain"
              size="md"
              iconLeft={Plus}
              iconColor={colors.teal}
              onPress={() => nav.navigate('TaskForm')}
              style={styles.pairItem}
            />
            <Button
              label="New meeting"
              variant="plain"
              size="md"
              iconLeft={Calendar}
              iconColor={colors.teal}
              onPress={() => nav.navigate('MeetingForm', {})}
              style={styles.pairItem}
            />
          </View>

          <Eyebrow label="At a glance" />
          <GlanceStrip
            title="Due today"
            boxes={[
              {
                label: 'Tasks',
                value: tasksToday.data?.total,
                onPress: () => nav.navigate('To-Do'),
              },
              {
                label: 'Meetings',
                value: meetingsToday.data?.total,
                onPress: () => nav.navigate('Meetings'),
              },
              {
                label: 'Diary',
                value: diaryToday.data?.total,
                onPress: () => nav.navigate('Diary'),
              },
              { label: 'Visits', value: visitsToday.data?.total },
            ]}
          />
          {lateCount ? (
            <Pressable
              onPress={() => nav.navigate('To-Do')}
              accessibilityRole="button"
              accessibilityLabel={`${lateCount} overdue ${
                lateCount === 1 ? 'task' : 'tasks'
              }. Opens My To-Do.`}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.attention}>
                <IconTile bg={colors.redTint} size={38}>
                  <TriangleAlert
                    size={s(19)}
                    color={colors.red}
                    strokeWidth={2}
                  />
                </IconTile>
                <View style={styles.attentionText}>
                  <AppText variant="label" color={colors.redInk}>
                    {lateCount} {lateCount === 1 ? 'task is' : 'tasks are'}{' '}
                    overdue
                  </AppText>
                  <AppText
                    variant="meta"
                    color={colors.inkMuted}
                    numberOfLines={1}
                  >
                    {tasksLate.data?.items?.[0]
                      ? `Oldest: ${tasksLate.data.items[0].desc}`
                      : 'Open My To-Do to clear them.'}
                  </AppText>
                </View>
                <ChevronRight size={s(18)} color={colors.inkFaint} />
              </Card>
            </Pressable>
          ) : null}

          {sees('meetings') ? (
            <>
              <Eyebrow
                label="Next meeting"
                action="All"
                onAction={() => nav.navigate('Meetings')}
              />
              {nextMeetingQ.isLoading ? (
                <Card style={styles.quiet}>
                  <ShimmerRows rows={1} icon={false} />
                </Card>
              ) : nextMeeting ? (
                <MeetingCard
                  meeting={meetingToLine(nextMeeting, me?.name)}
                  onPress={() =>
                    nav.navigate('MeetingDetail', { id: nextMeeting.id })
                  }
                />
              ) : (
                <Card style={styles.quiet}>
                  <IconText icon={Calendar} text="Nothing scheduled." />
                </Card>
              )}
            </>
          ) : null}

          {sees('todo') ? (
            <>
              <Eyebrow
                label="Owed by me"
                action="All"
                onAction={() => nav.navigate('To-Do')}
              />
              {owedQ.isLoading ? (
                <Card style={styles.quiet}>
                  <ShimmerRows rows={3} icon={false} />
                </Card>
              ) : owed.length ? (
                <Card style={styles.owed}>
                  {owed.map((t, i) => (
                    <Pressable
                      key={t.id}
                      onPress={() => nav.navigate('TaskDetail', { id: t.id })}
                      accessibilityRole="button"
                      accessibilityLabel={t.desc}
                      style={({ pressed }) => [
                        styles.owedRow,
                        i === owed.length - 1 && styles.lastRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <StatusDot status="open" />
                      <View style={styles.owedText}>
                        <AppText variant="body" numberOfLines={2}>
                          {t.desc}
                        </AppText>
                        <AppText
                          variant="meta"
                          color={t.isOverdue ? colors.redInk : colors.inkMuted}
                          numberOfLines={1}
                        >
                          due {dueDate(t.deadline)}
                          {t.isOverdue ? ' · overdue' : ''}
                          {t.meetingTitle ? ` · ${t.meetingTitle}` : ''}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              ) : (
                <Card style={styles.quiet}>
                  <IconText
                    icon={SquareCheck}
                    text="Nothing owed by you. Clean slate."
                  />
                </Card>
              )}
            </>
          ) : null}
        </View>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { paddingBottom: vs(18) },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  unit: { flex: 1 },
  bellCount: {
    position: 'absolute',
    top: -vs(3),
    right: -s(3),
    minWidth: s(18),
    paddingHorizontal: s(4),
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  greeting: { marginTop: vs(16) },
  name: { marginTop: vs(2) },
  date: { marginTop: vs(8) },
  content: { paddingHorizontal: s(13), paddingTop: vs(12) },
  notice: { marginBottom: vs(10) },
  shifts: { flexDirection: 'row', gap: s(12), marginTop: vs(14) },
  pair: { flexDirection: 'row', gap: s(12) },
  pairItem: { flex: 1, ...shadow.card },
  stripTitle: { marginBottom: vs(6), marginTop: vs(8) },
  glance: { flexDirection: 'row', borderRadius: radius.sm },
  glanceRule: { width: hairline, backgroundColor: colors.line },
  stat: { flex: 1, paddingHorizontal: s(10), paddingVertical: vs(9) },
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: s(14),
    marginTop: vs(12),
  },
  attentionText: { flex: 1 },
  quiet: { padding: s(14) },
  owed: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  owedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  owedText: { flex: 1 },
});
