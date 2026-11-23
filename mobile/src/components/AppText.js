import React from 'react';
import { Text } from 'react-native';
import { colors, type } from '../theme';

export function AppText({
  variant = 'body',
  color = colors.ink,
  style,
  ...rest
}) {
  return (
    <Text
      allowFontScaling={false}
      {...rest}
      style={[type[variant], { color, includeFontPadding: false }, style]}
    />
  );
}
