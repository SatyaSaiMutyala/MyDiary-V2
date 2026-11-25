/**
 * Lab Readiness on the phone, against what the API actually sends.
 *
 * The fixtures in __tests__/fixtures are real answers captured from the v2 API — a signed opening
 * round with a deviation, N/As and a photograph. They are the contract between the server and these
 * screens, so a change on either side that breaks the other shows up here.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import board from './fixtures/board.json';
import day from './fixtures/day.json';
import history from './fixtures/history.json';
import record from './fixtures/record.json';

import {
  groupBoard,
  groupRecord,
  isComplete,
  needsPhoto,
  needsRemark,
  clock,
} from '../src/lab/model';
import { settle } from '../src/store/api/labReadinessApi';
import { ChecklistItemRow } from '../src/components/ChecklistItemRow';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { LabSections } from '../src/components/LabSections';
import { LabRecordRow } from '../src/components/LabRecordRow';
import { ReopenLog } from '../src/components/ReopenLog';

// The model reads the session's token for the image headers; one is not needed to render.
jest.mock('../src/store', () => ({
  store: { getState: () => ({ session: { token: 'test-token' } }) },
}));

/**
 * All the words a rendered tree puts on screen, as one string.
 *
 * React splits an interpolated line into several children ("26", " of ", "26", " recorded"), so the
 * pieces are joined back together before anything is looked for in them.
 */
const words = node => {
  if (node === null || node === undefined || node === false) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(words).join('');
  }
  // Text typed into a field is its `value`, not a child of it.
  const own = typeof node.props?.value === 'string' ? node.props.value : '';
  return own + words(node.children);
};
const text = tree => words(tree.toJSON());

// A screen asks the phone how much of it the notch and the home bar take; off a phone, it is told.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const draw = element => {
  let tree;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>,
    );
  });
  return tree;
};

describe('the board, as the API sends it', () => {
  const { activities, items, sections } = groupBoard(board);

  it('reads every activity into a section', () => {
    expect(activities.length).toBe(board.activities.length);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.reduce((n, s) => n + s.rows.length, 0)).toBe(
      activities.length,
    );
    // One block per heading, even though the sheet comes round to the same heading twice.
    expect(new Set(sections.map(s => s.title)).size).toBe(sections.length);
  });

  it('carries each answer, its remark and its photographs', () => {
    const deviation = activities.find(a => items[a.key].status === 'deviation');
    expect(items[deviation.key].remark).toBeTruthy();

    const withPhoto = activities.find(a => items[a.key].photos.length);
    expect(withPhoto).toBeTruthy();
    const photo = items[withPhoto.key].photos[0];
    expect(photo.source.uri).toContain(
      `/lab-readiness/${board.unit.key}/${board.date}/${board.phase}/photos/`,
    );
    expect(photo.source.headers.Authorization).toBe('Bearer test-token');
  });

  it('agrees with the API about what is complete', () => {
    const open = activities.filter(a => !isComplete(a, items[a.key]));
    expect(open.map(a => a.key)).toEqual(
      board.progress.missing.map(m => m.split(' — ')[0]),
    );
    expect(open.length === 0).toBe(board.progress.complete);
  });

  it('applies the same two rules the API applies', () => {
    const photoAct = {
      key: 'x',
      photoRequired: true,
      section: 'S',
      text: 't',
      time: '',
    };
    const noPhoto = { status: 'done', remark: '', photos: [] };
    expect(needsPhoto(photoAct, noPhoto)).toBe(true);
    // An activity that did not happen as written explains itself instead of photographing nothing.
    expect(
      needsPhoto(photoAct, { status: 'na', remark: 'why', photos: [] }),
    ).toBe(false);
    expect(needsRemark({ status: 'na', remark: '', photos: [] })).toBe(true);
    expect(needsRemark({ status: 'deviation', remark: '  ', photos: [] })).toBe(
      true,
    );
    expect(needsRemark({ status: 'done', remark: '', photos: [] })).toBe(false);
  });

  it('reads a timestamp as a clock time', () => {
    expect(clock(board.run.signedAt)).toMatch(/^\d{2}:\d{2}$/);
    expect(clock(null)).toBe('');
    expect(clock('not a date')).toBe('');
  });
});

