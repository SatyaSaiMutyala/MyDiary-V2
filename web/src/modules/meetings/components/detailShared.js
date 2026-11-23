// Shared helpers for the meeting DETAIL view (text exports + blob downloads). Action items and their
// sub-tasks / comments now come from the API, so the local factories are gone.
import { TYPES } from '../../../data/meetings';
import { parseDate, formatDate, formatDateLong, formatTime } from '../../../utils/dates';
import { normExt } from '../../../utils/people';

function downloadText(txt, filename) {
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// downloadTranscript(m, dlg) — verbatim. `dlg` is the caller's useDialog(), since a helper module
// cannot call the hook itself.
export function downloadTranscript(m, dlg) {
  if (!m || !m.transcript || !m.transcript.length) { dlg.alert('No transcript to download.'); return; }
  let txt = 'TRANSCRIPT · ' + m.title + '\n' + formatDateLong(parseDate(m.date)) + '\n\n' + '='.repeat(60) + '\n\n';
  m.transcript.forEach(t => txt += '[' + t.time + '] ' + t.speaker + ':\n' + t.text + '\n\n');
  downloadText(txt, m.title.replace(/[^\w]+/g, '-') + '-transcript.txt');
}

// exportMinutes(meetingId) — verbatim text export with header + confidentiality block
export function exportMinutes(m) {
  if (!m) return;
  const externals = (m.external || []).map(normExt);
  const recipients = m.attendees.concat(externals.filter(e => e.email).map(e => e.name));
  let txt = '';
  txt += '================================================================\n';
  txt += '          TRUSTLAB DIAGNOSTICS PRIVATE LIMITED\n';
  txt += '          Begumpet · Hyderabad · Telangana · 500016\n';
  txt += '          CIN · U85100TG2020PTC143059\n';
  txt += '          "Get it Fast. Get it Right."\n';
  txt += '================================================================\n';
  txt += '          Document: TL-OPS-DRM-001 · Rev 1.0\n';
  txt += '          Type: MINUTES OF MEETING\n';
  txt += '          Issued: ' + formatDate(new Date()) + '\n';
  txt += '================================================================\n\n';
  txt += '*** CONFIDENTIAL — FOR NAMED RECIPIENTS ONLY ***\n\n';
  txt += 'This document and the information it contains are the property of\n';
  txt += 'TrustLab Diagnostics Pvt Ltd and are intended solely for the\n';
  txt += 'attendees named herein (' + recipients.length + ' recipient' + (recipients.length > 1 ? 's' : '') + '). Protected by TrustLab\'s\n';
  txt += 'confidentiality, data-protection and non-disclosure policies, and\n';
  txt += 'by applicable law. Any review, dissemination, distribution,\n';
  txt += 'reproduction or use of this document by any person other than the\n';
  txt += 'named recipients is strictly prohibited and may be unlawful.\n';
  txt += 'If received in error, please notify ' + m.chair + ' immediately and\n';
  txt += 'permanently delete all copies from your systems.\n\n';
  txt += '================================================================\n\n';
  txt += 'TITLE:     ' + m.title + '\n';
  txt += 'TYPE:      ' + TYPES[m.type].name + (m.subBadge ? ' · ' + m.subBadge : '') + '\n';
  txt += 'DATE:      ' + formatDateLong(parseDate(m.date)) + ' · ' + formatTime(m.time) + ' · ' + m.dur + '\n';
  txt += 'VENUE:     ' + m.loc + ' (' + m.mode + ')\n';
  txt += 'CHAIR:     ' + m.chair + '\n\n';
  txt += 'INTERNAL ATTENDEES (' + m.attendees.length + '):\n';
  m.attendees.forEach(a => txt += '   • ' + a + '\n');
  if (externals.length) {
    txt += '\nEXTERNAL ATTENDEES (' + externals.length + '):\n';
    externals.forEach(e => txt += '   • ' + e.name + (e.email ? ' <' + e.email + '>' : ' [no email on file]') + '\n');
  }
  txt += '\n================================================================\nAGENDA & DISCUSSION\n================================================================\n\n';
  m.agenda.forEach((a, i) => {
    txt += (i + 1) + '. ' + a + '\n';
    const mins = m.minutes && m.minutes['ag' + i];
    if (mins) {
      if (mins.disc) txt += '\nDiscussion:\n' + mins.disc + '\n';
      if (mins.dec) txt += '\nDecision:\n' + mins.dec + '\n';
    }
    txt += '\n' + '-'.repeat(50) + '\n\n';
  });
  if (m.actions && m.actions.length) {
    txt += '================================================================\nACTION ITEMS\n================================================================\n\n';
    m.actions.forEach((a, i) => {
      txt += (i + 1) + '. ' + a.desc + '\n   Owner: ' + a.owner + (a.ownerType === 'external' ? ' [EXT]' : '') + ' | Due: ' + a.deadline + ' | Priority: ' + a.priority + ' | Status: ' + a.status + '\n\n';
    });
  }
  // Signature block
  txt += '\n================================================================\n\n';
  txt += 'MINUTED BY: Pallavi Elisetti · EA to CMD\n\n';
  txt += 'Signature: ______________________________    Date: __________\n\n\n';
  txt += 'APPROVED BY CHAIR: ' + m.chair + '\n\n';
  txt += 'Signature: ______________________________    Date: __________\n\n';
  txt += '================================================================\n';
  txt += 'TrustLab Diagnostics Pvt Ltd · TL-OPS-DRM-001 · Rev 1.0\n';
  txt += 'CONFIDENTIAL · Not for onward distribution without permission\n';
  txt += '================================================================\n';
  downloadText(txt, m.title.replace(/[^\w]+/g, '-') + '-minutes.txt');
}
