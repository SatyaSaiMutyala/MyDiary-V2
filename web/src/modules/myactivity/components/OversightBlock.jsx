import { useState } from 'react';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { tokens, fonts } from '../../../theme/tokens';
import { Avatar } from '../../../components';
import HeadCard from './HeadCard';
import { deptRollupRows, sortByLowest, barClassFor } from '../utils';
import { DAYS_OF_WEEK_FULL } from '../../../data/departments';
import { MONTHS } from '../../../utils/dates';

/**
 * Prototype: renderCMDOversightBlock — collapsible "Organisation Rollup — Today" band.
 * NOTE: the prototype's renderMyActivity never calls this; it is kept available for parity.
 */
export function CMDOversightBlock({ departments, activityLog, facts }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const rows = deptRollupRows(departments, activityLog, facts);
  const orgTotal = rows.reduce((s, r) => s + r.total, 0);
  const orgDone = rows.reduce((s, r) => s + r.done, 0);
  const orgPct = orgTotal ? Math.round((orgDone / orgTotal) * 100) : 0;
  return (
    <Box sx={{ mt: '28px' }}>
      <Box onClick={() => setOpen(o => !o)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', p: '14px 18px', background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: open ? '10px 10px 0 0' : '10px', borderBottom: open ? 0 : '1px solid rgba(255,255,255,0.1)' }}>
        <Box component="span" sx={{ fontSize: 22 }}>🌐</Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ fontFamily: fonts.serif, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Organisation Rollup — Today</Box>
          <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, letterSpacing: '0.04em', mt: '2px' }}>All 17 departments · {orgDone}/{orgTotal} tasks done org-wide · {orgPct}%</Box>
        </Box>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 11, bgcolor: 'rgba(255,255,255,0.18)', p: '5px 10px', borderRadius: '12px', fontWeight: 700 }}>{open ? '▲ Collapse' : '▼ Expand'}</Box>
      </Box>
      {open && (
        <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: 'none', borderRadius: '0 0 10px 10px', p: '18px' }}>
          <Box sx={{ fontSize: 12, color: tokens.slate, mb: '14px' }}>Where your attention is needed first — departments sorted by lowest completion. Click any card to open the department.</Box>
          <Grid container spacing={1.25}>
            {sortByLowest(rows).map(r => (
              <Grid key={r.dept.id} size={{ xs: 12, lg: 6 }}>
                <HeadCard icon={r.dept.icon} name={r.dept.name} meta={`${r.people} people · ${r.total} task${r.total !== 1 ? 's' : ''} due today`} done={r.done} total={r.total} pct={r.pct} barClass={barClassFor(r.pct)} onClick={() => navigate(`/departments/${r.dept.id}`)} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

/**
 * Prototype: renderMyActivityOversight — full-page CMD rollup (hero + date chip + dept cards).
 * NOTE: also not called by the prototype's renderMyActivity; kept available for parity.
 */
export function MyActivityOversight({ me, departments, activityLog, facts }) {
  const navigate = useNavigate();
  const rows = deptRollupRows(departments, activityLog, facts, { skipCMDOffice: false });
  const orgTotal = rows.reduce((s, r) => s + r.total, 0);
  const orgDone = rows.reduce((s, r) => s + r.done, 0);
  const orgPct = orgTotal ? Math.round((orgDone / orgTotal) * 100) : 0;
  const circ = 2 * Math.PI * 38;
  const offset = circ - (orgPct / 100) * circ;
  const today = facts.today;
  return (
    <>
      <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: '14px', p: '22px 26px', mb: '18px' }}>
        <Grid container spacing={2.25} sx={{ alignItems: "center" }}>
          <Grid size="auto"><Avatar name={me} size={68} fontSize={22} sx={{ border: '3px solid rgba(255,255,255,0.3)' }} /></Grid>
          <Grid size="grow">
            <Box component="h1" sx={{ fontFamily: fonts.serif, fontSize: 24, m: 0, fontWeight: 700 }}>Organisation activity rollup</Box>
            <Box sx={{ fontFamily: fonts.mono, fontSize: 11, opacity: 0.85, mt: '4px', letterSpacing: '0.04em' }}>CMD view · All 17 departments · Today's shift completion</Box>
            <Box sx={{ fontSize: 13, opacity: 0.92, mt: '6px' }}>You don't own a departmental shift list yourself — this is the cross-organisation view, so you can spot where today's opening/closing/weekly/monthly items are not getting done.</Box>
          </Grid>
          <Grid size={{ xs: 12, md: 'auto' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box component="svg" viewBox="0 0 100 100" sx={{ width: 92, height: 92 }}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="38" fill="none" stroke={tokens.yellow} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.4s' }} />
                <text x="50" y="50" fill="#fff" fontFamily={fonts.serif} fontSize="20" fontWeight="700" textAnchor="middle" dominantBaseline="central">{orgPct}%</text>
              </Box>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9, opacity: 0.85, letterSpacing: '0.1em', mt: '4px', textTransform: 'uppercase' }}>{orgDone}/{orgTotal} org-wide</Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: '18px', alignItems: 'center', p: '10px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', flexWrap: 'wrap' }}>
        <Box sx={{ p: '8px 14px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '20px', fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: tokens.slate, letterSpacing: '0.04em', ml: 'auto' }}>📅 {DAYS_OF_WEEK_FULL[today.getDay()]}, {today.getDate()} {MONTHS[today.getMonth()]} {today.getFullYear()}</Box>
      </Box>
      <Grid container spacing={1.5}>
        {sortByLowest(rows).map(r => (
          <Grid key={r.dept.id} size={{ xs: 12, lg: 6 }}>
            <HeadCard icon={r.dept.icon} name={r.dept.name} meta={`${r.people} people · ${r.total} task${r.total !== 1 ? 's' : ''} due today`} done={r.done} total={r.total} pct={r.pct} barClass={barClassFor(r.pct)} onClick={() => navigate(`/departments/${r.dept.id}`)} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
