/**
 * Renders the tiny markup used in notification text — only <strong> and <em> — as React nodes.
 *
 * Why this exists: notification text is composed on the server from things people type (meeting
 * titles, action descriptions, notes, names). Injecting that with dangerouslySetInnerHTML would let
 * a meeting titled `<img src=x onerror=…>` run code in every user's notification panel. Here the
 * text is parsed, so anything that is not <strong>/<em> is shown as plain characters and can never
 * become live HTML — including rows already saved in the database before this fix.
 *
 *   <RichText text={n.text} />
 */

const TAG = /<(\/?)(strong|em)\s*>/gi;

/**
 * Splits the limited markup into runs of text with their emphasis.
 * @param {string} src
 * @returns {{ text: string, bold: boolean, italic: boolean }[]}
 */
export function parseRichText(src) {
  const input = typeof src === 'string' ? src : src == null ? '' : String(src);
  /** @type {{ text: string, bold: boolean, italic: boolean }[]} */
  const runs = [];
  const open = { strong: 0, em: 0 };
  let last = 0;

  const push = (text) => {
    if (!text) return;
    const bold = open.strong > 0;
    const italic = open.em > 0;
    const prev = runs[runs.length - 1];
    if (prev && prev.bold === bold && prev.italic === italic) prev.text += text;
    else runs.push({ text, bold, italic });
  };

  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(input)) !== null) {
    push(input.slice(last, m.index));
    const tag = m[2].toLowerCase();
    if (m[1]) open[tag] = Math.max(0, open[tag] - 1);
    else open[tag] += 1;
    last = m.index + m[0].length;
  }
  push(input.slice(last));
  return runs;
}

/** The few HTML entities the server's escaper produces, turned back into characters for display. */
const ENTITY = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITY[e] ?? e);

/**
 * Notification text as safe React nodes. @param {{ text?: string }} props
 */
export function RichText({ text }) {
  return (
    <>
      {parseRichText(text).map((r, i) => {
        const body = decode(r.text);
        if (r.bold && r.italic) return <strong key={i}><em>{body}</em></strong>;
        if (r.bold) return <strong key={i}>{body}</strong>;
        if (r.italic) return <em key={i}>{body}</em>;
        return <span key={i}>{body}</span>;
      })}
    </>
  );
}
