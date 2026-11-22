import { Box } from '@mui/material';
import { EmptyState } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';

/** Shown in place of the calendar while the first fetch of a period is in flight. */
export function DiaryLoading() {
  return (
    <Box sx={{ p: '14px 18px' }}>
      <EmptyState icon="⏳" title="Loading your diary…" desc="Fetching this period’s entries and meetings." />
    </Box>
  );
}

/**
 * Empty state for the time-grid views: one line above the lattice, which stays clickable underneath
 * so a first entry is one click away.
 */
export function DiaryEmptyNote({ period }) {
  return (
    <Box sx={{ p: '10px 16px', bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slate }}>
      Nothing on the diary {period} — click a slot, or + New Entry
    </Box>
  );
}
