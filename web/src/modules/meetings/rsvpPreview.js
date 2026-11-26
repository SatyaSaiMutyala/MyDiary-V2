// ============ RSVP PREVIEW (simulated invitee email) ============
// Generic port of the prototype's openRsvpPreview(kind, id, invIdx). The caller resolves the
// meeting / diary entry and passes plain values; `onRespond(resp, note)` is invoked from the
// child window through window.handleRsvpResponse exactly like the prototype.
//
//  openRsvpPreview({ subject, dateStr, timeStr, dur, location, modeStr, organizer, orgEmail,
//                    invitee: { name, email }, agenda: [], notes: '', logoDataUrl, onRespond, dlg })
//
//  `dlg` is the caller's useDialog(): this module cannot call the hook, so a blocked pop-up is
//  reported in a MyDiary dialog rather than a browser alert.
export function openRsvpPreview({ subject, dateStr, timeStr, dur = '', location, modeStr = '', organizer, orgEmail, invitee, agenda = [], notes = '', logoDataUrl = '', onRespond, dlg }) {
  const w = window.open('', 'rsvp-' + Date.now(), 'width=720,height=880');
  if (!w) { dlg.alert('Pop-up blocked. Please allow pop-ups.'); return; }

  // Register callback on parent (this window) so the child can respond
  window.handleRsvpResponse = function (resp, note) {
    if (typeof onRespond === 'function') onRespond(resp, note || '');
  };

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invitation · ${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Playfair+Display:wght@600;700;700italic&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: 'DM Sans', Georgia, sans-serif; background: #F3EEE0; color: #1A1A1A; line-height: 1.55; font-size: 13pt; }
      .email-wrap { max-width: 680px; margin: 30px auto; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.15); border-radius: 8px; overflow: hidden; }
      .band { height: 8px; background: linear-gradient(90deg, #26C4B0 0%, #1A3A2F 50%, #F0B429 100%); }

      /* Email-style header */
      .email-head { padding: 18px 28px; background: #FDFBF5; border-bottom: 1px solid #E8E4DA; display: flex; justify-content: space-between; align-items: center; }
      .email-head-l { font-family: 'Space Mono', monospace; font-size: 10pt; color: #6B6B6B; letter-spacing: 0.1em; }
      .email-head-l strong { color: #1A3A2F; font-weight: 700; }
      .email-head-r { font-family: 'Space Mono', monospace; font-size: 9pt; color: #9A9A9A; letter-spacing: 0.08em; }

      /* Logo bar */
      .logo-bar { padding: 24px 28px 16px; display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 2px solid #1A3A2F; position: relative; }
      .logo-bar::after { content: ""; position: absolute; bottom: -3px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #26C4B0, #1A3A2F, #F0B429); }
      .logo-bar img { height: 40px; width: auto; }
      .logo-bar .tag { font-family: 'Playfair Display', serif; font-style: italic; font-size: 10pt; color: #0A6B59; margin-top: 4px; }
      .logo-bar .label { font-family: 'Space Mono', monospace; font-size: 10pt; color: #0A6B59; letter-spacing: 0.15em; font-weight: 700; text-align: right; text-transform: uppercase; }

      /* Main content */
      .main { padding: 28px; }
      .greeting { font-size: 14pt; color: #1A3A2F; margin-bottom: 14px; }
      .greeting strong { font-weight: 700; }
      h1.subj { font-family: 'Playfair Display', serif; font-size: 24pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin: 14px 0 18px; }

      /* Details box */
      .details { background: #FDFBF5; border-left: 4px solid #0F8F76; padding: 18px 22px; border-radius: 6px; margin-bottom: 20px; }
      .details .row { display: flex; align-items: flex-start; gap: 12px; padding: 7px 0; font-size: 11.5pt; }
      .details .row .ico { width: 20px; color: #6B6B6B; font-size: 14pt; flex-shrink: 0; text-align: center; }
      .details .row strong { color: #1A3A2F; font-weight: 700; }

      /* Agenda */
      .agenda-box { background: #FFFBEE; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; border-left: 3px solid #F0B429; }
      .agenda-box h3 { font-family: 'Space Mono', monospace; font-size: 10pt; letter-spacing: 0.12em; text-transform: uppercase; color: #B7791F; margin: 0 0 10px; font-weight: 700; }
      .agenda-box ol { margin: 0; padding-left: 20px; font-size: 11pt; line-height: 1.6; }

      .notes-box { background: #F8F6EE; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; font-size: 11pt; line-height: 1.6; white-space: pre-wrap; border-left: 3px solid #6B6B6B; }
      .notes-box h3 { font-family: 'Space Mono', monospace; font-size: 10pt; letter-spacing: 0.12em; text-transform: uppercase; color: #6B6B6B; margin: 0 0 8px; font-weight: 700; }

      /* RSVP buttons */
      .rsvp-ask { padding: 22px 24px; background: linear-gradient(135deg, #1A3A2F, #0A6B59); color: #fff; border-radius: 10px; margin: 24px 0 16px; text-align: center; }
      .rsvp-ask h2 { font-family: 'Playfair Display', serif; font-size: 20pt; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.01em; }
      .rsvp-ask p { margin: 0 0 18px; opacity: 0.9; font-size: 12pt; }
      .rsvp-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .rsvp-btn { padding: 14px 10px; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 12pt; font-weight: 700; cursor: pointer; letter-spacing: 0.02em; transition: all 0.15s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .rsvp-btn:hover { transform: translateY(-2px); }
      .rsvp-btn .big { font-size: 20pt; }
      .rsvp-btn.accept { background: #F0B429; color: #1A3A2F; }
      .rsvp-btn.accept:hover { background: #fff; }
      .rsvp-btn.decline { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
      .rsvp-btn.decline:hover { background: rgba(197,48,48,0.9); border-color: #C53030; }
      .rsvp-btn.tentative { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
      .rsvp-btn.tentative:hover { background: rgba(37,99,235,0.9); border-color: #2563EB; }

      .response-note { margin-top: 14px; }
      .response-note label { font-family: 'Space Mono', monospace; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; display: block; text-align: left; opacity: 0.85; margin-bottom: 6px; }
      .response-note textarea { width: 100%; padding: 10px 12px; border: none; border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: 11pt; background: rgba(255,255,255,0.15); color: #fff; }
      .response-note textarea::placeholder { color: rgba(255,255,255,0.6); }
      .response-note textarea:focus { outline: none; background: rgba(255,255,255,0.25); }

      /* Response confirmation */
      .confirmation { padding: 40px 28px; text-align: center; display: none; }
      .confirmation.show { display: block; }
      .confirmation .big-ico { font-size: 56pt; margin-bottom: 14px; display: block; }
      .confirmation h2 { font-family: 'Playfair Display', serif; font-size: 22pt; font-weight: 700; margin: 0 0 10px; }
      .confirmation p { color: #6B6B6B; margin-bottom: 20px; font-size: 12pt; }

      /* Footer */
      .foot { background: #1A3A2F; color: #fff; padding: 18px 28px; display: flex; justify-content: space-between; align-items: center; font-size: 9pt; }
      .foot-l { font-family: 'Space Mono', monospace; letter-spacing: 0.08em; }
      .foot-r { font-family: 'Playfair Display', serif; font-style: italic; font-size: 11pt; color: #F0B429; }

      .confidential-bar { padding: 10px 28px; background: #FDFBF5; border-top: 1px solid #E8E4DA; font-size: 8pt; color: #6B6B6B; line-height: 1.4; font-family: 'DM Sans', sans-serif; }
      .confidential-bar strong { color: #C53030; letter-spacing: 0.04em; }

      .simulator-badge { position: fixed; top: 12px; left: 12px; background: rgba(240,180,41,0.95); color: #1A3A2F; padding: 6px 12px; border-radius: 6px; font-family: 'Space Mono', monospace; font-size: 9pt; letter-spacing: 0.08em; font-weight: 700; z-index: 100; }
    </style></head><body>
      <div class="simulator-badge">SIMULATED EMAIL · DEMO</div>
      <div class="email-wrap">
        <div class="band"></div>
        <div class="email-head">
          <div class="email-head-l">
            From: <strong>${organizer}</strong> &lt;${orgEmail}&gt;<br>
            To: <strong>${invitee.name}</strong> &lt;${invitee.email || 'no email'}&gt;
          </div>
          <div class="email-head-r">
            via MyDiary · ${new Date().toDateString()}
          </div>
        </div>
        <div class="logo-bar">
          <div>
            ${logoDataUrl ? '<img src="' + logoDataUrl + '" alt="TrustLab">' : '<strong style="font-family:Playfair Display;font-size:22pt;color:#1A3A2F">TrustLab</strong>'}
            <div class="tag">Get it Fast. Get it Right.</div>
          </div>
          <div class="label">Meeting<br>Invitation</div>
        </div>

        <div id="main-pane" class="main">
          <div class="greeting">Hello <strong>${invitee.name}</strong>,</div>
          <p><strong>${organizer}</strong> has invited you to the following meeting at <strong>TrustLab Diagnostics Pvt Ltd</strong>:</p>

          <h1 class="subj">${subject}</h1>

          <div class="details">
            <div class="row"><div class="ico"></div><div><strong>${dateStr}</strong></div></div>
            <div class="row"><div class="ico"></div><div><strong>${timeStr}</strong>${dur ? ' · ' + dur : ''}</div></div>
            <div class="row"><div class="ico"></div><div>${location}${modeStr ? ' · ' + modeStr : ''}</div></div>
            <div class="row"><div class="ico"></div><div>Organiser: <strong>${organizer}</strong></div></div>
          </div>

          ${agenda.length ? '<div class="agenda-box"><h3>Agenda</h3><ol>' + agenda.map(a => '<li>' + a + '</li>').join('') + '</ol></div>' : ''}
          ${notes ? '<div class="notes-box"><h3>Notes from Organiser</h3>' + notes + '</div>' : ''}

          <div class="rsvp-ask">
            <h2>Will you attend?</h2>
            <p>Click your response below. ${organizer} will be notified automatically.</p>
            <div class="rsvp-btns">
              <button class="rsvp-btn accept" onclick="sendResponse('accepted')"><span class="big">✓</span><span>Accept</span></button>
              <button class="rsvp-btn tentative" onclick="sendResponse('tentative')"><span class="big">?</span><span>Tentative</span></button>
              <button class="rsvp-btn decline" onclick="sendResponse('declined')"><span class="big">✗</span><span>Decline</span></button>
            </div>
            <div class="response-note">
              <label>Message to organiser (optional)</label>
              <textarea id="resp-note" rows="2" placeholder="e.g. &#39;Looking forward to it.&#39; or &#39;Can&#39;t make it — let&#39;s reschedule?&#39;"></textarea>
            </div>
          </div>

          <p style="font-size:10pt;color:#9A9A9A;text-align:center;margin-top:16px">Need to change your response later? Simply click a different button — the organiser will see the update.</p>
        </div>

        <div id="confirm-pane" class="confirmation">
          <span class="big-ico" id="conf-ico"></span>
          <h2 id="conf-title"></h2>
          <p id="conf-msg"></p>
          <p style="font-size:10pt;color:#9A9A9A">This window can be closed.</p>
        </div>

        <div class="confidential-bar">
          <strong>CONFIDENTIAL · For named recipients only.</strong> This invitation is intended solely for ${invitee.name}. If you received this in error, please notify ${orgEmail} and delete it. © TrustLab Diagnostics Pvt Ltd · CIN U85100TG2020PTC143059
        </div>
        <div class="foot">
          <div class="foot-l">TL-OPS-DRM-001 · MyDiary</div>
          <div class="foot-r">Get it Fast. Get it Right.</div>
        </div>
      </div>
    <script>
      function sendResponse(resp) {
        const note = (document.getElementById('resp-note').value || '').trim();
        try {
          if (window.opener && !window.opener.closed && window.opener.handleRsvpResponse) {
            window.opener.handleRsvpResponse(resp, note);
          }
        } catch(e) {}
        // Show confirmation
        document.getElementById('main-pane').style.display = 'none';
        document.getElementById('confirm-pane').classList.add('show');
        const cfg = {
          accepted: { ico: '✓', title: 'Accepted', msg: 'Your acceptance has been sent to ${organizer.replace(/'/g, "\\'")}. The meeting is on your calendar.' },
          declined: { ico: '✗', title: 'Declined', msg: '${organizer.replace(/'/g, "\\'")} has been notified. Thank you for responding.' },
          tentative: { ico: '?', title: 'Tentative', msg: 'Marked as tentative. ${organizer.replace(/'/g, "\\'")} will be notified.' }
        }[resp];
        document.getElementById('conf-ico').textContent = cfg.ico;
        document.getElementById('conf-title').textContent = cfg.title;
        document.getElementById('conf-msg').textContent = cfg.msg + (note ? ' Your message: "' + note + '"' : '');
      }
    </script>
    </body></html>`);
  w.document.close();
}
