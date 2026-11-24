import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LockOpen } from 'lucide-react-native';
import { Button } from '../components/Button';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { SignerCard } from '../components/SignerCard';
import { TextArea } from '../components/TextArea';
import { clock, phaseName } from '../lab/model';
import { errorMessage, fieldErrors } from '../store';
import {
  useLabBoardQuery,
  useLabReopenMutation,
} from '../store/api/labReadinessApi';
import { longDate } from '../utils/dates';
import { vs } from '../theme';

/** Open a signed record again. The reason stays on the record, and the sign-off photograph goes. */
export function LabReopenScreen() {
  const nav = useNavigation();
  const target = useRoute().params;
  const board = useLabBoardQuery(target);
  const [reopen, call] = useLabReopenMutation();
  const [reason, setReason] = useState('');
  const run = board.data?.run;

  const submit = async () => {
    try {
      await reopen({ ...target, reason: reason.trim() }).unwrap();
      nav.goBack();
    } catch {
      // Shown from the API's own message below.
    }
  };

  return (
    <FormScreen
      title="Reopen record"
      footer={
        <Button
          label={call.isLoading ? 'Reopening…' : 'Reopen record'}
          iconLeft={LockOpen}
          disabled={!reason.trim() || call.isLoading}
          onPress={submit}
        />
      }
    >
      <Notice
        tone="error"
        title="Reopening a signed record is itself a deviation"
        text="State the reason. It is kept with the record, and the sign-off photograph is removed."
        style={styles.notice}
      />
      {call.error ? (
        <Notice
          tone="error"
          title={errorMessage(call.error)}
          style={styles.notice}
        />
      ) : null}
      <FormCard
        title={`${board.data?.unit.name ?? ''} · ${phaseName(
          target.phase,
        )} · ${longDate(target.date)}`}
      >
        {run?.signedAt ? (
          <SignerCard
            name={run.signedBy?.name ?? ''}
            role={run.signedBy?.role ?? ''}
            note={`Signed at ${clock(run.signedAt)}`}
          />
        ) : null}
        <TextArea
          label="Reason for reopening *"
          value={reason}
          onChangeText={setReason}
          maxLength={1000}
          placeholder="Why does this record need to change?"
          invalid={!!fieldErrors(call.error).reason}
        />
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: vs(10) },
});
