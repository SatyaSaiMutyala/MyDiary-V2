import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { Btn, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';

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

/** renderLivePane — live bar + transcript feed + "Generate AI Summary" CTA */
export default function DetailLivePane({ m, recording, onToggleRecording, onDownload, onGenerateAI }) {
  const isRecording = recording.active && recording.meetingId === m.id;
  const transcript = m.transcript || [];
  const timer = isRecording ? String(Math.floor(recording.elapsed / 60)).padStart(2, '0') + ':' + String(recording.elapsed % 60).padStart(2, '0') : '00:00';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '12px', md: '16px' }, p: '14px 18px', background: isRecording ? 'linear-gradient(90deg, #8B1E1E, #C53030)' : `linear-gradient(90deg, ${tokens.greenDeep}, ${tokens.greenMid})`, color: '#fff', borderRadius: tokens.radius, mb: '18px', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: isRecording ? '#fff' : 'rgba(255,255,255,0.15)', color: isRecording ? tokens.red : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, animation: isRecording ? `${pulse} 1.5s infinite` : 'none' }}>{isRecording ? '' : ''}</Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Box sx={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>{isRecording ? 'RECORDING IN PROGRESS' : 'Live Transcription · Ready'}</Box>
          <Box sx={{ fontSize: 11, opacity: 0.8, mt: '2px', fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{isRecording ? 'Speaker diarization · English + Hindi + Telugu · via Deepgram' : 'Press Record to start capturing · AI transcribes with speaker labels'}</Box>
        </Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.15)', p: '6px 14px', borderRadius: '6px' }}>{timer}</Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <LiveBtn primary onClick={onToggleRecording}>{isRecording ? '⏹ Stop' : '● Start Recording'}</LiveBtn>
          {transcript.length > 0 && <LiveBtn onClick={onDownload}>⬇ Download</LiveBtn>}
        </Box>
      </Box>

      <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: { xs: '16px', md: '20px 24px' }, maxHeight: 500, overflowY: 'auto', mb: '18px', fontFamily: fonts.sans }}>
        {transcript.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: '40px 20px', color: tokens.slate, fontSize: 13 }}>
            <Box sx={{ fontSize: 36, opacity: 0.4, mb: '10px' }}><Icon name="mic" /></Box>
            <Box sx={{ fontWeight: 700, mb: '6px' }}>No transcript yet</Box>
            <Box>Press <strong>Start Recording</strong> above to begin live transcription. Speaker labels, timestamps, and multi-language support included.</Box>
          </Box>
        ) : transcript.map((t, i) => {
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
      </Box>

      {transcript.length > 0 && !isRecording && (
        <Box sx={{ p: '16px 18px', bgcolor: tokens.tealSofter, border: `1px solid ${tokens.teal}`, borderRadius: tokens.radius, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Box component="span" sx={{ fontSize: 24 }}>✨</Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ fontWeight: 700, fontSize: 13, mb: '3px' }}>Transcript ready for AI processing</Box>
            <Box sx={{ fontSize: 12, color: tokens.slate }}>{transcript.length} lines captured. Claude can now generate a summary, extract action items, and detect decisions.</Box>
          </Box>
          <Btn variant="primary" size="sm" onClick={onGenerateAI}>✨ Generate AI Summary</Btn>
        </Box>
      )}
    </Box>
  );
}
