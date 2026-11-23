import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  CalendarClock,
  FileText,
  SquareCheck,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Dot } from '../components/Dot';
import { EmptyState } from '../components/EmptyState';
import { Eyebrow } from '../components/Eyebrow';
import { FilterChips } from '../components/FilterChips';
import { FormScreen } from '../components/FormScreen';
import { IconTile } from '../components/IconTile';
import { Notice } from '../components/Notice';
import { RichText } from '../components/RichText';
import { ShimmerRows } from '../components/Shimmer';
import { errorMessage } from '../store';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useReadAllNotificationsMutation,
} from '../store/api/notificationsApi';
import { relativeTime } from '../utils/dates';
import { plainText } from '../utils/richText';
import { colors, hairline, s, space, vs } from '../theme';

/**
 * The server sends an emoji for each notification. `AppText` pins Poppins, which has no emoji
 * glyphs, so an emoji would come out as a tofu box — the type decides the icon here instead.
 */
const LOOK = {
  action: { icon: SquareCheck, bg: colors.redTint, ink: colors.red },
  meeting: { icon: CalendarClock, bg: colors.tealTint, ink: colors.teal },
  minutes: { icon: FileText, bg: colors.blueTint, ink: colors.blueInk },
};
const FALLBACK = { icon: Bell, bg: colors.amberTint, ink: colors.amberInk };

/** One line of the bell list. Tapping an unread one marks it read, as it does on the website. */
function NotificationRow({ n, last, busy, onPress }) {
  const look = LOOK[n.type] ?? FALLBACK;
  const Icon = look.icon;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || !n.unread}
      accessibilityRole={n.unread ? 'button' : undefined}
      accessibilityLabel={
        n.unread
          ? `Unread. ${plainText(n.text)}. ${relativeTime(n.time)}. Tap to mark read.`
          : `${plainText(n.text)}. ${relativeTime(n.time)}.`
      }
      style={({ pressed }) => [
        styles.row,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      <IconTile bg={look.bg} size={34}>
        <Icon size={s(16)} color={look.ink} strokeWidth={2} />
      </IconTile>

      <View style={styles.body}>
        <RichText
          text={n.text}
          variant="meta"
          color={n.unread ? colors.ink : colors.inkMuted}
          emColor={n.unread ? colors.teal : colors.inkMuted}
        />
        <AppText variant="meta" color={colors.inkFaint} style={styles.when}>
          {relativeTime(n.time)}
        </AppText>
      </View>

      {n.unread ? (
        <View style={styles.dot}>
          <Dot color={colors.teal} size={8} />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Notifications — what has been waiting for this person.
 *
 * The list is already scoped to them by the server, which also sends `unreadTotal` so the count
 * here and the badge on Home come from the same answer and cannot drift apart.
 */
export function NotificationsScreen() {
  const [box, setBox] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [problem, setProblem] = useState('');

  const { data, error, isLoading, refetch } = useListNotificationsQuery({
    limit: 50,
    sort: '-createdAt',
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [readAll, readingAll] = useReadAllNotificationsMutation();

  const all = data?.items ?? [];
  const unreadCount = data?.unreadTotal ?? 0;
  const rows = box === 'unread' ? all.filter(n => n.unread) : all;

  const open = async n => {
    if (!n.unread) {
      return;
    }
    setBusyId(n.id);
    setProblem('');
    try {
      await markRead(n.id).unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const clearAll = async () => {
    setProblem('');
    try {
      await readAll().unwrap();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen title="Notifications" onRefresh={refetch}>
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <View style={styles.chips}>
        <FilterChips
          value={box}
          onChange={setBox}
          options={[
            { key: 'all', label: 'All', count: all.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
          ]}
        />
      </View>

      {error ? (
        <Notice tone="error" title={errorMessage(error)} />
      ) : isLoading ? (
        <Card style={styles.loading}>
          <ShimmerRows rows={5} />
        </Card>
      ) : rows.length ? (
        <>
          <Eyebrow
            style={styles.head}
            label={
              unreadCount
                ? `${unreadCount} unread`
                : `${all.length} ${all.length === 1 ? 'notification' : 'notifications'}`
            }
            action={unreadCount && !readingAll.isLoading ? 'Mark all read' : undefined}
            onAction={unreadCount ? clearAll : undefined}
          />
          <Card style={styles.list}>
            {rows.map((n, i) => (
              <NotificationRow
                key={n.id}
                n={n}
                last={i === rows.length - 1}
                busy={busyId === n.id || readingAll.isLoading}
                onPress={() => open(n)}
              />
            ))}
          </Card>
        </>
      ) : box === 'unread' ? (
        <EmptyState text="Nothing unread. You are all caught up." />
      ) : (
        <EmptyState text="No notifications yet." />
      )}

      <AppText variant="meta" color={colors.inkFaint} style={styles.foot}>
        Notifications are raised by the website and the app as things happen — an action assigned to
        you, a meeting you are part of, minutes circulated. They are not push messages yet.
      </AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  // The bar is the first thing under the top bar and the list follows it straight away, so both
  // standard gaps are pulled in — a notification list is read in one sweep, not section by section.
  chips: { marginTop: vs(-6), marginBottom: vs(2) },
  head: { marginTop: vs(8) },
  loading: { padding: s(14) },
  // Edge to edge: a full-width band of rows, not a card floating in the gutter.
  list: {
    marginHorizontal: -space.gutter,
    borderRadius: 0,
    paddingHorizontal: space.gutter,
    paddingVertical: vs(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(12),
    paddingVertical: vs(11),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: vs(3) },
  when: { marginTop: vs(1) },
  dot: { paddingTop: vs(6) },
  foot: { marginTop: vs(16), paddingHorizontal: s(4) },
});
