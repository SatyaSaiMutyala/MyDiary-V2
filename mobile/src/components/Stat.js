import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, fs, s } from '../theme';
import { AppText } from './AppText';
import { Dot } from './Dot';

// A number with a short label under it.
export function Stat({
  value,
  label,
  sub,
  tone = colors.ink,
  size = 'lg',
  dot,
  style,
}) {
  return (
    <View style={[styles.stat, style]}>
      <View style={styles.top}>
        {dot ? <Dot color={dot.color} hollow={dot.hollow} size={9} /> : null}
        <AppText
          style={[size === 'lg' ? styles.lg : styles.sm, { color: tone }]}
        >
          {value}
        </AppText>
      </View>
      <AppText
        variant="meta"
        numberOfLines={1}
        color={size === 'lg' ? colors.inkSoft : colors.inkMuted}
      >
        {label}
      </AppText>
      {sub ? (
        <AppText variant="meta" numberOfLines={1} color={colors.inkFaint}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  lg: { fontFamily: fonts.semibold, fontSize: fs(22), lineHeight: fs(28) },
  sm: { fontFamily: fonts.semibold, fontSize: fs(17), lineHeight: fs(24) },
});
