import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, KeyRound } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Eyebrow } from '../components/Eyebrow';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { InfoRow } from '../components/InfoRow';
import { Notice } from '../components/Notice';
import { Pill } from '../components/Pill';
import { ShimmerRows } from '../components/Shimmer';
import { TextField } from '../components/TextField';
import { moduleLabel, roleLabel } from '../model/modules';
import { errorMessage } from '../store';
import { useMeQuery, useUpdateMeMutation } from '../store/api/authApi';
import { initialsOf } from '../utils/people';
import { longDate } from '../utils/dates';
import { APP_VERSION } from '../config/appVersion';
import { colors, hairline, s, vs } from '../theme';

/**
 * My account — the person's own details.
 *
 * Only the two things the server lets a person change about themselves are editable (name and job
 * title). Email, role, department and which modules they have are set in Settings on the website,
 * so they are shown but not offered as fields — a box you cannot save is worse than no box.
 */
export function AccountScreen() {
  const nav = useNavigation();
  const { data: me, error, isLoading, refetch } = useMeQuery();
  const [updateMe, saving] = useUpdateMeMutation();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);

  const filled = useRef(false);
  useEffect(() => {
    if (!me || filled.current) {
      return;
    }
    filled.current = true;
    setName(me.name ?? '');
    setTitle(me.title ?? '');
  }, [me]);

  if (isLoading) {
    return (
      <FormScreen title="My account">
        <Card style={styles.loading}>
          <ShimmerRows rows={4} />
        </Card>
      </FormScreen>
    );
  }

  if (error || !me) {
    return (
      <FormScreen title="My account">
        <Notice
          tone="error"
          title={error ? errorMessage(error) : 'Your account could not be loaded.'}
        />
      </FormScreen>
    );
  }

  const changed = name.trim() !== me.name || title.trim() !== (me.title ?? '');

  const save = async () => {
    if (!name.trim()) {
      setProblem('Enter your name.');
      return;
    }
    setProblem('');
    setSaved(false);
    try {
      await updateMe({ name: name.trim(), title: title.trim() }).unwrap();
      setSaved(true);
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title="My account"
      onRefresh={refetch}
      footer={
        <Button
          label={saving.isLoading ? 'Saving…' : 'Save changes'}
          iconLeft={Check}
          disabled={saving.isLoading || !changed}
          onPress={save}
        />
      }
    >
      {problem ? <Notice tone="error" title={problem} /> : null}
      {saved && !changed ? (
        <Notice tone="success" title="Saved." />
      ) : null}

      <Card style={styles.hero}>
        <Avatar label={initialsOf(me.name)} size={56} />
        <View style={styles.heroText}>
          <AppText variant="heading" numberOfLines={1}>
            {me.name}
          </AppText>
          <AppText variant="meta" color={colors.inkMuted} numberOfLines={1}>
            {me.email}
          </AppText>
          <View style={styles.heroTags}>
            <Pill label={roleLabel(me.role)} tone="teal" />
            {me.status !== 'active' ? (
              <Pill label={me.status} tone="critical" />
            ) : null}
          </View>
        </View>
      </Card>

      <FormCard title="What you can change">
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Job title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Chairman & Managing Director"
        />
      </FormCard>

      <FormCard title="Set by an administrator">
        <InfoRow label="Email" value={me.email} />
        <InfoRow label="Role" value={roleLabel(me.role)} />
        <InfoRow label="Department" value={me.department} />
        <InfoRow
          label="Joined"
          value={me.createdAt ? longDate(String(me.createdAt).slice(0, 10)) : ''}
        />
        <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
          These are changed in Settings on the website.
        </AppText>
      </FormCard>

      <Eyebrow label={`What you can open · ${(me.modules ?? []).length}`} />
      <Card style={styles.list}>
        {(me.modules ?? []).map((key, i) => (
          <View
            key={key}
            style={[
              styles.moduleRow,
              i === (me.modules ?? []).length - 1 && styles.lastRow,
            ]}
          >
            <AppText variant="body">{moduleLabel(key)}</AppText>
          </View>
        ))}
      </Card>

      <FormCard title="Sign-in">
        <Button
          label="Change password"
          variant="plain"
          size="md"
          iconLeft={KeyRound}
          onPress={() => nav.navigate('ChangePassword')}
          style={styles.passwordButton}
        />
      </FormCard>

      <AppText variant="meta" color={colors.inkFaint} style={styles.version}>
        Trust Diary {APP_VERSION}
      </AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: s(14) },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
  },
  heroText: { flex: 1, gap: vs(2) },
  heroTags: { flexDirection: 'row', gap: s(6), marginTop: vs(6) },
  hint: { marginTop: vs(4), marginBottom: vs(8) },
  list: { paddingHorizontal: s(14), paddingVertical: vs(4) },
  moduleRow: {
    paddingVertical: vs(10),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  passwordButton: { alignSelf: 'flex-start', marginBottom: vs(10) },
  version: { textAlign: 'center', marginTop: vs(16) },
});
