import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { isOverdue } from '../../../utils/dates';
import { DmsCard, EmptyState, MonoHeading, Icon } from '../../../components';
import { ApiError, Fetching } from '../../settings/components/listUi';

/** .log-followup-item (renderFUItem) — grid 24px | 1fr | auto | auto. showFrom → "from: <topic>" link */
export function FUItem({ fu: f, onToggle, onOpenLog, showFrom }) {
  const od = !f.done && isOverdue(f.deadline);
  return (
    <Grid container spacing="10px" sx={{ alignItems: 'center', p: '10px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${od ? tokens.red : tokens.yellow}`, borderRadius: '6px', mb: '6px', opacity: f.done ? 0.6 : 1 }}>
      <Grid size="auto">
        <Box onClick={onToggle} sx={{ width: 18, height: 18, border: `2px solid ${f.done ? tokens.teal : tokens.line}`, bgcolor: f.done ? tokens.teal : 'transparent', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{f.done ? '✓' : ''}</Box>
      </Grid>
      <Grid size="grow" sx={{ minWidth: 0 }}>
        <Box sx={{ fontSize: 13, fontWeight: 600, textDecoration: f.done ? 'line-through' : 'none' }}>{f.text}</Box>
        {showFrom && f.log && (
          <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 400 }}>
            from: <Box component="a" onClick={() => onOpenLog(f.log.id)} sx={{ color: tokens.tealDark, cursor: 'pointer', fontWeight: 700 }}>{f.log.topic}</Box>
          </Box>
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', gap: '10px', alignItems: 'center', pl: { xs: '28px', sm: 0 } }}>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>{f.owner || 'self'}</Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: od ? tokens.red : tokens.slate, letterSpacing: '0.04em', fontWeight: 700 }}>{f.deadline || '—'}{od ? ' ⚠' : ''}</Box>
      </Grid>
    </Grid>
  );
}

/**
 * renderFollowupsView — strip Open/Overdue/Closed + Overdue / Open / Done sections.
 * Every row is one follow-up of GET /api/logs/followups, which carries the log it came from; the
 * Open and Closed numbers are the server's counts, Overdue is worked out against the app's calendar.
 */
export default function FollowupsView({ query, allFUs, counts, onToggle, onOpenLog }) {
  const { error, isLoading, isFetching, refetch } = query;
  const head = <><ApiError error={error} onRetry={refetch} sx={{ mb: '14px' }} /><Fetching on={isFetching} /></>;
  if (error) return head;
  if (allFUs.length === 0) {
    if (isLoading) return head;
    return <>{head}<EmptyState icon={<Icon name="task" />} title="No follow-ups logged" desc="Follow-ups appear here when you add them to your discussion logs." /></>;
  }
  const open = allFUs.filter(f => !f.done);
  const overdue = open.filter(f => isOverdue(f.deadline));
  const done = allFUs.filter(f => f.done);
  const openNotOverdue = open.filter(f => !isOverdue(f.deadline));
  const sortByDl = (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999');
  const item = f => <FUItem key={f.log.id + f.id} fu={f} showFrom onToggle={() => onToggle(f.log.id, f.id)} onOpenLog={onOpenLog} />;

  return (
    <>
      {head}
      <Grid container spacing="10px" sx={{ mb: '20px' }}>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="yellow" label="Open Follow-ups" value={counts?.open ?? open.length} sub="Across your discussion logs" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard accent="red" label="Overdue" value={overdue.length} sub="Past deadline" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><DmsCard label="Closed" value={counts?.done ?? done.length} sub="Completed" /></Grid>
      </Grid>
      {overdue.length > 0 && <><MonoHeading color={tokens.red} sx={{ m: '14px 0 10px' }}>⚠ Overdue</MonoHeading>{[...overdue].sort(sortByDl).map(item)}</>}
      {openNotOverdue.length > 0 && <><MonoHeading color={tokens.tealDark} sx={{ m: '20px 0 10px' }}>⌛ Open · by deadline</MonoHeading>{[...openNotOverdue].sort(sortByDl).map(item)}</>}
      {done.length > 0 && <><MonoHeading color={tokens.slate} sx={{ m: '20px 0 10px' }}>✓ Done</MonoHeading>{done.slice(0, 10).map(item)}</>}
    </>
  );
}
