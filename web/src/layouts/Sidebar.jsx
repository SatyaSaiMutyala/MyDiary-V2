import { useState } from 'react';
import { Box, IconButton, List, ListItemButton, Stack, Typography } from '@mui/material';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { NavLink } from 'react-router-dom';
import { fonts, RAIL_BG, RAIL_COLLAPSED, RAIL_WIDTH, TOPBAR_HEIGHT, tokens } from '../theme/tokens';
import { NAV_GROUPS } from './navItems';
import { useAppStore } from '../store/AppStore';
import { useListMeetingsQuery } from '../store/api/meetingsApi';
import { useListActionItemsQuery } from '../store/api/actionItemsApi';
import { isOverdue } from '../utils/dates';
import { hasModule } from '../data/users';
import { useViewerUser } from '../auth/useViewerUser';

const PIN_KEY = 'md.rail.pinned';
/** Remembered pin; without one, the menu starts open on wide screens and as icons below 1200 px. */
function readPinned() {
  const wide = typeof window === 'undefined' || window.innerWidth >= 1200;
  try { const v = localStorage.getItem(PIN_KEY); return v === null ? wide : v === '1'; } catch { return wide; }
}

/** Logo on a white rounded tile (the TrustLab mark). */
export function LogoTile({ size }) {
  return (
    <Box aria-hidden sx={{ width: size, height: size, borderRadius: `${Math.round(size * 0.24)}px`, bgcolor: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Box component="img" src="/mydiary-logo.png" alt="MyDiary" sx={{ width: '88%', height: '88%', objectFit: 'contain' }} />
    </Box>
  );
}

/** Wordmark: "MyDiary" over the department (AIMS rail lockup). */
export function Brand({ compact = false }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <LogoTile size={compact ? 32 : 40} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: compact ? 18 : 20, lineHeight: 1, color: '#fff' }}>MyDiary</Typography>
        <Typography noWrap sx={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.155em', textTransform: 'uppercase', color: 'rgba(255,255,255,.58)', mt: 0.5 }}>TrustLab Diagnostics</Typography>
      </Box>
    </Stack>
  );
}

