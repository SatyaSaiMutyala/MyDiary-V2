import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, Trash2 } from 'lucide-react-native';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { TextField } from '../components/TextField';
import { priorities, sortedMilestones, taskStatuses } from '../model/project';
import { errorMessage, useMe } from '../store';
import {
  useAddProjectTaskMutation,
  useGetProjectQuery,
  useRemoveProjectTaskMutation,
  useUpdateProjectTaskMutation,
} from '../store/api/projectsApi';
import { addDays, realToday } from '../utils/dates';
import { colors } from '../theme';

/** A task on a project, optionally hung off one of its milestones. */
export function ProjectTaskFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const projectId = route.params?.projectId;
  const taskId = route.params?.taskId;

  const { data: project } = useGetProjectQuery(projectId);
  const existing = (project?.tasks ?? []).find(t => t.id === taskId);

  const [addTask, adding] = useAddProjectTaskMutation();
  const [updateTask, updating] = useUpdateProjectTaskMutation();
  const [removeTask] = useRemoveProjectTaskMutation();
  const saving = adding.isLoading || updating.isLoading;

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(me?.name ?? '');
  const [due, setDue] = useState(addDays(realToday(), 14));
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [milestoneId, setMilestoneId] = useState(
    route.params?.milestoneId ?? '',
  );
  const [problem, setProblem] = useState('');

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setTitle(existing.title ?? '');
    setAssignee(existing.assignee ?? '');
    setDue(existing.dueDate ?? '');
    setStatus(existing.status ?? 'todo');
    setPriority(existing.priority ?? 'medium');
    setMilestoneId(existing.milestoneId ?? '');
  }, [existing]);

  const milestoneOptions = [
    { id: '', label: 'None — project-wide' },
    ...sortedMilestones(project).map(m => ({ id: m.id, label: m.name })),
  ];

  const save = async () => {
    if (!title.trim()) {
      setProblem('Give the task a title.');
      return;
    }
    setProblem('');
    const body = {
      title: title.trim(),
      assignee: assignee.trim(),
      dueDate: due || '',
      status,
      priority,
      // The API wants null, not an empty string, for "no milestone".
      milestoneId: milestoneId || null,
    };
    try {
      if (taskId) {
        await updateTask({ id: projectId, taskId, ...body }).unwrap();
      } else {
        await addTask({ id: projectId, ...body }).unwrap();
      }
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this task?',
      text: `"${existing?.title}" is removed from the project. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeTask({ id: projectId, taskId }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={taskId ? 'Edit task' : 'New task'}
      right={
        taskId ? (
          <IconButton
            icon={Trash2}
            label="Delete task"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : taskId ? 'Save changes' : 'Add task'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="The task">
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="What has to be done"
        />
        <TextField
          label="Assignee"
          value={assignee}
          onChangeText={setAssignee}
          placeholder="Who does it"
        />
        <DateField clearable label="Due" value={due} onChange={setDue} />
      </FormCard>

      <FormCard title="Where it sits">
        <Dropdown
          label="Status"
          options={taskStatuses}
          value={status}
          onChange={setStatus}
        />
        <Dropdown
          label="Priority"
          options={priorities}
          value={priority}
          onChange={setPriority}
        />
        <Dropdown
          label="Milestone"
          options={milestoneOptions}
          value={milestoneId}
          onChange={setMilestoneId}
          placeholder="None — project-wide"
        />
      </FormCard>
    </FormScreen>
  );
}

