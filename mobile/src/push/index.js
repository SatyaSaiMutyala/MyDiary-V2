import { PermissionsAndroid, Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Push notifications through Firebase Cloud Messaging.
 *
 * Ported from the v1 app (src/push/index.ts). The Firebase module is loaded on demand and every
 * call here fails quietly: a phone that cannot receive pushes — a simulator, or one where the
 * person said no — simply gets none, and the app works exactly as usual.
 */

export const navigationRef = createNavigationContainerRef();

const firebase = () => {
  try {
    return require('@react-native-firebase/messaging');
  } catch (e) {
    return null;
  }
};

/** The person is asked before notifications are shown: always on iPhone, and on Android 13+. */
async function allowed(fb) {
  if (Platform.OS === 'ios') {
    const status = await fb.requestPermission(fb.getMessaging());
    return (
      status === fb.AuthorizationStatus.AUTHORIZED ||
      status === fb.AuthorizationStatus.PROVISIONAL
    );
  }
  if (Number(Platform.Version) < 33) {
    return true;
  }
  const answer = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return answer === PermissionsAndroid.RESULTS.GRANTED;
}

/** This phone's push address, or null when push is unavailable or the person said no. */
export async function pushToken() {
  const fb = firebase();
  if (!fb) {
    return null;
  }
  try {
    if (!(await allowed(fb))) {
      return null;
    }
    return await fb.getToken(fb.getMessaging());
  } catch (e) {
    return null;
  }
}

/**
 * Opens what a notification is about.
 *
 * The server sends the notification's `type`; without an id there is nothing specific to open, so
 * a tap lands on the list that type belongs to — which is still better than the home screen.
 */
export function openLink(data) {
  if (!navigationRef.isReady()) {
    return;
  }
  const type = data?.type ?? data?.kind;
  const id = data?.id;

  const go = (name, params) => navigationRef.navigate(name, params);

  switch (String(type ?? '').split('.')[0]) {
    case 'action':
      return id ? go('TaskDetail', { id }) : go('Tabs', { screen: 'To-Do' });
    case 'meeting':
      return id ? go('MeetingDetail', { id }) : go('Meetings');
    case 'minutes':
      return id ? go('MeetingMinutes', { id }) : go('Meetings');
    case 'reminder':
      return id ? go('ReminderDetail', { id }) : go('Reminders');
    case 'visit':
      return id ? go('VisitDetail', { id }) : go('Visits');
    case 'project':
      return id ? go('ProjectDetail', { id }) : go('Projects');
    case 'log':
      return id ? go('LogDetail', { id }) : go('Logs');
    case 'decision':
      return go('Decisions');
    case 'diary':
      return id ? go('DiaryEntry', { id }) : go('Tabs', { screen: 'Diary' });
    default:
      return go('Notifications');
  }
}

/**
 * Starts listening. Returns a function that stops it.
 *
 * @param {{ onArrive: (type?: string) => void, onNewToken: (token: string) => void }} handlers
 */
export function listenForPushes({ onArrive, onNewToken }) {
  const fb = firebase();
  if (!fb) {
    return () => {};
  }
  const m = fb.getMessaging();
  const stops = [
    fb.onMessage(m, async msg => onArrive(msg?.data?.type ?? msg?.data?.kind)),
    fb.onTokenRefresh(m, onNewToken),
    // Tapped while the app was in the background.
    fb.onNotificationOpenedApp(m, msg => {
      onArrive(msg?.data?.type ?? msg?.data?.kind);
      openLink(msg?.data);
    }),
  ];
  // Tapped while the app was closed: it opened the app.
  fb.getInitialNotification(m)
    .then(msg => {
      if (msg) {
        // Give the first screen a moment to mount.
        setTimeout(() => openLink(msg.data), 600);
      }
    })
    .catch(() => {});
  return () => stops.forEach(stop => stop());
}

/**
 * Android needs a handler registered for pushes that arrive while the app is not running. The
 * system shows the notification itself; there is nothing to do here.
 */
export function registerBackgroundHandler() {
  const fb = firebase();
  if (fb) {
    fb.setBackgroundMessageHandler(fb.getMessaging(), async () => {});
  }
}
