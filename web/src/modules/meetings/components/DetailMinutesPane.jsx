import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Btn, QuickLinkBtn, TypePill, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { TYPES } from '../../../data/meetings';
import { TDPL_LOGO_FULL } from '../../../data/logos';
import { parseDate, formatDateLong, formatTime } from '../../../utils/dates';
import { normExt } from '../../../utils/people';
import { AgendaTime } from './DetailAgendaPane';

const monoLbl = (color = tokens.slate) => ({ fontFamily: fonts.mono, fontSize: 9, color, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '6px' });

/** .minutes-textarea (variant: 'discussion' | 'decisions' | undefined) */
function MinutesTextarea({ variant, sx, ...rest }) {
  const left = variant === 'decisions' ? `3px solid ${tokens.teal}` : variant === 'discussion' ? `3px solid ${tokens.yellow}` : undefined;
  return (
    <Box component="textarea" sx={{ width: '100%', minHeight: 90, p: '12px 14px', border: `1px solid ${tokens.line}`, borderLeft: left, borderRadius: tokens.radiusSm, bgcolor: tokens.cream, fontFamily: 'inherit', fontSize: 13, color: tokens.ink, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', display: 'block', '&:focus': { outline: 'none', borderColor: tokens.teal, borderLeft: left, bgcolor: '#fff', boxShadow: `0 0 0 3px ${tokens.tealSoft}` }, '&::placeholder': { color: tokens.slateSoft }, ...sx }} {...rest} />
  );
}

/** .minutes-block */
function MinutesBlock({ num, numSx, title, time, children }) {
  return (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '16px', md: '20px 22px' }, mb: '14px', boxShadow: tokens.shadowSm, transition: 'box-shadow 0.15s', position: 'relative', '&:hover': { boxShadow: tokens.shadow } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: '14px' }}>
        <Box sx={{ width: 26, height: 26, borderRadius: '6px', bgcolor: tokens.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, flexShrink: 0, ...numSx }}>{num}</Box>
        <Box sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{title}</Box>
        {time !== undefined && <AgendaTime>{time}</AgendaTime>}
      </Box>
      {children}
    </Box>
  );
}

const SectionLabel = ({ children }) => <Box sx={{ fontSize: 10, fontFamily: fonts.mono, color: tokens.slate, letterSpacing: '0.1em', textTransform: 'uppercase', mb: '6px', mt: '12px', fontWeight: 700 }}>{children}</Box>;

