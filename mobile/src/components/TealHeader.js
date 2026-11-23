import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, radius, space, vs } from '../theme';
import { ArcBackdrop } from './ArcBackdrop';
import { FocusStatusBar } from './FocusStatusBar';

// The teal band with the leaf arc that opens every main screen.
export function TealHeader({
  children,
  arcHeight = vs(240),
  rounded = true,
  topGap = 16,
  inTabs = true,
  style,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        rounded && styles.rounded,
        { paddingTop: insets.top + vs(topGap) },
        style,
      ]}
    >
      {inTabs ? (
        <FocusStatusBar tone="light" />
      ) : (
        <StatusBar barStyle="light-content" />
      )}
      <ArcBackdrop height={arcHeight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.teal,
    paddingHorizontal: space.gutter,
    paddingBottom: vs(20),
    overflow: 'hidden',
  },
  rounded: {
    borderBottomLeftRadius: radius.xl + ms(4),
    borderBottomRightRadius: radius.xl + ms(4),
  },
});