describe('the screens draw it', () => {
  const { items, sections } = groupBoard(board);

  it('renders a checklist row with its answer, remark and photograph', () => {
    const activity = sections
      .flatMap(s => s.rows)
      .find(a => items[a.key].status === 'deviation');
    const out = text(
      draw(
        <ChecklistItemRow
          activity={activity}
          item={items[activity.key]}
          locked={false}
          onStatus={() => {}}
          onRemark={() => {}}
        />,
      ),
    );
    expect(out).toContain(activity.text);
    expect(out).toContain(items[activity.key].remark);
  });

  it('renders every section of a signed round without a single missing field', () => {
    const out = text(
      draw(
        <LabSections
          sections={sections}
          items={items}
          renderRow={a => (
            <ChecklistItemRow
              key={a.key}
              activity={a}
              item={items[a.key]}
              locked
            />
          )}
        />,
      ),
    );
    for (const sec of sections) {
      expect(out).toContain(sec.title);
    }
  });

  it('renders a history row from the list the API returns', () => {
    const row = history.records[0];
    const out = text(draw(<LabRecordRow record={row} onPress={() => {}} />));
    expect(out).toContain(row.unitName);
    expect(out).toContain('Signed');
    expect(out).toContain(`${row.done} of ${row.total} recorded`);
  });

  it('renders the reopen log, and nothing at all when there is none', () => {
    let empty;
    act(() => {
      empty = renderer.create(<ReopenLog log={[]} />);
    });
    expect(empty.toJSON()).toBeNull();

    const out = text(
      draw(
        <ReopenLog
          log={[
            {
              at: '2026-11-24T06:20:00.000Z',
              by: 'Anusha Singh',
              reason: 'Ticked the wrong line.',
            },
          ]}
        />,
      ),
    );
    expect(out).toContain('Anusha Singh');
    expect(out).toContain('Ticked the wrong line.');
    expect(out).toContain('Reopened 1 time');
  });
});

describe('a past record', () => {
  it('shows the wording it was signed with, not today’s checklist', () => {
    const { activities, items, sections } = groupRecord(record);
    expect(activities.length).toBe(record.run.items.length);
    expect(sections.length).toBeGreaterThan(0);
    const first = record.run.items[0];
    expect(activities[0].text).toBe(first.text);
    expect(items[first.taskKey].status).toBe(first.status);
  });

  it('is empty, not broken, when the record has gone', () => {
    expect(groupRecord(null)).toEqual({
      activities: [],
      items: {},
      sections: [],
    });
    expect(groupBoard(undefined)).toEqual({
      activities: [],
      items: {},
      sections: [],
    });
  });
});

describe('the day', () => {
  it('lists every unit with both of its rounds', () => {
    expect(day.units.length).toBeGreaterThan(0);
    for (const u of day.units) {
      expect(u.phases.opening).toBeDefined();
      expect(u.phases.closing).toBeDefined();
    }
    const signed = day.units.find(u => u.phases.opening.signedAt);
    expect(signed.phases.opening.status).toBe('signed');
  });
});

