/**
 * What the phone remembers about who is signed in.
 *
 * The tabs are chosen from one server-computed flag on the stored profile: `lab` decides whether a
 * person gets Lab Readiness or My Activity. /auth/me brings a fresh profile down whenever the app
 * is opened or brought back to the front, and `userUpdated` puts it in memory — but what the next
 * COLD start begins from is the copy on disk.
 *
 * Saving on a token change alone meant that copy went stale the moment an admin changed anything
 * that does not mint a new token. Moving somebody from Information Technology to Clinical
 * Laboratory did exactly that: the phone kept restoring the old profile and kept showing My
 * Activity, and only signing out and back in — a new token — made it stick.
 */
const mockSave = jest.fn();
jest.mock('../src/store/persist', () => ({
  saveSession: (...a) => mockSave(...a),
  loadSession: () => Promise.resolve(null),
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'android', select: o => o.android },
}));

const { store } = require('../src/store/store');
const {
  restored,
  signedIn,
  userUpdated,
  signedOut,
} = require('../src/store/slices/sessionSlice');

const IT = {
  id: 'u1', name: 'Pavan', department: 'Information Technology', lab: false,
};
const LAB = { ...IT, department: 'Clinical Laboratory', lab: true };

const lastSaved = () => mockSave.mock.calls[mockSave.mock.calls.length - 1]?.[0];

beforeEach(() => {
  mockSave.mockClear();
  store.dispatch(restored({ token: 'tok-1', user: IT }));
  mockSave.mockClear();
});

describe('the stored session', () => {
  it('writes the new profile when a department changes under the same token', () => {
    // Exactly what /auth/me does after an admin moves the person.
    store.dispatch(userUpdated(LAB));

    expect(mockSave).toHaveBeenCalled();
    expect(lastSaved()).toMatchObject({
      token: 'tok-1',                       // unchanged — this is the whole point
      user: { department: 'Clinical Laboratory', lab: true },
    });
  });

  it('so a cold start begins on Lab Readiness, not My Activity', () => {
    store.dispatch(userUpdated(LAB));
    const onDisk = lastSaved();

    // The next launch restores whatever was written.
    store.dispatch(restored(onDisk));
    expect(store.getState().session.user.lab).toBe(true);
  });

  it('does not write when nothing about the session changed', () => {
    store.dispatch(userUpdated(IT));   // same object, same token
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('still saves a brand new sign-in, and clears on sign-out', () => {
    store.dispatch(signedIn({ token: 'tok-2', user: LAB }));
    expect(lastSaved()).toMatchObject({ token: 'tok-2' });

    store.dispatch(signedOut());
    expect(lastSaved()).toBe(null);
  });
});
