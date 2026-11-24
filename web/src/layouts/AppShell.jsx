import { useState, useEffect, useRef } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import DesktopRail from './Sidebar';
import Topbar from './Topbar';
import PhoneChrome from './PhoneChrome';
import CommandPalette from '../features/CommandPalette';
import SpectatorBar from '../features/SpectatorBar';
import { DESKTOP_MIN, tokens } from '../theme/tokens';

/** GateBook shell: desktop rail + 60px top bar at ≥861px; dark app bar + bottom tabs on phones. */
export default function AppShell() {
  const desktop = useMediaQuery(`(min-width:${DESKTOP_MIN}px)`, { noSsr: true });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100dvh', bgcolor: tokens.cream, overflow: 'hidden' }}>
      {desktop ? <DesktopRail /> : null}
      {/* The page scrolls inside this column (not the body), with overscroll bounce switched off. */}
      <Box ref={scrollRef} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100dvh', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}>
        {desktop ? <Topbar /> : <PhoneChrome />}
        {/* Only shows while an admin is watching someone else's MyDiary. */}
        <SpectatorBar />
        <Box component="main" sx={{ flex: 1, width: '100%', maxWidth: 1600, mx: 'auto', px: { xs: 1.75, md: 2.5 }, pt: { xs: 2, md: 2.5 }, pb: { xs: 'calc(96px + env(safe-area-inset-bottom))', md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  );
}
