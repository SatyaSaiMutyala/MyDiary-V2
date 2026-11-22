import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useState } from 'react';
import { Box, ClickAwayListener, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { toolBtn } from '../layouts/Topbar';
import { TextLink } from '../components';
import { useListNotificationsQuery, useMarkNotificationReadMutation, useReadAllNotificationsMutation } from '../store/api/notificationsApi';
import { errorMessage } from '../store/api/baseApi';
import { relativeTime } from '../utils/dates';
import { tokens, fonts } from '../theme/tokens';
import { RichText } from '../utils/richText.jsx';

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// .notif-icon colours by type (default = amber/yellow-soft)
const ICON_STYLE = {
  action: { bg: tokens.redSoft, color: tokens.red },
  meeting: { bg: tokens.tealSoft, color: tokens.tealDark },
  minutes: { bg: tokens.blueSoft, color: tokens.blue },
};

/**
 * 🔔 .icon-btn-top with .notif-dot + fixed .notif-panel — GET /api/notifications (mine, newest first,
 * with `unreadTotal`), PATCH /:id/read on click and POST /read-all for "Mark all read".
 */
export default function NotificationsBell({ onRail = false }) {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading } = useListNotificationsQuery({ limit: 50, sort: '-createdAt' }, { pollingInterval: 60000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [readAll] = useReadAllNotificationsMutation();

  const notifications = data?.items || [];
  const unreadCount = data?.unreadTotal ?? 0;

  const markAllRead = () => { readAll().unwrap().catch(() => {}); };
  const handleNotif = (n) => { if (n.unread) markRead(n.id).unwrap().catch(() => {}); };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Box component="button" type="button" id="notif-btn" title="Notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} onClick={() => setOpen(o => !o)}
          sx={{ ...toolBtn, ...(onRail ? { width: 40, height: 40, color: tokens.railInk, border: '1px solid rgba(255,255,255,0.16)', bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } } : {}) }}>
          <NotificationsNoneOutlinedIcon sx={{ fontSize: onRail ? 22 : 19 }} />
          {unreadCount > 0 && <Box component="span" sx={{ position: 'absolute', top: -6, right: -6, minWidth: 19, height: 19, px: '5px', borderRadius: '10px', bgcolor: tokens.bad, color: '#fff', border: '2px solid #fff', fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unreadCount > 99 ? '99+' : unreadCount}</Box>}
        </Box>

        {open && (
          <Box sx={{ position: 'fixed', top: 70, right: { xs: 12, sm: 24 }, left: { xs: 12, sm: 'auto' }, width: { xs: 'auto', sm: 400 }, maxHeight: '70vh', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '12px', boxShadow: tokens.shadowLg, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: `${slideIn} 0.2s ease` }}>
            {/* .notif-head */}
            <Box sx={{ p: '16px 18px', borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Notifications</Typography>
              <TextLink onClick={markAllRead}>Mark all read</TextLink>
            </Box>
            {/* .notif-list */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: '4px 0', maxHeight: 500 }}>
              {error ? (
                <Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.bad, fontSize: 13 }}>{errorMessage(error)}</Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.slate, fontSize: 13 }}>{isLoading ? 'Loading…' : 'No notifications'}</Box>
              ) : notifications.map(n => {
                const ic = ICON_STYLE[n.type] || { bg: tokens.yellowSoft, color: tokens.amber };
                return (
                  <Box key={n.id} onClick={() => handleNotif(n)}
                    sx={{ p: '12px 18px', borderBottom: `1px solid ${tokens.lineSoft}`, display: 'flex', gap: '12px', cursor: 'pointer', transition: 'background 0.1s', bgcolor: n.unread ? tokens.tealSofter : 'transparent', '&:hover': { bgcolor: tokens.cream } }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: ic.bg, color: ic.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{n.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ fontSize: 13, lineHeight: 1.4, '& strong': { fontWeight: 700 } }}><RichText text={n.text} /></Box>
                      <Box sx={{ fontSize: 11, color: tokens.slate, mt: '4px', fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{relativeTime(n.time)}</Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
