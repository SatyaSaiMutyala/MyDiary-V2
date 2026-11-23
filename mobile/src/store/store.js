import { AppState } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi } from './api/baseApi';
import { saveSession } from './persist';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
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

// Keep the phone's storage in step with the session, so closing the app does
// not sign the person out.
let lastToken;
store.subscribe(() => {
  const { token, user, loading } = store.getState().session;
  if (loading || token === lastToken) {
    return;
  }
  lastToken = token;
  saveSession(token && user ? { token, user } : null);
});

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

/** The signed-in person, or null while signed out. */
export const useMe = () => useAppSelector(s => s.session.user);
