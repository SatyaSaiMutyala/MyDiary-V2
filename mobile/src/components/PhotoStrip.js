import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react-native';
import { pickPhotos, takePhoto } from '../utils/photos';
import { colors, hairline, radius, s, vs } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { PhotoViewer } from './PhotoViewer';

// Thumbnails of the photographs on a record, with Camera and Upload buttons.
export function PhotoStrip({
  photos,
  max,
  locked = false,
  caption,
  onAdd,
  onRemove,
}) {
  const [open, setOpen] = useState();
  const [error, setError] = useState();
  const room = max - photos.length;

  const run = async action => {
    const result = await action();
    setError(result.error);
    if (result.photos.length) {
      onAdd?.(result.photos.slice(0, room));
    }
  };

  return (
    <View>
      {photos.length ? (
        <View style={styles.grid}>
          {photos.map(p => (
            <View key={p.id}>
              <Pressable
                accessibilityLabel={
                  p.pending ? 'Photograph being sent' : 'Open photograph'
                }
                disabled={p.pending}
                onPress={() => setOpen(p)}
                style={styles.thumb}
              >
                {/* The copy on the phone sits underneath, so swapping to the stored
                    photograph never shows an empty square. */}
                {p.localUri && !p.pending ? (
                  <Image source={{ uri: p.localUri }} style={styles.under} />
                ) : null}
                {p.source ?? p.uri ? (
                  <Image
                    source={p.source ?? { uri: p.uri }}
                    style={[styles.image, p.pending && styles.sendingImage]}
                  />
                ) : (
                  <ImageIcon
                    size={s(20)}
                    color={colors.teal}
                    strokeWidth={1.6}
                  />
                )}
                {/* Still on its way to the server: the photograph is already here, so it is shown
                    at once rather than making the person wait on a blank square. */}
                {p.pending ? (
                  <View style={styles.sending}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : null}
              </Pressable>
              {locked || !onRemove || p.pending ? null : (
                <Pressable
                  hitSlop={s(8)}
                  accessibilityLabel="Remove photograph"
                  onPress={() => onRemove(p.id)}
                  style={styles.remove}
                >
                  <X size={s(12)} color={colors.white} strokeWidth={3} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {locked || !onAdd ? null : (
        <View style={styles.actions}>
          <Button
            label="Camera"
            size="sm"
            variant="outline"
            iconLeft={Camera}
            iconColor={colors.teal}
            disabled={room <= 0}
            onPress={() => run(takePhoto)}
          />

          <Button
            label="Upload"
            size="sm"
            variant="outline"
            iconLeft={Upload}
            iconColor={colors.teal}
            disabled={room <= 0}
            onPress={() => run(() => pickPhotos(room))}
          />

          <AppText variant="meta" color={colors.inkMuted}>
            {photos.length} / {max}
          </AppText>
        </View>
      )}
      {error ? (
        <AppText
          variant="metaStrong"
          color={colors.redInk}
          style={styles.error}
        >
          {error}
        </AppText>
      ) : null}

      <PhotoViewer
        photo={open}
        caption={caption}
        onClose={() => setOpen(undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
    marginBottom: vs(10),
  },
  thumb: {
    width: s(58),
    height: s(58),
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.tealLine,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  under: { ...StyleSheet.absoluteFillObject },
  sendingImage: { opacity: 0.45 },
  sending: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: -s(6),
    right: -s(6),
    width: s(20),
    height: s(20),
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  error: { marginTop: vs(6) },
});
