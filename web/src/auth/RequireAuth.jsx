import { Box, CircularProgress, Typography } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { tokens } from '../theme/tokens';

/** Full-screen spinner while the stored session is being checked (GateBook RequireAuth). */
export function SessionLoading({ note }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: tokens.cream }}>
      <Box sx={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
        <CircularProgress sx={{ color: tokens.teal }} />
        {note ? <Typography sx={{ fontSize: 13, color: tokens.muted, maxWidth: 360, textAlign: 'center' }}>{note} Retrying…</Typography> : null}
      </Box>
    </Box>
  );
}

/** Route guard: signed-in users only. */
export function RequireAuth({ children }) {
  const { status, user, connectionError } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SessionLoading note={connectionError} />;
  if (status !== 'signedIn' || !user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
