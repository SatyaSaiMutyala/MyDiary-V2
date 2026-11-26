/**
 * What My Activity does with the day's logged work.
 *
 * The screen draws four preset lanes and one logged lane off the same loop, and only three of the
 * five have a logged bucket at all. Asking an opening or closing lane for its logged rows used to
 * throw — the whole screen went blank on a lane nobody had logged against, which no unit test of
 * the form itself would have caught. So the lanes are rendered here, together, as the screen does.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();
const mockUpdate = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockRemove = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockTick = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockConfirm = jest.fn(() => Promise.resolve(true));
let mockLogged = { daily: [], weekly: [], monthly: [] };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));
jest.mock('../src/components/ConfirmDialog', () => ({
  useConfirm: () => mockConfirm,
}));
jest.mock('../src/store', () => ({
  errorMessage: e => String(e?.message ?? e),
  useMe: () => ({ name: 'Venkata Cherukuri', modules: ['activity'] }),
}));
jest.mock('../src/store/api/authApi', () => ({
  canOpen: () => false,
  useUpdateMeMutation: () => [jest.fn(), { isLoading: false }],
}));
jest.mock('../src/store/api/labReadinessApi', () => ({
  useLabMineQuery: () => ({ data: undefined }),
  useLabDayQuery: () => ({ data: undefined }),
}));
jest.mock('../src/store/api/departmentsApi', () => ({
  useListAssignmentsQuery: () => ({
    isLoading: false,
    data: {
      'Venkata Cherukuri': { departmentId: 'd1', positionId: null, role: 'head' },
    },
  }),
  useGetDepartmentQuery: () => ({
    isLoading: false,
    data: {
      id: 'd1',
      name: 'CMD Office',
      positions: [],
      openingTasks: [
        { id: 'o1', order: 1, text: 'Clear the approval hub', positionIds: [] },
      ],
      closingTasks: [
        { id: 'c1', order: 1, text: 'Log the day’s decisions', positionIds: [] },
      ],
      weeklyTasks: [],
      monthlyTasks: [],
    },
  }),
  useGetActivityQuery: () => ({ isLoading: false, data: { log: {}, person: 'Venkata Cherukuri' } }),
  useSetActivityTickMutation: () => [mockTick, { isLoading: false }],
  useGetLoggedActivityQuery: () => ({ isLoading: false, data: mockLogged }),
  useLogActivityMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateLoggedActivityMutation: () => [mockUpdate, { isLoading: false }],
  useRemoveLoggedActivityMutation: () => [mockRemove, { isLoading: false }],
}));

const { ActivityScreen } = require('../src/screens/ActivityScreen');

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mount() {
  let tree;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ActivityScreen />
      </SafeAreaProvider>,
    );
  });
  const texts = () =>
    tree.root
      .findAll(n => typeof n.props?.children === 'string')
      .map(n => n.props.children);
  const byAccessibilityLabel = re =>
    tree.root.findAll(
      n => typeof n.props?.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel),
    );
  return { tree, texts, byAccessibilityLabel };
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockUpdate.mockClear();
  mockRemove.mockClear();
  mockConfirm.mockClear();
  mockLogged = { daily: [], weekly: [], monthly: [] };
});

describe('My Activity and the logged lane', () => {
  it('renders the preset lanes without a logged bucket of their own', () => {
    // The regression: opening and closing have no logged bucket, and asking for theirs threw.
    const { texts } = mount();
    const all = texts().join(' | ');
    expect(all).toContain('Clear the approval hub');
    expect(all).toContain('Log the day’s decisions');
    expect(all).toContain('LOGGED TODAY · NOTHING YET');
    // Opening and closing have no logged bucket, so they are not offered the shortcut.
    expect(all.match(/\+ Log/g)).toBe(null);
  });

  it('draws what was logged, and offers the way to log more', () => {
    mockLogged = {
      daily: [
        {
          id: 'e1',
          lane: 'daily',
          text: 'Signed the Apollo MoU',
          atTime: '15:30',
          tag: 'approval',
          done: true,
        },
      ],
      weekly: [],
      monthly: [],
    };
    const { texts, byAccessibilityLabel } = mount();
    const all = texts().join(' | ');
    expect(all).toContain('Signed the Apollo MoU');
    expect(all).toContain('15:30');
    expect(all).toContain('Approval');
    expect(all).toContain('Added by you');
    expect(all).toContain('LOGGED TODAY · 1');
    expect(byAccessibilityLabel(/Log activity/)).not.toHaveLength(0);
  });

  it('opens the form on the lane the button belongs to', () => {
    const { byAccessibilityLabel } = mount();
    act(() => {
      byAccessibilityLabel(/Log activity/)[0].props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'LogActivity',
      expect.objectContaining({ lane: 'daily', departmentId: 'd1' }),
    );
  });

  it('un-ticks an entry rather than deleting it', async () => {
    mockLogged = {
      daily: [{ id: 'e1', lane: 'daily', text: 'A note', atTime: '', tag: '', done: true }],
      weekly: [],
      monthly: [],
    };
    const { byAccessibilityLabel } = mount();
    await act(async () => {
      await byAccessibilityLabel(/Un-tick/)[0].props.onPress();
    });
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'e1', done: false });
  });

  it('asks before removing one, and removes it when told to', async () => {
    mockLogged = {
      daily: [{ id: 'e1', lane: 'daily', text: 'A note', atTime: '', tag: '', done: true }],
      weekly: [],
      monthly: [],
    };
    const { byAccessibilityLabel } = mount();
    await act(async () => {
      await byAccessibilityLabel(/Remove this entry/)[0].props.onPress();
    });
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith('e1');
  });

  it('leaves it alone when the confirmation is declined', async () => {
    mockConfirm.mockImplementationOnce(() => Promise.resolve(false));
    mockLogged = {
      daily: [{ id: 'e1', lane: 'daily', text: 'A note', atTime: '', tag: '', done: true }],
      weekly: [],
      monthly: [],
    };
    const { byAccessibilityLabel } = mount();
    await act(async () => {
      await byAccessibilityLabel(/Remove this entry/)[0].props.onPress();
    });
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
