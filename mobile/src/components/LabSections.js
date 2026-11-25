import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import { colors, s, vs } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { Pill } from './Pill';

// The checklist grouped by section; each section folds and unfolds.
//
// Which sections start folded is decided once, when the record first loads:
// everything except the first one with work left in it. A round is twenty-six
// activities, each with three buttons, a photo strip and a text box, and
// drawing them all at once is what made the screen crawl on a real phone —
// opening one section is both faster and how the round is actually worked.
// After that only the person folds or unfolds a section. Finishing the last
// item of a section must NOT fold it, or the page jumps and the person loses
// their place.
export function LabSections({
  sections,
  items,
  renderRow,
  onlyActioned = false,
}) {
  const [folded, setFolded] = useState(null);

  useEffect(() => {
    if (folded === null && sections.length) {
      const open = sections.find(sec => sec.complete < sec.rows.length);
      setFolded(
        Object.fromEntries(
          sections.map(sec => [sec.title, sec.title !== open?.title]),
        ),
      );
    }
  }, [folded, sections]);

  return (
    <>
      {sections.map(sec => {
        const rows = onlyActioned
          ? sec.rows.filter(a => {
              const item = items[a.key];
              return item && (item.status !== null || item.photos.length > 0);
            })
          : sec.rows;
        if (!rows.length) {
          return null;
        }
        const allDone = sec.complete === sec.rows.length;
        // Until the first load has decided, keep everything folded but the first unfinished one.
        const isFolded = folded ? !!folded[sec.title] : true;
        const toggle = () =>
          setFolded(f => ({ ...(f ?? {}), [sec.title]: !isFolded }));

        if (isFolded) {
          return (
            <Pressable key={sec.title} onPress={toggle}>
              <Card style={styles.folded}>
                <IconTile
                  round
                  size={36}
                  bg={allDone ? colors.teal : colors.tealTint}
                >
                  {allDone ? (
                    <Check
                      size={s(17)}
                      color={colors.white}
                      strokeWidth={2.75}
                    />
                  ) : (
                    <AppText variant="metaStrong" color={colors.tealDeep}>
                      {sec.complete}/{sec.rows.length}
                    </AppText>
                  )}
                </IconTile>
                <View style={styles.foldedBody}>
                  <AppText variant="heading">{sec.title}</AppText>
                  <AppText variant="meta" color={colors.inkMuted}>
                    {allDone
                      ? `All ${sec.rows.length} complete`
                      : `${sec.complete} of ${sec.rows.length} complete · ${
                          sec.rows.length - sec.complete
                        } open`}
                  </AppText>
                </View>
                <ChevronDown
                  size={s(20)}
                  color={colors.inkSoft}
                  strokeWidth={2}
                />
              </Card>
            </Pressable>
          );
        }

        return (
          <View key={sec.title} style={styles.section}>
            <Pressable style={styles.head} onPress={toggle}>
              <AppText variant="heading" style={styles.title}>
                {sec.title}
              </AppText>
              {allDone ? (
                <Pill label="Complete" tone="signed" icon={Check} />
              ) : (
                <AppText variant="metaStrong" color={colors.inkMuted}>
                  {sec.complete} of {sec.rows.length}
                </AppText>
              )}
              <ChevronUp size={s(20)} color={colors.inkSoft} strokeWidth={2} />
            </Pressable>
            {rows.map(a => {
              return (
                <Card key={a.key} style={styles.card}>
                  {renderRow(a)}
                </Card>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: vs(10) },
  folded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: s(14),
    marginTop: vs(14),
  },
  foldedBody: { flex: 1 },
  section: { marginTop: vs(20) },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: vs(40),
    marginBottom: vs(6),
  },
  title: { flex: 1 },
});
