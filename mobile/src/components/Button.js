import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, fs, ms, radius, s, shadow, vs } from '../theme';
import { AppText } from './AppText';

const palette = {
  primary: { bg: colors.yellow, ink: colors.yellowInk },
  secondary: { bg: colors.teal, ink: colors.white },
  outline: { bg: colors.surface, ink: colors.ink, border: colors.line },
  // A white button with no border, for quiet actions on a card-coloured page.
  plain: { bg: colors.surface, ink: colors.ink },
  danger: { bg: colors.red, ink: colors.white },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  iconColor,
  leading,
  spread = false,
  accessibilityLabel,
  style,
}) {
  const tone = palette[variant];
  const ink = disabled ? colors.disabledInk : tone.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        leading ? styles.withLeading : null,
        { backgroundColor: disabled ? colors.disabled : tone.bg },
        tone.border && !disabled
          ? { borderWidth: ms(1.5, 0.2), borderColor: tone.border }
          : null,
        variant === 'primary' && !disabled ? shadow.action : null,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.row, spread && styles.spread]}>
        {leading}
        {IconLeft ? (
          <IconLeft size={s(18)} color={iconColor ?? ink} strokeWidth={1.9} />
        ) : null}
        <AppText
          style={[
            styles.label,
            size === 'sm' && styles.labelSm,
            spread && styles.labelSpread,
            { color: ink },
          ]}
        >
          {label}
        </AppText>
        {IconRight ? (
          <IconRight size={s(18)} color={ink} strokeWidth={2} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(16),
  },
  // Real heights on an iPhone 17: large 46, medium 40, small 33.
  lg: { minHeight: vs(36), borderRadius: radius.md },
  md: { minHeight: vs(31), borderRadius: radius.md },
  sm: { minHeight: vs(26), borderRadius: radius.sm, paddingHorizontal: s(12) },
  withLeading: { paddingLeft: s(6), paddingVertical: vs(4) },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(9) },
  spread: { alignSelf: 'stretch' },
  label: { fontFamily: fonts.semibold, fontSize: fs(15), lineHeight: fs(21) },
  labelSm: { fontSize: fs(13), lineHeight: fs(18) },
  labelSpread: { flex: 1 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