describe('settling a write into the board on screen', () => {
  // What the phone has on screen: o02 ticked a moment ago, o03 about to be answered.
  const onScreen = () => ({
    activities: board.activities,
    progress: {
      total: 2,
      done: 1,
      missing: ['o03 — no status yet'],
      complete: false,
    },
    declaration: 'old wording',
    run: {
      startedAt: '2026-11-25T06:00:00.000Z',
      items: [
        { taskKey: 'o02', status: 'done', remark: '' },
        { taskKey: 'o03', status: null, remark: '' },
      ],
      photos: [{ id: 'p1', taskKey: 'o02', name: 'fridge.jpg' }],
    },
  });

  // What the server answers to the o03 write — a whole board, as it stood when o03 was saved.
  const answer = {
    activities: board.activities,
    progress: { total: 2, done: 2, missing: [], complete: true },
    declaration: 'new wording',
    run: {
      startedAt: '2026-11-25T06:00:00.000Z',
      signedAt: null,
      items: [
        { taskKey: 'o02', status: 'done', remark: '' },
        { taskKey: 'o03', status: 'deviation', remark: 'Pump noisy.' },
      ],
      photos: [{ id: 'p1', taskKey: 'o02', name: 'fridge.jpg' }],
    },
  };

  it('takes the activity it wrote, and the tally', () => {
    const draft = onScreen();
    expect(settle(draft, answer, 'o03')).toBeUndefined();
    expect(draft.run.items.find(i => i.taskKey === 'o03')).toMatchObject({
      status: 'deviation',
      remark: 'Pump noisy.',
    });
    expect(draft.progress.complete).toBe(true);
    expect(draft.declaration).toBe('new wording');
  });

  it('does not undo a tick made while it was in the air', () => {
    const draft = onScreen();
    // While o03 was being saved, the person answered o04 as well and it is already on screen.
    draft.run.items.push({
      taskKey: 'o04',
      status: 'na',
      remark: 'Closed today.',
    });
    draft.run.photos.push({ id: 'p2', taskKey: 'o04', name: 'door.jpg' });

    settle(draft, answer, 'o03');

    // The answer knows nothing about o04 — and must not take it away again.
    expect(draft.run.items.find(i => i.taskKey === 'o04')).toMatchObject({
      status: 'na',
    });
    expect(draft.run.photos.map(p => p.id).sort()).toEqual(['p1', 'p2']);
    // Each activity is still there exactly once.
    const keys = draft.run.items.map(i => i.taskKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('replaces the photographs of the activity it wrote, and only those', () => {
    const draft = onScreen();
    draft.run.photos.push({
      id: 'sending-1',
      taskKey: 'o03',
      pendingUri: 'file:///tmp/x.jpg',
    });
    settle(
      draft,
      {
        ...answer,
        run: {
          ...answer.run,
          photos: [
            { id: 'p1', taskKey: 'o02', name: 'fridge.jpg' },
            { id: 'p9', taskKey: 'o03', name: 'pump.jpg' },
          ],
        },
      },
      'o03',
    );

    const o03 = draft.run.photos.filter(p => p.taskKey === 'o03');
    expect(o03).toHaveLength(1); // the half-sent one is gone, the stored one is there
    expect(o03[0].id).toBe('p9');
    expect(draft.run.photos.some(p => p.id === 'p1')).toBe(true);
  });

  it('replaces the whole board when the write was a sign-off', () => {
    const draft = onScreen();
    const signed = {
      ...answer,
      run: { ...answer.run, signedAt: '2026-11-25T09:10:00.000Z' },
    };
    expect(settle(draft, signed, undefined)).toBe(signed);
  });

  it('clears the record when the server says there is none', () => {
    const draft = onScreen();
    settle(draft, { ...answer, run: null }, 'o03');
    expect(draft.run).toBeNull();
  });
});

describe('getting back out of a screen', () => {
  // Lab Readiness is opened from More, so it needs a way back that is not the phone's own gesture.
  const labels = node => {
    if (!node || typeof node !== 'object') {
      return [];
    }
    if (Array.isArray(node)) {
      return node.flatMap(labels);
    }
    const own = node.props?.accessibilityLabel
      ? [node.props.accessibilityLabel]
      : [];
    return [...own, ...labels(node.children)];
  };

  // The teal header asks whether its screen is the one in view, so it needs a navigator around it.
  const header = props =>
    draw(
      <NavigationContainer>
        <ScreenHeader {...props} />
      </NavigationContainer>,
    );

  it('draws a back arrow when the screen has somewhere to go back to', () => {
    const tree = header({
      eyebrow: 'today',
      title: 'Lab readiness',
      onBack: () => {},
    });
    expect(labels(tree.toJSON())).toContain('Back');
  });

  it('draws none on a tab screen, which has nowhere to go back to', () => {
    const tree = header({ eyebrow: 'today', title: 'My Activity' });
    expect(labels(tree.toJSON())).not.toContain('Back');
  });
});
