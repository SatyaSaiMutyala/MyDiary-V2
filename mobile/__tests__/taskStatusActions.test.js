/**
 * Moving a task from the phone.
 *
 * The phone could only ever mark a task complete. Somebody held up had no way to say so from the
 * one device they carry, and no way to say they had started — so a task sat at "open" until it
 * jumped to "done". These are the two that were missing, and what they send is what is tested:
 * the status, and the note that goes with it.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockUpdate = jest.fn(() => ({ unwrap: () => Promise.resolve({ id: 'a1' }) }));
const mockComment = jest.fn(() => ({ unwrap: () => Promise.resolve({ id: 'c1' }) }));

const task = {
  id: 'a1',
  meetingId: 'm1',
  desc: 'Pull the NABL validation records',
  owner: 'Kavya Reddy',
  deadline: '2026-12-05',
  priority: 'high',
  status: 'open',
  meetingTitle: 'Q3 Ops Review',
  createdBy: { name: 'Venkata Cherukuri' },
  subtasks: [],
  comments: [],
  dependencies: [],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'a1' } }),
  useIsFocused: () => true,
}));
jest.mock('../src/store', () => ({ errorMessage: e => String(e?.message ?? e) }));
jest.mock('../src/store/api/actionItemsApi', () => ({
  useGetActionItemQuery: () => ({ data: task, isLoading: false, error: undefined, refetch: jest.fn() }),
  useUpdateActionItemMutation: () => [mockUpdate, { isLoading: false }],
  useAddCommentMutation: () => [mockComment, { isLoading: false }],
  useAddSubtaskMutation: () => [jest.fn(), { isLoading: false }],
  useSetSubtaskMutation: () => [jest.fn(), { isLoading: false }],
}));

const { TaskDetailScreen } = require('../src/screens/TaskDetailScreen');

function mount() {
  let tree;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <TaskDetailScreen />
      </SafeAreaProvider>,
    );
  });
  const button = (re) =>
    tree.root.findAll(n => typeof n.props?.label === 'string' && re.test(n.props.label) && n.props?.onPress)[0];
  const noteField = () =>
    tree.root.findAll(n => n.props?.accessibilityLabel === 'Note for this status change' && n.props?.onChangeText && n.type?.name === 'TextField')[0];
  return { tree, button, noteField };
}

beforeEach(() => {
  task.status = 'open';
  mockUpdate.mockClear();
  mockComment.mockClear();
});

describe('moving a task on the phone', () => {
  it('offers in progress and raise a blocker while there is work left', () => {
    const f = mount();
    expect(f.button(/In progress/)).toBeTruthy();
    expect(f.button(/Raise a blocker/)).toBeTruthy();
  });

  it('sends in-progress', async () => {
    const f = mount();
    await act(async () => { f.button(/In progress/).props.onPress(); });
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'a1', meetingId: 'm1', status: 'in-progress' });
  });

  it('sends blocked, with the note as a comment', async () => {
    const f = mount();
    await act(async () => { f.noteField().props.onChangeText('Waiting on the lab to release October.'); });
    await act(async () => { f.button(/Raise a blocker/).props.onPress(); });
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'a1', meetingId: 'm1', status: 'blocked' });
    expect(mockComment).toHaveBeenCalledWith({ id: 'a1', meetingId: 'm1', text: 'Waiting on the lab to release October.' });
  });

  it('says nothing extra when no note was typed', async () => {
    const f = mount();
    await act(async () => { f.button(/In progress/).props.onPress(); });
    expect(mockComment).not.toHaveBeenCalled();
  });

  it('hides both once the task is done', () => {
    task.status = 'done';
    const f = mount();
    expect(f.button(/In progress/)).toBeUndefined();
    expect(f.button(/Raise a blocker/)).toBeUndefined();
  });
});
