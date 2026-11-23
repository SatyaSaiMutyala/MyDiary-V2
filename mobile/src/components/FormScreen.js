import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, vs } from '../theme';
import { FooterBar } from './FooterBar';
import { KeyboardAvoider } from './KeyboardAvoider';
import { ScreenScroll } from './ScreenScroll';
import { TopBar } from './TopBar';

// Standard inner screen: top bar, scrolling body, action pinned at the bottom.
export function FormScreen({
  title,
  children,
  footer,
  right,
  onEndReached,
  onRefresh,
}) {
  const nav = useNavigation();
  return (
    <KeyboardAvoider style={styles.root}>
      <TopBar
        title={title}
        right={right}
        onBack={() => nav.canGoBack() && nav.goBack()}
      />

      <ScreenScroll
        bottomGap={24}
        onEndReached={onEndReached}
        onRefresh={onRefresh}
        // ScreenScroll's default top padding clears a tall teal header; above a plain top bar
        // that much air just looks like a mistake.
        contentContainerStyle={styles.body}
      >
        {children}
      </ScreenScroll>
      {footer ? <FooterBar>{footer}</FooterBar> : null}
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  body: { paddingTop: vs(4) },
});
