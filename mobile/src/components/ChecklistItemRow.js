import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Ban,
  Camera,
  Check,
  CircleAlert,
  Clock,
  TriangleAlert,
} from 'lucide-react-native';
import { MAX_PHOTOS, needsPhoto, needsRemark } from '../lab/model';
import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { ChoiceGroup } from './ChoiceGroup';
import { IconText } from './IconText';
import { PhotoStrip } from './PhotoStrip';
import { Pill } from './Pill';
import { StatusDot } from './StatusDot';
import { TextArea } from './TextArea';

const options = [
  { key: 'done', label: 'Done', icon: Check, tone: 'green' },
  { key: 'deviation', label: 'Deviation', icon: TriangleAlert, tone: 'amber' },
  { key: 'na', label: 'N/A', icon: Ban, tone: 'slate' },
];

const remarkLabel = status =>
  status === 'deviation'
    ? 'Deviation, containment action and escalation'
    : status === 'na'
    ? 'Reason not applicable'
    : 'Note (optional)';

const REMARK_DELAY = 700;

function Row({
  activity,
  item,
  locked,
  onStatus,
  onRemark,
  onAddPhotos,
  onRemovePhoto,
}) {
  // The remark is typed here and sent a moment after typing stops.
  //
  // It used to be held by the screen, which meant every letter re-rendered all twenty-six rows of
  // the round — the typing lag people felt. Kept here, a letter re-renders one row.
  const [draft, setDraft] = useState(null);
  const timer = useRef(null);
  const saved = item.remark;
  useEffect(() => {
    if (draft !== null && draft === saved) {
      setDraft(null); // what was typed is now what is stored
    }
  }, [draft, saved]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const type = text => {
    setDraft(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onRemark?.(text), REMARK_DELAY);
  };
  const flush = () => {
    clearTimeout(timer.current);
    if (draft !== null && draft !== saved) {
      onRemark?.(draft);
    }
  };

  const shown = { ...item, remark: draft ?? saved };
  const remarkMissing = needsRemark(shown);
  const photoMissing = needsPhoto(activity, shown);
  const touched = item.status !== null || item.photos.length > 0;
  const showPhotos =
    item.photos.length > 0 || (!locked && (activity.photoRequired || touched));
  // The box opens where something has to be written — a deviation or an N/A — or where a note
  // already is. It used to open on every answer, so each tick of a plain "Done" grew the row by a
  // box nobody was going to type in and pushed the rest of the round down the screen. This is also
  // what the website does.
  const showRemark = locked
    ? !!shown.remark.trim()
    : remarkMissing || !!shown.remark.trim();

  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <StatusDot status={item.status ?? 'open'} />
        <View style={styles.headBody}>
          <AppText variant="body">{activity.text}</AppText>
          <View style={styles.meta}>
            <IconText icon={Clock} text={activity.time} />
            {activity.photoRequired ? (
              <Pill label="Photo required" tone="low" icon={Camera} />
            ) : null}
            {/* Whose line it is. Nothing shown means everyone's. A line that is not yours is
                still here and still answerable — the round is signed as one sheet. */}
            {(activity.positions ?? []).map(p => (
              <Pill
                key={p.id}
                label={p.name}
                tone={activity.mine === false ? 'low' : 'signed'}
              />
            ))}
          </View>
          {item.actionedBy ? (
            <AppText
              variant="meta"
              color={colors.inkFaint}
              style={styles.stamp}
            >
              Actioned {item.actionedAt} · {item.actionedBy}
            </AppText>
          ) : null}
        </View>
      </View>

      {locked ? null : (
        <ChoiceGroup
          clearable
          vivid
          style={styles.block}
          options={options}
          value={item.status}
          onChange={k => onStatus?.(k)}
        />
      )}

      {showPhotos ? (
        <View style={styles.block}>
          <PhotoStrip
            photos={item.photos}
            max={MAX_PHOTOS}
            locked={locked}
            caption={activity.text}
            onAdd={onAddPhotos}
            onRemove={onRemovePhoto}
          />
        </View>
      ) : null}
      {photoMissing ? (
        <Hint text="Add a photograph to complete this item" />
      ) : null}

      {showRemark ? (
        <View style={styles.block}>
          <AppText variant="metaStrong" color={colors.inkSoft}>
            {remarkLabel(item.status)}
          </AppText>
          {locked ? (
            <AppText
              variant="bodyRegular"
              color={colors.inkSoft}
              style={styles.remark}
            >
              {shown.remark}
            </AppText>
          ) : (
            <TextArea
              value={shown.remark}
              onChangeText={type}
              onBlur={flush}
              maxLength={5000}
              placeholder="What happened and what did you do?"
              invalid={remarkMissing}
              style={styles.remark}
            />
          )}
          {remarkMissing ? (
            <Hint text="Add a remark to complete this item" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Hint({ text }) {
  return (
    <IconText
      icon={CircleAlert}
      text={text}
      variant="metaStrong"
      color={colors.redInk}
      iconColor={colors.red}
      iconSize={14}
      gap={6}
      style={styles.hint}
    />
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: s(14), paddingVertical: vs(14) },
  head: { flexDirection: 'row', gap: s(12) },
  headBody: { flex: 1 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: s(10),
    marginTop: vs(6),
  },
  stamp: { marginTop: vs(4) },
  block: { marginTop: vs(12) },
  remark: { marginTop: vs(6) },
  hint: { marginTop: vs(8) },
});

/**
 * One line of the readiness sheet.
 *
 * Wrapped so that answering one activity redraws that activity, not the twenty-six of the round.
 * Only what is drawn is compared: the callbacks are new closures on every render of the screen, but
 * they close over nothing that changes without the board being rebuilt from scratch (the section
 * list is keyed by unit, date and round), so their identity is deliberately ignored.
 */
export const ChecklistItemRow = React.memo(Row, (a, b) => {
  if (
    a.activity !== b.activity ||
    a.activity.mine !== b.activity.mine ||
    a.locked !== b.locked ||
    a.item.status !== b.item.status ||
    a.item.remark !== b.item.remark ||
    a.item.actionedBy !== b.item.actionedBy ||
    a.item.actionedAt !== b.item.actionedAt ||
    a.item.photos.length !== b.item.photos.length
  ) {
    return false;
  }
  return a.item.photos.every((p, i) => {
    const q = b.item.photos[i];
    return (
      p.id === q.id && p.pending === q.pending && p.localUri === q.localUri
    );
  });
});
