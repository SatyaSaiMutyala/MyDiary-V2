import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, hairline, space, vs } from '../theme';
import { useKeyboardShown } from './KeyboardAvoider';

// White strip pinned to the bottom of a screen for its main action.
export function FooterBar({ children, inTabs = false }) {
  const insets = useSafeAreaInsets();
  // Above the keyboard the home indicator's gap is not needed.
  const keyboard = useKeyboardShown();
  const inset = inTabs || keyboard ? 0 : insets.bottom;
  return (
    <View style={[styles.footer, { paddingBottom: vs(12) + inset }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: vs(12),
    backgroundColor: colors.surface,
    borderTopWidth: hairline,
    borderTopColor: colors.line,
  },
});
