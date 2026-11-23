import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { ANDROID_PACKAGE_ID, PLAY_STORE_URL } from '../config/appVersion';
import { installedVersion } from './installedVersion';
import { fetchPlayStoreVersion } from './playStoreVersion';

// '1.10' is newer than '1.9': compare part by part as numbers.
export function isNewer(candidate, current) {
  const a = String(candidate)
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  const b = String(current)
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) {
      return x > y;
    }
  }
  return false;
}

/**
 * Tells whether this build is too old to keep using. Android only, and nothing is asked of the
 * MyDiary backend — the same way CMD Approval Hub, AIMS and Trust GateBook do it.
 *
 * The app compares its own version with the one live on Google Play, when it starts and every time
 * it comes back to the front. If the store has a newer one, the app is blocked until it is updated.
 *
 * Two things keep this from locking people out by mistake:
 *  - the comparison is against the version ANDROID says is installed, not one written into the
 *    JavaScript when the bundle was made;
 *  - any failure — no network, Google changing its page, the app not published yet — lets the
 *    person in. A wrong block costs more than a late update.
 *
 * iPhone is never blocked (the App Store has no page to read this way). Debug builds never are.
 */
export function useForceUpdate() {
  const [storeVersion, setStoreVersion] = useState(null);
  const active = !__DEV__ && Platform.OS === 'android';

  // One look at the store at a time.
  const running = useRef(false);

  const check = useCallback(async () => {
    if (running.current) {
      return;
    }
    running.current = true;
    try {
      const latest = await fetchPlayStoreVersion();
      // Once the store is known to be ahead it stays so: a later look that fails (no network) must
      // not let an old build back in.
      if (latest && isNewer(latest, installedVersion())) {
        setStoreVersion(latest);
      }
    } catch (e) {
      // Offline, the page changed, the app is not published yet: let them in.
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    check();
    // Back from anywhere: look again. This covers a release going live while the app was in the
    // background, and someone who opens the store, does not update, and comes back.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, [active, check]);

  const openStore = async () => {
    // No canOpenURL guard: on Android 11+ it says no for schemes not listed in <queries>, which
    // would trap the person behind the dialog.
    try {
      await Linking.openURL(`market://details?id=${ANDROID_PACKAGE_ID}`);
    } catch (e) {
      Linking.openURL(PLAY_STORE_URL).catch(() => {});
    }
  };

  return {
    updateRequired: active && storeVersion !== null,
    storeVersion,
    openStore,
  };
}
