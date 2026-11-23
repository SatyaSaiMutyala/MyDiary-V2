import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { DiaryItem } from '../components/DiaryItem';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { IconTile } from '../components/IconTile';
import { MonthGrid } from '../components/MonthGrid';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScroll } from '../components/ScreenScroll';
import { ShimmerRows } from '../components/Shimmer';
import { WeekStrip } from '../components/WeekStrip';
import {
  byTime,
  countsByDay,
  entryToLine,
  meetingToLine,
} from '../model/diaryLines';
import { errorMessage, useMe } from '../store';
import { canOpen } from '../store/api/authApi';
import { useListDiaryQuery } from '../store/api/diaryApi';
import { useListMeetingsQuery } from '../store/api/meetingsApi';
import { addDays, longDate, realToday, shortDate } from '../utils/dates';
import { Pressable } from 'react-native';
import { colors, s, shadow, vs } from '../theme';

/** The window asked for in one go: a little before the shown month, a month after. */
const WINDOW_BACK = 10;
const WINDOW_ON = 45;

/**
 * My Diary — my own entries and the meetings I am part of, on one day at a time.
 *
 * Both come from different places and are merged here, exactly as the website does it: no meeting
 * is ever copied into the diary collection, so changing one changes it everywhere.
 */
export function DiaryScreen() {
  const nav = useNavigation();
  const me = useMe();
  const [day, setDay] = useState(realToday());
  const [view, setView] = useState('day');

  const from = addDays(day, -WINDOW_BACK);
  const to = addDays(day, WINDOW_ON);

  const diary = useListDiaryQuery({ from, to, limit: 200, sort: 'date' });
  const meetings = useListMeetingsQuery(
    { date_from: from, date_to: to, limit: 200, sort: 'date', mine: true },
    { skip: !canOpen(me, 'meetings') },
  );

  const lines = useMemo(() => {
    const own = (diary.data?.items ?? []).map(e => entryToLine(e, me?.name));
    const mine = (meetings.data?.items ?? [])
      .filter(m => m.status !== 'cancelled')
      .map(m => meetingToLine(m, me?.name));
    return [...own, ...mine];
  }, [diary.data, meetings.data, me?.name]);

  const busy = useMemo(() => new Set(lines.map(l => l.date)), [lines]);
  const counts = useMemo(() => countsByDay(lines), [lines]);

  const forDay = useMemo(
    () => lines.filter(l => l.date === day).sort(byTime),
    [lines, day],
  );

  /** The next three weeks, day by day, skipping empty days. */
  const agenda = useMemo(() => {
    const out = [];
    for (let i = 0; i < 21; i += 1) {
      const iso = addDays(day, i);
      const forThat = lines.filter(l => l.date === iso).sort(byTime);
      if (forThat.length) {
        out.push({ iso, lines: forThat });
      }
    }
    return out;
  }, [lines, day]);

  const loading = diary.isLoading || meetings.isLoading;
  const error = diary.error || meetings.error;
  const today = realToday();

  const refresh = async () => {
    await Promise.all([diary.refetch(), meetings.refetch?.()].filter(Boolean));
  };

  const open = line =>
    line.source === 'meetings'
      ? nav.navigate('MeetingDetail', { id: line.meetingId })
      : nav.navigate('DiaryEntry', { id: line.id });

  const dayList = (list, label) => (
    <>
      <Eyebrow label={label} />
      <Card style={styles.card}>
        {list.map((line, i) => (
          <DiaryItem
            key={line.id}
            line={line}
            last={i === list.length - 1}
            onPress={() => open(line)}
          />
        ))}
      </Card>
    </>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={day === today ? 'Today' : longDate(day)}
        title="My Diary"
        eyebrowAction={
          day !== today ? (
            <AppText
              variant="metaStrong"
              color={colors.yellow}
              onPress={() => setDay(today)}
            >
              Today
            </AppText>
          ) : undefined
        }
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New entry"
            onPress={() => nav.navigate('DiaryEntryForm', { date: day })}
          >
            <IconTile size={38} bg={colors.yellow} style={styles.add}>
              <Plus size={s(20)} color={colors.yellowInk} strokeWidth={2.25} />
            </IconTile>
          </Pressable>
        }
      >
        <WeekStrip selected={day} onSelect={setDay} busy={busy} />
      </ScreenHeader>

      <ScreenScroll onRefresh={refresh}>
        <View style={styles.chips}>
          <FilterChips
            value={view}
            onChange={setView}
            options={[
              { key: 'day', label: 'Day', count: forDay.length },
              { key: 'month', label: 'Month' },
              { key: 'agenda', label: 'Next 3 weeks' },
            ]}
          />
        </View>

        {error ? (
          <Notice tone="error" title={errorMessage(error)} />
        ) : loading ? (
          <Card style={styles.loading}>
            <ShimmerRows rows={4} icon={false} />
          </Card>
        ) : view === 'month' ? (
          <>
            <MonthGrid
              month={day}
              selected={day}
              onSelect={setDay}
              counts={counts}
            />
            {forDay.length ? (
              dayList(forDay, longDate(day))
            ) : (
              <EmptyState text="Nothing on this day." />
            )}
          </>
        ) : view === 'agenda' ? (
          agenda.length ? (
            agenda.map(d => (
              <View key={d.iso}>
                {dayList(
                  d.lines,
                  d.iso === today ? 'Today' : shortDate(d.iso),
                )}
              </View>
            ))
          ) : (
            <EmptyState text="Nothing in the next three weeks." />
          )
        ) : forDay.length ? (
          dayList(forDay, `${forDay.length} ${forDay.length === 1 ? 'entry' : 'entries'}`)
        ) : (
          <EmptyState text="Nothing on this day. Tap + to add something, or pick another day above." />
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  add: { ...shadow.action },
  chips: { marginBottom: vs(8) },
  loading: { padding: s(14) },
  card: { padding: s(14), marginBottom: vs(10) },
});
