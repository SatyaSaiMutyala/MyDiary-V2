import { Box, Modal, Typography } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';

/**
 * AIMS dialog: 14px corners, deep shadow, white title bar (title + sub) with a hairline, body on the
 * canvas colour, actions bar with a top hairline. `head` 'light' and 'gradient' both render this
 * header (the gradient variant keeps the icon tile); 'custom' renders `headSlot` as-is.
 */
export default function ModalShell({ open, onClose, width = 620, head = 'light', icon, title, sub, headSlot, footer, bodySx, children, headSx, align = 'center' }) {
  return (
    <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: align === 'top' ? 'flex-start' : 'center', justifyContent: 'center', p: { xs: 1.5, md: 2.5 }, pt: align === 'top' ? '15vh' : undefined }} slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' } } }}>
      <Box sx={{ bgcolor: tokens.card, borderRadius: '14px', boxShadow: '0 24px 60px rgba(16,21,28,.42)', width, maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}>
        {head === 'custom' ? headSlot : (
          <Box sx={{ p: '14px 18px 12px', borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: tokens.card, ...headSx }}>
            {icon && <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: tokens.tealSoft, color: tokens.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</Box>}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h2" sx={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', m: 0 }}>{title}</Typography>
              {sub && <Typography component="div" sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.faint, mt: '3px' }}>{sub}</Typography>}
            </Box>
            {headSlot}
            <Box component="button" type="button" onClick={onClose} aria-label="Close" sx={{ width: 32, height: 32, borderRadius: '6px', border: `1px solid ${tokens.line}`, bgcolor: tokens.card, color: tokens.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0, '&:hover': { bgcolor: tokens.tealSoft, color: tokens.teal } }}>×</Box>
          </Box>
        )}
        <Box sx={{ p: { xs: '16px', md: '18px 20px' }, overflowY: 'auto', flex: 1, bgcolor: tokens.cream, ...bodySx }}>{children}</Box>
        {footer && <Box sx={{ p: '10px 16px', borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>{footer}</Box>}
      </Box>
    </Modal>
  );
}

export function FootNote({ sx, children }) {
  return <Typography component="div" sx={{ fontSize: 11.5, color: tokens.faint, fontFamily: fonts.mono, ...sx }}>{children}</Typography>;
}
