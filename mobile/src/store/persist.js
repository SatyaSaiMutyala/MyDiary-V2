import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mydiary.session';

// The token and profile stay on the phone so people do not sign in every day.
export async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(saved) {
  try {
    if (saved) {
      await AsyncStorage.setItem(KEY, JSON.stringify(saved));
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    // Storage failing must never block the app; the person just signs in again.
  }
}
