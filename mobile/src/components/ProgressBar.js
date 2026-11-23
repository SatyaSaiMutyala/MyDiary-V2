import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, vs } from '../theme';

// A thin bar filled to a percentage.
export function ProgressBar({ value, color = colors.teal, style }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={[styles.track, style]}>
      <View
        style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: vs(6),
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
