import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, s } from '../theme';

// A bare icon you can tap (back arrow, history, show password).
export function IconButton({
  icon: Icon,
  label,
  onPress,
  color = colors.ink,
  size = 40,
  iconSize = 22,
  strokeWidth = 1.75,
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={s(10)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { width: s(size), height: s(size) },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon size={s(iconSize)} color={color} strokeWidth={strokeWidth} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
