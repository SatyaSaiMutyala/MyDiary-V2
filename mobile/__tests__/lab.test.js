/**
 * Lab Readiness on the phone, against what the API actually sends.
 *
 * The fixtures in __tests__/fixtures are real answers captured from the v2 API — a signed opening
 * round with a deviation, N/As and a photograph. They are the contract between the server and these
 * screens, so a change on either side that breaks the other shows up here.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
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
import { ChecklistItemRow } from '../src/components/ChecklistItemRow';
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
