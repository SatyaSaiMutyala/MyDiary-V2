import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { Notice } from '../components/Notice';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import {
  blankProject,
  categories,
  priorities,
  statuses,
} from '../model/project';
import { errorMessage, useMe } from '../store';
import {
  useCreateProjectMutation,
  useGetProjectQuery,
  useListProjectsQuery,
  useUpdateProjectMutation,
} from '../store/api/projectsApi';

/**
 * A new project, or a change to one.
 *
 * Only the project's own details live here. Milestones, tasks, risks, KPIs and the team are added
 * from the project's own screen, each through its own endpoint — the website's four-step wizard is
 * a desk convenience, and on a phone a shorter form that opens straight into the project is kinder.
 */
export function ProjectFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const editId = route.params?.id;

  const { data: existing } = useGetProjectQuery(editId, { skip: !editId });
  // Only to number a new project's code the way the website numbers it.
  const { data: portfolio } = useListProjectsQuery(
    { limit: 1 },
    { skip: Boolean(editId) },
  );
  const [createProject, creating] = useCreateProjectMutation();
  const [updateProject, updating] = useUpdateProjectMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [form, setForm] = useState(() => blankProject(me?.name));
  const [problem, setProblem] = useState('');
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Number the code once the portfolio size is known.
  const numbered = useRef(false);
  useEffect(() => {
    if (editId || numbered.current || portfolio?.total === undefined) {
      return;
    }
    numbered.current = true;
    setForm(f => ({ ...f, ...blankProject(me?.name, portfolio.total), name: f.name }));
  }, [editId, portfolio?.total, me?.name]);

  // Fill the form once, when the project being edited arrives.
  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setForm({
      code: existing.code ?? '',
      name: existing.name ?? '',
      description: existing.description ?? '',
      category: existing.category ?? 'operations',
      priority: existing.priority ?? 'medium',
      status: existing.status ?? 'planning',
      owner: existing.owner ?? '',
      startDate: existing.startDate ?? '',
      endDate: existing.endDate ?? '',
    });
  }, [existing]);

  const save = async () => {
    if (!form.name.trim()) {
      setProblem('Give the project a name.');
      return;
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setProblem('The end date must be on or after the start date.');
      return;
    }
    setProblem('');

    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      status: form.status,
      owner: form.owner.trim(),
      startDate: form.startDate || '',
      endDate: form.endDate || '',
    };

    try {
      if (editId) {
        await updateProject({ id: editId, ...body }).unwrap();
        nav.goBack();
      } else {
        const saved = await createProject(body).unwrap();
        nav.replace('ProjectDetail', { id: saved.id });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit project' : 'New project'}
      footer={
        <Button
          label={saving ? 'Saving…' : editId ? 'Save changes' : 'Create project'}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="What it is">
        <TextField
          label="Name"
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="e.g. NABL re-accreditation 2027"
        />
        <TextField
          label="Code"
          value={form.code}
          onChangeText={v => set('code', v)}
          placeholder="TL-2026-01"
        />
        <TextArea
          label="Description"
          value={form.description}
          onChangeText={v => set('description', v)}
          placeholder="What this project is for, in a line or two"
          rows={3}
        />
        <Dropdown
          label="Category"
          options={categories}
          value={form.category}
          onChange={v => set('category', v)}
        />
      </FormCard>

      <FormCard title="Where it stands">
        <Dropdown
          label="Status"
          options={statuses}
          value={form.status}
          onChange={v => set('status', v)}
        />
        <Dropdown
          label="Priority"
          options={priorities}
          value={form.priority}
          onChange={v => set('priority', v)}
        />
        <TextField
          label="Owner"
          value={form.owner}
          onChangeText={v => set('owner', v)}
          placeholder="Who answers for it"
        />
      </FormCard>

      <FormCard title="When">
        <DateField
          clearable
          label="Starts"
          value={form.startDate}
          onChange={v => set('startDate', v)}
        />
        <DateField
          clearable
          label="Ends"
          value={form.endDate}
          onChange={v => set('endDate', v)}
        />
      </FormCard>
    </FormScreen>
  );
}

