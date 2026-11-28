/**
 * The note that sits under an agenda item, on the phone.
 *
 * A note is only worth typing if it reaches the meeting, and it reaches it through a second array
 * that has to line up with the agenda item by item. A note that slips one place up is worse than no
 * note at all: it reads as instructions for the wrong item, and nothing about it looks broken.
 *
 * So what is tested is the alignment: the note goes out beside its own item, a blank one still takes
 * its place in the list, and an item typed with no text takes its note out of the list with it.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockCreateMeeting = jest.fn(() => ({
  unwrap: () => Promise.resolve({ id: 'm9' }),
}));
const mockUpdateMeeting = jest.fn(() => ({
  unwrap: () => Promise.resolve({ id: 'm9' }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));
jest.mock('../src/store', () => ({
  errorMessage: e => String(e?.message ?? e),
  useMe: () => ({ name: 'Venkata Cherukuri' }),
}));
jest.mock('../src/store/api/meetingsApi', () => ({
  useCreateMeetingMutation: () => [mockCreateMeeting, { isLoading: false }],
  useUpdateMeetingMutation: () => [mockUpdateMeeting, { isLoading: false }],
  useGetMeetingQuery: () => ({ data: undefined, isLoading: false }),
}));
jest.mock('../src/store/api/templatesApi', () => ({
  useListTemplatesQuery: () => ({ data: { items: [] }, isLoading: false }),
}));

const { MeetingFormScreen } = require('../src/screens/MeetingFormScreen');

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
        <MeetingFormScreen />
      </SafeAreaProvider>,
    );
  });
  /**
   * One node per field. A TextField renders a TextInput which renders a host TextInput, and all
   * three carry the placeholder, so an unfiltered findAll returns each field three times over —
   * and index 1 is then still the first field, not the second one.
   */
  const inputs = ph =>
    tree.root.findAll(
      n =>
        n.props?.placeholder === ph &&
        n.props?.onChangeText &&
        n.type?.name === 'TextField',
    );
  /**
   * Found by what the field is for, not by its placeholder: the wording of the prompt is a design
   * decision that will change again, and the test should not break when it does.
   */
  const byLabel = re =>
    tree.root.findAll(
      n =>
        re.test(n.props?.accessibilityLabel ?? '') &&
        n.props?.onChangeText &&
        n.type?.name === 'TextField',
    );
  const noteFields = () => byLabel(/^Note for agenda item/);
  return {
    tree,
    title: () => inputs('e.g. Q3 Operations Review')[0],
    agendaFields: () => byLabel(/^Agenda item \d/),
    noteFields,
    addAgenda: () =>
      tree.root.findAll(
        n => n.props?.label === 'Add another agenda item' && n.props?.onPress,
      )[0],
    save: () =>
      tree.root.findAll(
        n => n.props?.label === 'Create meeting' && n.props?.onPress,
      )[0],
  };
}

const type = async (field, text) => {
  await act(async () => {
    field.props.onChangeText(text);
  });
};

beforeEach(() => {
  mockCreateMeeting.mockClear();
  mockUpdateMeeting.mockClear();
});

describe('agenda notes on the phone', () => {
  it('gives every agenda line a note field of its own', async () => {
    const f = mount();
    expect(f.noteFields()).toHaveLength(f.agendaFields().length);

    await act(async () => {
      f.addAgenda().props.onPress();
    });
    expect(f.agendaFields()).toHaveLength(2);
    expect(f.noteFields()).toHaveLength(2);
  });

  it('sends each note beside the item it was written under', async () => {
    const f = mount();
    await act(async () => {
      f.addAgenda().props.onPress();
    });
    await act(async () => {
      f.addAgenda().props.onPress();
    });

    await type(f.agendaFields()[0], 'Opening & context');
    await type(f.agendaFields()[1], 'Branch TAT dip W47');
    await type(f.agendaFields()[2], 'Decisions & asks');
    // Only the middle item gets a note: the two blanks must still hold their places.
    await type(f.noteFields()[1], 'CFO to bring the W45–W46 branch table');

    // Everything else the form insists on before it will save.
    await type(f.title(), 'W48 Ops Review');
    const dateField = f.tree.root.findAll(
      n => n.props?.label === 'Date' && n.props?.onChange,
    )[0];
    await act(async () => {
      dateField.props.onChange('2026-11-24');
    });

    await act(async () => {
      f.save().props.onPress();
    });

    expect(mockCreateMeeting).toHaveBeenCalledTimes(1);
    const body = mockCreateMeeting.mock.calls[0][0];
    expect(body.agenda).toEqual([
      'Opening & context',
      'Branch TAT dip W47',
      'Decisions & asks',
    ]);
    expect(body.agendaNotes).toEqual([
      '',
      'CFO to bring the W45–W46 branch table',
      '',
    ]);
    expect(body.agendaNotes).toHaveLength(body.agenda.length);
  });

  it('drops the note of an item left without text', async () => {
    const f = mount();
    await act(async () => {
      f.addAgenda().props.onPress();
    });

    // The second line is never typed, but someone puts a note on it anyway.
    await type(f.agendaFields()[0], 'Opening & context');
    await type(f.noteFields()[0], 'Chair opens — 2 minutes only');
    await type(f.noteFields()[1], 'orphan note on an empty line');

    await type(f.title(), 'W48 Ops Review');
    const dateField = f.tree.root.findAll(
      n => n.props?.label === 'Date' && n.props?.onChange,
    )[0];
    await act(async () => {
      dateField.props.onChange('2026-11-24');
    });
    await act(async () => {
      f.save().props.onPress();
    });

    const body = mockCreateMeeting.mock.calls[0][0];
    expect(body.agenda).toEqual(['Opening & context']);
    expect(body.agendaNotes).toEqual(['Chair opens — 2 minutes only']);
  });
});
