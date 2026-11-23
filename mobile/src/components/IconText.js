import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, s } from '../theme';
import { AppText } from './AppText';

// Small icon followed by a short line of text.
export function IconText({
  icon: Icon,
  text,
  color = colors.inkMuted,
  iconColor,
  variant = 'meta',
  iconSize = 13,
  gap = 5,
  style,
}) {
  return (
    <View style={[styles.row, { gap: s(gap) }, style]}>
      <Icon size={s(iconSize)} color={iconColor ?? color} strokeWidth={1.9} />
      <AppText variant={variant} color={color}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
