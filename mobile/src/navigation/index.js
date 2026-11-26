import React, { useCallback, useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForceUpdateDialog } from '../components/ForceUpdateDialog';
import { AccountScreen } from '../screens/AccountScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { DecisionsScreen } from '../screens/DecisionsScreen';
import { DiaryEntryFormScreen } from '../screens/DiaryEntryFormScreen';
import { DiaryEntryScreen } from '../screens/DiaryEntryScreen';
import { DiaryScreen } from '../screens/DiaryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LabHistoryScreen } from '../screens/LabHistoryScreen';
import { LabReadinessScreen } from '../screens/LabReadinessScreen';
import { LabRecordScreen } from '../screens/LabRecordScreen';
import { LabReopenScreen } from '../screens/LabReopenScreen';
import { LabSignOffScreen } from '../screens/LabSignOffScreen';
import { LogDetailScreen } from '../screens/LogDetailScreen';
import { LogFormScreen } from '../screens/LogFormScreen';
import { LogsScreen } from '../screens/LogsScreen';
import { MeetingActionsScreen } from '../screens/MeetingActionsScreen';
import { MeetingDecisionsScreen } from '../screens/MeetingDecisionsScreen';
import { MeetingDetailScreen } from '../screens/MeetingDetailScreen';
import { MeetingFormScreen } from '../screens/MeetingFormScreen';
import { MeetingLiveScreen } from '../screens/MeetingLiveScreen';
import { MeetingMinutesScreen } from '../screens/MeetingMinutesScreen';
import { MeetingRequestsScreen } from '../screens/MeetingRequestsScreen';
import { MeetingsScreen } from '../screens/MeetingsScreen';
import { MeetingSummaryScreen } from '../screens/MeetingSummaryScreen';
import { MeetingTemplatesScreen } from '../screens/MeetingTemplatesScreen';
import { MilestoneFormScreen } from '../screens/MilestoneFormScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProjectDetailScreen } from '../screens/ProjectDetailScreen';
import { ProjectFormScreen } from '../screens/ProjectFormScreen';
import { ProjectKpiFormScreen } from '../screens/ProjectKpiFormScreen';
import { ProjectMemberFormScreen } from '../screens/ProjectMemberFormScreen';
import { ProjectRiskFormScreen } from '../screens/ProjectRiskFormScreen';
import { ReminderDetailScreen } from '../screens/ReminderDetailScreen';
import { ReminderFormScreen } from '../screens/ReminderFormScreen';
import { RemindersScreen } from '../screens/RemindersScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { ProjectTaskFormScreen } from '../screens/ProjectTaskFormScreen';
import { ProjectTemplatesScreen } from '../screens/ProjectTemplatesScreen';
import { RequestMeetingScreen } from '../screens/RequestMeetingScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { TodoScreen } from '../screens/TodoScreen';
import { VisitDetailScreen } from '../screens/VisitDetailScreen';
import { VisitFormScreen } from '../screens/VisitFormScreen';
import { VisitsScreen } from '../screens/VisitsScreen';
import { useAppDispatch, useAppSelector } from '../store';
import { useMeQuery } from '../store/api/authApi';
import { loadSession } from '../store/persist';
import { restored } from '../store/slices/sessionSlice';
import { navigationRef } from '../push';
import { usePush } from '../push/usePush';
import { useReminderAlarms } from '../reminders/useReminderAlarms';
import { useForceUpdate } from '../update/useForceUpdate';
import { colors } from '../theme';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.ground },
};

const renderTabBar = props => <TabBar {...props} />;

/**
 * The five tabs, in the same shape as the v1 app: the work you do every day is one tap away,
 * everything else lives under More.
 *
 * The fourth one depends on where the person works. Somebody in a department that runs a
 * readiness board gets **Lab** — the board itself, which is that department's opening and closing
 * round. Everybody else, admins included, gets **Activity**: their own department's shift
 * checklist.
 */
