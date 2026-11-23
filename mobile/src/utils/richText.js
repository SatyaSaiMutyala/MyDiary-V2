/**
 * The tiny markup notification text uses — only <strong> and <em> — split into runs.
 *
 * Why this exists: notification text is composed on the server out of things people type (meeting
 * titles, action descriptions, names). Rendering that as HTML would let a meeting titled
 * `<img src=x onerror=…>` run code. Here it is parsed instead, so anything that is not
 * <strong>/<em> is shown as plain characters and can never become live markup — including rows
 * already in the database before the server started escaping.
 *
 * Ported run-for-run from web/src/utils/richText.jsx, so both apps break the text the same way.
 */

const TAG = /<(\/?)(strong|em)\s*>/gi;

/**
 * @param {string} src
 * @returns {{ text: string, bold: boolean, italic: boolean }[]}
 */
export function parseRichText(src) {
  const input = typeof src === 'string' ? src : src == null ? '' : String(src);
  const runs = [];
  const open = { strong: 0, em: 0 };
  let last = 0;

  const push = text => {
    if (!text) {
      return;
    }
    const bold = open.strong > 0;
    const italic = open.em > 0;
    const prev = runs[runs.length - 1];
    if (prev && prev.bold === bold && prev.italic === italic) {
      prev.text += text;
    } else {
      runs.push({ text, bold, italic });
    }
  };

  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(input)) !== null) {
    push(input.slice(last, m.index));
    const tag = m[2].toLowerCase();
    if (m[1]) {
      open[tag] = Math.max(0, open[tag] - 1);
    } else {
      open[tag] += 1;
    }
    last = m.index + m[0].length;
  }
  push(input.slice(last));
  return runs;
}

/** The few entities the server's escaper produces, turned back into characters for display. */
const ENTITY = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

export const decodeEntities = s =>
  s.replace(/&(?:amp|lt|gt|quot|#39);/g, e => ENTITY[e] ?? e);

/** The whole thing as plain characters — for an accessibility label or a one-line preview. */
export const plainText = src =>
  parseRichText(src)
    .map(r => decodeEntities(r.text))
    .join('');
