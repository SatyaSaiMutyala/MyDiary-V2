import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useState } from 'react';
import { Box, ClickAwayListener } from '@mui/material';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthContext';
import { viewerRole } from '../data/users';
import { EMPLOYEES } from '../data/employees';
import { initials, ownerAvatarColor } from '../utils/people';
import { tokens, fonts } from '../theme/tokens';

const vadHead = { p: '12px 16px', borderBottom: `1px solid ${tokens.line}`, fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, bgcolor: tokens.creamWarm };

/** .vad-opt row — avatar · name · role pill · ✓ when current */
function Opt({ name, label, role, current, onClick }) {
  return (
    <Box onClick={onClick} sx={{ p: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 13, transition: 'background 0.1s', bgcolor: current ? tokens.tealSoft : 'transparent', '&:hover': { bgcolor: current ? tokens.tealSoft : tokens.tealSofter } }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: ownerAvatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{initials(name)}</Box>
      <Box sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || name}</Box>
      <Box sx={{ fontSize: 9, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: tokens.creamWarm, p: '2px 6px', borderRadius: '8px', fontWeight: 700, flexShrink: 0 }}>{role}</Box>
      {current && <Box component="span" sx={{ ml: 'auto', color: tokens.tealDark, fontWeight: 700 }}>✓</Box>}
    </Box>
  );
}

/** .view-as-chip + .view-as-dropdown (prototype toggleViewAs / setViewer — demo multi-user switcher) */
export default function ViewAsSwitcher() {
  const { state, setViewer } = useAppStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const viewer = state.viewer;
  const ME = { name: user?.name || viewer.name, role: viewerRole(user) || viewer.role, short: user?.title || 'Me' };
  const isMe = viewer.name === ME.name;

  const pick = (name, role) => { setViewer(name, role); setOpen(false); };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative' }}>
        <Box component="button" type="button" id="view-as-chip" onClick={() => setOpen(o => !o)} title={isMe ? 'View as another user (demo)' : `Viewing as ${viewer.name} — click to switch`} aria-label="View as"
          sx={{ width: 34, height: 34, borderRadius: '6px', bgcolor: isMe ? tokens.card : tokens.gold, border: `1px solid ${isMe ? tokens.line : tokens.gold}`, color: tokens.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', '&:hover': { bgcolor: isMe ? tokens.tealSoft : tokens.gold } }}>
          <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />
        </Box>

        {open && (
          <Box onClick={(e) => e.stopPropagation()}
            sx={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 420, bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', boxShadow: tokens.shadowLg, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={vadHead}>View My To-Do as any TDPL employee (demo)</Box>
            <Box sx={{ overflowY: 'auto', maxHeight: 360, p: '4px 0' }}>
              <Opt name={ME.name} label={`Myself (${ME.name})`} role={ME.short} current={isMe} onClick={() => pick(ME.name, ME.role)} />
              {EMPLOYEES.map(g => (
                <Box key={g.group}>
                  <Box sx={{ ...vadHead, p: '8px 14px 2px', fontSize: 9, borderBottom: 'none', bgcolor: 'transparent' }}>{g.group}</Box>
                  {g.people.filter(p => p.name !== ME.name).map(p => (
                    <Opt key={p.name} name={p.name} role={p.role} current={viewer.name === p.name} onClick={() => pick(p.name, p.role)} />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
