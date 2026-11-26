import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, s, vs } from '../theme';

/**
 * "Load 15 more · showing 15 of 62" — the foot of a paged list.
 *
 * Nothing is ever hidden silently: when the server holds more than the screen has been given, it
 * says so and offers the rest.
 */
export function LoadMore({ paged, shown }) {
  if (!paged.more) {
    return null;
  }
  return (
    <Pressable
      onPress={paged.loadMore}
      disabled={paged.loadingMore}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <AppText variant="body" color={colors.tealDeep}>
        {paged.loadingMore ? 'Loading…' : `Load ${paged.nextBatch} more`}
      </AppText>
      <AppText variant="meta" color={colors.inkFaint}>
        Showing {shown ?? paged.items.length} of {paged.total}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: vs(3),
    paddingVertical: vs(14),
    marginTop: vs(10),
    borderRadius: s(12),
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.7 },
});