function CountBadge({ count, tone = 'ok' }) {
  if (count === null || count === undefined) return null;
  const on = count > 0; const warn = tone === 'warn';
  return <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, px: 0.875, py: '1px', borderRadius: '20px', flexShrink: 0, bgcolor: on ? (warn ? 'rgba(255,200,31,.2)' : 'rgba(51,204,85,.2)') : 'rgba(255,255,255,0.08)', color: on ? (warn ? '#FFD45C' : '#4FDD6E') : tokens.railMuted }}>{count}</Box>;
}
function CountDot({ count, tone }) {
  if (!count) return null;
  return <Box component="span" sx={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', bgcolor: tone === 'warn' ? tokens.gold : '#4FDD6E', boxShadow: '0 0 0 2px #0E3529' }} />;
}
function RailGroup({ label, open }) {
  if (!label) return null;
  if (!open) return <Box sx={{ mx: 1.5, my: 1.25, borderTop: '1px solid rgba(255,255,255,.09)' }} />;
  return <Typography sx={{ px: 1.25, pt: 2, pb: 0.75, fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.railMuted, whiteSpace: 'nowrap' }}>{label}</Typography>;
}

/** Rail row (AIMS nav row): coloured icon tile + uppercase label + count; active = sky-blue tint with a bar. */
export function RailLink({ to, icon, label, color, badge, end, open, onClick }) {
  return (
    <ListItemButton component={NavLink} to={to} end={end} onClick={onClick} aria-label={open ? undefined : label} sx={{
      '--ic': color, position: 'relative', gap: 1.5, px: open ? 1.25 : 0, py: open ? 0.75 : 0.5, mb: '3px', minHeight: 44,
      justifyContent: open ? 'flex-start' : 'center', borderRadius: '10px', border: '1px solid transparent', color: '#E2EDE8', transition: 'background-color .12s ease',
      '&:hover': { backgroundColor: 'rgba(255,255,255,.07)' },
      '&.active': open
        ? { backgroundColor: 'rgba(46,177,255,.16)', borderColor: 'rgba(46,177,255,.35)', color: '#fff', '&::before': { content: '""', position: 'absolute', left: -9, top: 6, bottom: 6, width: 4, borderRadius: '0 4px 4px 0', backgroundColor: 'var(--ic)' } }
        : { backgroundColor: 'transparent', '& .rail-ico': { backgroundColor: 'color-mix(in srgb, var(--ic) 26%, transparent)' } },
    }}>
      <Box className="rail-ico" sx={{ position: 'relative', width: 34, height: 34, flexShrink: 0, borderRadius: '9px', display: 'grid', placeItems: 'center', color: 'var(--ic)', backgroundColor: 'rgba(255,255,255,.06)', filter: 'brightness(1.18) saturate(1.15)', '& .MuiSvgIcon-root': { fontSize: 19 } }}>
        {icon}{!open && badge ? <CountDot count={badge.count} tone={badge.tone} /> : null}
      </Box>
      {open ? (<>
        <Typography noWrap sx={{ flex: 1, fontSize: 11, fontWeight: 600, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'inherit' }}>{label}</Typography>
        {badge ? <CountBadge count={badge.count} tone={badge.tone} /> : null}
      </>) : null}
    </ListItemButton>
  );
}

/** Live counts for the rail badges: meetings and action items from the server, ad-hoc tasks still local. */
export function useRailBadges() {
  const { state } = useAppStore();
  const me = state.viewer.name;
  const upcoming = useListMeetingsQuery({ status: 'upcoming', limit: 1, fields: 'title' }).data?.total ?? 0;
  const mine = useListActionItemsQuery({ mine: 'true', status: 'open,in-progress,blocked', limit: 200, fields: 'deadline' }).data;
  let open = mine?.total ?? 0;
  let overdue = (mine?.items || []).filter(a => isOverdue(a.deadline)).length;
  state.standaloneTasks.forEach(t => { if (t.owner === me && t.status !== 'done') { open++; if (isOverdue(t.deadline)) overdue++; } });
  return { meetings: { count: upcoming, tone: 'ok' }, todo: { count: open, tone: overdue ? 'warn' : 'ok' } };
}

/** The nav list (shared by the desktop rail and the phone drawer). */
export function RailNav({ open, onNavigate }) {
  const badges = useRailBadges();
  const { me } = useViewerUser();
  const groups = NAV_GROUPS.map(([g, items]) => [g, items.filter(it => hasModule(me, it.module))]).filter(([, items]) => items.length);
  return (
    <>
      {groups.map(([group, items]) => (
        <Box key={group || 'top'}>
          <RailGroup label={group} open={open} />
          <List disablePadding>
            {items.map(it => <RailLink key={it.to} {...it} badge={it.badgeKey ? badges[it.badgeKey] : undefined} open={open} onClick={onNavigate} />)}
          </List>
        </Box>
      ))}
    </>
  );
}

/** Desktop rail: 258px, collapses to 66px icons when unpinned; hover opens it; pin remembered. */
export default function DesktopRail() {
  const [pinned, setPinned] = useState(readPinned);
  const [hover, setHover] = useState(false);
  const open = pinned || hover;
  const togglePin = () => {
    setPinned(p => { try { localStorage.setItem(PIN_KEY, p ? '0' : '1'); } catch { /* storage blocked */ } return !p; });
    setHover(false);
  };
  return (
    <Box sx={{ width: pinned ? RAIL_WIDTH : RAIL_COLLAPSED, flexShrink: 0, transition: 'width .16s ease' }}>
      <Box component="nav" aria-label="Main menu" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1200, width: open ? RAIL_WIDTH : RAIL_COLLAPSED, transition: 'width .16s ease', overflow: 'hidden', background: RAIL_BG, color: tokens.railInk, display: 'flex', flexDirection: 'column',
          boxShadow: hover && !pinned ? '6px 0 24px rgba(16,21,28,.22)' : '2px 0 16px -8px rgba(0,0,0,.45), inset -1px 0 0 rgba(255,255,255,.055)' }}>
        <Stack direction="row" sx={{ height: TOPBAR_HEIGHT, px: open ? 1.75 : 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexShrink: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.018))', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
          {open ? <Brand /> : <LogoTile size={40} />}
          {open ? (
            <IconButton size="small" onClick={togglePin} aria-pressed={pinned} aria-label={pinned ? 'Unpin menu (collapse to icons)' : 'Pin menu open'} title={pinned ? 'Collapse menu' : 'Keep menu open'}
              sx={{ color: pinned ? tokens.gold : tokens.railMuted, transform: pinned ? 'rotate(45deg)' : 'none', transition: 'transform .15s ease, color .12s ease', '&:hover': { color: tokens.gold, bgcolor: 'rgba(255,255,255,.07)' } }}>
              <PushPinOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.25, pt: 1.5, pb: 1 }}>
          <RailNav open={open} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,.09)', color: tokens.railMuted, fontFamily: fonts.mono, fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} />
          {open ? <span>MyDiary · TrustLab</span> : null}
        </Stack>
      </Box>
    </Box>
  );
}
