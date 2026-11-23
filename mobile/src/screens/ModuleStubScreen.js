import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Hammer } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { IconTile } from '../components/IconTile';
import { ScreenScroll } from '../components/ScreenScroll';
import { TopBar } from '../components/TopBar';
import { colors, s, vs } from '../theme';

/** What each route is called, and what it will hold once it is built. */
const MODULES = {
  Notifications: {
    title: 'Notifications',
    detail:
      'Everything waiting on you: action items assigned to you, meeting invitations, and minutes circulated for review.',
  },
  Meetings: {
    title: 'My Meetings',
    detail:
      'Schedule a meeting, take the minutes while it runs, record decisions, and turn commitments into action items.',
  },
  Logs: {
    title: 'Discussion Logs',
    detail:
      'The calls, chats and corridor conversations that never became meetings — captured in one line, searchable by person and topic.',
  },
  Visits: {
    title: 'Visit Observations',
    detail:
      'Site visits with structured observations, ratings, photos and follow-up actions that flow into your To-Do.',
  },
  Projects: {
    title: 'Projects',
    detail: 'Milestones, tasks, risks, the team and progress against plan.',
  },
  Decisions: {
    title: 'Decisions Registry',
    detail:
      'Every decision on record across all meetings — what was decided, by whom, and when.',
  },
  Templates: {
    title: 'Agenda Templates',
    detail:
      'Ready-made agendas for recurring meetings, loaded into a new meeting in one tap.',
  },
  Account: {
    title: 'My Account',
    detail: 'Your name, job title and department.',
  },
  ChangePassword: {
    title: 'Change Password',
    detail: 'Set a new sign-in password for this account.',
  },
  Settings: {
    title: 'Settings',
    detail:
      'People, what each person may open, and the activity log of every change.',
  },
};

/**
 * Stands in for a module that has not been built yet.
 *
 * Every row under More leads somewhere real, so nothing on screen is a dead end: the screen says
 * what the module will do rather than failing silently. Each one is replaced by its real screen as
 * the module is built, and this file goes away once the last one lands.
 */
export function ModuleStubScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const module = MODULES[route.name] ?? {
    title: route.name,
    detail: 'This part of the app is still being built.',
  };

  return (
    <View style={styles.root}>
      <TopBar title={module.title} onBack={() => nav.goBack()} />
      <ScreenScroll>
        <Card style={styles.card}>
          <IconTile bg={colors.tealTint} size={46}>
            <Hammer size={s(22)} color={colors.teal} strokeWidth={1.9} />
          </IconTile>
          <AppText variant="heading" style={styles.title}>
            {module.title} is on the way
          </AppText>
          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.detail}
          >
            {module.detail}
          </AppText>
          <AppText variant="meta" color={colors.inkFaint} style={styles.note}>
            It already works on the website. The phone screen is being built
            next.
          </AppText>
        </Card>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  card: { alignItems: 'center', padding: s(22), gap: vs(10), marginTop: vs(8) },
  title: { textAlign: 'center', marginTop: vs(4) },
  detail: { textAlign: 'center' },
  note: { textAlign: 'center', marginTop: vs(6) },
});
