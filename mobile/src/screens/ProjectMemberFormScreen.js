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
  useAddExternalMutation,
  useAddMemberMutation,
  useGetProjectQuery,
  useRemoveExternalMutation,
  useRemoveMemberMutation,
  useUpdateExternalMutation,
  useUpdateMemberMutation,
} from '../store/api/projectsApi';
import { colors } from '../theme';

/**
 * Somebody on the project — a TDPL colleague, or an outside collaborator.
 *
 * The two are different endpoints on the server (`/team` and `/external`), so `external` decides
 * which pair of calls this screen makes; only an external collaborator has an email.
 */
export function ProjectMemberFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const confirm = useConfirm();
  const projectId = route.params?.projectId;
  const memberId = route.params?.memberId;
  const external = Boolean(route.params?.external);

  const { data: project } = useGetProjectQuery(projectId);
  const existing = (
    (external ? project?.external : project?.team) ?? []
  ).find(x => x.id === memberId);

  const [addMember, addingM] = useAddMemberMutation();
  const [updateMember, updatingM] = useUpdateMemberMutation();
  const [removeMember] = useRemoveMemberMutation();
  const [addExternal, addingX] = useAddExternalMutation();
  const [updateExternal, updatingX] = useUpdateExternalMutation();
  const [removeExternal] = useRemoveExternalMutation();
  const saving =
    addingM.isLoading || updatingM.isLoading || addingX.isLoading || updatingX.isLoading;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState('');

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    setName(existing.name ?? '');
    setRole(existing.role ?? '');
    setEmail(existing.email ?? '');
  }, [existing]);

  const save = async () => {
    if (!name.trim()) {
      setProblem(
        external ? 'Enter the collaborator’s name.' : 'Enter the name.',
      );
      return;
    }
    setProblem('');
    const body = external
      ? { name: name.trim(), role: role.trim(), email: email.trim() }
      : { name: name.trim(), role: role.trim() };
    try {
      if (memberId) {
        const call = external ? updateExternal : updateMember;
        await call({ id: projectId, memberId, ...body }).unwrap();
      } else {
        const call = external ? addExternal : addMember;
        await call({ id: projectId, ...body }).unwrap();
      }
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Take them off this project?',
      text: `${existing?.name} is removed from the ${external ? 'collaborators' : 'team'}. Their tasks stay.`,
      confirmLabel: 'Remove',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      const call = external ? removeExternal : removeMember;
      await call({ id: projectId, memberId }).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const what = external ? 'collaborator' : 'member';

  return (
    <FormScreen
      title={memberId ? `Edit ${what}` : `Add ${what}`}
      right={
        memberId ? (
          <IconButton
            icon={Trash2}
            label={`Remove ${what}`}
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <Button
          label={saving ? 'Saving…' : memberId ? 'Save changes' : `Add ${what}`}
          iconLeft={Check}
          disabled={saving}
          onPress={save}
        />
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title={external ? 'External collaborator' : 'TDPL member'}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Full name"
        />
        <TextField
          label={external ? 'Role / organisation' : 'Role on this project'}
          value={role}
          onChangeText={setRole}
          placeholder={external ? 'e.g. Auditor, NABL' : 'e.g. Project Lead'}
        />
        {external ? (
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="name@example.com"
          />
        ) : null}
      </FormCard>
    </FormScreen>
  );
}

