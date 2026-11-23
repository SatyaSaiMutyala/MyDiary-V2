import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  CircleAlert,
  CircleCheckBig,
  CircleHelp,
  LogOut,
  Trash2,
} from 'lucide-react-native';

import { colors, ms, radius, s, shadow, space, vs } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconTile } from './IconTile';

const ConfirmContext = createContext(() => Promise.resolve(false));

const tones = {
  ask: {
    icon: CircleHelp,
    bg: colors.tealTint,
    ink: colors.tealDeep,
    variant: 'secondary',
  },
  warn: {
    icon: CircleAlert,
    bg: colors.amberTint,
    ink: colors.amberInk,
    variant: 'primary',
  },
  danger: {
    icon: Trash2,
    bg: colors.redTint,
    ink: colors.red,
    variant: 'danger',
  },
  success: {
    icon: CircleCheckBig,
    bg: colors.greenTint,
    ink: colors.greenInk,
    variant: 'primary',
  },
};

// One themed "Are you sure?" box for the whole app. Screens call
// `const confirm = useConfirm()` and `if (await confirm({...}))`.
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const answer = useRef(() => {});

  const ask = useCallback(
    opts =>
      new Promise(resolve => {
        answer.current = resolve;
        setOptions(opts);
      }),
    [],
  );
  const close = yes => {
    setOptions(null);
    answer.current(yes);
  };

  const value = useMemo(() => ask, [ask]);
  const tone = tones[options?.tone ?? 'ask'];
  const Icon = options?.icon ?? tone.icon;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        transparent
        statusBarTranslucent
        visible={!!options}
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable style={styles.scrim} onPress={() => close(false)} />
        <View style={styles.centre} pointerEvents="box-none">
          <View style={styles.card}>
            <IconTile size={44} bg={tone.bg} round>
              <Icon size={s(22)} color={tone.ink} strokeWidth={1.9} />
            </IconTile>
            <AppText variant="heading" style={styles.title}>
              {options?.title}
            </AppText>
            {options?.text ? (
              <AppText
                variant="bodyRegular"
                color={colors.inkSoft}
                style={styles.text}
              >
                {options.text}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              {options?.single ? null : (
                <Button
                  label={options?.cancelLabel ?? 'Cancel'}
                  variant="outline"
                  size="md"
                  style={styles.action}
                  onPress={() => close(false)}
                />
              )}
              <Button
                label={options?.confirmLabel ?? 'Yes'}
                variant={tone.variant}
                size="md"
                style={styles.action}
                onPress={() => close(true)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

export const signOutIcon = LogOut;

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.veil,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutter + s(8),
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: s(20),
    paddingTop: vs(20),
    paddingBottom: vs(16),
    borderRadius: radius.lg + ms(2),
    backgroundColor: colors.surface,
    ...shadow.card,
    shadowOpacity: 0.2,
    shadowRadius: ms(24),
    elevation: 12,
  },
  title: { marginTop: vs(12), textAlign: 'center' },
  text: { marginTop: vs(6), textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: s(10),
    marginTop: vs(18),
    alignSelf: 'stretch',
  },
  action: { flex: 1 },
});
