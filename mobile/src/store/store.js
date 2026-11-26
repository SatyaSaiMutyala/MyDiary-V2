import { AppState } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi } from './api/baseApi';
import { saveSession } from './persist';
import labReducer from './slices/labSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    lab: labReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: getDefault => getDefault().concat(baseApi.middleware),
});

// Tell the API cache when the app comes back to the front, so what is on
// screen is fetched again (refetchOnFocus in baseApi).
setupListeners(store.dispatch, (dispatch, actions) => {
  const sub = AppState.addEventListener('change', state => {
    dispatch(state === 'active' ? actions.onFocus() : actions.onFocusLost());
  });
  return () => sub.remove();
});

// Keep the phone's storage in step with the session, so closing the app does not sign the person
// out — and so the next cold start begins from who the person is NOW.
//
// This used to compare the token alone. A token does not change when an admin moves somebody
// between departments, grants a module or sets their unit: /auth/me brings the new profile down and
// `userUpdated` puts it in memory, but the copy on disk was left as it was. The app then looked
// right until it was next opened from cold, when the stale profile was restored and the person was
// back in the wrong place — someone moved from Information Technology to Clinical Laboratory kept
// landing on My Activity instead of Lab Readiness, and only a sign-out and sign-in (a new token)
// made it stick. So the profile is compared too. The reducers replace the user object rather than
// mutating it, so comparing the reference is enough to notice.
let lastToken;
let lastUser;
store.subscribe(() => {
  const { token, user, loading } = store.getState().session;
  if (loading || (token === lastToken && user === lastUser)) {
    return;
  }
  lastToken = token;
  lastUser = user;
  saveSession(token && user ? { token, user } : null);
});

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

/** The signed-in person, or null while signed out. */
export const useMe = () => useAppSelector(s => s.session.user);
