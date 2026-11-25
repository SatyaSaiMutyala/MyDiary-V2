/**
 * How much of the round is redrawn when one line of it changes.
 *
 * A round is twenty-six rows, each with three buttons, a photo strip and a text box. Redrawing all
 * of them for one tick — or for one letter typed into a remark — is what made the screen crawl on a
 * real phone. These tests count the rows that actually run again.
 *
 * The count is taken from `needsRemark`, which every row calls exactly once as it renders.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Named `mock…` so jest allows the factory below to reach it.
const mockRendered = jest.fn();
jest.mock('../src/lab/model', () => {
  const real = jest.requireActual('../src/lab/model');
  return {
    ...real,
    needsRemark: (...args) => {
      mockRendered(...args);
      return real.needsRemark(...args);
    },
  };
});
jest.mock('../src/store', () => ({
  store: { getState: () => ({ session: { token: 'test-token' } }) },
}));

const { ChecklistItemRow } = require('../src/components/ChecklistItemRow');

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ACTIVITIES = Array.from({ length: 26 }, (_, i) => ({
  key: `o${String(i + 2).padStart(2, '0')}`,
  section: 'Facility, safety & housekeeping',
  text: `Check number ${i + 1}`,
  time: '07:00',
  photoRequired: i % 5 === 0,
}));

const emptyItems = () =>
  Object.fromEntries(
    ACTIVITIES.map(a => [a.key, { status: null, remark: '', photos: [] }]),
  );

/** The whole round, the way the screen draws it. */
function Round({ items }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      {ACTIVITIES.map(a => (
        <ChecklistItemRow
          key={a.key}
          activity={a}
          item={items[a.key]}
          locked={false}
          // New closures on every render, exactly as the screen passes them.
          onStatus={() => {}}
          onRemark={() => {}}
          onAddPhotos={() => {}}
          onRemovePhoto={() => {}}
        />
      ))}
    </SafeAreaProvider>
  );
}

describe('redrawing a round', () => {
  beforeEach(() => mockRendered.mockClear());

  it('draws every row the first time, and no more', () => {
    act(() => {
      renderer.create(<Round items={emptyItems()} />);
    });
    expect(mockRendered).toHaveBeenCalledTimes(26);
  });

  it('redraws one row when one activity is answered', () => {
    const items = emptyItems();
    let tree;
    act(() => {
      tree = renderer.create(<Round items={items} />);
    });
    mockRendered.mockClear();

    // What a tick does to the board: that one line gets a new object, the rest keep theirs —
    // which is what the cache update in labReadinessApi.js produces.
    const next = { ...items, o05: { status: 'done', remark: '', photos: [] } };
    act(() => {
      tree.update(<Round items={next} />);
    });

    expect(mockRendered).toHaveBeenCalledTimes(1);
  });

  it('redraws nothing when the board is rebuilt but nothing on it changed', () => {
    const items = emptyItems();
    let tree;
    act(() => {
      tree = renderer.create(<Round items={items} />);
    });
    mockRendered.mockClear();

    // A refetch that brings back the same answers hands every row a new object.
    const same = Object.fromEntries(
      Object.entries(items).map(([k, v]) => [k, { ...v }]),
    );
    act(() => {
      tree.update(<Round items={same} />);
    });

    expect(mockRendered).toHaveBeenCalledTimes(0);
  });

  it('redraws one row while a photograph of it is being sent', () => {
    const items = emptyItems();
    let tree;
    act(() => {
      tree = renderer.create(<Round items={items} />);
    });
    mockRendered.mockClear();

    const sending = {
      ...items,
      o02: {
        status: 'done',
        remark: '',
        photos: [
          { id: 'sending-1', pending: true, source: { uri: 'file:///x.jpg' } },
        ],
      },
    };
    act(() => {
      tree.update(<Round items={sending} />);
    });
    expect(mockRendered).toHaveBeenCalledTimes(1);

    // …and again, once, when the stored one takes its place.
    mockRendered.mockClear();
    const stored = {
      ...sending,
      o02: {
        ...sending.o02,
        photos: [
          { id: 'p1', pending: false, source: { uri: 'https://api/x' } },
        ],
      },
    };
    act(() => {
      tree.update(<Round items={stored} />);
    });
    expect(mockRendered).toHaveBeenCalledTimes(1);
  });
});

describe('how much a row grows when it is answered', () => {
  const boxes = node => {
    if (!node || typeof node !== 'object') {
      return 0;
    }
    if (Array.isArray(node)) {
      return node.reduce((n, c) => n + boxes(c), 0);
    }
    const own = node.type === 'TextInput' ? 1 : 0;
    return own + boxes(node.children);
  };

  const row = item =>
    renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ChecklistItemRow
          activity={ACTIVITIES[1]}
          item={item}
          locked={false}
          onStatus={() => {}}
          onRemark={() => {}}
        />
      </SafeAreaProvider>,
    );

  it('opens no note box for a plain "Done"', () => {
    let tree;
    act(() => {
      tree = row({ status: 'done', remark: '', photos: [] });
    });
    expect(boxes(tree.toJSON())).toBe(0);
  });

  it('opens one for a deviation, which has to say why', () => {
    let tree;
    act(() => {
      tree = row({ status: 'deviation', remark: '', photos: [] });
    });
    expect(boxes(tree.toJSON())).toBe(1);
  });

  it('opens one for an N/A as well', () => {
    let tree;
    act(() => {
      tree = row({ status: 'na', remark: '', photos: [] });
    });
    expect(boxes(tree.toJSON())).toBe(1);
  });

  it('keeps a note that is already written', () => {
    let tree;
    act(() => {
      tree = row({
        status: 'done',
        remark: 'Fridge door reseated.',
        photos: [],
      });
    });
    expect(boxes(tree.toJSON())).toBe(1);
  });
});
