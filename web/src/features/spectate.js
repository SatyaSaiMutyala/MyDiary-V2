import { baseApi, getViewAs, readViewAs, setViewAs } from '../store/api/baseApi';
import { store } from '../store/redux/store';

/**
 * Spectator mode — look at the whole of MyDiary as one of your people.
 *
 * Switching is two steps: remember who is being watched (every request then carries them in a
 * header, see baseApi) and throw away everything already fetched, so each screen asks the server
 * again and comes back with that person's meetings, to-do, diary, logs, visits and projects
 * instead of the admin's. Without the second step the pages would keep showing the rows already
 * in hand and nothing would appear to happen — which is exactly how it used to look.
 *
 * Admin-only and read-only; the API enforces both.
 *
 * @param {{ name: string, role?: string, title?: string, department?: string, modules?: string[], status?: string } | null} who
 *   the person to watch, or null to go back to your own work
 */
export function spectate(who) {
  const name = who?.name || '';
  if (getViewAs() === name) return;
  setViewAs(name ? who : null);
  store.dispatch(baseApi.util.resetApiState());
}

/** The person being watched right now, or null when you are looking at your own work. */
export const spectatedUser = () => readViewAs();

/**
 * Where the "that is read-only" line is shown. DialogProvider plugs a toast in here; this module
 * cannot reach the dialogs itself, and a blocked click must never just do nothing — that is what
 * makes a button look broken.
 */
export const onBlockedWhileSpectating = { handler: null };

/**
 * Guard for anything that changes data. The API already refuses writes made while watching someone;
 * this is for the screens still holding sample data in memory, which the server never sees.
 * @param {string} what what the click was trying to do, for the message
 * @returns {boolean} true when the caller must stop
 */
export function blockIfSpectating(what = 'make changes') {
  const who = readViewAs();
  if (!who) return false;
  onBlockedWhileSpectating.handler?.(`⚠ You are seeing MyDiary as ${who.name} — it is read-only. Go back to your own view to ${what}.`);
  return true;
}
