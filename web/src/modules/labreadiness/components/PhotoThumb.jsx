import { Box, ButtonBase, Typography } from '@mui/material';
import { ModalShell, Btn, FootNote, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { useEvidenceUrl } from '../useEvidenceUrl';
import { clock } from '../utils';

/**
 * One evidence photograph: a thumbnail that opens full size.
 *
 * The bytes come down with the session's own headers (useEvidenceUrl), so a thumbnail is a real
 * authenticated read, not a public link — the photographs are patient-area evidence.
 */
export default function PhotoThumb({ path, photo, onOpen, onRemove, locked }) {
  const { url, loading, error } = useEvidenceUrl(path);
  return (
    <Box sx={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
      <ButtonBase
        onClick={() => url && onOpen?.()}
        title={error || `${photo.name || 'photograph'} · ${clock(photo.uploadedAt)}${photo.uploadedBy ? ` · ${photo.uploadedBy}` : ''}`}
        sx={{
          width: 58, height: 58, borderRadius: '8px', overflow: 'hidden', display: 'block',
          border: `1px solid ${error ? tokens.bad : tokens.line}`, bgcolor: tokens.sunk,
          '&:hover': { borderColor: tokens.teal },
        }}
      >
        {url ? (
          <Box component="img" src={url} alt={photo.name || 'Evidence photograph'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: error ? tokens.bad : tokens.slateSoft }}>
            {loading ? '⏳' : error ? '⚠' : ''}
          </Box>
        )}
      </ButtonBase>
      {!locked && onRemove && (
        <Box
          component="button"
          type="button"
          onClick={onRemove}
          title="Remove this photograph"
          sx={{
            position: 'absolute', top: -6, right: -6, width: 20, height: 20, p: 0, borderRadius: '50%',
            bgcolor: tokens.card, border: `1px solid ${tokens.line}`, color: tokens.faint, fontSize: 12,
            lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tokens.shadowSm,
            '&:hover': { color: tokens.bad, borderColor: tokens.bad, bgcolor: tokens.badSoft },
          }}
        >
          ×
        </Box>
      )}
    </Box>
  );
}

/** The same photograph, full size, with who filed it and when. */
export function PhotoViewerModal({ open, path, photo, activity, onClose }) {
  const { url, loading, error } = useEvidenceUrl(open ? path : '');
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      width={760}
      icon={<Icon name="image" />}
      title={photo?.name || 'Evidence photograph'}
      sub={activity ? `${activity.key.toUpperCase()} · ${activity.text}` : ''}
      bodySx={{ bgcolor: tokens.ink }}
      footer={<>
        <FootNote>
          {photo?.uploadedBy ? `Filed by ${photo.uploadedBy}` : 'Filed'}{photo?.uploadedAt ? ` at ${clock(photo.uploadedAt)}` : ''}
          {photo?.sizeBytes ? ` · ${(photo.sizeBytes / 1024).toFixed(0)} KB` : ''}
        </FootNote>
        <Btn onClick={onClose}>Close</Btn>
      </>}
    >
      <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? (
          <Box component="img" src={url} alt={photo?.name || 'Evidence photograph'} sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', borderRadius: '6px' }} />
        ) : (
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: error ? '#FFB4AE' : 'rgba(255,255,255,.6)' }}>
            {loading ? 'Loading the photograph…' : error || 'No photograph'}
          </Typography>
        )}
      </Box>
    </ModalShell>
  );
}
