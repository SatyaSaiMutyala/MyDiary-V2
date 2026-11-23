import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Trash2 } from 'lucide-react-native';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { priorities, riskStatuses, sortedMilestones } from '../model/project';
import { errorMessage, useMe } from '../store';
import {
  useAddProjectRiskMutation,
  useGetProjectQuery,
  useRemoveProjectRiskMutation,
  useUpdateProjectRiskMutation,
} from '../store/api/projectsApi';
import { colors } from '../theme';

/** Something that could go wrong, and the plan for it. */
export function ProjectRiskFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const projectId = route.params?.projectId;
  const riskId = route.params?.riskId;

  const { data: project } = useGetProjectQuery(projectId);
  const existing = (project?.risks ?? []).find(r => r.id === riskId);

  const [addRisk, adding] = useAddProjectRiskMutation();
  const [updateRisk, updating] = useUpdateProjectRiskMutation();
  const [removeRisk] = useRemoveProjectRiskMutation();
  const saving = adding.isLoading || updating.isLoading;

  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [mitigation, setMitigation] = useState('');
  const [owner, setOwner] = useState(me?.name ?? '');
  const [status, setStatus] = useState('open');
  const [milestoneId, setMilestoneId] = useState('');
  const [problem, setProblem] = useState('');

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setTitle(existing.title ?? '');
    setSeverity(existing.severity ?? 'medium');
    setMitigation(existing.mitigation ?? '');
    setOwner(existing.owner ?? '');
    setStatus(existing.status ?? 'open');
    setMilestoneId(existing.milestoneId ?? '');
  }, [existing]);

  const milestoneOptions = [
    { id: '', label: 'None — project-wide' },
    ...sortedMilestones(project).map(m => ({ id: m.id, label: m.name })),
  ];

  const save = async () => {
    if (!title.trim()) {
      setProblem('Say what could go wrong.');
      return;
    }
    setProblem('');
    const body = {
      title: title.trim(),
      severity,
      mitigation: mitigation.trim(),
      owner: owner.trim(),
      status,
      milestoneId: milestoneId || null,
    };
    try {
      if (riskId) {
        await updateRisk({ id: projectId, riskId, ...body }).unwrap();
      } else {
        await addRisk({ id: projectId, ...body }).unwrap();
      }
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this risk?',
      text: `"${existing?.title}" is removed from the project. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeRisk({ id: projectId, riskId }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={riskId ? 'Edit risk' : 'New risk'}
      right={
        riskId ? (
          <IconButton
            icon={Trash2}
            label="Delete risk"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : riskId ? 'Save changes' : 'Add risk'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="The risk">
        <TextField
          label="What could go wrong"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Analyser calibration slips past the audit"
        />
        <Dropdown
          label="Severity"
          options={priorities}
          value={severity}
          onChange={setSeverity}
        />
        <TextArea
          label="Mitigation plan"
          value={mitigation}
          onChangeText={setMitigation}
          placeholder="What is being done about it"
          rows={3}
        />
      </FormCard>

      <FormCard title="Who and where">
        <TextField
          label="Risk owner"
          value={owner}
          onChangeText={setOwner}
          placeholder="Who watches it"
        />
        <Dropdown
          label="Status"
          options={riskStatuses}
          value={status}
          onChange={setStatus}
        />
        <Dropdown
          label="Threatens which milestone"
          options={milestoneOptions}
          value={milestoneId}
          onChange={setMilestoneId}
          placeholder="None — project-wide"
        />
      </FormCard>
    </FormScreen>
  );
}

