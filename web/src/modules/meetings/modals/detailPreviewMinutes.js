// previewMinutes(m, decisions, dlg) — opens a new window with the full A4 print document
// (verbatim port of the prototype's previewMinutes HTML/CSS string).
//
// `dlg` is the page's useDialog(): a helper module cannot call the hook, so the page hands its
// dialogs in, and a blocked pop-up is reported in a MyDiary dialog rather than a browser alert.
import { TYPES } from '../../../data/meetings';
import { TDPL_LOGO_FULL, TDPL_LOGO_ICON } from '../../../data/logos';
import { parseDate, formatDateLong, formatTime, isOverdue } from '../../../utils/dates';
import { normExt } from '../../../utils/people';

const LOGO_FULL_IMG = `<img src="${TDPL_LOGO_FULL}" alt="TrustLab Diagnostics" style="max-height:48px;width:auto;display:block">`;
const LOGO_ICON_IMG = `<img src="${TDPL_LOGO_ICON}" alt="TrustLab Diagnostics" style="max-width:100%;max-height:100%;object-fit:contain;display:block">`;

export function previewMinutes(m, allDecisions, dlg) {
  if (!m) return;
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { dlg.alert('Pop-up blocked. Please allow pop-ups to preview.'); return; }
  const dt = parseDate(m.date);
  const externals = (m.external || []).map(normExt);
  const typeColors = { internal: '#0F8F76', customer: '#2563EB', supplier: '#DD6B20', consultants: '#7C3AED', board: '#F0B429', other: '#6B6B6B' };
  const typeColor = typeColors[m.type] || '#0F8F76';
  const myDecisions = (allDecisions || []).filter(d => d.meetingId === m.id);
  const allRecipients = m.attendees.concat(externals.filter(e => e.email).map(e => e.name + ' <' + e.email + '>'));

  // ===== BUILD THE CONTENT ONCE (used in <tbody>) =====
  const bodyContent = `
    <div class="hero-block">
      <span class="type-pill">${TYPES[m.type].name}${m.subBadge ? ' · ' + m.subBadge : ''}</span>
      <h1 class="doc-title">${m.title}</h1>
      <div class="meta-grid">
        <div class="meta-item"><div class="meta-lbl">Date</div><div class="meta-val">${formatDateLong(dt)}</div></div>
        <div class="meta-item"><div class="meta-lbl">Time</div><div class="meta-val">${formatTime(m.time)} · ${m.dur}</div></div>
        <div class="meta-item"><div class="meta-lbl">Venue / Mode</div><div class="meta-val">${m.loc} · ${m.mode}</div></div>
        <div class="meta-item"><div class="meta-lbl">Chair</div><div class="meta-val">${m.chair}</div></div>
      </div>
      <div class="att-block">
        <div class="att-grid">
          <div class="att-col">
            <h4>Internal Attendees · ${m.attendees.length}</h4>
            <div class="att-list">${m.attendees.map(a => '<div class="att-item">• ' + a + '</div>').join('')}</div>
          </div>
          ${externals.length ? `
          <div class="att-col ext">
            <h4>External Attendees · ${externals.length}</h4>
            <div class="att-list">${externals.map(e => '<div class="att-item">• ' + e.name + (e.email ? ' <span class="att-email">&lt;' + e.email + '&gt;</span>' : '') + '</div>').join('')}</div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <h2 class="sec"><span class="n">1</span> Agenda &amp; Discussion</h2>
    ${m.agenda.map((a, i) => {
      const mins = m.minutes && m.minutes['ag' + i];
      return `
        <div class="ag-block">
          <div class="ag-head">
            <div class="ag-num">${String(i+1).padStart(2,'0')}</div>
            <div class="ag-title">${a}</div>
            <div class="ag-time">${m.agendaTimes[i] || ''}</div>
          </div>
          ${mins && mins.disc ? '<div class="disc"><span class="disc-label">Discussion</span>' + mins.disc.replace(/\n/g, '<br>') + '</div>' : ''}
          ${mins && mins.dec ? '<div class="dec"><span class="dec-label">Decision / Outcome</span>' + mins.dec.replace(/\n/g, '<br>') + '</div>' : ''}
          ${!mins || (!mins.disc && !mins.dec) ? '<div style="font-size:9pt;color:#9A9A9A;font-style:italic;padding:6px 0">— No notes recorded for this item —</div>' : ''}
        </div>
      `;
    }).join('')}
    ${m.minutes && m.minutes.general && m.minutes.general.disc ? `
      <div class="ag-block" style="border-left-color:#F0B429">
        <div class="ag-head">
          <div class="ag-num" style="background:#F0B429;color:#1A3A2F">+</div>
          <div class="ag-title">Any Other Business / Ad-hoc Notes</div>
        </div>
        <div class="disc">${m.minutes.general.disc.replace(/\n/g, '<br>')}</div>
      </div>
    ` : ''}

    ${m.actions && m.actions.length ? `
    <h2 class="sec page-break-before"><span class="n">2</span> Action Items</h2>
    <table class="act-table">
      <thead><tr><th>#</th><th>Action</th><th>Owner</th><th>Deadline</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>${m.actions.map((a, i) => `
        <tr>
          <td class="act-num">${String(i+1).padStart(2,'0')}</td>
          <td><strong>${a.desc || '—'}</strong></td>
          <td>${a.owner || '<em style="color:#9A9A9A">Unassigned</em>'}${a.ownerType === 'external' ? '<span class="ext-mark">EXT</span>' : ''}</td>
          <td style="${(a.status !== 'done' && isOverdue(a.deadline)) ? 'color:#C53030;font-weight:700' : ''}">${a.deadline}${(a.status !== 'done' && isOverdue(a.deadline)) ? ' ⚠' : ''}</td>
          <td><span class="act-pill ${a.priority}">${a.priority}</span></td>
          <td><span class="act-pill status-${(a.status !== 'done' && isOverdue(a.deadline)) ? 'overdue' : a.status}">${(a.status !== 'done' && isOverdue(a.deadline)) ? 'overdue' : a.status.replace('-',' ')}</span></td>
        </tr>
      `).join('')}</tbody>
    </table>
    ` : ''}

    ${myDecisions.length ? `
    <h2 class="sec page-break-before"><span class="n">${m.actions && m.actions.length ? 3 : 2}</span> Formal Decisions Recorded</h2>
    ${myDecisions.map(d => `
      <div class="dec-block">
        <div class="dec-txt">${d.text}</div>
        <div class="dec-meta">Decided by: <strong>${d.decidedBy}</strong> · Department: <strong>${d.department}</strong> · Tags: ${d.tags.join(' · ')}</div>
      </div>
    `).join('')}
    ` : ''}

    <div class="sig-block">
      <div class="sig-slot">
        <div class="sig-line"></div>
        <div class="sig-role">Minuted by</div>
        <div class="sig-name">Pallavi Elisetti · EA to CMD</div>
      </div>
      <div class="sig-slot">
        <div class="sig-line"></div>
        <div class="sig-role">Approved by Chair</div>
        <div class="sig-name">${m.chair}</div>
      </div>
    </div>
  `;

  // ===== BUILD HEADER / FOOTER HTML (used by thead/tfoot for each page) =====
  const headerBlock = `
    <div class="rh-inner">
      <div class="rh-logo">
        <div class="rh-logo-img">${LOGO_FULL_IMG}</div>
        <div class="rh-tag">Get it Fast. Get it Right.</div>
      </div>
      <div class="rh-right">
        <div class="rh-code">TL-OPS-DRM-001 · Rev 1.0</div>
        <div class="rh-label">Minutes of Meeting</div>
      </div>
    </div>
  `;

  const footerBlock = `
    <div class="rf-inner">
      <div class="rf-row">
        <div class="rf-brand">
          <div class="rf-brand-icon">${LOGO_ICON_IMG.replace('max-height:48px', 'max-height:22px')}</div>
          <div>
            <div class="rf-brand-text">TrustLab Diagnostics Pvt Ltd</div>
            <div class="rf-brand-sub">Begumpet · Hyderabad · Telangana · 500016 · CIN U85100TG2020PTC143059</div>
          </div>
        </div>
        <div class="rf-code">
          <span class="doc-code-highlight">TL-OPS-DRM-001</span> · Rev 1.0
        </div>
      </div>
      <div class="rf-confidential">
        <strong>CONFIDENTIAL · FOR NAMED RECIPIENTS ONLY.</strong> Intended solely for the ${allRecipients.length} attendee${allRecipients.length>1?'s':''} named herein. Protected by TrustLab&#39;s confidentiality, data-protection and non-disclosure policies, and by applicable law. Any review, dissemination, distribution, reproduction, copying or use by any other person is strictly prohibited and may be unlawful. If received in error, please notify ${m.chair} immediately and permanently delete all copies. © TrustLab Diagnostics Pvt Ltd.
      </div>
    </div>
  `;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Minutes · ${m.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Playfair+Display:wght@600;700;700italic&display=swap" rel="stylesheet">
    <style>
      /* ========== PAGE SETUP ========== */
      @page {
        size: A4;
        margin: 15mm 15mm 15mm 15mm;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-family: 'Space Mono', monospace;
          font-size: 8pt;
          color: #6B6B6B;
        }
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: 'DM Sans', Georgia, sans-serif;
        background: #D4CFC0;
        color: #1A1A1A;
        line-height: 1.55;
        font-size: 11pt;
        -webkit-font-smoothing: antialiased;
      }

      /* ========== THE PAGE-LAYOUT TABLE ========== */
      /* Using a table with thead/tfoot is the most reliable way to get repeating headers and
         footers across printed pages in Chrome, Safari, and Firefox. */
      .page-table {
        width: 100%;
        border-collapse: collapse;
        max-width: 210mm;
        margin: 0 auto;
      }
      .page-table thead { display: table-header-group; }
      .page-table tfoot { display: table-footer-group; }
      .page-table th, .page-table td { padding: 0; text-align: left; font-weight: normal; vertical-align: top; }

      /* Repeating header */
      .rh-inner {
        padding: 6mm 15mm 4mm;
        background: #fff;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        border-bottom: 2px solid #1A3A2F;
        position: relative;
      }
      .rh-inner::after {
        content: ""; position: absolute; bottom: -3px; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, #26C4B0 0%, #1A3A2F 50%, #F0B429 100%);
      }
      .rh-logo-img img { height: 30px !important; width: auto !important; display: block; }
      .rh-tag {
        font-family: 'Playfair Display', serif;
        font-style: italic; font-size: 8pt;
        color: #0A6B59; margin-top: 2px;
      }
      .rh-right { text-align: right; }
      .rh-code { font-family: 'Space Mono', monospace; font-size: 7.5pt; color: #0A6B59; letter-spacing: 0.15em; font-weight: 700; }
      .rh-label { font-family: 'Space Mono', monospace; font-size: 10pt; color: #1A3A2F; letter-spacing: 0.1em; font-weight: 700; margin-top: 2px; text-transform: uppercase; }

      /* Repeating footer */
      .rf-inner {
        padding: 4mm 15mm 3mm;
        background: #FDFBF5;
        border-top: 2px solid #1A3A2F;
        position: relative;
      }
      .rf-inner::before {
        content: ""; position: absolute; top: -3px; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, #F0B429 0%, #1A3A2F 50%, #26C4B0 100%);
      }
      .rf-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 4px; }
      .rf-brand { display: flex; align-items: center; gap: 10px; }
      .rf-brand-icon img { height: 20px !important; width: auto !important; display: block; }
      .rf-brand-text { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 9.5pt; color: #1A3A2F; }
      .rf-brand-sub { font-family: 'Space Mono', monospace; font-size: 6.5pt; color: #6B6B6B; letter-spacing: 0.06em; margin-top: 1px; }
      .rf-code { font-family: 'Space Mono', monospace; font-size: 7pt; color: #6B6B6B; letter-spacing: 0.08em; text-align: right; flex-shrink: 0; }
      .rf-code .doc-code-highlight { color: #0A6B59; font-weight: 700; }
      .rf-confidential {
        font-family: 'DM Sans', sans-serif;
        font-size: 6pt; color: #6B6B6B; line-height: 1.45;
        text-align: justify;
        padding-top: 3px;
        border-top: 1px solid #E8E4DA;
      }
      .rf-confidential strong { color: #C53030; letter-spacing: 0.04em; }

      /* ========== MAIN BODY CONTENT ========== */
      .doc-body { padding: 8mm 15mm; background: #fff; position: relative; }

      /* Hero / first-page block */
      .hero-block { margin-bottom: 10mm; }
      .type-pill { display: inline-block; padding: 5px 12px; border-radius: 14px; font-family: 'Space Mono', monospace; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; background: ${typeColor}15; color: ${typeColor}; }
      h1.doc-title { font-family: 'Playfair Display', serif; font-size: 22pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 14px; color: #1A1A1A; }
      .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 32px; padding: 14px 20px; background: linear-gradient(135deg, #FDFBF5, #F7F2E8); border-radius: 6px; border-left: 4px solid ${typeColor}; margin-bottom: 12px; }
      .meta-item { font-size: 10pt; }
      .meta-lbl { font-family: 'Space Mono', monospace; font-size: 7pt; color: #6B6B6B; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
      .meta-val { font-weight: 700; color: #1A1A1A; }
      .att-block { padding: 12px 20px; background: #FDFBF5; border-radius: 6px; border-left: 4px solid #1A3A2F; }
      .att-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .att-col h4 { font-family: 'Space Mono', monospace; font-size: 8pt; color: #6B6B6B; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin: 0 0 6px; }
      .att-col.ext h4 { color: #2563EB; }
      .att-list { font-size: 10pt; line-height: 1.6; }
      .att-item { padding: 2px 0; }
      .att-email { font-family: 'Space Mono', monospace; font-size: 8pt; color: #6B6B6B; }

      /* Section headers */
      h2.sec { font-family: 'Playfair Display', serif; font-size: 15pt; color: #1A3A2F; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #1A3A2F; letter-spacing: -0.01em; display: flex; align-items: center; gap: 10px; page-break-after: avoid; break-after: avoid; }
      h2.sec .n { width: 24px; height: 24px; border-radius: 50%; background: #1A3A2F; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-family: 'Space Mono', monospace; font-size: 10pt; font-weight: 700; }

      /* Agenda items */
      .ag-block { margin: 10px 0; padding: 12px 16px; background: #FDFBF5; border-radius: 6px; border-left: 3px solid #E8E4DA; page-break-inside: avoid; break-inside: avoid; }
      .ag-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
      .ag-num { width: 22px; height: 22px; border-radius: 5px; background: #1A3A2F; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Space Mono', monospace; font-size: 9pt; font-weight: 700; flex-shrink: 0; }
      .ag-title { font-size: 11pt; font-weight: 700; color: #1A3A2F; flex: 1; }
      .ag-time { font-family: 'Space Mono', monospace; font-size: 8pt; color: #6B6B6B; background: #fff; padding: 2px 7px; border-radius: 8px; letter-spacing: 0.04em; }
      .disc, .dec { font-size: 10pt; margin: 6px 0; padding: 9px 13px; border-radius: 4px; line-height: 1.55; }
      .disc { background: #FFFBEE; border-left: 3px solid #F0B429; }
      .dec { background: #E8F5F1; border-left: 3px solid #0F8F76; font-weight: 500; }
      .disc-label, .dec-label { font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
      .disc-label { color: #B7791F; }
      .dec-label { color: #0A6B59; }

      /* Action table */
      .act-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; border-radius: 6px; overflow: hidden; page-break-inside: auto; }
      .act-table thead { display: table-header-group; }
      .act-table th { background: linear-gradient(135deg, #1A3A2F, #0A6B59); color: #fff; padding: 8px 10px; text-align: left; font-family: 'Space Mono', monospace; font-size: 7.5pt; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
      .act-table td { padding: 8px 10px; border-bottom: 1px solid #E8E4DA; vertical-align: top; }
      .act-table tr { page-break-inside: avoid; }
      .act-table tr:last-child td { border-bottom: none; }
      .act-table tr:nth-child(even) td { background: #FDFBF5; }
      .act-num { font-family: 'Space Mono', monospace; font-weight: 700; color: #6B6B6B; width: 28px; }
      .act-pill { display: inline-block; padding: 2px 7px; border-radius: 10px; font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
      .act-pill.high { background: #FEE; color: #C53030; }
      .act-pill.medium { background: #FFF7E5; color: #B7791F; }
      .act-pill.low { background: #E8F5F1; color: #0A6B59; }
      .act-pill.status-open { background: #F0F0F0; color: #6B6B6B; }
      .act-pill.status-in-progress { background: #E0E9FD; color: #2563EB; }
      .act-pill.status-done { background: #E8F5F1; color: #0A6B59; }
      .act-pill.status-blocked, .act-pill.status-overdue { background: #FEE; color: #C53030; }
      .ext-mark { background: #E0E9FD; color: #2563EB; font-family: 'Space Mono', monospace; font-size: 7pt; padding: 1px 4px; border-radius: 5px; margin-left: 4px; font-weight: 700; letter-spacing: 0.04em; }

      /* Decisions */
      .dec-block { padding: 10px 14px; background: #E8F5F1; border-left: 4px solid #0F8F76; border-radius: 6px; margin-bottom: 8px; page-break-inside: avoid; }
      .dec-block .dec-txt { font-size: 10pt; font-weight: 600; margin-bottom: 5px; }
      .dec-block .dec-meta { font-family: 'Space Mono', monospace; font-size: 8pt; color: #6B6B6B; letter-spacing: 0.04em; }

      /* Signatures */
      .sig-block { margin-top: 16mm; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding-top: 18px; border-top: 2px dashed #E8E4DA; page-break-inside: avoid; }
      .sig-slot { text-align: center; }
      .sig-line { border-bottom: 1.5px solid #1A3A2F; height: 45px; margin-bottom: 6px; }
      .sig-role { font-family: 'Space Mono', monospace; font-size: 8pt; color: #6B6B6B; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
      .sig-name { font-size: 10pt; font-weight: 700; margin-top: 2px; }

      .page-break-before { page-break-before: always; break-before: page; }

      /* ========== SCREEN (preview) ========== */
      @media screen {
        body { background: #D4CFC0; padding: 20px 0; }
        .page-table {
          background: #fff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          min-height: 297mm;
        }
      }

      /* ========== PRINT ========== */
      @media print {
        body { background: #fff; padding: 0; margin: 0; }
        .page-table { max-width: 100%; box-shadow: none; min-height: 0; }
        .no-print { display: none !important; }
      }

      /* Floating controls (screen only) */
      .print-btn { position: fixed; top: 16px; right: 16px; background: #1A3A2F; color: #fff; padding: 10px 18px; border: none; border-radius: 6px; font-weight: 700; font-size: 12pt; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.25); z-index: 2000; font-family: 'DM Sans', sans-serif; }
      .print-btn:hover { background: #0A6B59; }
      .size-hint { position: fixed; top: 16px; left: 16px; background: rgba(255,255,255,0.9); color: #6B6B6B; padding: 6px 12px; border-radius: 6px; font-family: 'Space Mono', monospace; font-size: 9pt; letter-spacing: 0.08em; z-index: 2000; }
    </style></head><body>
    <div class="size-hint no-print">A4 · 210mm × 297mm · ${m.agenda.length} agenda item${m.agenda.length>1?'s':''}</div>
    <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

    <!-- The table structure is what gives us a repeating header and footer on every printed page. -->
    <table class="page-table">
      <thead>
        <tr><th>${headerBlock}</th></tr>
      </thead>
      <tbody>
        <tr><td><div class="doc-body">${bodyContent}</div></td></tr>
      </tbody>
      <tfoot>
        <tr><td>${footerBlock}</td></tr>
      </tfoot>
    </table>
  </body></html>`;
  w.document.write(html); w.document.close();
}
