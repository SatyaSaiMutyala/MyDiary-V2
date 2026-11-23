import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { baseApi } from '../store/api/baseApi';
import {
  devicesApi,
  lastPushToken,
  setLastPushToken,
} from '../store/api/devicesApi';
import { listenForPushes, pushToken } from './index';

/**
 * Which cached data to fetch again when a push arrives, by the notification's type.
 *
 * A push means "something changed" — the bell is always stale, and usually the module it came from
 * too, so the screen behind the notification is right the moment it is opened.
 */
const BY_TYPE = {
  action: ['Notifications', 'Actions', 'Action', 'Dashboard'],
  meeting: ['Notifications', 'Meetings', 'Meeting', 'Diary', 'Dashboard'],
  minutes: ['Notifications', 'Meetings', 'Meeting'],
  reminder: ['Notifications', 'Reminders', 'Reminder', 'Dashboard'],
  visit: ['Notifications', 'Visits', 'Visit', 'Dashboard'],
  project: ['Notifications', 'Projects', 'Project'],
  log: ['Notifications', 'Logs', 'Log'],
  decision: ['Notifications', 'Decisions', 'Decision'],
  diary: ['Notifications', 'Diary', 'DiaryEntry', 'Dashboard'],
};
const tagsFor = type => BY_TYPE[String(type ?? '').split('.')[0]] ?? ['Notifications'];

/**
 * Runs while someone is signed in: gives the server this phone's push address, and keeps what is on
 * screen fresh when a push arrives.
 */
export function usePush() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(st => st.session.token);

  useEffect(() => {
    // Nobody signed in: no address to give, and nothing to keep fresh.
    if (!token) {
      return undefined;
    }

    const register = address => {
      if (!address || address === lastPushToken()) {
        return;
      }
      setLastPushToken(address);
      dispatch(
        devicesApi.endpoints.registerDevice.initiate({
          token: address,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        }),
      );
    };

    pushToken().then(register);

    return listenForPushes({
      onArrive: type => dispatch(baseApi.util.invalidateTags(tagsFor(type))),
      onNewToken: register,
    });
  }, [dispatch, token]);
}
