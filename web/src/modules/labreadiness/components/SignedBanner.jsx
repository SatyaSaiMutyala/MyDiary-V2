import { Box, Typography } from '@mui/material';
import { Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useEvidenceUrl } from '../useEvidenceUrl';
import { clock, prettyDate } from '../utils';

/**
 * The foot of a signed record: who signed, when, the declaration they signed, and the photograph
 * taken at the time. A late sign-off says so — it is accepted, not hidden.
 */
export default function SignedBanner({ board, selfiePath, onReopen, canReopen }) {
  const run = board.run;
  const { url } = useEvidenceUrl(run?.hasSelfie ? selfiePath : '');
  const late = run.late;

  return (
    <Box sx={{ mt: '18px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${late ? tokens.amber : tokens.ok}` }}>
      <Box sx={{ p: { xs: '14px 16px', md: '16px 20px' }, bgcolor: late ? tokens.yellowSoft : tokens.okSoft, display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {url && (
          <Box component="img" src={url} alt={`Sign-off photograph of ${run.signedBy.name}`} sx={{ width: 76, height: 76, borderRadius: '10px', objectFit: 'cover', border: `2px solid ${tokens.card}`, boxShadow: tokens.shadowSm, flexShrink: 0 }} />
        )}
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: late ? tokens.amber : tokens.ok, mb: '5px' }}>
            {late ? '⚠ Signed off after the cut-off' : '✓ Signed off'}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: tokens.ink, fontWeight: 700 }}>
            {run.signedBy.name}{run.signedBy.role ? ` · ${run.signedBy.role}` : ''}
          </Typography>
          <Typography sx={{ fontSize: 12, color: tokens.slate, mt: '2px' }}>
            {prettyDate(board.date)} at {clock(run.signedAt)}
            {board.phase === 'opening' ? ` · cut-off ${board.config.openingCutoff}` : ` · cut-off ${board.config.closingCutoff}`}
            {run.startedAt ? ` · first activity recorded at ${clock(run.startedAt)}` : ''}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: tokens.ink, mt: '8px', lineHeight: 1.55, fontStyle: 'italic' }}>
            “{run.declaration}”
          </Typography>
        </Box>
        {canReopen && (
          <Box sx={{ ml: { xs: 0, md: 'auto' } }}>
            <Btn onClick={onReopen}>🔓 Reopen this record</Btn>
          </Box>
        )}
      </Box>

      {run.reopenLog.length > 0 && (
        <Box sx={{ p: '12px 16px', bgcolor: tokens.card, borderTop: `1px solid ${tokens.line}` }}>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slateSoft, mb: '6px' }}>
            Reopened {run.reopenLog.length} time{run.reopenLog.length === 1 ? '' : 's'}
          </Typography>
          {run.reopenLog.map((r, i) => (
            <Typography key={i} sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.6 }}>
              <strong>{r.by || 'Somebody'}</strong> · {prettyDate(r.at.slice(0, 10))} {clock(r.at)} — {r.reason}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
