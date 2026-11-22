import { Box } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';

/** AIMS eyebrow — mono 11px uppercase: <Eyebrow code="TL-OPS-DRM-001" parts={['Meeting Management','Templates']} /> */
export default function Eyebrow({ code, parts = [], sx }) {
  return (
    <Box sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tokens.slate, textTransform: 'uppercase', mb: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', lineHeight: 1.4, ...sx }}>
      {code && <Box component="span" sx={{ color: tokens.teal, fontWeight: 700 }}>{code}</Box>}
      {parts.map((p, i) => (
        <Box component="span" key={i} sx={{ display: 'inline-flex', alignItems: 'center' }}>
          {(code || i > 0) && <Box component="span" sx={{ color: tokens.slateSofter, mx: '8px' }}>›</Box>}
          {p}
        </Box>
      ))}
    </Box>
  );
}
