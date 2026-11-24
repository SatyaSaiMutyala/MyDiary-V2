import { createSlice } from '@reduxjs/toolkit';

// Which record the Lab Readiness screen is looking at: the unit, the day and the round.
//
// It lives in the store rather than in the screen so that moving between tabs, opening the history
// and coming back, or following a link into a past record, all return to the same place.

const pad = n => String(n).padStart(2, '0');

/** Today, from this phone's clock. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const initialState = {
  unit: null, // unit key; null until the units have loaded
  date: todayIso(),
  phase: 'opening',
};

const labSlice = createSlice({
  name: 'lab',
  initialState,
  reducers: {
    unitChosen(state, action) {
      state.unit = action.payload;
    },
    dateChosen(state, action) {
      state.date = action.payload || todayIso();
    },
    phaseChosen(state, action) {
      state.phase = action.payload === 'closing' ? 'closing' : 'opening';
    },
  },
});

export const { unitChosen, dateChosen, phaseChosen } = labSlice.actions;
export default labSlice.reducer;
