// Visit-observation helpers — 1:1 ports of the prototype (lines 13033–13873)
import { tokens } from '../../theme/tokens';
import { VISIT_TYPES, RATING_AREAS } from '../../data/visits';
import { EMPLOYEES } from '../../data/employees';
import { parseDate, formatDateLong, todayStr } from '../../utils/dates';

export const EMPLOYEE_OPTIONS = EMPLOYEES.flatMap(g => g.people.map(p => ({ name: p.name, role: p.role })));

export function myVisits(visits, viewerName) {
  return visits.filter(v => v.owner === viewerName);
}

export function avgRating(v) {
  const scores = Object.values(v.ratings || {}).filter(r => r > 0);
  return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
}

// .visit-type-pill.<type> colours (soft bg + colour)
export const TYPE_PILL = {
  'supplier-audit': { bg: tokens.orangeSoft, color: tokens.orange },
  'branch-office': { bg: tokens.tealSoft, color: tokens.tealDark },
  'new-premises': { bg: tokens.purpleSoft, color: tokens.purple },
  regulatory: { bg: tokens.yellowSoft, color: tokens.amber },
  'customer-site': { bg: tokens.blueSoft, color: tokens.blue },
  'partner-lab': { bg: tokens.pinkSoft, color: tokens.pink },
  other: { bg: 'rgba(107,107,107,0.1)', color: tokens.slate },
};
// .visit-card[data-type] left border colour
export const TYPE_BORDER = {
  'supplier-audit': tokens.orange, 'branch-office': tokens.teal, 'new-premises': tokens.purple, regulatory: tokens.yellow,
  'customer-site': tokens.blue, 'partner-lab': tokens.pink, other: tokens.slateSoft,
};
// .visit-overall-pill.<key>
export const OVERALL_PILL = {
  excellent: { bg: tokens.tealSoft, color: tokens.tealDark },
  good: { bg: tokens.blueSoft, color: tokens.blue },
  satisfactory: { bg: tokens.yellowSoft, color: tokens.amber },
  'needs-improvement': { bg: tokens.orangeSoft, color: tokens.orange },
  unsatisfactory: { bg: tokens.redSoft, color: tokens.red },
};

// Gradient used for the detail-modal head (inline expression in openVisitDetail)
export function detailHeadGradient(type) {
  const c = (VISIT_TYPES[type] || VISIT_TYPES.other).color;
  if (c === '#F0B429') return `linear-gradient(135deg,#92400E,${c})`;
  const dark = c.replace('#0F8F76', '#0A6B59').replace('#DD6B20', '#9A3412').replace('#7C3AED', '#5B21B6').replace('#2563EB', '#1E3A8A').replace('#D53F8C', '#BE185D').replace('#6B6B6B', '#374151');
  return `linear-gradient(135deg,${dark},${c})`;
}
// .visit-detail-head[data-type] gradients (+ regulatory uses dark text)
export function visitDetailHeadStyle(type) {
  const map = {
    'supplier-audit': `linear-gradient(135deg, #7C2D12, ${tokens.orange})`,
    'new-premises': `linear-gradient(135deg, #5B21B6, ${tokens.purple})`,
    'customer-site': `linear-gradient(135deg, #1E3A8A, ${tokens.blue})`,
    regulatory: `linear-gradient(135deg, #92400E, ${tokens.yellow})`,
    'partner-lab': `linear-gradient(135deg, #BE185D, ${tokens.pink})`,
  };
  return { background: map[type] || `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: type === 'regulatory' ? tokens.greenDeep : '#fff' };
}

// openVisitModal() — blank draft
export function newVisitDraft(owner) {
  return {
    id: 'v' + Date.now(), owner,
    title: '', type: 'branch-office', status: 'draft',
    date: todayStr(), timeIn: '', timeOut: '',
    org: { name: '', branch: '', address: '', city: '', state: '', gps: '' },
    host: { name: '', designation: '', phone: '', email: '' },
    team: [], externalParticipants: '',
    purpose: '', scope: '', references: '', tags: [],
    ratings: { infra: 0, quality: 0, safety: 0, regulatory: 0, staff: 0, docs: 0 },
    overallAssessment: '', executiveSummary: '',
    observations: [], photos: 0, actionItems: [],
    nextVisitDate: '', followUpRequired: false, additionalRemarks: '',
    createdAt: new Date().toISOString(),
  };
}

// pickVisitTemplate() merge step — preset objects merge, everything else is deep-copied
export function applyVisitTemplate(draft, tpl) {
  const d = JSON.parse(JSON.stringify(draft));
  Object.entries(tpl.preset).forEach(([k, v]) => {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(d[k] || (d[k] = {}), v);
    } else if (v != null) {
      d[k] = JSON.parse(JSON.stringify(v));
    }
  });
  if (tpl.preset.title == null) d.title = tpl.name + ' — ';
  return d;
}

// exportVisitReport() — plain-text report downloaded as visit-<id>.txt
export function exportVisitReport(v) {
  if (!v) return;
  const t = VISIT_TYPES[v.type] || VISIT_TYPES.other;
  let txt = '================================================================\n';
  txt += '          TRUSTLAB DIAGNOSTICS PRIVATE LIMITED\n';
  txt += '          VISIT OBSERVATION REPORT · TL-OPS-DRM-001\n';
  txt += '================================================================\n\n';
  txt += 'TITLE:     ' + v.title + '\n';
  txt += 'TYPE:      ' + t.label + '\n';
  txt += 'DATE:      ' + formatDateLong(parseDate(v.date)) + ' · ' + v.timeIn + (v.timeOut ? ' – ' + v.timeOut : '') + '\n\n';
  txt += 'ORGANISATION: ' + v.org.name + (v.org.branch ? ' · ' + v.org.branch : '') + '\n';
  txt += 'ADDRESS:   ' + v.org.address + (v.org.city ? ', ' + v.org.city : '') + '\n';
  txt += 'HOST:      ' + v.host.name + ' (' + v.host.designation + ')\n';
  txt += 'TEAM:      ' + (v.team.join(', ') || '—') + '\n\n';
  txt += '--- PURPOSE ---\n' + v.purpose + '\n\n';
  txt += '--- SCOPE ---\n' + v.scope + '\n\n';
  txt += '--- RATINGS ---\n';
  RATING_AREAS.forEach(a => { txt += a.label + ': ' + (v.ratings[a.key] || 0) + '/5\n'; });
  txt += '\n--- OVERALL: ' + (v.overallAssessment || '—').toUpperCase() + ' ---\n' + v.executiveSummary + '\n\n';
  if (v.observations.length) {
    txt += '--- OBSERVATIONS ---\n';
    v.observations.forEach((o, i) => { txt += (i + 1) + '. [' + o.category + '] ' + o.observation + (o.evidence ? ' (Evidence: ' + o.evidence + ')' : '') + '\n'; });
    txt += '\n';
  }
  if (v.actionItems.length) {
    txt += '--- ACTION ITEMS ---\n';
    v.actionItems.forEach((a, i) => { txt += (i + 1) + '. ' + a.text + ' — ' + a.owner + ' by ' + a.deadline + '\n'; });
    txt += '\n';
  }
  txt += '================================================================\n';
  txt += 'TrustLab Diagnostics Pvt Ltd · TL-OPS-DRM-001 · Confidential\n';
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'visit-' + v.id + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}
