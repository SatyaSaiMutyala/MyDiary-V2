import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { Btn, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { TRANSCRIPT_LANGUAGES } from '../useLiveTranscription';

const barSelectSx = {
  bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '6px', p: '7px 10px', fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
  cursor: 'pointer', maxWidth: 180, '& option': { color: tokens.ink },
};

const pulse = keyframes`0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); } 50% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }`;
const blink = keyframes`50% { opacity: 0; }`;
const slideIn = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`;

const SPEAKER = {
  s1: { bg: tokens.tealSoft, color: tokens.tealDark },
  s2: { bg: tokens.blueSoft, color: tokens.blue },
  s3: { bg: tokens.orangeSoft, color: tokens.orange },
  s4: { bg: tokens.purpleSoft, color: tokens.purple },
  s5: { bg: tokens.yellowSoft, color: tokens.amber },
};

function LiveBtn({ primary, sx, children, ...rest }) {
  return (
    <Box component="button" type="button" sx={{ p: '9px 16px', borderRadius: '6px', bgcolor: primary ? '#fff' : 'rgba(255,255,255,0.15)', color: primary ? tokens.greenDeep : '#fff', border: `1px solid ${primary ? '#fff' : 'rgba(255,255,255,0.3)'}`, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', whiteSpace: 'nowrap', '&:hover': { bgcolor: primary ? tokens.yellow : 'rgba(255,255,255,0.25)' }, ...sx }} {...rest}>{children}</Box>
  );
}

/**
 * renderLivePane — the live bar, the transcript as it is spoken, and the "Generate AI Summary" CTA.
 *
 * The words come from the browser listening to the microphone, so what the bar says about itself has
 * to be true: it no longer claims speaker diarization or a transcription vendor, because there is
 * neither. Who is speaking is said by the person minuting, and the language is chosen rather than
 * detected.
 */
export default function DetailLivePane({ m, recording, live, sink, speaker, onSpeaker, lang, onLang, onToggleRecording, onDownload, onGenerateAI }) {
  const isRecording = recording.active && recording.meetingId === m.id;
  const transcript = m.transcript || [];
  const timer = isRecording ? String(Math.floor(recording.elapsed / 60)).padStart(2, '0') + ':' + String(recording.elapsed % 60).padStart(2, '0') : '00:00';
  const people = [...new Set([speaker, ...(m.attendees ?? []), ...(m.external ?? []).map(e => e.name)].filter(Boolean))];
  const langLabel = TRANSCRIPT_LANGUAGES.find(l => l.code === lang)?.label ?? lang;
  const canListen = live?.supported && live?.secure;

  /**
   * The newest line stays in view. Without this the feed grows downwards behind the fold and the
   * person minuting is reading a minute into the past by the time it matters.
   */
  const feedRef = useRef(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = feedRef.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript.length, live?.interim]);
  // Scrolling up to read something is respected until the person comes back to the bottom.
  const onFeedScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <Box>
      {/* Said once, plainly, rather than letting somebody find out by speaking into a dead room. */}
      {!canListen && (
        <Box sx={{ p: '12px 16px', mb: '12px', bgcolor: tokens.yellowSoft, border: `1px solid ${tokens.yellow}`, borderRadius: tokens.radius, fontSize: 12.5, color: '#92400E', lineHeight: 1.5 }}>
          <Box component="strong">Live transcription needs Chrome or Edge on a computer{live?.supported && !live?.secure ? ', over https' : ''}.</Box>{' '}
          {live?.supported ? 'Open MyDiary on its https address to use the microphone.' : 'This browser has no speech recogniser, so the Record button is off. Everything else on this page works.'}
        </Box>
      )}
      {sink?.pending ? (
        <Box sx={{ p: '10px 16px', mb: '12px', borderRadius: tokens.radius, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 12.5, lineHeight: 1.5,
          bgcolor: sink.failing ? tokens.redSoft : tokens.tealSofter, border: `1px solid ${sink.failing ? tokens.red : tokens.teal}`, color: sink.failing ? '#991B1B' : tokens.tealDark }}>
          <Box sx={{ flex: 1 }}>
            {sink.failing
              ? <><strong>{sink.pending} line{sink.pending === 1 ? '' : 's'} could not be saved yet.</strong> Nothing is lost — MyDiary keeps trying. Leave this page open.</>
              : <>Saving {sink.pending} line{sink.pending === 1 ? '' : 's'}…</>}
          </Box>
          {sink.failing && <Btn size="sm" onClick={sink.retryNow}>Try now</Btn>}
        </Box>
      ) : null}
      {live?.problem && (
        <Box sx={{ p: '12px 16px', mb: '12px', bgcolor: tokens.redSoft, border: `1px solid ${tokens.red}`, borderRadius: tokens.radius, fontSize: 12.5, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>{live.problem}</Box>
          <Btn size="sm" onClick={live.clearProblem}>Dismiss</Btn>
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '12px', md: '16px' }, p: '14px 18px', background: isRecording ? 'linear-gradient(90deg, #8B1E1E, #C53030)' : `linear-gradient(90deg, ${tokens.greenDeep}, ${tokens.greenMid})`, color: '#fff', borderRadius: tokens.radius, mb: '18px', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: isRecording ? '#fff' : 'rgba(255,255,255,0.15)', color: isRecording ? tokens.red : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, animation: isRecording ? `${pulse} 1.5s infinite` : 'none' }}>{isRecording ? '' : ''}</Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Box sx={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>
            {isRecording ? (live?.listening ? 'LISTENING' : 'PAUSED — NOT LISTENING') : canListen ? 'Live Transcription · Ready' : 'Live Transcription · Unavailable here'}
          </Box>
          <Box sx={{ fontSize: 11, opacity: 0.85, mt: '2px', fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isRecording
              ? (live?.listening ? `${langLabel} · saving as ${(speaker || '').split(' ')[0] || 'you'} speaks` : 'Nothing is being captured · press Resume to carry on')
              : 'Press record — your microphone is transcribed into the minutes'}
          </Box>
        </Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.15)', p: '6px 14px', borderRadius: '6px' }}>{timer}</Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Changed mid-meeting: whoever is minuting marks who has the floor, and the next sentence
              is recorded against them. */}
          <Box component="select" value={speaker || ''} onChange={(e) => onSpeaker(e.target.value)} title="Who is speaking now" sx={barSelectSx}>
            {people.map(n => <option key={n} value={n}>{n}</option>)}
          </Box>
          <Box component="select" value={lang} onChange={(e) => onLang(e.target.value)} title="Language being spoken" sx={{ ...barSelectSx, maxWidth: 150 }}>
            {TRANSCRIPT_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </Box>
          {/* Pause leaves the meeting recording and the clock running but stops listening, for the
              part of the room that should not be on the record. */}
          {isRecording && (
            <LiveBtn onClick={() => (live.listening ? live.stop() : live.start())} title={live?.listening ? 'Stop listening without ending the recording' : 'Start listening again'}>
              {live?.listening ? '⏸ Pause' : '▶ Resume'}
            </LiveBtn>
          )}
          <LiveBtn primary onClick={onToggleRecording} disabled={!canListen && !isRecording}
            sx={!canListen && !isRecording ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>
            {isRecording ? '⏹ Stop' : '● Start Recording'}
          </LiveBtn>
          {transcript.length > 0 && <LiveBtn onClick={onDownload}>⬇ Download</LiveBtn>}
        </Box>
      </Box>

      <Box ref={feedRef} onScroll={onFeedScroll} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '16px', md: '20px 24px' }, maxHeight: 500, overflowY: 'auto', mb: '18px', fontFamily: fonts.sans, scrollBehavior: 'smooth' }}>
        {transcript.length === 0 && !(sink?.waiting ?? []).length ? (
          <Box sx={{ textAlign: 'center', p: '40px 20px', color: tokens.slate, fontSize: 13 }}>
            <Box sx={{ fontSize: 36, opacity: 0.4, mb: '10px' }}><Icon name="mic" /></Box>
            <Box sx={{ fontWeight: 700, mb: '6px' }}>No transcript yet</Box>
            <Box>Press <strong>Start Recording</strong> above and talk. Your microphone is transcribed as you speak, each line stamped and saved against whoever has the floor.</Box>
          </Box>
        ) : null}
        {transcript.map((t, i) => {
          const sc = SPEAKER[t.chip] || SPEAKER.s1;
          const cursor = i === transcript.length - 1 && isRecording;
          return (
            <Box key={i} sx={{ display: 'flex', gap: '14px', p: '10px 0', borderBottom: `1px dashed ${tokens.lineSoft}`, animation: `${slideIn} 0.3s ease`, '&:last-child': { borderBottom: 'none' } }}>
              <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: { xs: 86, sm: 110 } }}>
                <Box sx={{ p: '3px 9px', borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: sc.bg, color: sc.color }}>{t.speaker.split(' ')[0]}</Box>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.slateSoft, mt: '3px', letterSpacing: '0.04em' }}>{t.time}</Box>
              </Box>
              <Box sx={{ flex: 1, fontSize: 14, lineHeight: 1.6, pt: '2px', ...(cursor ? { '&::after': { content: '"▎"', animation: `${blink} 1s infinite`, color: tokens.teal } } : {}) }}>{t.text}</Box>
            </Box>
          );
        })}

        {/* Said, but not yet stored. Shown rather than hidden: during an outage the feed otherwise
            reads "no transcript yet" while somebody is talking into it. */}
        {(sink?.waiting ?? []).map((t, i) => (
          <Box key={`w${i}`} sx={{ display: 'flex', gap: '14px', p: '10px 0', borderBottom: `1px dashed ${tokens.lineSoft}`, '&:last-of-type': { borderBottom: 'none' } }}>
            <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: { xs: 86, sm: 110 } }}>
              <Box sx={{ p: '3px 9px', borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: tokens.creamWarm, color: tokens.slate }}>{(t.speaker || '').split(' ')[0]}</Box>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 8.5, color: sink.failing ? tokens.red : tokens.slateSoft, mt: '3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{sink.failing ? 'not saved' : 'saving…'}</Box>
            </Box>
            <Box sx={{ flex: 1, fontSize: 14, lineHeight: 1.6, pt: '2px', color: tokens.slate }}>{t.text}</Box>
          </Box>
        ))}

        {/* What the recogniser has heard but not yet settled on — grey until it commits. */}
        {isRecording && live?.interim ? (
          <Box sx={{ display: 'flex', gap: '14px', p: '10px 0' }}>
            <Box sx={{ flexShrink: 0, width: { xs: 86, sm: 110 }, display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ p: '3px 9px', borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: tokens.creamWarm, color: tokens.slate }}>{(speaker || '').split(' ')[0]}</Box>
            </Box>
            <Box sx={{ flex: 1, fontSize: 14, lineHeight: 1.6, pt: '2px', color: tokens.slateSoft, fontStyle: 'italic' }}>
              {live.interim}
              <Box component="span" sx={{ animation: `${blink} 1s infinite`, color: tokens.teal, fontStyle: 'normal' }}>▎</Box>
            </Box>
          </Box>
        ) : null}
        {isRecording && live?.listening && !live?.interim && transcript.length === 0 && !(sink?.waiting ?? []).length ? (
          <Box sx={{ textAlign: 'center', p: '30px 20px', color: tokens.slate, fontSize: 13 }}>Listening… say something and it will appear here.</Box>
        ) : null}
      </Box>

      {transcript.length > 0 && !isRecording && (
        <Box sx={{ p: '16px 18px', bgcolor: tokens.tealSofter, border: `1px solid ${tokens.teal}`, borderRadius: tokens.radius, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Box component="span" sx={{ fontSize: 24 }}>✨</Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ fontWeight: 700, fontSize: 13, mb: '3px' }}>Transcript ready for AI processing</Box>
            <Box sx={{ fontSize: 12, color: tokens.slate }}>{transcript.length} line{transcript.length === 1 ? '' : 's'} captured. Claude can now generate a summary, extract action items, and detect decisions.</Box>
          </Box>
          <Btn variant="primary" size="sm" onClick={onGenerateAI}>✨ Generate AI Summary</Btn>
        </Box>
      )}
    </Box>
  );
}
