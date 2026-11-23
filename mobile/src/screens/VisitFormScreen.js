import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Plus, Save, Send, Trash2, X } from 'lucide-react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { FormCard } from '../components/FormCard';
import { FormScreen } from '../components/FormScreen';
import { IconButton } from '../components/IconButton';
import { Notice } from '../components/Notice';
import { StarRating } from '../components/StarRating';
import { SwitchRow } from '../components/SwitchRow';
import { TextArea } from '../components/TextArea';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import {
  assessments,
  blankVisit,
  observationCategories,
  ratingAreas,
  visitBody,
  visitTypes,
  whyNotSubmittable,
} from '../model/visit';
import { errorMessage, useMe } from '../store';
import {
  useCreateVisitMutation,
  useGetVisitQuery,
  useRemoveVisitMutation,
  useUpdateVisitMutation,
} from '../store/api/visitsApi';
import { colors, hairline, s, vs } from '../theme';

/** A row of chips that can be added to and removed from — the visit team, and the tags. */
function ChipList({ label, items, placeholder, onAdd, onRemove }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) {
      setDraft('');
      return;
    }
    onAdd(v);
    setDraft('');
  };
  return (
    <View>
      <AppText variant="label" color={colors.inkSoft} style={styles.chipLabel}>
        {label}
      </AppText>
      {items.length ? (
        <View style={styles.chips}>
          {items.map(x => (
            <Pressable
              key={x}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${x}`}
              onPress={() => onRemove(x)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <AppText variant="meta">{x}</AppText>
              <X size={s(13)} color={colors.inkMuted} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.chipAdd}>
        {/* TextField spreads its props onto the TextInput, so the row's flex goes on a wrapper. */}
        <View style={styles.flex}>
          <TextField
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            onSubmitEditing={add}
            returnKeyType="done"
          />
        </View>
        <IconButton
          icon={Plus}
          label={`Add to ${label}`}
          size={34}
          iconSize={17}
          onPress={add}
        />
      </View>
    </View>
  );
}

/**
 * A visit report, written up or corrected.
 *
 * It saves two ways, as the website does: "Save draft" keeps it half-finished, and "Submit" signs
 * it off — which the server will refuse unless the organisation, the purpose and the overall
 * assessment are filled in, so those are checked here first with the same wording.
 */
export function VisitFormScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const me = useMe();
  const confirm = useConfirm();
  const editId = route.params?.id;

  const { data: existing } = useGetVisitQuery(editId, { skip: !editId });
  const [createVisit, creating] = useCreateVisitMutation();
  const [updateVisit, updating] = useUpdateVisitMutation();
  const [removeVisit] = useRemoveVisitMutation();
  const saving = creating.isLoading || updating.isLoading;

  const [d, setD] = useState(() => blankVisit(me?.name));
  const [problem, setProblem] = useState('');

  const set = (key, value) => setD(x => ({ ...x, [key]: value }));
  const setIn = (group, key, value) =>
    setD(x => ({ ...x, [group]: { ...x[group], [key]: value } }));

  const filled = useRef(false);
  useEffect(() => {
    if (!existing || filled.current) {
      return;
    }
    filled.current = true;
    const blank = blankVisit(me?.name);
    setD({
      ...blank,
      ...existing,
      org: { ...blank.org, ...(existing.org ?? {}) },
      host: { ...blank.host, ...(existing.host ?? {}) },
      ratings: { ...blank.ratings, ...(existing.ratings ?? {}) },
      team: existing.team ?? [],
      tags: existing.tags ?? [],
      observations: existing.observations ?? [],
      actionItems: existing.actionItems ?? [],
    });
  }, [existing, me?.name]);

  const save = async status => {
    if (status === 'submitted') {
      const why = whyNotSubmittable(d);
      if (why) {
        setProblem(why);
        return;
      }
    } else if (!d.title.trim()) {
      setProblem('Please enter a visit title.');
      return;
    }
    if (!d.date) {
      setProblem('Pick the date of the visit.');
      return;
    }
    setProblem('');

    const body = visitBody(d, status);
    try {
      if (editId) {
        await updateVisit({ id: editId, ...body }).unwrap();
        if (status === 'submitted') {
          nav.replace('VisitDetail', { id: editId });
        } else {
          nav.goBack();
        }
      } else {
        const saved = await createVisit(body).unwrap();
        nav.replace(status === 'submitted' ? 'VisitDetail' : 'VisitForm', {
          id: saved.id,
        });
      }
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: 'Delete this visit report?',
      text: `"${existing?.title}" and everything in it is removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    });
    if (!yes) {
      return;
    }
    try {
      await removeVisit(editId).unwrap();
      nav.goBack();
    } catch (err) {
      setProblem(errorMessage(err));
    }
  };

  const addObservation = () =>
    set('observations', [
      ...d.observations,
      { category: 'Other', observation: '', evidence: '' },
    ]);
  const patchObservation = (i, next) =>
    set(
      'observations',
      d.observations.map((o, j) => (j === i ? { ...o, ...next } : o)),
    );
  const dropObservation = i =>
    set(
      'observations',
      d.observations.filter((_, j) => j !== i),
    );

  const addAction = () =>
    set('actionItems', [
      ...d.actionItems,
      { text: '', owner: me?.name ?? '', deadline: '' },
    ]);
  const patchAction = (i, next) =>
    set(
      'actionItems',
      d.actionItems.map((a, j) => (j === i ? { ...a, ...next } : a)),
    );
  const dropAction = i =>
    set(
      'actionItems',
      d.actionItems.filter((_, j) => j !== i),
    );

  return (
    <FormScreen
      title={editId ? 'Edit visit' : 'New visit'}
      right={
        editId ? (
          <IconButton
            icon={Trash2}
            label="Delete visit"
            iconSize={20}
            color={colors.red}
            onPress={remove}
          />
        ) : undefined
      }
      footer={
        <View style={styles.footer}>
          <Button
            label={saving ? 'Saving…' : 'Save draft'}
            variant="plain"
            size="md"
            iconLeft={Save}
            disabled={saving}
            onPress={() => save('draft')}
            style={styles.flex}
          />
          <Button
            label="Submit"
            size="md"
            iconLeft={Send}
            disabled={saving}
            onPress={() => save('submitted')}
            style={styles.flex}
          />
        </View>
      }
    >
      {problem ? (
        <Notice tone="error" title={problem} />
      ) : null}

      <FormCard title="The visit">
        <TextField
          label="Title"
          value={d.title}
          onChangeText={v => set('title', v)}
          placeholder="e.g. Roche Diagnostics — annual supplier audit"
        />
        <Dropdown
          label="Type"
          options={visitTypes}
          value={d.type}
          onChange={v => set('type', v)}
        />
        <DateField label="Date" value={d.date} onChange={v => set('date', v)} />
        <TimeField
          label="Time in"
          value={d.timeIn}
          onChange={v => set('timeIn', v)}
        />
        <TimeField
          label="Time out"
          value={d.timeOut}
          onChange={v => set('timeOut', v)}
        />
      </FormCard>

      <FormCard title="Where">
        <TextField
          label="Organisation"
          value={d.org.name}
          onChangeText={v => setIn('org', 'name', v)}
          placeholder="Whose site was visited"
        />
        <TextField
          label="Branch / unit"
          value={d.org.branch}
          onChangeText={v => setIn('org', 'branch', v)}
        />
        <TextField
          label="Address"
          value={d.org.address}
          onChangeText={v => setIn('org', 'address', v)}
        />
        <TextField
          label="City"
          value={d.org.city}
          onChangeText={v => setIn('org', 'city', v)}
        />
        <TextField
          label="State"
          value={d.org.state}
          onChangeText={v => setIn('org', 'state', v)}
        />
        <TextField
          label="GPS link"
          value={d.org.gps}
          onChangeText={v => setIn('org', 'gps', v)}
          autoCapitalize="none"
          placeholder="A maps link, if you have one"
        />
      </FormCard>

      <FormCard title="Who met you">
        <TextField
          label="Host"
          value={d.host.name}
          onChangeText={v => setIn('host', 'name', v)}
        />
        <TextField
          label="Designation"
          value={d.host.designation}
          onChangeText={v => setIn('host', 'designation', v)}
        />
        <TextField
          label="Phone"
          value={d.host.phone}
          onChangeText={v => setIn('host', 'phone', v)}
          keyboardType="phone-pad"
        />
        <TextField
          label="Email"
          value={d.host.email}
          onChangeText={v => setIn('host', 'email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FormCard>

      <FormCard title="Our side">
        <ChipList
          label="Visit team"
          items={d.team}
          placeholder="Add a colleague's name"
          onAdd={name => set('team', [...d.team, name])}
          onRemove={name =>
            set('team', d.team.filter(x => x !== name))
          }
        />
        <TextArea
          label="External participants"
          value={d.externalParticipants}
          onChangeText={v => set('externalParticipants', v)}
          placeholder="Anyone else present, and from where"
          rows={2}
        />
      </FormCard>

      <FormCard title="Why we went">
        <TextArea
          label="Purpose"
          value={d.purpose}
          onChangeText={v => set('purpose', v)}
          placeholder="What this visit set out to do"
          rows={3}
        />
        <TextArea
          label="Scope"
          value={d.scope}
          onChangeText={v => set('scope', v)}
          placeholder="What was covered on the ground"
          rows={3}
        />
        <TextArea
          label="References"
          value={d.references}
          onChangeText={v => set('references', v)}
          placeholder="Standards, SOPs, prior reports"
          rows={2}
        />
        <ChipList
          label="Tags"
          items={d.tags}
          placeholder="Add a tag"
          onAdd={tag => set('tags', [...d.tags, tag])}
          onRemove={tag => set('tags', d.tags.filter(x => x !== tag))}
        />
      </FormCard>

      <FormCard title="Ratings">
        <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
          Score each area out of 5. Leave an area at zero and it is simply not counted.
        </AppText>
        {ratingAreas.map(a => (
          <StarRating
            key={a.id}
            label={a.label}
            value={d.ratings[a.id] ?? 0}
            onChange={v => setIn('ratings', a.id, v)}
          />
        ))}
      </FormCard>

      <FormCard title="The verdict">
        <Dropdown
          label="Overall assessment"
          options={assessments}
          value={d.overallAssessment}
          onChange={v => set('overallAssessment', v)}
          placeholder="Pick one to submit"
        />
        <TextArea
          label="Executive summary"
          value={d.executiveSummary}
          onChangeText={v => set('executiveSummary', v)}
          placeholder="The short version, for someone who will not read the rest"
          rows={4}
        />
      </FormCard>

      <FormCard title={`Observations${d.observations.length ? ` · ${d.observations.length}` : ''}`}>
        {d.observations.map((o, i) => (
          <View key={`obs-${i}`} style={styles.block}>
            <View style={styles.blockHead}>
              <AppText variant="metaStrong" color={colors.inkFaint}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <IconButton
                icon={X}
                label={`Remove observation ${i + 1}`}
                size={28}
                iconSize={15}
                color={colors.inkFaint}
                onPress={() => dropObservation(i)}
              />
            </View>
            <Dropdown
              label="Category"
              options={observationCategories}
              value={o.category}
              onChange={v => patchObservation(i, { category: v })}
            />
            <TextArea
              label="What was seen"
              value={o.observation}
              onChangeText={v => patchObservation(i, { observation: v })}
              rows={3}
            />
            <TextField
              label="Evidence"
              value={o.evidence}
              onChangeText={v => patchObservation(i, { evidence: v })}
              placeholder="Record, photo or document that shows it"
            />
          </View>
        ))}
        <Button
          label="Add observation"
          size="sm"
          variant="outline"
          iconLeft={Plus}
          onPress={addObservation}
          style={styles.addButton}
        />
      </FormCard>

      <FormCard title={`Follow-up actions${d.actionItems.length ? ` · ${d.actionItems.length}` : ''}`}>
        <AppText variant="meta" color={colors.inkFaint} style={styles.hint}>
          On submit, the server notifies each owner.
        </AppText>
        {d.actionItems.map((a, i) => (
          <View key={`act-${i}`} style={styles.block}>
            <View style={styles.blockHead}>
              <AppText variant="metaStrong" color={colors.inkFaint}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <IconButton
                icon={X}
                label={`Remove action ${i + 1}`}
                size={28}
                iconSize={15}
                color={colors.inkFaint}
                onPress={() => dropAction(i)}
              />
            </View>
            <TextArea
              label="What must happen"
              value={a.text}
              onChangeText={v => patchAction(i, { text: v })}
              rows={2}
            />
            <TextField
              label="Owner"
              value={a.owner}
              onChangeText={v => patchAction(i, { owner: v })}
            />
            <DateField
              clearable
              label="By when"
              value={a.deadline}
              onChange={v => patchAction(i, { deadline: v })}
            />
          </View>
        ))}
        <Button
          label="Add action"
          size="sm"
          variant="outline"
          iconLeft={Plus}
          onPress={addAction}
          style={styles.addButton}
        />
      </FormCard>

      <FormCard title="Afterwards">
        <SwitchRow
          label="Follow-up visit needed"
          value={d.followUpRequired}
          onChange={v => set('followUpRequired', v)}
        />
        <DateField
          clearable
          label="Next visit"
          value={d.nextVisitDate}
          onChange={v => set('nextVisitDate', v)}
        />
        <TextArea
          label="Additional remarks"
          value={d.additionalRemarks}
          onChangeText={v => set('additionalRemarks', v)}
          rows={3}
        />
      </FormCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  footer: { flexDirection: 'row', gap: s(10) },
  hint: { marginBottom: vs(8) },
  addButton: { alignSelf: 'flex-start', marginTop: vs(6) },
  chipLabel: { marginBottom: vs(6) },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginBottom: vs(8),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: s(14),
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipAdd: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  block: {
    paddingTop: vs(8),
    marginTop: vs(8),
    borderTopWidth: hairline,
    borderTopColor: colors.lineSoft,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
