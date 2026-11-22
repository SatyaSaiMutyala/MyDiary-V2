import { useState } from 'react';
import { Box, ButtonBase, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { fonts, TOPBAR_HEIGHT, tokens } from '../theme/tokens';
import { useCrumbsValue } from '../store/CrumbsContext';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthContext';
import { useListNotificationsQuery } from '../store/api/notificationsApi';
import { TODAY } from '../utils/dates';
import { initials } from '../utils/people';
import { viewerRole } from '../data/users';
import NotificationsBell from '../features/NotificationsPanel';
import ViewAsSwitcher from '../features/ViewAsSwitcher';
import { CRUMBS } from './navItems';

/** AIMS top-bar icon button (34px, hairline border) — also used by the notifications bell. */
export const toolBtn = { width: 34, height: 34, borderRadius: '6px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, color: tokens.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, position: 'relative', fontFamily: 'inherit', transition: 'background-color .12s ease', '&:hover': { bgcolor: tokens.tealSoft } };

/** Avatar initials with the gold ring; user chip + account menu (My account · Notifications · Sign out). */
export function UserMenu() {
  const { state } = useAppStore();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  // The signed-in person (from the API) is the source of truth for the chip; View-as only changes the viewer.
  const name = user?.name || state.viewer.name; const role = user ? viewerRole(user) : state.viewer.role;
  const viewingAs = state.viewer.name !== name ? state.viewer : null;
  // Unread count comes from the server (same list the bell panel shows).
  const unread = useListNotificationsQuery({ unread: 'true', limit: 1 }).data?.unreadTotal ?? 0;
  const avatar = (size) => (
    <Box aria-hidden sx={{ width: size, height: size, borderRadius: '50%', bgcolor: tokens.teal, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${tokens.gold}` }}>{initials(name)}</Box>
  );
  const go = (to) => { setAnchor(null); navigate(to); };
  return (
    <>
      <ButtonBase onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" aria-label={`Account menu, ${name}`} sx={{ gap: 1, pl: 0.75, pr: 1.5, py: 0.5, borderRadius: '14px', bgcolor: tokens.tealSoft, border: '1px solid rgba(15,118,110,.28)', '&:hover': { borderColor: tokens.teal } }}>
        {avatar(30)}
        <Box sx={{ textAlign: 'left', display: { xs: 'none', lg: 'block' } }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} noWrap>{name}</Typography>
          <Typography sx={{ fontSize: 11, color: tokens.faint, lineHeight: 1.2 }} noWrap>{role}</Typography>
        </Box>
        <KeyboardArrowDownIcon sx={{ fontSize: 18, color: tokens.muted }} />
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 300, borderRadius: '18px', boxShadow: '0 18px 46px rgba(16,21,28,.16)' } } }}>
        <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, alignItems: 'center' }}>
          {avatar(48)}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }} noWrap>{name}</Typography>
            <Typography sx={{ fontSize: 12, color: tokens.faint }} noWrap>{role}</Typography>
            {user?.email ? <Typography sx={{ fontSize: 12, color: tokens.faint }} noWrap>{user.email}</Typography> : null}
          </Box>
        </Stack>
        {viewingAs ? <Typography sx={{ px: 2.5, pb: 1.5, fontSize: 12, color: tokens.warn }}>Viewing as {viewingAs.name} ({viewingAs.role}) — demo switch</Typography> : null}
        <Divider />
        <MenuItem onClick={() => go('/settings?tab=account')} sx={{ py: 1.25, px: 2.5, gap: 1.5 }}><PersonOutlineIcon sx={{ fontSize: 18, color: tokens.teal }} />My account & settings</MenuItem>
        <MenuItem onClick={() => go('/settings?tab=activity')} sx={{ py: 1.25, px: 2.5, gap: 1.5 }}>
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 18, color: tokens.teal }} /><Box sx={{ flex: 1 }}>Notifications</Box>
          {unread ? <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11, px: 1, borderRadius: '20px', bgcolor: tokens.badSoft, color: tokens.bad }}>{unread}</Box> : null}
        </MenuItem>
        <Divider />
        <MenuItem onClick={async () => { setAnchor(null); await logout(); navigate('/login'); }} sx={{ py: 1.25, px: 2.5, gap: 1.5, color: tokens.bad, '&:hover': { bgcolor: tokens.badSoft } }}><LogoutIcon sx={{ fontSize: 18 }} />Sign out</MenuItem>
      </Menu>
    </>
  );
}

/** Resolve breadcrumb: page-published crumbs win; otherwise the route map. Returns [{label,to?}...] */
export function useCrumbItems() {
  const crumbs = useCrumbsValue();
  const { pathname } = useLocation();
  if (crumbs.length) return crumbs;
  const key = Object.keys(CRUMBS).filter(k => pathname === k || (k !== '/' && pathname.startsWith(`${k}/`))).sort((a, b) => b.length - a.length)[0];
  const [group, page] = CRUMBS[key] ?? ['', 'MyDiary'];
  return group ? [{ label: group }, { label: page }] : [{ label: page }];
}

/** Desktop top bar (AIMS topbar): breadcrumb · date · ⌘ · view-as · bell · user chip. 60px, sticky, white. */
export default function Topbar() {
  const items = useCrumbItems();
  const navigate = useNavigate();
  const today = TODAY.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 1100, height: TOPBAR_HEIGHT, minHeight: TOPBAR_HEIGHT, flexShrink: 0, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: tokens.card, borderBottom: `1px solid ${tokens.line}`, boxShadow: '0 4px 12px -8px rgba(16,21,28,.22)' }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', minWidth: 0 }}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'baseline', minWidth: 0 }}>
              {last ? <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{c.label}</Typography>
                : <Typography onClick={c.to ? () => navigate(c.to) : undefined} sx={{ fontSize: 12.5, color: tokens.faint, cursor: c.to ? 'pointer' : 'default', '&:hover': c.to ? { color: tokens.teal } : {} }} noWrap>{c.label}</Typography>}
              {!last && <Typography sx={{ fontSize: 12.5, color: tokens.faint }}>›</Typography>}
            </Stack>
          );
        })}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: tokens.muted, display: { xs: 'none', lg: 'block' } }}>{today}</Typography>
      <ViewAsSwitcher />
      <NotificationsBell />
      <Box sx={{ width: '1px', height: 26, bgcolor: tokens.line }} />
      <UserMenu />
    </Box>
  );
}
