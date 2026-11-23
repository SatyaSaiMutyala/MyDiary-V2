import { useCallback, useState } from 'react';
import { Alert, AlertTitle, Box, LinearProgress, Snackbar, TableCell, Typography } from '@mui/material';
import { Btn } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { errorDetails, errorMessage } from '../../../store/api/baseApi';
import { DateInput as DatePicker } from '../../../components/DateTimeInput';

export const PAGE_SIZE = 25;

/** "1–25 of 57" with Prev / Next, driven by the list envelope { page, limit, total, pages, hasMore }. */
export function Pager({ data, page, onPage, loading }) {
  const total = data?.total ?? 0; const limit = data?.limit ?? PAGE_SIZE;
  const from = total ? (page - 1) * limit + 1 : 0; const to = Math.min(page * limit, total);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1.25, borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.card }}>
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: tokens.muted }}>{total ? `${from}–${to} of ${total}` : loading ? 'Loading…' : '0 of 0'}{data?.pages > 1 ? ` · page ${page} of ${data.pages}` : ''}</Typography>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <Btn size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>‹ Prev</Btn>
        <Btn size="sm" onClick={() => onPage(page + 1)} disabled={!data?.hasMore || loading}>Next ›</Btn>
      </Box>
    </Box>
  );
}

/** Table header cell that sorts by `field` ("field" ascending, "-field" descending) when clicked. */
export function SortCell({ field, sort, onSort, children, sx, ...rest }) {
  const active = sort === field || sort === `-${field}`;
  const desc = sort === `-${field}`;
  const click = () => onSort(active && !desc ? `-${field}` : field);
  return (
    <TableCell onClick={click} aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'} title={`Sort by ${field}`}
      sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: active ? tokens.teal : undefined, '&:hover': { color: tokens.teal }, ...sx }} {...rest}>
      {children}<Box component="span" sx={{ ml: 0.5, fontSize: 10, opacity: active ? 1 : 0.35 }}>{active ? (desc ? '▼' : '▲') : '▲'}</Box>
    </TableCell>
  );
}

/** Thin progress line shown while a list refetches (keeps the old rows on screen). */
export function Fetching({ on }) {
  return <Box sx={{ height: 3 }}>{on ? <LinearProgress sx={{ height: 3, bgcolor: tokens.tealSoft, '& .MuiLinearProgress-bar': { bgcolor: tokens.teal } }} /> : null}</Box>;
}

/** Server error as-is (message + validation details) with an optional Retry. */
export function ApiError({ error, onRetry, sx }) {
  if (!error) return null;
  const details = errorDetails(error);
  return (
    <Alert severity="error" sx={{ borderRadius: '6px', fontSize: 13, ...sx }} action={onRetry ? <Btn size="sm" onClick={onRetry}>Retry</Btn> : null}>
      <AlertTitle sx={{ fontSize: 13, fontWeight: 600, mb: details.length ? 0.5 : 0 }}>{errorMessage(error)}</AlertTitle>
      {details.length ? <Box component="ul" sx={{ m: 0, pl: 2.25 }}>{details.map((d, i) => <li key={i}><strong>{d.field}</strong>: {d.message}</li>)}</Box> : null}
    </Alert>
  );
}

/** Page-level toast: const { toast, show } = useToast(); show('Saved.') · show(err, 'error') */
export function useToast() {
  const [t, setT] = useState(null);
  const show = useCallback((msgOrErr, severity) => {
    const isErr = severity === 'error' || (msgOrErr && typeof msgOrErr === 'object');
    setT({ msg: typeof msgOrErr === 'string' ? msgOrErr : errorMessage(msgOrErr), severity: isErr ? 'error' : severity || 'success', key: Date.now() });
  }, []);
  const toast = t ? (
    <Snackbar key={t.key} open autoHideDuration={t.severity === 'error' ? 8000 : 3500} onClose={(_, r) => { if (r !== 'clickaway') setT(null); }} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={t.severity} variant="filled" onClose={() => setT(null)} sx={{ borderRadius: '6px', fontSize: 13, boxShadow: tokens.shadowLg }}>{t.msg}</Alert>
    </Snackbar>
  ) : null;
  return { toast, show };
}

/** The filter-bar date field: the app's date picker, sized for a toolbar. */
export function DateInput(props) {
  return <DatePicker sx={{ width: 'auto' }} inputSx={{ minWidth: 138, fontSize: 12.5 }} {...props} />;
}
