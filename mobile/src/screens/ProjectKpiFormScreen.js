import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Trash2 } from 'lucide-react-native';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { TextField } from '../components/TextField';
import { errorMessage } from '../store';
import {
  useAddKpiMutation,
  useGetProjectQuery,
  useRemoveKpiMutation,
  useUpdateKpiMutation,
} from '../store/api/projectsApi';
import { colors } from '../theme';

/** A number this project is judged on. */
export function ProjectKpiFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const confirm = useConfirm();
  const projectId = route.params?.projectId;
  const kpiId = route.params?.kpiId;

  const { data: project } = useGetProjectQuery(projectId);
  const existing = (project?.kpis ?? []).find(k => k.id === kpiId);

  const [addKpi, adding] = useAddKpiMutation();
  const [updateKpi, updating] = useUpdateKpiMutation();
  const [removeKpi] = useRemoveKpiMutation();
  const saving = adding.isLoading || updating.isLoading;

  const [name, setName] = useState('');
  const [current, setCurrent] = useState('0');
  const [target, setTarget] = useState('100');
  const [unit, setUnit] = useState('');
  const [problem, setProblem] = useState('');

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setName(existing.name ?? '');
    setCurrent(String(existing.current ?? 0));
    setTarget(String(existing.target ?? 0));
    setUnit(existing.unit ?? '');
  }, [existing]);

  const save = async () => {
    if (!name.trim()) {
      setProblem('Give the KPI a name.');
      return;
    }
    const cur = Number(current);
    const tgt = Number(target);
    if (Number.isNaN(cur) || Number.isNaN(tgt)) {
      setProblem('The current value and the target must both be numbers.');
      return;
    }
    setProblem('');
    // `unit` is deliberately not trimmed — ' days' and ' · ₹28L' read as written, after the number.
    const body = { name: name.trim(), current: cur, target: tgt, unit };
    try {
      if (kpiId) {
        await updateKpi({ id: projectId, kpiId, ...body }).unwrap();
      } else {
        await addKpi({ id: projectId, ...body }).unwrap();
      }
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this KPI?',
      text: `"${existing?.name}" is removed from the project.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeKpi({ id: projectId, kpiId }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={kpiId ? 'Edit KPI' : 'New KPI'}
      right={
        kpiId ? (
          <IconButton
            icon={Trash2}
            label="Delete KPI"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : kpiId ? 'Save changes' : 'Add KPI'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="The measure">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. SOPs reviewed"
        />
        <TextField
          label="Current"
          value={current}
          onChangeText={setCurrent}
          keyboardType="numeric"
          placeholder="0"
        />
        <TextField
          label="Target"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder="100"
        />
        <TextField
          label="Unit"
          value={unit}
          onChangeText={setUnit}
          placeholder="%, days, or leave it blank"
        />
      </FormCard>
    </FormScreen>
  );
}

