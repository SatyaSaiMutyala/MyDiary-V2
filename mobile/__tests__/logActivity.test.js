/**
 * What the Log Activity form sends, and what it refuses to send.
 *
 * This is the one place a person records work nobody preset for them, so the body matters: the lane
 * decides which part of My Activity it comes back under, and the date decides which day it belongs
 * to. Both are easy to get silently wrong — the entry saves either way, it just surfaces in the
 * wrong place — so both are tested rather than trusted.
 *
 * Editing goes to a different endpoint from writing. Sending an edit as a new entry would quietly
 * leave the day with two copies, so that fork is tested too.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockLog = jest.fn(() => ({ unwrap: () => Promise.resolve({ id: 'e1' }) }));
const mockUpdate = jest.fn(() => ({
  unwrap: () => Promise.resolve({ id: 'e1' }),
}));
const mockGoBack = jest.fn();
let mockParams = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
  useIsFocused: () => true,
}));
jest.mock('../src/store', () => ({
  errorMessage: e => String(e?.message ?? e),
  useMe: () => ({ name: 'Venkata Cherukuri' }),
}));
jest.mock('../src/store/api/departmentsApi', () => ({
  useLogActivityMutation: () => [mockLog, { isLoading: false }],
  useUpdateLoggedActivityMutation: () => [mockUpdate, { isLoading: false }],
}));

const { LogActivityScreen, LOG_LANES, LOG_TAGS } = require('../src/screens/LogActivityScreen');

function mount() {
  let tree;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <LogActivityScreen />
      </SafeAreaProvider>,
    );
  });
  const byLabel = label => tree.root.findAll(n => n.props?.label === label)[0];
  return {
    tree,
    text: () => byLabel('What did you do?'),
    lane: () => byLabel('Lane'),
    time: () => byLabel('Approximate time'),
    tag: () => byLabel('Tag it'),
    save: () =>
      tree.root.findAll(
        n =>
          typeof n.props?.label === 'string' &&
          /log|save|add/i.test(n.props.label) &&
          n.props.onPress,
      )[0],
  };
}

beforeEach(() => {
  mockLog.mockClear();
  mockUpdate.mockClear();
  mockGoBack.mockClear();
  mockParams = { lane: 'daily', date: '2026-11-26', departmentId: 'd1' };
});

describe('the Log Activity form', () => {
  it('sends what you did, on the lane and day it was opened for', async () => {
    const f = mount();
    await act(async () => {
      f.text().props.onChangeText('Signed the Apollo MoU');
    });
    await act(async () => {
      await f.save().props.onPress();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog.mock.calls[0][0]).toMatchObject({
      lane: 'daily',
      text: 'Signed the Apollo MoU',
      date: '2026-11-26',
      departmentId: 'd1',
      atTime: '',
      tag: '',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('carries the time and the tag when they are given, and trims the text', async () => {
    const f = mount();
    await act(async () => {
      f.text().props.onChangeText('  Call with the CFO  ');
    });
    await act(async () => {
      f.time().props.onChange('09:15');
    });
    await act(async () => {
      f.tag().props.onChange('call');
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockLog.mock.calls[0][0]).toMatchObject({
      text: 'Call with the CFO',
      atTime: '09:15',
      tag: 'call',
    });
  });

  it('logs to the lane the button came from', async () => {
    mockParams = { lane: 'monthly', date: '2026-11-30' };
    const f = mount();
    await act(async () => {
      f.text().props.onChangeText('Closed the November books');
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockLog.mock.calls[0][0]).toMatchObject({
      lane: 'monthly',
      date: '2026-11-30',
    });
    // No department on the account means none is sent, rather than a null the server would reject.
    expect('departmentId' in mockLog.mock.calls[0][0]).toBe(false);
  });

  it('refuses a blank entry and says why', async () => {
    const f = mount();
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => {
      f.text().props.onChangeText('   ');
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('patches an entry it was opened on, rather than writing a second one', async () => {
    mockParams = {
      entry: {
        id: 'e9',
        lane: 'weekly',
        date: '2026-11-21',
        text: 'Clal with the CFO',
        atTime: '',
        tag: 'call',
        done: true,
      },
    };
    const f = mount();
    // It opens on what is already there, so a typo is a correction and not a retype.
    expect(f.text().props.value).toBe('Clal with the CFO');
    // The lane is not re-askable while editing: moving an entry between lanes is another thought.
    expect(f.lane()).toBeUndefined();

    await act(async () => {
      f.text().props.onChangeText('Call with the CFO');
    });
    await act(async () => {
      await f.save().props.onPress();
    });

    expect(mockLog).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'e9',
      text: 'Call with the CFO',
      tag: 'call',
    });
  });

  it('clears the tag when the chosen one is tapped again', async () => {
    const f = mount();
    await act(async () => {
      f.text().props.onChangeText('Something');
    });
    await act(async () => {
      f.tag().props.onChange('review');
    });
    expect(f.tag().props.value).toBe('review');
    // ChoiceGroup is clearable, so it hands back null — which has to reach the server as ''.
    await act(async () => {
      f.tag().props.onChange(null);
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockLog.mock.calls[0][0].tag).toBe('');
  });

  it('offers the same three lanes and eight tags the website offers', () => {
    expect(LOG_LANES.map(l => l.key)).toEqual(['daily', 'weekly', 'monthly']);
    expect(LOG_TAGS.map(t => t.key)).toEqual([
      'approval', 'meeting', 'review', 'call', 'decision', 'visit', 'task', 'other',
    ]);
  });

  it('draws them as icons, never as emoji', () => {
    // The website uses the prototype's emoji; every chip, row and button on the phone is a lucide
    // icon, and an emoji among them lands at the wrong weight, colour and baseline.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const o of [...LOG_LANES, ...LOG_TAGS]) {
      expect(o.label).not.toMatch(emoji);
      expect(typeof o.icon).toBe('object');
    }
  });
});
