import React from 'react';
import { View } from 'react-native';
import { ms, radius, s } from '../theme';

export function Dot({ color, size = 8, hollow = false, style }) {
  return (
    <View
      style={[
        { width: s(size), height: s(size), borderRadius: radius.pill },
        hollow
          ? { borderWidth: ms(1.5, 0.2), borderColor: color }
          : { backgroundColor: color },
        style,
      ]}
    />
  );
}
