import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, Card, Icon } from '../../../components';

/** Btn sitting on a dark Card title bar (Card forces white text there). */
const barBtnSx = { bgcolor: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.4)', '&:hover': { bgcolor: 'rgba(255,255,255,.22)', borderColor: '#fff', color: '#fff' } };
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';
import { useDialog } from '../../../components/Dialogs';

const monoLbl = (extra = {}) => ({ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, ...extra });

/** Agenda tab: context card · carried forward · agenda list + parking lot · contributions · pre-read · presence · polls */
export default function DetailAgendaPane({ m, onEdit, onAddParking, onRmParking, onCyclePresence }) {
  return (
    <Box>
      {m.contextCard && <ContextCard ctx={m.contextCard} />}
      {m.carriedOver && m.carriedOver.length > 0 && <CarriedOver items={m.carriedOver} />}

      <Card num="A" title="Agenda" sub="What was planned to be discussed" right={m.status === 'upcoming' ? <Btn size="sm" sx={barBtnSx} onClick={onEdit}>✎ Edit Agenda</Btn> : null}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {m.agenda.map((a, i) => {
            const note = m.agendaNotes?.[i];
            return (
              <Box key={i} sx={{
                bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${note ? tokens.teal : tokens.line}`,
                borderRadius: tokens.radiusSm, overflow: 'hidden', transition: 'box-shadow .15s, border-color .15s',
                '&:hover': { boxShadow: tokens.shadowSm, borderLeftColor: tokens.teal },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', p: '14px 16px' }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: tokens.greenDeep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</Box>
                  <Box sx={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{a}</Box>
                  <AgendaTime>{m.agendaTimes[i] || '—'}</AgendaTime>
                </Box>
                {/* Only when there is one: an empty note line under every item would be noise in the room. */}
                {note ? (
                  <Box sx={{ display: 'flex', gap: '10px', p: '10px 16px 12px 58px', bgcolor: tokens.cream, borderTop: `1px solid ${tokens.lineSoft}` }}>
                    <Box sx={{ ...monoLbl({ color: tokens.teal, mt: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }) }}><Icon name="note" size={13} />Note</Box>
                    <Box sx={{ flex: 1, fontSize: 12.5, color: tokens.slate, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{note}</Box>
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
        {m.parkingLot !== undefined && <ParkingLot items={m.parkingLot} onAdd={onAddParking} onRemove={onRmParking} />}
      </Card>

      {m.contributions && m.contributions.length > 0 && <Contributions items={m.contributions} />}
      {m.preRead && m.status === 'upcoming' && <PreRead preRead={m.preRead} />}
      {m.presence && <Presence attendees={m.attendees} presence={m.presence} onCycle={onCyclePresence} />}
      {m.polls && <Polls polls={m.polls} />}
    </Box>
  );
}

/** .agenda-ro-time */
export function AgendaTime({ children }) {
  return <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.slate, bgcolor: tokens.card, p: '4px 10px', borderRadius: '10px', whiteSpace: 'nowrap' }}>{children}</Box>;
}

// renderContextCard
function ContextCard({ ctx }) {
  return (
    <Box sx={{ background: `linear-gradient(135deg, ${tokens.card}, ${tokens.creamWarm})`, border: `1px solid ${tokens.line}`, borderLeft: `4px solid ${tokens.blue}`, borderRadius: tokens.radius, p: { xs: '16px', md: '18px 22px' }, mb: '18px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '14px', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}><Box component="span" sx={{ fontSize: 18 }}><Icon name="briefcase" /></Box> {ctx.customer} — Account Context</Box>
        <Box sx={monoLbl()}>Pulled from SalesPulse 365 · TruFlow</Box>
      </Box>
      <Grid container spacing="12px" sx={{ mb: '14px' }}>
        {ctx.stats.map((s, i) => (
          <Grid key={i} size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: '8px 10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '6px', height: '100%' }}>
              <Box sx={{ fontSize: 9, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mb: '3px' }}>{s.lbl}</Box>
              <Box sx={{ fontSize: 15, fontWeight: 700, fontFamily: fonts.serif }}>{s.val}</Box>
              <Box sx={{ fontSize: 10, color: s.bad ? tokens.red : tokens.tealDark }}>{s.sub}</Box>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box sx={monoLbl({ mb: '6px' })}>Past Meetings with this Account</Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ctx.pastMeetings.map((p, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '6px 10px', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '4px', fontSize: 12 }}>
            <Box sx={{ fontFamily: fonts.mono, color: tokens.slate, fontSize: 10, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{p.date}</Box>
            <Box sx={{ flex: 1 }}><strong>{p.title}</strong> — <Box component="span" sx={{ color: tokens.slate }}>{p.outcome}</Box></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// renderCarriedOver
function CarriedOver({ items }) {
  return (
    <Box sx={{ bgcolor: tokens.yellowSoft, border: `1px dashed ${tokens.yellow}`, borderRadius: tokens.radius, p: '14px 18px', mb: '14px' }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.amber, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>↻ Carried Forward · {items.length} open from previous meeting{items.length > 1 ? 's' : ''}</Box>
      {items.map((c, i) => (
        <Box key={i} sx={{ p: '8px 10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '5px', mb: '5px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <span>↻</span>
          <Box component="span" sx={{ flex: 1, minWidth: 160 }}>{c.text}</Box>
          <Box component="span" sx={{ fontSize: 10, fontWeight: 700, color: tokens.amber }}>{c.owner}</Box>
          <Box component="span" sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', ml: 'auto' }}>from: {c.fromMeeting}</Box>
        </Box>
      ))}
    </Box>
  );
}

// renderParkingLot — add on Enter, remove ×
function ParkingLot({ items, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <Box sx={{ bgcolor: tokens.yellowSoft, border: `1px dashed ${tokens.yellow}`, borderRadius: tokens.radius, p: '14px 18px', mt: '14px' }}>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.amber, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>🅿 Parking Lot · off-topic items deferred to next meeting</Box>
      {items.length === 0 ? (
        <Box sx={{ fontSize: 12, color: tokens.slate, fontStyle: 'italic', p: '4px 0' }}>Nothing parked yet.</Box>
      ) : items.map((it, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 0', fontSize: 13 }}>
          <span>▸</span>
          <Box component="span" sx={{ flex: 1 }}>{it}</Box>
          <Box component="span" onClick={() => onRemove(i)} sx={{ color: tokens.slateSoft, cursor: 'pointer', fontSize: 14, '&:hover': { color: tokens.red } }}>×</Box>
        </Box>
      ))}
      <Box component="input" type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Add an item to park for next time... (press Enter)"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = val.trim(); if (!t) return; onAdd(t); setVal(''); } }}
        sx={{ width: '100%', p: '7px 10px', border: `1px solid ${tokens.line}`, borderRadius: '5px', bgcolor: tokens.card, fontSize: 12, mt: '6px', fontFamily: 'inherit', color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal } }} />
    </Box>
  );
}

// renderContributions
function Contributions({ items }) {
  return (
    <Card num="C" title="Agenda Contributions" sub="From attendees before the meeting — attendees vote on what to cover">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', mt: '10px' }}>
        {items.map((c, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 12px', bgcolor: tokens.cream, border: `1px solid ${tokens.line}`, borderRadius: '6px', fontSize: 13, flexWrap: 'wrap' }}>
            <Box component="span" sx={{ flex: 1, minWidth: 160 }}>{c.text}</Box>
            <Box component="span" sx={{ fontSize: 10, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>{c.from}</Box>
            <Box component="span" sx={{ bgcolor: tokens.yellowSoft, color: tokens.amber, p: '2px 8px', borderRadius: '10px', fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}><Icon name="thumbUp" />{c.votes}</Box>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

// renderPreRead
function PreRead({ preRead }) {
  const dlg = useDialog();
  const opened = preRead.filter(p => p.opened).length;
  const pct = Math.round((opened / preRead.length) * 100);
  return (
    <Card num="P" title="Pre-Read Engagement" sub={`Who's reviewed the briefing pack · ${pct}% opened`}
      right={<Btn size="sm" sx={barBtnSx} onClick={() => dlg.alert('Reminder nudges sent to ' + (preRead.length - opened) + ' attendees who have not yet opened the pack.')}><Icon name="bell" />Nudge Un-opened</Btn>}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {preRead.map((p, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', alignItems: 'center', p: '6px 10px', bgcolor: tokens.cream, borderRadius: '5px' }}>
            <Box sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</Box>
            <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right', color: p.opened ? tokens.tealDark : tokens.red }}>{p.opened ? '● Opened' : '○ Not opened'}</Box>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

// renderPresence — click chip to cycle tbd → present → late → absent
const PRESENCE_STYLE = {
  tbd: { bg: tokens.card, border: tokens.line, dot: tokens.slateSofter, opacity: 1 },
  present: { bg: tokens.tealSofter, border: tokens.teal, dot: tokens.teal, opacity: 1 },
  late: { bg: tokens.yellowSoft, border: tokens.yellow, dot: tokens.yellow, opacity: 1 },
  absent: { bg: tokens.redSoft, border: tokens.red, dot: tokens.red, opacity: 0.7 },
};
function Presence({ attendees, presence, onCycle }) {
  const present = attendees.filter(a => presence[a] === 'present').length;
  const late = attendees.filter(a => presence[a] === 'late').length;
  const absent = attendees.filter(a => presence[a] === 'absent').length;
  return (
    <Card num="✓" title="Attendee Presence" sub="Click any name to cycle: TBD → Present → Late → Absent"
      right={<Box sx={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}><Box component="strong" sx={{ color: '#fff' }}>{present}</Box> present · <Box component="strong" sx={{ color: tokens.yellow }}>{late}</Box> late · <Box component="strong" sx={{ color: '#FBD5D5' }}>{absent}</Box> absent</Box>}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: '10px' }}>
        {attendees.map((a, i) => {
          const st = PRESENCE_STYLE[presence[a] || 'tbd'];
          return (
            <Box key={i} onClick={() => onCycle(a)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, p: '6px 10px 6px 6px', bgcolor: st.bg, border: `1px solid ${st.border}`, borderRadius: '20px', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', opacity: st.opacity, '&:hover': { borderColor: tokens.teal } }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: ownerAvatarColor(a), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>{initials(a)}</Box>
              <span>{a}</span>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: st.dot }} />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: '14px', fontSize: 11, color: tokens.slate, mt: '10px', fontFamily: fonts.mono, letterSpacing: '0.04em', textTransform: 'uppercase', flexWrap: 'wrap' }}>
        {[['TBD', tokens.slateSofter], ['Present', tokens.teal], ['Late', tokens.yellow], ['Absent', tokens.red]].map(([l, c]) => (
          <Box component="span" key={l}><Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', mr: '5px', verticalAlign: 'middle', bgcolor: c }} />{l}</Box>
        ))}
      </Box>
    </Card>
  );
}

// renderPolls — board resolutions with bars
function Polls({ polls }) {
  const dlg = useDialog();
  const row = (lbl, lblColor, barColor, n, total) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px', gap: '10px', alignItems: 'center', fontSize: 12 }}>
      <Box sx={{ fontWeight: 700, color: lblColor }}>{lbl}</Box>
      <Box sx={{ height: 10, bgcolor: tokens.lineSoft, borderRadius: '5px', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', borderRadius: '5px', transition: 'width 0.6s', bgcolor: barColor, width: `${total ? (n / total) * 100 : 0}%` }} />
      </Box>
      <Box sx={{ textAlign: 'right', fontFamily: fonts.mono, fontWeight: 700 }}>{n}</Box>
    </Box>
  );
  return (
    <Card num="⚖" title="Resolutions & Votes" sub="Board-meeting voting with audit trail"
      right={<Btn size="sm" sx={barBtnSx} onClick={() => dlg.alert('Add new resolution — opens the resolution composer with ayes/noes/absent template.')}>+ Add Resolution</Btn>}>
      {polls.map((p, i) => {
        const total = p.ayes + p.noes + p.absts;
        return (
          <Box key={i} sx={{ bgcolor: tokens.card, border: `1.5px solid ${tokens.yellow}`, borderLeftWidth: 4, borderRadius: tokens.radius, p: '18px 20px', mt: '14px' }}>
            <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.amber, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '6px' }}>Resolution {i + 1}</Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: '14px' }}>{p.question}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {row('✓ Ayes', tokens.tealDark, tokens.teal, p.ayes, total)}
              {row('✗ Noes', tokens.red, tokens.red, p.noes, total)}
              {row('◦ Abstain', tokens.slate, tokens.slateSoft, p.absts, total)}
            </Box>
            <Box sx={{ mt: '12px', p: '10px 14px', bgcolor: tokens.tealSoft, borderRadius: '6px', fontSize: 12, color: tokens.tealDark, fontWeight: 700 }}>{p.passed ? '✓ PASSED — resolution carries' : '✗ NOT PASSED'}</Box>
          </Box>
        );
      })}
    </Card>
  );
}
