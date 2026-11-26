import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyRound } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { TextField } from '../components/TextField';
import { errorMessage } from '../store';
import { useChangePasswordMutation } from '../store/api/authApi';
import { colors, vs } from '../theme';

/** The server's own rule, stated up front rather than after a rejected attempt. */
const MIN_LENGTH = 8;

/**
 * Change the password used to sign in.
 *
 * The old password is not asked for: being signed in on this phone is taken as proof enough, which
 * is what was wanted. It does mean an unlocked, signed-in phone is all somebody needs to take the
 * account over, so the warning below says so plainly rather than letting it come as a surprise.
 *
 * The confirmation box stays — the server cannot tell a typo from a decision, and this is the one
 * field nobody can check for themselves afterwards.
 */
export function ChangePasswordScreen() {
  const nav = useNavigation();
  const [changePassword, call] = useChangePasswordMutation();

  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    if (next.length < MIN_LENGTH) {
      setProblem(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== again) {
      setProblem('The two new passwords do not match.');
      return;
    }
    setProblem('');
    try {
      // No `current`: the server treats it as optional and takes the session as the proof.
      await changePassword({ next }).unwrap();
      setNext('');
      setAgain('');
      setDone(true);
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="Change password"
      footer={
        done ? (
          <Button label="Done" onPress={() => nav.goBack()} />
        ) : (
          <Button
            label={call.isLoading ? 'Changing…' : 'Change password'}
            iconLeft={KeyRound}
            disabled={call.isLoading}
            onPress={save}
          />
        )
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}
      {done ? (
        <Notice
          tone="success"
          title="Password changed."
          text="Use the new one next time you sign in."
        />
      ) : null}

      {done ? null : (
        <FormCard title="Your password">
          <TextField
            label="New password"
            value={next}
            onChangeText={setNext}
            secure
            autoCapitalize="none"
            placeholder={`At least ${MIN_LENGTH} characters`}
          />
          <TextField
            label="New password again"
            value={again}
            onChangeText={setAgain}
            secure
            autoCapitalize="none"
            placeholder="Type it once more"
          />
          <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
            Your old password is not needed — being signed in here is enough. Keep this phone
            locked: anyone who can open it can change this password.
          </AppText>
          <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
            You stay signed in on this phone. Anyone signed in elsewhere stays signed in too, so
            change it on those devices as well if that matters.
          </AppText>
        </FormCard>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: vs(2), marginBottom: vs(10) },
});
