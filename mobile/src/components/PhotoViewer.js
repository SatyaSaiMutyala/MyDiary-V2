import React from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ImageIcon, X } from 'lucide-react-native';
import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

// Full-screen view of one photograph.
//
// `photo` is either a picture on this phone ({ uri }) or one the API holds
// ({ source: { uri, headers } }) — a stored photograph is fetched with the
// session's own header, so it cannot be read by a bare link.
export function PhotoViewer({ photo, caption, onClose }) {
  const insets = useSafeAreaInsets();
  const source = photo?.source ?? (photo?.uri ? { uri: photo.uri } : null);
  return (
    <Modal
      visible={!!photo}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {source ? (
          <Image source={source} resizeMode="contain" style={styles.image} />
        ) : (
          <View style={styles.sample}>
            <ImageIcon
              size={s(40)}
              color={colors.onTealSoft}
              strokeWidth={1.5}
            />
            <AppText variant="body" color={colors.white}>
              Sample photograph
            </AppText>
          </View>
        )}
        {caption ? (
          <AppText
            variant="meta"
            color={colors.white}
            style={[styles.caption, { bottom: insets.bottom + vs(20) }]}
          >
            {caption}
          </AppText>
        ) : null}
        <IconButton
          icon={X}
          label="Close photograph"
          color={colors.white}
          iconSize={24}
          strokeWidth={2}
          onPress={onClose}
          style={[styles.close, { top: insets.top + vs(8) }]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
  },
  image: { width: '100%', height: '80%' },
  under: { position: 'absolute', top: '10%' },
  sample: { alignItems: 'center', gap: vs(10) },
  caption: {
    position: 'absolute',
    left: s(20),
    right: s(20),
    textAlign: 'center',
  },
  close: { position: 'absolute', right: s(12) },
});