/** Minutes tab — document header, auto-save line, agenda blocks, general notes, footer CTA */
export default function DetailMinutesPane({ m, onUpdateMinutes, onConvertToAction, onAttachFile, onLinkDecision, onPreview, onExport, onFinalise }) {
  const dt = parseDate(m.date);
  const externals = m.external || [];
  return (
    <Box>
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.card}, ${tokens.creamWarm})`, border: `1px solid ${tokens.line}`, borderRadius: '14px', p: { xs: '22px 18px', md: '26px 32px' }, mb: '18px', position: 'relative', overflow: 'hidden', boxShadow: tokens.shadow,
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${tokens.teal}, ${tokens.greenDeep}, ${tokens.yellow})` },
        '&::after': { content: '"CONFIDENTIAL"', position: 'absolute', bottom: 20, right: 32, fontFamily: fonts.mono, fontSize: 50, fontWeight: 700, color: 'rgba(197,48,48,0.06)', letterSpacing: '0.1em', pointerEvents: 'none', transform: 'rotate(-8deg)' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', mb: '18px', flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ maxWidth: 240 }}><Box component="img" src={TDPL_LOGO_FULL} alt="TrustLab Diagnostics" sx={{ maxHeight: 48, width: 'auto', display: 'block', maxWidth: '100%' }} /></Box>
            <Box sx={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 12, color: tokens.tealDark, mt: '6px', pl: '2px' }}>Get it Fast. Get it Right.</Box>
          </Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.tealDark, letterSpacing: '0.15em', textAlign: 'right', fontWeight: 700 }}>
            TL-OPS-DRM-001
            <Box component="span" sx={{ display: 'block', fontSize: 13, color: tokens.ink, letterSpacing: '0.1em', mt: '3px' }}>MINUTES OF MEETING</Box>
          </Box>
        </Box>
        <TypePill type={m.type} sx={{ p: '4px 10px', borderRadius: '12px', gap: '6px', mb: '10px' }}><Icon name={TYPES[m.type].icon} size={12} />{TYPES[m.type].name}{m.subBadge ? ' · ' + m.subBadge : ''}</TypePill>
        <Typography component="h1" sx={{ fontFamily: fonts.serif, fontSize: { xs: 24, md: 30 }, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, m: '10px 0 14px', color: tokens.ink }}>{m.title}</Typography>
        <Box sx={{ pt: '16px', borderTop: `1px solid ${tokens.line}` }}>
          <Grid container spacing="12px">
            {[
              ['Date', formatDateLong(dt), false],
              ['Time', <>{formatTime(m.time)} <Box component="span" sx={{ color: tokens.slate, fontWeight: 400 }}>· {m.dur}</Box></>, false],
              ['Venue', m.loc, true],
              ['Chair', m.chair, true],
            ].map(([lbl, val, small]) => (
              <Grid key={lbl} size={{ xs: 6, md: 3 }}>
                <Box sx={{ fontSize: 12 }}>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, mb: '4px' }}>{lbl}</Box>
                  <Box sx={{ fontWeight: 700, color: tokens.ink, fontSize: small ? 12 : 13 }}>{val}</Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ height: 1, background: `linear-gradient(90deg, transparent, ${tokens.line}, transparent)`, m: '20px 0 14px', position: 'relative', '&::after': { content: '"◆"', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', bgcolor: tokens.cream, p: '0 12px', color: tokens.teal, fontSize: 10 } }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: externals.length ? 6 : 12 }}>
            <Box sx={monoLbl()}>Internal ({m.attendees.length})</Box>
            <Box sx={{ fontSize: 12, lineHeight: 1.7 }}>{m.attendees.join(' · ')}</Box>
          </Grid>
          {externals.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={monoLbl(tokens.blue)}>External ({externals.length})</Box>
              <Box sx={{ fontSize: 12, lineHeight: 1.7 }}>
                {externals.map((e, i) => { const n = normExt(e); return (
                  <Box component="span" key={i}>{i > 0 ? ' · ' : ''}{n.name}{n.email ? <> <Box component="span" sx={{ color: tokens.slate, fontFamily: 'monospace', fontSize: 10 }}>&lt;{n.email}&gt;</Box></> : null}</Box>
                ); })}
              </Box>
            </Grid>
          )}
        </Grid>
        {m.minutesFinalised && <Box sx={{ mt: '14px', p: '8px 12px', bgcolor: tokens.tealSoft, borderRadius: '6px', fontSize: 11, color: tokens.tealDark, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Finalised{m.minutesCirculatedAt ? ' · Circulated' : ''}</Box>}
      </Box>

      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', mb: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <span><Icon name="save" />Auto-saves as you type · Last saved <span>just now</span></span>
        <span>{m.agenda.length} agenda item{m.agenda.length > 1 ? 's' : ''}</span>
      </Box>

      {m.agenda.map((a, i) => {
        const ag = 'ag' + i;
        const mins = (m.minutes && m.minutes[ag]) || { disc: '', dec: '' };
        return (
          <MinutesBlock key={ag} num={String(i + 1).padStart(2, '0')} title={a} time={m.agendaTimes[i] || '—'}>
            <SectionLabel><Icon name="chat" />Discussion Notes</SectionLabel>
            <MinutesTextarea variant="discussion" placeholder="Key points raised, who said what, data cited, questions asked..." value={mins.disc || ''} onChange={(e) => onUpdateMinutes(ag, 'disc', e.target.value)} />
            <SectionLabel><Icon name="target" />Decisions & Outcomes</SectionLabel>
            <MinutesTextarea variant="decisions" placeholder="What was decided · what the room agreed on..." value={mins.dec || ''} onChange={(e) => onUpdateMinutes(ag, 'dec', e.target.value)} />
            <Box sx={{ display: 'flex', gap: '6px', mt: 1, flexWrap: 'wrap' }}>
              <QuickLinkBtn onClick={() => onConvertToAction(a)}>+ Convert to Action Item</QuickLinkBtn>
              <QuickLinkBtn onClick={onAttachFile}>+ Attach File</QuickLinkBtn>
              <QuickLinkBtn onClick={() => onLinkDecision(i)}>+ Link Decision</QuickLinkBtn>
            </Box>
          </MinutesBlock>
        );
      })}

      <MinutesBlock num="+" numSx={{ bgcolor: tokens.yellow, color: tokens.greenDeep }} title="General Notes / Ad-hoc Items">
        <MinutesTextarea placeholder="Anything discussed outside the agenda · AoB · things to follow up..." value={(m.minutes && m.minutes.general && m.minutes.general.disc) || ''} onChange={(e) => onUpdateMinutes('general', 'disc', e.target.value)} />
      </MinutesBlock>

      <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '16px', md: '20px 24px' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, boxShadow: tokens.shadow, gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: 12, color: tokens.slate, '& strong': { color: tokens.ink, fontWeight: 700 } }}>
          Minutes draft · <strong>{m.agenda.length} agenda items</strong> · Chair: <strong>{m.chair}</strong>{m.minutesFinalised ? <> · <Box component="span" sx={{ color: tokens.tealDark, fontWeight: 700 }}>✓ FINALISED</Box></> : null}
        </Box>
        <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn onClick={onPreview}><Icon name="view" />Preview</Btn>
          <Btn onClick={onExport}><Icon name="document" />Export</Btn>
          <Btn variant="primary" onClick={onFinalise}>✓ Finalise &amp; Circulate</Btn>
        </Box>
      </Box>
    </Box>
  );
}
