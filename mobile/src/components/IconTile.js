import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, radius, s } from '../theme';

// The rounded square that sits behind an icon.
export function IconTile({
  children,
  size = 42,
  bg = colors.fill,
  borderColor,
  round = false,
  style,
}) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: s(size),
          height: s(size),
          backgroundColor: bg,
          borderRadius: round ? radius.pill : radius.md,
        },
        borderColor ? { borderWidth: ms(1.5, 0.2), borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
