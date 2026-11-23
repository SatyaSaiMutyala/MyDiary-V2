import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { installedVersion } from '../update/installedVersion';
import { colors, ms, radius, s, shadow, vs } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Eyebrow } from './Eyebrow';

/**
 * A blocking "Update required" box: no close, the back button does nothing, and the only way on is
 * the store. Shown when this build is too old — see update/useForceUpdate.js for who decides that.
 *
 * The teal fills the whole screen rather than dimming what is behind it: this is not a dialog over
 * the app, it is the end of the road until the person updates.
 */
export function ForceUpdateDialog({ visible, storeVersion, onUpdate }) {
  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {}}
    >
      {/* Plain flex centring: absolute layers inside a transparent Modal come out zero-sized
           on iOS. */}
      <View style={styles.scrim}>
        <View accessibilityRole="alert" style={styles.card}>
          <View style={styles.halo}>
            <View style={styles.disc}>
              <ArrowUp size={ms(34)} color={colors.yellowInk} strokeWidth={2.4} />
            </View>
          </View>

          <Eyebrow label="Update required" />

          <AppText variant="title" style={styles.title}>
            A new version is ready
          </AppText>

          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.text}
          >
            Version {storeVersion} of Trust Diary is available. This version (
            {installedVersion()}) can no longer be used. Please update to continue.
          </AppText>

          <Button label="Update now" onPress={onUpdate} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(22),
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingTop: vs(26),
    paddingHorizontal: s(22),
    paddingBottom: vs(22),
    gap: vs(8),
    ...shadow.card,
    shadowOpacity: 0.2,
    shadowRadius: ms(20),
  },
  halo: {
    width: ms(112),
    height: ms(112),
    borderRadius: ms(56),
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(4),
  },
  disc: {
    width: ms(84),
    height: ms(84),
    borderRadius: ms(42),
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  text: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: vs(10) },
});
