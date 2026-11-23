import { Platform } from 'react-native';
import notifee, {
  AndroidCategory,
  AndroidFlags,
  AndroidImportance,
  AndroidNotificationSetting,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import { navigationRef } from '../push';

/**
 * Reminders ring like an alarm.
 *
 * Ported from the v1 app (src/reminders/alarms.ts). A push alone shows a quiet banner, so the phone
 * itself schedules a local alarm for every reminder set for this person. At the minute it rings for
 * up to two minutes, or until Stop is tapped or the reminder is opened. Because the alarm lives on
 * the phone, it rings with no network and even if the app is never opened again.
 *
 * Android: one notification whose sound loops (FLAG_INSISTENT) and times out after two minutes,
 * shown over the lock screen.
 * iPhone: a sound may play for 30 seconds at most, so four notifications are booked 30 seconds
 * apart; stopping one cancels the rest.
 */

const CHANNEL = 'reminders';
const PREFIX = 'rem';
const RING_MS = 120_000;
const IOS_REPEATS = 4;
const IOS_GAP_MS = 30_000;

/** 'YYYY-MM-DD HH:mm' in the phone's own time zone. */
const toDate = remindAt => {
  const [d, t] = String(remindAt ?? '').split(' ');
  const [y, m, day] = String(d ?? '').split('-').map(Number);
  const [h, min] = String(t ?? '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, day || 1, h || 0, min || 0, 0, 0);
};

/**
 * The notification id carries the reminder and the minute it was booked for, so a reminder whose
 * time was changed books a new alarm and the old one is cleared away as stale.
 *
 * v1 ids were numbers; v2's are Mongo ids, so the id is read back as text.
 */
const idFor = (reminder, k) =>
  `${PREFIX}${reminder.id}-${Math.floor(toDate(reminder.remindAt).getTime() / 60000)}-${k}`;

const reminderIdOf = notificationId => {
  const m = String(notificationId ?? '').match(/^rem(.+?)-\d+-\d+$/);
  return m ? m[1] : null;
};

let prepared = false;

/** Channel, categories and permissions. Safe to call more than once. */
export async function prepareAlarms() {
  if (prepared) {
    return;
  }
  prepared = true;
  try {
    await notifee.requestPermission();
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL,
        name: 'Reminders',
        description: 'Rings like an alarm when a reminder is due',
        importance: AndroidImportance.HIGH,
        sound: 'alarm',
        vibration: true,
        vibrationPattern: [300, 500],
        bypassDnd: true,
      });
    } else {
      await notifee.setNotificationCategories([
        {
          id: 'reminder',
          actions: [{ id: 'stop', title: 'Stop', foreground: false }],
        },
      ]);
    }
  } catch (e) {
    // Without permission the server push still shows a plain notification.
  }
}

/** Android 12+: exact alarms need a switch in Settings, asked once. */
async function ensureExactAlarms() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    const settings = await notifee.getNotificationSettings();
    if (settings.android.alarm !== AndroidNotificationSetting.ENABLED) {
      await notifee.openAlarmPermissionSettings();
    }
  } catch (e) {
    // Older Android: no such setting.
  }
}

/**
 * Books (or re-books) the alarms for every reminder set for this person, and drops the ones that
 * were changed or cancelled.
 */
export async function syncAlarms(reminders) {
  await prepareAlarms();
  const now = Date.now();
  const wanted = (reminders ?? []).filter(
    r =>
      r.forMe &&
      r.status === 'scheduled' &&
      toDate(r.remindAt).getTime() > now - 60_000,
  );
  if (wanted.length) {
    await ensureExactAlarms();
  }

  const repeats = Platform.OS === 'ios' ? IOS_REPEATS : 1;
  const keep = new Set();
  for (const r of wanted) {
    for (let k = 0; k < repeats; k += 1) {
      keep.add(idFor(r, k));
    }
  }

  let existing = [];
  try {
    existing = await notifee.getTriggerNotificationIds();
  } catch (e) {
    existing = [];
  }
  const stale = existing.filter(id => id.startsWith(PREFIX) && !keep.has(id));
  if (stale.length) {
    await notifee.cancelTriggerNotifications(stale);
  }
  const have = new Set(existing);

  for (const r of wanted) {
    const at = toDate(r.remindAt).getTime();
    const title = r.mine
      ? `Reminder: ${r.title}`
      : `${r.creator} reminds you: ${r.title}`;
    const body = (r.note ?? '').trim() || `Set for ${r.time}`;
    for (let k = 0; k < repeats; k += 1) {
      const id = idFor(r, k);
      const when = at + k * IOS_GAP_MS;
      if (have.has(id) || when <= now) {
        continue;
      }
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: when,
        alarmManager: { allowWhileIdle: true },
      };
      try {
        await notifee.createTriggerNotification(
          {
            id,
            title,
            body,
            data: { reminderId: String(r.id) },
            android: {
              channelId: CHANNEL,
              category: AndroidCategory.ALARM,
              importance: AndroidImportance.HIGH,
              sound: 'alarm',
              loopSound: true,
              flags: [AndroidFlags.FLAG_INSISTENT],
              timeoutAfter: RING_MS,
              autoCancel: true,
              pressAction: { id: 'default', launchActivity: 'default' },
              fullScreenAction: { id: 'default', launchActivity: 'default' },
              actions: [{ title: 'Stop', pressAction: { id: 'stop' } }],
            },
            ios: {
              sound: 'alarm.wav',
              interruptionLevel: 'timeSensitive',
              categoryId: 'reminder',
            },
          },
          trigger,
        );
      } catch (e) {
        // One bad booking must not stop the others.
      }
    }
  }
}

/** Silence a ringing reminder and drop its remaining repeats. */
export async function stopAlarm(reminderId) {
  try {
    const [displayed, pending] = await Promise.all([
      notifee.getDisplayedNotifications(),
      notifee.getTriggerNotificationIds(),
    ]);
    const mine = id => reminderIdOf(id) === reminderId;
    for (const n of displayed) {
      if (mine(n.id)) {
        await notifee.cancelDisplayedNotification(n.id);
      }
    }
    const rest = pending.filter(id => mine(id));
    if (rest.length) {
      await notifee.cancelTriggerNotifications(rest);
    }
  } catch (e) {
    // Nothing to stop.
  }
}

/** What to do when a ringing reminder is tapped or its Stop is pressed. */
export async function handleAlarmEvent({ type, detail }) {
  const id = reminderIdOf(detail?.notification?.id);
  if (!id) {
    return;
  }
  if (type === EventType.ACTION_PRESS || type === EventType.DISMISSED) {
    await stopAlarm(id);
  } else if (type === EventType.PRESS) {
    await stopAlarm(id);
    if (navigationRef.isReady()) {
      navigationRef.navigate('ReminderDetail', { id });
    }
  }
}

/** Registered once at app start, for events while the app is not open. */
export function registerAlarmHandlers() {
  notifee.onBackgroundEvent(handleAlarmEvent);
}
