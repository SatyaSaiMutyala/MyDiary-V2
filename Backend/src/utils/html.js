/**
 * Safe composition of the tiny HTML used in notification text (<strong>/<em> only).
 *
 * Notification text is built from things people type — meeting titles, action descriptions, notes,
 * names. Interpolating those into an HTML string lets a meeting titled `<img src=x onerror=…>`
 * become live HTML in everyone's notification panel. The `html` tagged template escapes every
 * interpolated value while leaving the literal tags in the template alone:
 *
 *   html`<strong>${me.name}</strong> assigned you "${a.desc}" in <em>${a.meetingTitle}</em>.`
 *
 * The web app also parses rather than injects this text (web/src/utils/richText.jsx), so the two
 * sides are independent: neither one alone can be the hole.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** @param {unknown} value */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Tagged template: literal parts are kept as written, interpolated values are escaped.
 * @param {ArrayLike<string>} strings @param {...unknown} values
 */
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i += 1) {
    out += strings[i];
    if (i < values.length) out += escapeHtml(values[i]);
  }
  return out;
}
