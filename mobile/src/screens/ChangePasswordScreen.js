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
 * The current password is asked for because the server asks for it — knowing the phone is unlocked
 * is not the same as knowing whose phone it is. The confirmation box is this screen's own idea: the
 * server cannot tell a typo from a decision.
 */
export function ChangePasswordScreen() {
  const nav = useNavigation();
  const [changePassword, call] = useChangePasswordMutation();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!current) {
      setProblem('Enter your current password.');
      return;
    }
    if (next.length < MIN_LENGTH) {
      setProblem(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== again) {
      setProblem('The two new passwords do not match.');
      return;
    }
    if (next === current) {
      setProblem('The new password is the same as the current one.');
      return;
    }
    setProblem('');
    try {
      await changePassword({ current, next }).unwrap();
      setCurrent('');
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
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secure
            autoCapitalize="none"
            placeholder="The one you use now"
          />
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
