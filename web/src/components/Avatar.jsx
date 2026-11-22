import { Box } from '@mui/material';
import { initials, ownerAvatarColor } from '../utils/people';
import { tokens } from '../theme/tokens';

/** Round initials avatar. size px; color defaults to ownerAvatarColor(name); external → blue */
export default function Avatar({ name, size = 28, color, external, fontSize, sx, children }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color || (external ? tokens.blue : ownerAvatarColor(name)), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: fontSize || Math.max(8, Math.round(size * 0.36)), flexShrink: 0, ...sx }}>
      {children || initials(name)}
    </Box>
  );
}
