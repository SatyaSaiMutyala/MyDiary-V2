/**
 * Which call the task form makes, and what it sends.
 *
 * The form has two jobs behind one screen. A task that came out of a meeting hangs off that
 * meeting, so it is traceable back to the room it was promised in. A task somebody allocates from
 * their own To-Do belongs to nothing but its owner, and goes through a different endpoint — one
 * that did not exist until the meeting stopped being compulsory.
 *
 * Getting that fork wrong is silent: the task is created either way, it just lands in the wrong
 * place, or fails with "That meeting does not exist". So the fork is tested rather than trusted.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockCreateAction = jest.fn(() => ({
  unwrap: () => Promise.resolve({ id: 'a1' }),
}));
const mockAllocateTask = jest.fn(() => ({
  unwrap: () => Promise.resolve({ id: 'a2' }),
}));
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  // The form sits inside a FormScreen, which keeps the status bar off the unfocused tabs.
  useIsFocused: () => true,
}));
jest.mock('../src/store', () => ({
  errorMessage: e => String(e?.message ?? e),
  useMe: () => ({ name: 'Venkata Cherukuri' }),
}));
jest.mock('../src/store/api/meetingsApi', () => ({
  useCreateActionItemMutation: () => [mockCreateAction, { isLoading: false }],
  useListMeetingsQuery: () => ({
    isLoading: false,
    data: {
      items: [
        {
          id: 'm1',
          title: 'Adani AHC — Pricing',
          date: '2026-11-25',
          time: '14:30',
        },
      ],
    },
  }),
}));
jest.mock('../src/store/api/actionItemsApi', () => ({
  useAllocateTaskMutation: () => [mockAllocateTask, { isLoading: false }],
  useListPeopleQuery: () => ({
    isLoading: false,
    data: [
      {
        id: 'u1',
        name: 'Venkata Cherukuri',
        title: 'CMD',
        department: 'CMD Office',
      },
      {
        id: 'u2',
        name: 'Arjun Mehta',
        title: 'Sales Lead',
        department: 'Commercial',
      },
    ],
  }),
}));

const { TaskFormScreen } = require('../src/screens/TaskFormScreen');

/** Renders the form and hands back the pieces the tests drive. */
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
        <TaskFormScreen />
      </SafeAreaProvider>,
    );
  });
  const byLabel = label => tree.root.findAll(n => n.props?.label === label)[0];
  return {
    tree,
    desc: () => byLabel('What has to be done'),
    meeting: () => byLabel('Which meeting it came out of'),
    owner: () => byLabel('Allocate to'),
    deadline: () => byLabel('Deadline'),
    save: () =>
      tree.root.findAll(
        n =>
          typeof n.props?.label === 'string' &&
          /task/i.test(n.props.label) &&
          n.props.onPress,
      )[0],
  };
}

const fillIn = async (
  f,
  {
    desc = 'Pull the validation records',
    deadline = '2026-12-05',
    meeting,
    owner,
  } = {},
) => {
  await act(async () => {
    f.desc().props.onChangeText(desc);
  });
  await act(async () => {
    f.deadline().props.onChange(deadline);
  });
  if (meeting !== undefined)
    await act(async () => {
      f.meeting().props.onChange(meeting);
    });
  if (owner !== undefined)
    await act(async () => {
      f.owner().props.onChange(owner);
    });
};

beforeEach(() => {
  mockCreateAction.mockClear();
  mockAllocateTask.mockClear();
  mockGoBack.mockClear();
});

describe('the task form', () => {
  it('allocates it to you when you choose no meeting and nobody', async () => {
    const f = mount();
    await fillIn(f);
    await act(async () => {
      await f.save().props.onPress();
    });

    expect(mockCreateAction).not.toHaveBeenCalled();
    expect(mockAllocateTask).toHaveBeenCalledTimes(1);
    const body = mockAllocateTask.mock.calls[0][0];
    expect(body).toMatchObject({
      desc: 'Pull the validation records',
      deadline: '2026-12-05',
      priority: 'medium',
    });
    // No owner is sent at all: the server reads that as "give it to whoever asked".
    expect('owner' in body).toBe(false);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('sends it to the person you pick, still with no meeting', async () => {
    const f = mount();
    await fillIn(f, { owner: 'Arjun Mehta' });
    await act(async () => {
      await f.save().props.onPress();
    });

    expect(mockCreateAction).not.toHaveBeenCalled();
    expect(mockAllocateTask.mock.calls[0][0]).toMatchObject({
      owner: 'Arjun Mehta',
    });
  });

  it('offers Myself first, then real colleagues, and never lists you twice', async () => {
    const f = mount();
    const options = f.owner().props.options;
    expect(options[0]).toMatchObject({
      id: '',
      label: 'Myself (Venkata Cherukuri)',
    });
    expect(
      options.filter(o => o.label.includes('Venkata Cherukuri')),
    ).toHaveLength(1);
    expect(options.map(o => o.label)).toContain('Arjun Mehta');
    expect(options.find(o => o.label === 'Arjun Mehta').detail).toBe(
      'Sales Lead · Commercial',
    );
  });

  it("asks nothing about meetings, exactly as the website's composer does", () => {
    const f = mount();
    expect(f.meeting()).toBeUndefined();
    // A commitment made in a meeting is added on that meeting's own Action items screen.
    expect(mockCreateAction).not.toHaveBeenCalled();
  });

  it('still insists on what has to be done, and by when', async () => {
    const f = mount();
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockAllocateTask).not.toHaveBeenCalled();

    await act(async () => {
      f.desc().props.onChangeText('Something');
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockAllocateTask).not.toHaveBeenCalled(); // no deadline yet

    await act(async () => {
      f.deadline().props.onChange('2026-12-09');
    });
    await act(async () => {
      await f.save().props.onPress();
    });
    expect(mockAllocateTask).toHaveBeenCalledTimes(1);
  });
});
