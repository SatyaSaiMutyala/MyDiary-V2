import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Plus, Trash2, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { milestoneStatuses } from '../model/project';
import { errorMessage, useMe } from '../store';
import {
  useAddCriterionMutation,
  useAddMilestoneMutation,
  useGetProjectQuery,
  useRemoveCriterionMutation,
  useRemoveMilestoneMutation,
  useUpdateCriterionMutation,
  useUpdateMilestoneMutation,
} from '../store/api/projectsApi';
import { addDays, realToday } from '../utils/dates';
import { colors, hairline, s, vs } from '../theme';

/**
 * A milestone, and the pass/fail tests that decide it is done.
 *
 * Acceptance criteria are addressed by their position in the list, which is the server's contract —
 * so they are only editable once the milestone itself exists, and each change is its own request.
 */
export function MilestoneFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const projectId = route.params?.projectId;
  const milestoneId = route.params?.milestoneId;

  const { data: project } = useGetProjectQuery(projectId);
  const existing = (project?.milestones ?? []).find(m => m.id === milestoneId);

  const [addMilestone, adding] = useAddMilestoneMutation();
  const [updateMilestone, updatingM] = useUpdateMilestoneMutation();
  const [removeMilestone] = useRemoveMilestoneMutation();
  const [addCriterion, addingC] = useAddCriterionMutation();
  const [updateCriterion] = useUpdateCriterionMutation();
  const [removeCriterion] = useRemoveCriterionMutation();
  const saving = adding.isLoading || updatingM.isLoading;

  const [name, setName] = useState('');
  const [due, setDue] = useState(addDays(realToday(), 30));
  const [status, setStatus] = useState('todo');
  const [owner, setOwner] = useState(me?.name ?? '');
  const [description, setDescription] = useState('');
  const [criterion, setCriterion] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState('');

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setName(existing.name ?? '');
    setDue(existing.dueDate ?? '');
    setStatus(existing.status ?? 'todo');
    setOwner(existing.owner ?? '');
    setDescription(existing.description ?? '');
  }, [existing]);

  const run = async (key, fn) => {
    setBusy(key);
    setProblem('');
    try {
      await fn().unwrap();
      return true;
    } catch (err) {
      setProblem(errorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setProblem('Give the milestone a name.');
      return;
    }
    const body = {
      name: name.trim(),
      dueDate: due || '',
      status,
      owner: owner.trim(),
      description: description.trim(),
    };
    const ok = milestoneId
      ? await run('save', () =>
          updateMilestone({ id: projectId, milestoneId, ...body }),
        )
      : await run('save', () => addMilestone({ id: projectId, ...body }));
    if (ok) {
      nav.goBack();
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this milestone?',
      text: `"${existing?.name}" is removed from the project. Tasks and risks linked to it stay, unlinked.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    const ok = await run('delete', () =>
      removeMilestone({ id: projectId, milestoneId }),
    );
    if (ok) {
      nav.goBack();
    }
  };

  const addOne = async () => {
    const text = criterion.trim();
    if (!text) {
      return;
    }
    const ok = await run('criterion', () =>
      addCriterion({ id: projectId, milestoneId, text }),
    );
    if (ok) {
      setCriterion('');
    }
  };

  const list = existing?.acceptanceCriteria ?? [];

  return (
    <FormScreen
      title={milestoneId ? 'Edit milestone' : 'New milestone'}
      right={
        milestoneId ? (
          <IconButton
            icon={Trash2}
            label="Delete milestone"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : milestoneId ? 'Save changes' : 'Add milestone'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="The milestone">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Internal audit closed out"
        />
        <DateField clearable label="Due" value={due} onChange={setDue} />
        <Dropdown
          label="Status"
          options={milestoneStatuses}
          value={status}
          onChange={setStatus}
        />
        <TextField
          label="Owner"
          value={owner}
          onChangeText={setOwner}
          placeholder="Who sees it through"
        />
        <TextArea
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What this milestone covers"
          rows={3}
        />
      </FormCard>

      {milestoneId ? (
        <FormCard
          title={`Acceptance criteria${list.length ? ` · ${list.filter(c => c.done).length}/${list.length}` : ''}`}
        >
          {list.length ? (
            list.map((c, i) => (
              <View
                key={`${milestoneId}-c${i}`}
                style={[styles.row, i === list.length - 1 && styles.lastRow]}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(c.done) }}
                  accessibilityLabel={c.text}
                  disabled={busy === `tick:${i}`}
                  onPress={() =>
                    run(`tick:${i}`, () =>
                      updateCriterion({
                        id: projectId,
                        milestoneId,
                        index: i,
                        done: !c.done,
                      }),
                    )
                  }
                  style={({ pressed }) => [
                    styles.tickArea,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.box, c.done && styles.boxOn]}>
                    {c.done ? (
                      <Check size={s(12)} color={colors.white} strokeWidth={3} />
                    ) : null}
                  </View>
                  <AppText
                    variant="body"
                    color={c.done ? colors.inkMuted : colors.ink}
                    style={[styles.flex, c.done && styles.struck]}
                  >
                    {c.text}
                  </AppText>
                </Pressable>
                <IconButton
                  icon={X}
                  label={`Remove "${c.text}"`}
                  size={28}
                  iconSize={15}
                  color={colors.inkFaint}
                  onPress={() =>
                    run(`rm:${i}`, () =>
                      removeCriterion({
                        id: projectId,
                        milestoneId,
                        index: i,
                      }),
                    )
                  }
                />
              </View>
            ))
          ) : (
            <AppText variant="meta" color={colors.inkFaint} style={styles.empty}>
              None yet. Add the pass/fail tests that decide this milestone is done.
            </AppText>
          )}

          <TextField
            label="Add a criterion"
            value={criterion}
            onChangeText={setCriterion}
            placeholder='e.g. "All SOPs HOD-signed"'
          />
          <Button
            label={addingC.isLoading ? 'Adding…' : 'Add criterion'}
            variant="plain"
            size="sm"
            iconLeft={Plus}
            disabled={addingC.isLoading || !criterion.trim()}
            onPress={addOne}
            style={styles.addButton}
          />
        </FormCard>
      ) : (
        <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
          Save the milestone first — its acceptance criteria can be added once it exists.
        </AppText>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  struck: { textDecorationLine: 'line-through' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingVertical: vs(6),
    borderBottomWidth: hairline,
    borderBottomColor: colors.lineSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  tickArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(10) },
  box: {
    width: s(19),
    height: s(19),
    borderRadius: s(4),
    borderWidth: hairline * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  empty: { paddingVertical: vs(6) },
  addButton: { alignSelf: 'flex-start', marginTop: vs(8) },
  hint: { marginTop: vs(10), paddingHorizontal: s(4) },
});
