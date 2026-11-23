import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, s, vs } from '../theme';
import { AppText } from './AppText';

export function Eyebrow({ label, action, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="eyebrow" color={colors.inkMuted}>
        {label.toUpperCase()}
      </AppText>
      {action ? (
        <Pressable hitSlop={s(12)} onPress={onAction}>
          <AppText variant="label" color={colors.teal}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: vs(18),
    marginBottom: vs(8),
  },
});
