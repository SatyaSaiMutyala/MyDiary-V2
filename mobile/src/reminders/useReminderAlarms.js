import { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { useAppSelector } from '../store';
import { useListRemindersQuery } from '../store/api/remindersApi';
import { handleAlarmEvent, syncAlarms } from './alarms';

/**
 * Keeps the phone's local alarms in step with the reminders set for this person.
 *
 * Ported from the v1 app (src/reminders/useReminderAlarms.ts). The list is read again whenever the
 * app comes back to the foreground or a reminder push arrives — both already invalidate the
 * Reminders cache — and every change re-books the alarms.
 *
 * Only what is still scheduled matters, so the upcoming box is enough; `syncAlarms` filters it down
 * to the ones actually for this person.
 */
export function useReminderAlarms() {
  const token = useAppSelector(st => st.session.token);
  // 200 is the API's own ceiling, so one page always holds everything upcoming.
  const { data } = useListRemindersQuery(
    { box: 'upcoming', limit: 200 },
    { skip: !token },
  );

  useEffect(() => {
    if (!token || !data?.items) {
      return;
    }
    syncAlarms(data.items);
  }, [token, data]);

  // Taps and Stop while the app is open. The background case is registered in index.js.
  useEffect(() => notifee.onForegroundEvent(handleAlarmEvent), []);
}