function Tabs() {
  const user = useAppSelector(st => st.session.user);
  // One or the other, decided by the person's own department — an admin sets the board up in
  // Department Master but does not run it, so they get their own department's checklist.
  const lab = Boolean(user?.lab);
  const activity = !lab;

  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="To-Do" component={TodoScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} />
      {lab ? <Tab.Screen name="Lab" component={LabReadinessScreen} /> : null}
      {activity ? (
        <Tab.Screen name="Activity" component={ActivityScreen} />
      ) : null}
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

// Blocks every screen while this build is too old. Shown only after the
// splash, which would otherwise cover it.
/**
 * Gives the server this phone's push address while someone is signed in, and refreshes what a push
 * is about when one arrives. It draws nothing.
 */
function PushGate() {
  usePush();
  // The phone books its own alarm for every upcoming reminder, so one rings even with no network.
  useReminderAlarms();
  // And it asks who it is signed in as, which refreshes the stored session: a department, a module
  // or a unit an admin changed reaches the phone on the next open, without a sign-out.
  useMeQuery();
  return null;
}

function UpdateGate() {
  const { updateRequired, storeVersion, openStore } = useForceUpdate();
  return (
    <ForceUpdateDialog
      visible={updateRequired}
      storeVersion={storeVersion}
      onUpdate={openStore}
    />
  );
}

export function RootNavigator() {
  const dispatch = useAppDispatch();
  const { token, loading } = useAppSelector(st => st.session);
  const [booting, setBooting] = useState(true);
  const finishBoot = useCallback(() => setBooting(false), []);

  // Read the saved token while the splash screen plays.
  useEffect(() => {
    loadSession().then(saved => dispatch(restored(saved)));
  }, [dispatch]);

  if (booting || loading) {
    return <SplashScreen onDone={finishBoot} />;
  }
  if (!token) {
    return (
      <>
        <UpdateGate />
        <SignInScreen />
      </>
    );
  }
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <PushGate />
      <UpdateGate />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />

        {/* Meetings — built */}
        <Stack.Screen name="Meetings" component={MeetingsScreen} />
        <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} />
        <Stack.Screen name="MeetingForm" component={MeetingFormScreen} />
        <Stack.Screen name="MeetingMinutes" component={MeetingMinutesScreen} />
        <Stack.Screen name="MeetingLive" component={MeetingLiveScreen} />
        <Stack.Screen name="MeetingActions" component={MeetingActionsScreen} />
        <Stack.Screen
          name="MeetingDecisions"
          component={MeetingDecisionsScreen}
        />
        <Stack.Screen name="MeetingSummary" component={MeetingSummaryScreen} />
        <Stack.Screen
          name="MeetingRequests"
          component={MeetingRequestsScreen}
        />
        <Stack.Screen name="RequestMeeting" component={RequestMeetingScreen} />
        <Stack.Screen
          name="MeetingTemplates"
          component={MeetingTemplatesScreen}
        />

        {/* My To-Do — built */}
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} />

        {/* My Diary — built */}
        <Stack.Screen name="DiaryEntry" component={DiaryEntryScreen} />
        <Stack.Screen name="DiaryEntryForm" component={DiaryEntryFormScreen} />

        {/* The person's own account — built */}
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

        {/* Reminders — built */}
        <Stack.Screen name="Reminders" component={RemindersScreen} />
        <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
        <Stack.Screen name="ReminderForm" component={ReminderFormScreen} />

        {/* Discussion Logs — built */}
        <Stack.Screen name="Logs" component={LogsScreen} />
        <Stack.Screen name="LogDetail" component={LogDetailScreen} />
        <Stack.Screen name="LogForm" component={LogFormScreen} />

        {/* My Visits — built */}
        <Stack.Screen name="Visits" component={VisitsScreen} />
        <Stack.Screen name="VisitDetail" component={VisitDetailScreen} />
        <Stack.Screen name="VisitForm" component={VisitFormScreen} />

        {/* Lab Readiness — the laboratory's daily opening and closing rounds */}
        <Stack.Screen name="LabReadiness" component={LabReadinessScreen} />
        <Stack.Screen name="LabSignOff" component={LabSignOffScreen} />
        <Stack.Screen name="LabReopen" component={LabReopenScreen} />
        <Stack.Screen name="LabHistory" component={LabHistoryScreen} />
        <Stack.Screen name="LabRecord" component={LabRecordScreen} />

        {/* Decisions registry — built */}
        <Stack.Screen name="Decisions" component={DecisionsScreen} />

        {/* Notifications — built */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />

        {/* My Projects — built */}
        <Stack.Screen name="Projects" component={ProjectsScreen} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="ProjectForm" component={ProjectFormScreen} />
        <Stack.Screen
          name="ProjectTemplates"
          component={ProjectTemplatesScreen}
        />
        <Stack.Screen name="MilestoneForm" component={MilestoneFormScreen} />
        <Stack.Screen
          name="ProjectTaskForm"
          component={ProjectTaskFormScreen}
        />
        <Stack.Screen
          name="ProjectRiskForm"
          component={ProjectRiskFormScreen}
        />
        <Stack.Screen name="ProjectKpiForm" component={ProjectKpiFormScreen} />
        <Stack.Screen
          name="ProjectMemberForm"
          component={ProjectMemberFormScreen}
        />

        {/* Every destination More offers now has a real screen — there are no stubs left.
             Settings (people, permissions, the activity log) is deliberately website-only, so
             More does not offer it at all. */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
