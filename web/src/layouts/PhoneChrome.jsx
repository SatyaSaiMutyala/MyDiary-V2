import { useState } from 'react';
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Drawer, IconButton, Stack, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { RAIL_BG, RAIL_WIDTH, tokens } from '../theme/tokens';
import { Brand, RailNav } from './Sidebar';
import NotificationsBell from '../features/NotificationsPanel';

const TABS = [
  { value: '/', label: 'Home', icon: <DashboardOutlinedIcon /> },
  { value: '/meetings', label: 'Meetings', icon: <GroupsOutlinedIcon /> },
  { value: '/todo', label: 'To-Do', icon: <TaskAltOutlinedIcon /> },
  { value: '/diary', label: 'Diary', icon: <CalendarMonthOutlinedIcon /> },
  { value: '/settings', label: 'Account', icon: <PersonOutlineIcon /> },
];

/** Phone layout (< 861px): dark app bar (burger · brand · bell · user) + drawer with the full menu + bottom tabs. */
export default function PhoneChrome() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = TABS.find(t => pathname === t.value || (t.value !== '/' && pathname.startsWith(`${t.value}/`)))?.value ?? false;
  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ background: RAIL_BG, color: tokens.railInk }}>
        <Toolbar sx={{ gap: 1, justifyContent: 'space-between', minHeight: 60, px: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <IconButton onClick={() => setOpen(true)} aria-label="Open menu" sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,.1)' } }}><MenuIcon /></IconButton>
            <Brand compact />
          </Stack>
          <NotificationsBell onRail />
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: RAIL_WIDTH, background: RAIL_BG, color: tokens.railInk } } }}>
        <Box sx={{ px: 1.75, height: 66, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.09)' }}><Brand /></Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.25, pt: 1.5, pb: 2 }}><RailNav open onNavigate={() => setOpen(false)} /></Box>
      </Drawer>
      <Box component="nav" sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, background: 'linear-gradient(180deg, #134A38 0%, #0A2620 100%)', pb: 'env(safe-area-inset-bottom)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <BottomNavigation showLabels value={current} onChange={(_, v) => navigate(v)} sx={{ bgcolor: 'transparent', height: 64 }}>
          {TABS.map(t => <BottomNavigationAction key={t.value} value={t.value} label={t.label} icon={t.icon} />)}
        </BottomNavigation>
      </Box>
    </>
  );
}
