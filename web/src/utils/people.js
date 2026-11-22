// People helpers (verbatim logic from the prototype)
export function initials(name) {
  if (!name) return '??';
  const cleaned = name.replace(/\(.*?\)/g, '').replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Adv\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '??').slice(0,2).toUpperCase();
}

// Normalise external attendee: always returns { name, email, rsvp, respondedAt, respondedNote }.
export function normExt(e) {
  if (!e) return { name: '', email: '', rsvp: 'pending', respondedAt: null, respondedNote: '' };
  if (typeof e === 'string') return { name: e, email: '', rsvp: 'pending', respondedAt: null, respondedNote: '' };
  return { name: e.name || '', email: e.email || '', rsvp: e.rsvp || 'pending', respondedAt: e.respondedAt || null, respondedNote: e.respondedNote || '' };
}

export function rsvpSummary(externals) {
  const arr = (externals || []).map(normExt);
  const counts = { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  arr.forEach(e => { counts[e.rsvp || 'pending']++; });
  return counts;
}

export const RSVP_LABELS = {
  pending: { lbl: '⌛ Pending', cls: 'pending' },
  accepted: { lbl: '✓ Accepted', cls: 'accepted' },
  declined: { lbl: '✗ Declined', cls: 'declined' },
  tentative: { lbl: '? Tentative', cls: 'tentative' },
};

const OWNER_COLORS = ['#1A3A2F','#0F8F76','#2563EB','#DD6B20','#7C3AED','#B7791F','#D53F8C','#2A5A47'];
export function ownerAvatarColor(name) {
  if (!name) return '#9A9A9A';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return OWNER_COLORS[h % OWNER_COLORS.length];
}

// Synthetic TrustLab email the prototype derives from a name (used in circulate / rsvp preview)
export function tdplEmail(name) {
  return (name || '').toLowerCase().split('(')[0].trim().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@trustlab.co.in';
}

// Short pill-label for a position name (e.g. "Dispatch Co-ordinator" → "DC")
export function posPill(name) {
  if (!name) return '?';
  const words = name.replace(/\(.*?\)/g, '').split(/[\s\-\/]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}
