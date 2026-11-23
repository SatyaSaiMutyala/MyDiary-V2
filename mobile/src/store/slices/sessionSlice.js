import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: true,
  token: null,
  user: null,
  endedBecause: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // Called once at start with whatever the phone had saved.
    restored(state, action) {
      state.loading = false;
      state.token = action.payload?.token ?? null;
      state.user = action.payload?.user ?? null;
    },
    signedIn(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.endedBecause = null;
    },
    userUpdated(state, action) {
      state.user = action.payload;
    },
    signedOut(state) {
      state.token = null;
      state.user = null;
      state.endedBecause = null;
    },
    // The server refused the token: back to sign in with the reason.
    sessionEnded(state, action) {
      state.token = null;
      state.user = null;
      state.endedBecause = action.payload;
    },
  },
});

export const { restored, signedIn, userUpdated, signedOut, sessionEnded } =
  sessionSlice.actions;
export default sessionSlice.reducer;
