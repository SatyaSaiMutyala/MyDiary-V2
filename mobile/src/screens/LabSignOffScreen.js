import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, Lock, RotateCcw, UserRound } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { ShimmerRows } from '../components/Shimmer';
import { SignerCard } from '../components/SignerCard';
import { Stat } from '../components/Stat';
import { errorMessage, useMe } from '../store';
import {
  useLabBoardQuery,
  useLabSignOffMutation,
} from '../store/api/labReadinessApi';
import { longDate } from '../utils/dates';
import { pickPhotos, takeSelfie } from '../utils/photos';
import { colors, hairline, radius, s, vs } from '../theme';

/**
 * Sign off a round: the declaration, who is signing, and a photograph of them taken now.
 *
 * The photograph is the point — a tick can be made by anyone from anywhere, a face at the bench
 * cannot. The gallery is offered only when the phone has no usable camera.
 */
export function LabSignOffScreen() {
  const nav = useNavigation();
  const target = useRoute().params;
  const me = useMe();
  const board = useLabBoardQuery(target);
  const [signOff, call] = useLabSignOffMutation();

  const [selfie, setSelfie] = useState();
  const [error, setError] = useState();
  const [noCamera, setNoCamera] = useState(false);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    const shot = await takeSelfie();
    setError(shot.error);
    // A refused permission must not open the gallery: the photograph has to be live.
    if (shot.noCamera) {
      setNoCamera(true);
    }
    if (shot.photos[0]) {
      setSelfie(shot.photos[0]);
    }
  };

  const choose = async () => {
    const picked = await pickPhotos(1);
    setError(picked.error);
    if (picked.photos[0]) {
      setSelfie(picked.photos[0]);
    }
  };

  const submit = async () => {
    if (!selfie || busy) {
      return;
    }
    setBusy(true);
    try {
      await signOff({
        ...target,
        selfie: { ...selfie, name: 'selfie.jpg' },
        role: me?.title ?? me?.position ?? '',
      }).unwrap();
      nav.goBack();
    } catch {
      // The API's message is shown above the button.
    } finally {
      setBusy(false);
    }
  };

  const progress = board.data?.progress;
  const phase = target.phase;

  if (board.isLoading) {
    return (
      <FormScreen title="Sign off">
        <FormCard>
          <ShimmerRows rows={4} icon={false} />
        </FormCard>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={
        phase === 'opening' ? 'Opening declaration' : 'Closing declaration'
      }
      footer={
        <>
          {call.error ? (
            <Notice
              tone="error"
              title={errorMessage(call.error)}
              style={styles.footNotice}
            />
          ) : progress && !progress.complete ? (
            <Notice
              tone="info"
              title="This round is not complete yet"
              text={
                progress.missing[0] ??
                `${progress.pending} activities still have no answer.`
              }
              style={styles.footNotice}
            />
          ) : null}
          <Button
            label={busy ? 'Signing off…' : 'Sign off and lock'}
            iconLeft={Lock}
            disabled={!selfie || !progress?.complete || busy}
            onPress={submit}
          />
        </>
      }
    >
      {board.error ? (
        <Notice
          tone="error"
          title={errorMessage(board.error)}
          style={styles.notice}
        />
      ) : null}
      {progress ? (
        <FormCard title={`${board.data?.unit.name} · ${longDate(target.date)}`}>
          <View style={styles.stats}>
            <Stat
              size="sm"
              value={progress.completed}
              label="Done"
              dot={{ color: colors.teal }}
            />
            <Stat
              size="sm"
              value={progress.deviations}
              label="Deviation"
              dot={{ color: colors.amber }}
            />
            <Stat
              size="sm"
              value={progress.na}
              label="N/A"
              dot={{ color: colors.slate }}
            />
            <Stat
              size="sm"
              value={board.data?.run?.photos?.length ?? 0}
              label="Photos"
              dot={{ color: colors.blue }}
            />
          </View>
        </FormCard>
      ) : null}

      <FormCard title="Declaration">
        <AppText variant="bodyRegular" style={styles.declaration}>
          {board.data?.declaration}
        </AppText>
        <SignerCard
          name={me?.name ?? ''}
          role={me?.title ?? me?.position ?? ''}
          note="Taken from your login — it cannot be typed"
        />
      </FormCard>

      <FormCard title="Sign-off photograph">
        <View style={styles.selfieRow}>
          <View style={styles.frame}>
            {selfie ? (
              <Image source={{ uri: selfie.uri }} style={styles.photo} />
            ) : (
              <UserRound
                size={s(40)}
                color={colors.inkFaint}
                strokeWidth={1.4}
              />
            )}
          </View>
          <View style={styles.selfieText}>
            <AppText variant="meta" color={colors.inkMuted}>
              Face the camera. This photograph is filed with the declaration as
              proof of who signed.
            </AppText>
            <Button
              label={selfie ? 'Retake' : 'Take photograph'}
              size="md"
              variant={selfie ? 'outline' : 'secondary'}
              iconLeft={selfie ? RotateCcw : Camera}
              onPress={capture}
              style={styles.selfieBtn}
            />
            {noCamera ? (
              <Button
                label="Choose a photo"
                size="md"
                variant="outline"
                onPress={choose}
                style={styles.selfieBtn}
              />
            ) : null}
          </View>
        </View>
        {error ? (
          <Notice tone="error" title={error} style={styles.notice} />
        ) : null}
      </FormCard>

      <Notice
        tone="info"
        title="Signing locks this record"
        text="The time of signing is stamped on it. A correction afterwards needs the record reopened, with a reason that stays on it."
        style={styles.notice}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: vs(10), marginBottom: vs(4) },
  footNotice: { marginBottom: vs(10) },
  stats: { flexDirection: 'row', marginBottom: vs(12) },
  declaration: { marginBottom: vs(14) },
  selfieRow: { flexDirection: 'row', gap: s(14), marginBottom: vs(14) },
  frame: {
    width: s(104),
    height: s(128),
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  selfieText: { flex: 1 },
  selfieBtn: { marginTop: vs(10) },
});
