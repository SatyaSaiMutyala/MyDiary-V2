/**
 * How the board behaves while the server is still thinking.
 *
 * This is what the laboratory feels: a tick has to land under the finger at once, not after a
 * round trip, and a photograph has to appear the moment it is taken. The test runs a real store
 * against a deliberately slow fake server and looks at the cache at each point.
 */
import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '../src/store/api/baseApi';
import { labReadinessApi } from '../src/store/api/labReadinessApi';
import sessionReducer from '../src/store/slices/sessionSlice';
import board from './fixtures/board.json';

const TARGET = {
  unitKey: 'nrl-biochemistry',
  date: '2026-11-25',
  phase: 'opening',
};

/** The board as a day that is only just starting: nothing recorded yet. */
const freshBoard = () => ({
  ...board,
  date: TARGET.date,
  run: null,
  progress: {
    total: board.activities.length,
    done: 0,
    completed: 0,
    deviations: 0,
    na: 0,
    pending: board.activities.length,
    missing: board.activities.map(a => `${a.key} — no status yet`),
    complete: false,
  },
});

const stores = [];
const newStore = () => {
  const store = configureStore({
    reducer: {
      session: sessionReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: getDefault => getDefault().concat(baseApi.middleware),
  });
  stores.push(store);
  return store;
};

/** What the screen would be drawing right now. */
const cached = store =>
  labReadinessApi.endpoints.labBoard.select(TARGET)(store.getState()).data;

const itemOf = (data, key) =>
  (data?.run?.items ?? []).find(i => i.taskKey === key) ?? null;

const tick = () => new Promise(done => setImmediate(done));

/** A fake Response, close enough to the real one for fetchBaseQuery to read it. */
const reply = (status, body) => ({
  ok: status < 400,
  status,
  headers: {
    get: name =>
      name.toLowerCase() === 'content-type' ? 'application/json' : null,
  },
  clone() {
    return this;
  },
  json: async () => body,
  // fetchBaseQuery reads the text and parses it, so this has to be the real thing.
  text: async () => JSON.stringify(body),
});

describe('the board while the server is still thinking', () => {
  let answer; // what the fake server will reply with
  let holdUp; // resolved by the test when the reply should arrive

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      await holdUp;
      return reply(200, answer);
    });
  });
  afterEach(() => {
    global.fetch.mockRestore();
  });

  /** Puts a board in the cache without waiting on the network. */
  const open = [];
  const withBoard = async store => {
    answer = freshBoard();
    holdUp = Promise.resolve();
    const sub = store.dispatch(
      labReadinessApi.endpoints.labBoard.initiate(TARGET),
    );
    open.push(sub);
    await sub;
    expect(cached(store).run).toBeNull();
  };
  // Let the cache go, or its keep-alive timers outlive the test and the runner complains about
  // reaching into an environment that has been torn down.
  afterEach(() => {
    open.splice(0).forEach(sub => sub.unsubscribe());
    stores.splice(0).forEach(st => st.dispatch(baseApi.util.resetApiState()));
  });

  it('shows a tick before the server has answered, and settles on what it saved', async () => {
    const store = newStore();
    await withBoard(store);
    const key = board.activities[0].key;

    // The server is told to take its time.
    let release;
    holdUp = new Promise(go => {
      release = go;
    });
    answer = {
      ...freshBoard(),
      run: {
        startedAt: '2026-11-25T06:05:00.000Z',
        startedBy: 'Venkata Cherukuri',
        items: [
          {
            taskKey: key,
            status: 'done',
            remark: '',
            actionedAt: '2026-11-25T06:05:00.000Z',
            actionedBy: 'Venkata Cherukuri',
          },
        ],
        photos: [],
        reopenLog: [],
      },
      progress: {
        ...freshBoard().progress,
        done: 1,
        completed: 1,
        pending: 0,
        missing: [],
      },
    };

    const sent = store.dispatch(
      labReadinessApi.endpoints.setLabItem.initiate({
        ...TARGET,
        taskKey: key,
        status: 'done',
      }),
    );
    await tick();

    // Nothing has come back yet — and the tick is already on screen, stamped. The stamp has to
    // be there from the first frame: arriving later makes the row taller and shoves the rest of
    // the round down the screen while the person is reading it.
    expect(itemOf(cached(store), key)).toMatchObject({ status: 'done' });
    expect(itemOf(cached(store), key).actionedAt).toBeTruthy();

    release();
    await sent;
    await tick();

    // …and now it carries who did it and when, which only the server knows.
    expect(itemOf(cached(store), key)).toMatchObject({
      status: 'done',
      actionedBy: 'Venkata Cherukuri',
    });
    expect(cached(store).progress.done).toBe(1);
    // One request: the answer was the board, so it was not asked for again.
    expect(global.fetch).toHaveBeenCalledTimes(2); // the first load, then this write
  });

  it('puts the tick back if the server refuses it', async () => {
    const store = newStore();
    await withBoard(store);
    const key = board.activities[0].key;

    // The refusal is made to take its time as well, so the moment in between can be looked at.
    let release;
    const refused = new Promise(go => {
      release = go;
    });
    global.fetch.mockImplementation(async () => {
      await refused;
      return reply(409, { error: { message: 'This record is signed off.' } });
    });

    const sent = store.dispatch(
      labReadinessApi.endpoints.setLabItem.initiate({
        ...TARGET,
        taskKey: key,
        status: 'done',
      }),
    );
    await tick();
    expect(itemOf(cached(store), key).status).toBe('done'); // shown at once, hopefully

    release();
    const result = await sent;
    await tick();

    expect(result.error.message).toBe('This record is signed off.');
    expect(itemOf(cached(store), key)).toBeNull(); // and taken back off
  });

  it("keeps the phone's copy of a photograph after the stored one arrives", async () => {
    const store = newStore();
    await withBoard(store);
    const key = board.activities.find(a => a.photoRequired).key;

    holdUp = Promise.resolve();
    answer = {
      ...freshBoard(),
      run: {
        startedAt: '2026-11-25T06:05:00.000Z',
        items: [],
        photos: [{ id: 'stored-1', taskKey: key, name: 'fridge.jpg' }],
        reopenLog: [],
      },
    };

    await store.dispatch(
      labReadinessApi.endpoints.addLabPhoto.initiate({
        ...TARGET,
        taskKey: key,
        photo: {
          uri: 'file:///tmp/fridge.jpg',
          base64: 'AAAA',
          mimeType: 'image/jpeg',
        },
      }),
    );
    await tick();

    const [stored] = cached(store).run.photos;
    expect(stored.id).toBe('stored-1');
    // The square shows this until the stored one has been fetched, so it never goes blank.
    expect(stored.localUri).toBe('file:///tmp/fridge.jpg');
  });

  it('shows a photograph from the phone while it is still being sent', async () => {
    const store = newStore();
    await withBoard(store);
    const key = board.activities.find(a => a.photoRequired).key;

    let release;
    holdUp = new Promise(go => {
      release = go;
    });
    answer = {
      ...freshBoard(),
      run: {
        startedAt: '2026-11-25T06:05:00.000Z',
        items: [],
        photos: [
          {
            id: 'stored-1',
            taskKey: key,
            name: 'fridge.jpg',
            uploadedBy: 'Venkata Cherukuri',
          },
        ],
        reopenLog: [],
      },
    };

    const sent = store.dispatch(
      labReadinessApi.endpoints.addLabPhoto.initiate({
        ...TARGET,
        taskKey: key,
        photo: {
          uri: 'file:///tmp/fridge.jpg',
          base64: 'AAAA',
          mimeType: 'image/jpeg',
          name: 'fridge.jpg',
        },
      }),
    );
    await tick();

    const sending = cached(store).run.photos;
    expect(sending).toHaveLength(1);
    expect(sending[0].pendingUri).toBe('file:///tmp/fridge.jpg'); // the phone's own copy

    release();
    await sent;
    await tick();

    const stored = cached(store).run.photos;
    expect(stored).toHaveLength(1); // not two — the half-sent one was replaced
    expect(stored[0].id).toBe('stored-1');
    expect(stored[0].pendingUri).toBeUndefined();
  });
});
