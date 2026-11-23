import React from 'react';
import { AppText } from './AppText';
import { colors, fonts } from '../theme';
import { decodeEntities, parseRichText } from '../utils/richText';

/**
 * Notification text, with its <strong> and <em> runs shown as emphasis.
 *
 * The text is parsed, never rendered as markup — see utils/richText.js for why that matters.
 *
 * Poppins ships here in four upright weights and no italic face, so an `<em>` run cannot be
 * slanted without falling back to some other typeface. The website italicises the thing a
 * notification is *about* — a meeting or an action title — so here that run is tealed instead,
 * which is how the app points at a meeting everywhere else.
 */
export function RichText({
  text,
  variant = 'meta',
  color = colors.ink,
  emColor = colors.teal,
  style,
  ...rest
}) {
  const runs = parseRichText(text);
  return (
    <AppText variant={variant} color={color} style={style} {...rest}>
      {runs.map((r, i) => (
        <AppText
          key={i}
          variant={variant}
          color={r.italic ? emColor : color}
          style={r.bold ? styles.bold : undefined}
        >
          {decodeEntities(r.text)}
        </AppText>
      ))}
    </AppText>
  );
}

const styles = { bold: { fontFamily: fonts.semibold } };
