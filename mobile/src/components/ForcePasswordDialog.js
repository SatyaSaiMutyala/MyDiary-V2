import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { colors, ms, radius, s, shadow, vs } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Eyebrow } from './Eyebrow';
import { Notice } from './Notice';
import { TextField } from './TextField';

const MIN_LENGTH = 8;

/**
 * A blocking "Set your password" box: no close, and the back button does nothing.
 *
 * It is raised by `mustChangePassword` on the person's own record, which the server turns on
 * whenever somebody else chose their password — a new account, or a password an admin reset. At
 * that moment two people know it, and only one of them should.
 *
 * Built like ForceUpdateDialog on purpose: the teal fills the screen rather than dimming the app,
 * because this is not a dialog over the app — it is the end of the road until a password is set.
 * The flag lives on the server, so doing this on the website clears the phone too.
 */
export function ForcePasswordDialog({ visible, name, saving, onSubmit, onSignOut }) {
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState('');

  const save = () => {
    if (next.length < MIN_LENGTH) {
      setProblem(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== again) {
      setProblem('The two passwords do not match.');
      return;
    }
    setProblem('');
    onSubmit(next, err => setProblem(err));
  };

  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.scrim}>
        <View accessibilityRole="alert" style={styles.card}>
          <View style={styles.halo}>
            <View style={styles.disc}>
              <KeyRound size={ms(34)} color={colors.yellowInk} strokeWidth={2.4} />
            </View>
          </View>

          <Eyebrow label="Password change required" />

          <AppText variant="title" style={styles.title}>
            Set your password
          </AppText>

          <AppText
            variant="bodyRegular"
            color={colors.inkMuted}
            style={styles.text}
          >
            {name ? `${name}, your` : 'Your'} password was set by somebody else, so two people know
            it. Choose your own to carry on.
          </AppText>

          {problem ? (
            <Notice tone="error" title={problem} style={styles.notice} />
          ) : null}

          <View style={styles.fields}>
            <TextField
              label="New password"
              value={next}
              onChangeText={v => {
                setNext(v);
                if (problem) {
                  setProblem('');
                }
              }}
              secure
              autoCapitalize="none"
              placeholder={`At least ${MIN_LENGTH} characters`}
            />
            <TextField
              label="New password again"
              value={again}
              onChangeText={v => {
                setAgain(v);
                if (problem) {
                  setProblem('');
                }
              }}
              secure
              autoCapitalize="none"
              placeholder="Type it once more"
            />
          </View>

          <Button
            label={saving ? 'Saving…' : 'Set password'}
            disabled={saving}
            onPress={save}
            style={styles.button}
          />

          {/* The one way out that is not choosing a password, so nobody is stuck on a shared phone. */}
          <Pressable onPress={onSignOut} style={styles.signOut}>
            <AppText variant="meta" color={colors.inkMuted}>
              Sign out instead
            </AppText>
          </Pressable>
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
    paddingBottom: vs(18),
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
  notice: { alignSelf: 'stretch', marginTop: vs(6) },
  fields: { alignSelf: 'stretch', marginTop: vs(10) },
  button: { alignSelf: 'stretch' },
  signOut: { paddingTop: vs(12), alignItems: 'center' },
});
