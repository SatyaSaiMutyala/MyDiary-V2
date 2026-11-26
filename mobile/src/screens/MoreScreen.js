import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AlarmClock,
  Bell,
  FlaskConical,
  FolderKanban,
  KeyRound,
  LogOut,
  MapPin,
  MessageCircle,
  Scale,
  UserRound,
  Users,
} from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { CardList } from '../components/CardList';
import { Eyebrow } from '../components/Eyebrow';
import { signOutIcon, useConfirm } from '../components/ConfirmDialog';
import { MenuRow } from '../components/MenuRow';
import { Pill } from '../components/Pill';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScroll } from '../components/ScreenScroll';
import { useAppDispatch, useMe } from '../store';
import { canOpen, useLogoutMutation } from '../store/api/authApi';
import { signedOut } from '../store/slices/sessionSlice';
import {
  lastPushToken,
  setLastPushToken,
  useUnregisterDeviceMutation,
} from '../store/api/devicesApi';
import { APP_VERSION } from '../config/appVersion';
import { colors, radius, s, vs } from '../theme';

// Everything that is not a tab. `module` is the key the API grants a person
// (Backend/src/services/modules.js) — a row they may not open is not drawn.
const work = [
  {
    to: 'Notifications',
    module: 'dashboard',
    icon: Bell,
    title: 'Notifications',
    detail: 'What needs you: actions, invitations, minutes',
  },
  {
    to: 'Meetings',
    module: 'meetings',
    icon: Users,
    title: 'My meetings',
    detail: 'Plan, take minutes, follow up actions',
  },
  {
    to: 'LabReadiness',
    module: 'labReadiness',
    icon: FlaskConical,
    title: 'Lab readiness',
    detail: "The laboratory's opening and closing rounds, unit by unit",
  },
  {
    to: 'Logs',
    module: 'logs',
    icon: MessageCircle,
    title: 'Discussion logs',
    detail: 'Calls, chats and corridor talks, in one line',
  },
  {
    to: 'Visits',
    module: 'visits',
    icon: MapPin,
    title: 'Visit observations',
    detail: 'Notes, ratings and photos from site visits',
  },
  {
    to: 'Projects',
    module: 'projects',
    icon: FolderKanban,
    title: 'Projects',
    detail: 'Milestones, owners and progress',
  },
  {
    to: 'Reminders',
    module: 'reminders',
    icon: AlarmClock,
    title: 'Reminders',
    detail: 'Nudges for you and your colleagues, at the minute you choose',
  },
  {
    to: 'Decisions',
    module: 'decisions',
    icon: Scale,
    title: 'Decisions registry',
    detail: 'Every decision on record, and who made it',
  },
];

const account = [
  {
    to: 'Account',
    module: 'dashboard',
    icon: UserRound,
    title: 'My account',
    detail: 'Your name, title and department',
  },
  {
    to: 'ChangePassword',
    module: 'dashboard',
    icon: KeyRound,
    title: 'Change password',
    detail: 'Update your sign-in password',
  },
];

const signOutItem = {
  icon: LogOut,
  title: 'Sign out',
  detail: 'End your shift on this phone',
};

export function MoreScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const me = useMe();
  // A laboratory person reaches the board from its own tab, so More does not offer it twice.
  const labIsATab = Boolean(me?.lab) && !me?.seesAll;
  const [logout] = useLogoutMutation();
  const [unregisterDevice] = useUnregisterDeviceMutation();
  const confirm = useConfirm();

  // Tell the server to forget the session and this phone's push address, then leave. Leaving does
  // not wait for either: a dead token is dropped server-side anyway, and the push address matters
  // most — without this the next person to sign in on this phone would get these notifications.
  const signOut = async () => {
    const yes = await confirm({
      title: 'Sign out of Trust Diary?',
      text: 'You will need your email and password to sign in again.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay',
      tone: 'danger',
      icon: signOutIcon,
    });
    if (yes) {
      const address = lastPushToken();
      if (address) {
        unregisterDevice({ token: address });
        setLastPushToken(null);
      }
      logout();
      dispatch(signedOut());
    }
  };

  const allowed = rows =>
    rows.filter(
      r => canOpen(me, r.module) && !(labIsATab && r.to === 'LabReadiness'),
    );
  const initials = (me?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  const roleLabel =
    me?.role === 'admin'
      ? 'Admin'
      : me?.role === 'manager'
      ? 'Manager'
      : 'Employee';

  return (
    <View style={styles.root}>
      <ScreenHeader eyebrow={me?.email ?? ''} title="More">
        <View style={styles.profile}>
          <Avatar label={initials} size={38} />
          <View style={styles.profileText}>
            <View style={styles.nameRow}>
              <AppText variant="label" color={colors.white}>
                {me?.name}
              </AppText>
              <Pill label={roleLabel} tone="yellow" />
            </View>
            <AppText variant="meta" color={colors.onTealSoft} numberOfLines={1}>
              {[me?.title, me?.department].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      </ScreenHeader>

      <ScreenScroll>
        <Eyebrow label="Daily work" />
        <CardList inset={52}>
          {allowed(work).map(item => (
            <MenuRow
              key={item.title}
              item={item}
              onPress={() => nav.navigate(item.to)}
            />
          ))}
        </CardList>

        <Eyebrow label="Account" />
        <CardList inset={52}>
          {allowed(account).map(item => (
            <MenuRow
              key={item.title}
              item={item}
              onPress={() => nav.navigate(item.to)}
            />
          ))}
          <MenuRow item={signOutItem} danger onPress={signOut} />
        </CardList>

        <AppText variant="meta" color={colors.inkFaint} style={styles.version}>
          Trust Diary {APP_VERSION} · TrustLab Diagnostics Pvt. Ltd.
        </AppText>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    height: vs(52),
    paddingHorizontal: s(10),
    borderRadius: radius.md,
    backgroundColor: colors.tealDeep,
  },
  profileText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  version: { textAlign: 'center', marginTop: vs(18), marginBottom: vs(8) },
});
