/**
 * What happens when a pull-to-refresh fails.
 *
 * React Native calls RefreshControl's onRefresh and throws the returned promise away. So a
 * rejection that escapes ScreenScroll has nothing left to catch it, and the app reports it through
 * Libraries/promiseRejectionTrackingOptions.js as "Uncaught (in promise)" — a crash report raised
 * by nothing worse than a refresh that could not reach the server.
 *
 * Every pull in the app goes through this one component (FormScreen delegates to it too), so this
 * is the one place it has to be right.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { RefreshControl } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../src/store', () => ({
  store: { getState: () => ({ session: { token: 't' } }) },
}));

const { ScreenScroll } = require('../src/components/ScreenScroll');

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mount(onRefresh) {
  let tree;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ScreenScroll onRefresh={onRefresh} />
      </SafeAreaProvider>,
    );
  });
  return tree.root.findByType(RefreshControl);
}

describe('pull to refresh', () => {
  it('does not let a failed refresh escape as an unhandled rejection', async () => {
    const boom = jest.fn(() => Promise.reject(new Error('Network request failed')));
    const control = mount(boom);

    // Exactly what RefreshControl does: call it, ignore what comes back.
    await act(async () => {
      await expect(control.props.onRefresh()).resolves.toBeUndefined();
    });
    expect(boom).toHaveBeenCalled();
  });

  it('stops the spinner whether the refresh works or fails', async () => {
    const ok = jest.fn(() => Promise.resolve());
    let control = mount(ok);
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(control.props.refreshing).toBe(false);

    const bad = jest.fn(() => Promise.reject(new Error('nope')));
    control = mount(bad);
    await act(async () => {
      await control.props.onRefresh();
    });
    // The spinner must not be left turning on a screen that will never load.
    expect(control.props.refreshing).toBe(false);
  });

  it('offers no pull at all on a screen that cannot refresh', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <ScreenScroll />
        </SafeAreaProvider>,
      );
    });
    // No handler means no spinner to pull — rather than a control that does nothing.
    expect(tree.root.findAllByType(RefreshControl)).toHaveLength(0);
  });
});
