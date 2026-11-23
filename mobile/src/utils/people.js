/**
 * People helpers, ported from the website (web/src/utils/people.js) so the same person wears the
 * same initials in both places.
 *
 * A title is not an initial: "Dr. Anusha Singh" is AS, not DA. Anything in brackets — "(TBD)",
 * "(on leave)" — is dropped before the initials are taken.
 */
export function initialsOf(name) {
  if (!name) {
    return '??';
  }
  const cleaned = name
    .replace(/\(.*?\)/g, '')
    .replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Adv\.)\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] || '??').slice(0, 2).toUpperCase();
}
