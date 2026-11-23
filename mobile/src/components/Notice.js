import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CircleAlert,
  CircleCheck,
  Info,
  Lock,
  TriangleAlert,
} from 'lucide-react-native';
import { colors, radius, s, vs } from '../theme';
import { AppText } from './AppText';

const tones = {
  error: {
    bg: colors.redTint,
    ink: colors.redInk,
    icon: colors.red,
    Icon: CircleAlert,
  },
  success: {
    bg: colors.greenTint,
    ink: colors.greenInk,
    icon: colors.green,
    Icon: CircleCheck,
  },
  // Something to be aware of before going on — not an error, and not good news either.
  warn: {
    bg: colors.amberTint,
    ink: colors.amberInk,
    icon: colors.amber,
    Icon: TriangleAlert,
  },
  info: {
    bg: colors.blueTint,
    ink: colors.blueInk,
    icon: colors.blue,
    Icon: Info,
  },
  locked: {
    bg: colors.tealTint,
    ink: colors.tealDeep,
    icon: colors.teal,
    Icon: Lock,
  },
};

// Coloured message box: errors, confirmations and locked states.
export function Notice({ tone, title, text, style }) {
  // An unknown tone used to crash the screen on `t.bg`; now it just reads as information.
  const t = tones[tone] ?? tones.info;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.box, { backgroundColor: t.bg }, style]}
    >
      <t.Icon size={s(19)} color={t.icon} strokeWidth={2} />
      <View style={styles.text}>
        <AppText variant="label" color={t.ink}>
          {title}
        </AppText>
        {text ? (
          <AppText variant="meta" color={t.ink}>
            {text}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: s(10),
    paddingHorizontal: s(14),
    paddingVertical: vs(12),
    borderRadius: radius.md,
  },
  text: { flex: 1 },
});
