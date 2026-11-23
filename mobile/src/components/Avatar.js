import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, fs, ms, radius, s } from '../theme';
import { AppText } from './AppText';

export function Avatar({
  label,
  size = 44,
  bg = colors.tealTint,
  ink = colors.tealDeep,
  borderColor,
  style,
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: s(size), height: s(size), backgroundColor: bg },
        borderColor ? { borderWidth: ms(2, 0.2), borderColor } : null,
        style,
      ]}
    >
      <AppText
        style={{
          fontFamily: fonts.semibold,
          fontSize: fs(size * 0.34),
          lineHeight: fs(size * 0.46),
          color: ink,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
