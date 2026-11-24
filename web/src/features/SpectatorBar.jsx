import { Box, ButtonBase } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthContext';
import { initials, ownerAvatarColor } from '../utils/people';
import { tokens, fonts } from '../theme/tokens';

/**
 * The band across the top while an admin is looking at someone else's MyDiary.
 *
 * Without it the app looks normal but every number belongs to another person, which is how a
 * manager ends up chasing a task that was never theirs. It also carries the way out, so leaving is
 * one click from any page.
 */
export default function SpectatorBar() {
  const { state, setViewer } = useAppStore();
  const { user } = useAuth();
  const watching = user && state.viewer.name !== user.name ? state.viewer : null;
  if (!watching) return null;

  const back = () => setViewer(user.name, user.title || user.role, null);
  return (
    <Box
      role="status"
      sx={{
        display: 'flex', alignItems: 'center', gap: { xs: '8px', sm: '12px' },
        px: { xs: '12px', md: '18px' }, py: '8px',
        background: `linear-gradient(135deg, ${tokens.gold}, ${tokens.goldDark})`,
        color: tokens.greenDeep, borderBottom: `1px solid ${tokens.goldDark}`,
        position: 'sticky', top: 0, zIndex: 120, flexWrap: 'wrap',
      }}
    >
      <VisibilityOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: ownerAvatarColor(watching.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>
        {initials(watching.name)}
      </Box>
      <Box sx={{ fontSize: 13, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Seeing MyDiary as {watching.name}
        {watching.role ? <Box component="span" sx={{ fontWeight: 500, opacity: 0.8 }}> · {watching.role}</Box> : null}
      </Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, bgcolor: 'rgba(32,96,91,.14)', px: '8px', py: '2px', borderRadius: '10px', flexShrink: 0 }}>
        Read-only
      </Box>
      <ButtonBase
        onClick={back}
        sx={{ ml: 'auto', px: '12px', minHeight: 28, borderRadius: '6px', bgcolor: tokens.greenDeep, color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0, '&:hover': { bgcolor: tokens.tealDark } }}
      >
        ← Back to my view
      </ButtonBase>
    </Box>
  );
}
