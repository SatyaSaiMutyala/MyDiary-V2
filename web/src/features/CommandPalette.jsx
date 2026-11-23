import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, InputBase, Modal } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppStore';
import { TYPES } from '../data/meetings';
import { EMPLOYEES } from '../data/employees';
import { formatDate, parseDate } from '../utils/dates';
import { tokens, fonts } from '../theme/tokens';
import { useAuth } from '../auth/AuthContext';
import { useDebounced } from '../utils/useDebounced';
import { useSearchQuery } from '../store/api/searchApi';
import { errorMessage } from '../store/api/baseApi';
import { useDialog } from '../components/Dialogs';

const SERVER_ICON = { users: '👤', audit: '🧾' };

/** <kbd> chip inside .cmd-hint */
function Kbd({ children }) {
  const dlg = useDialog();
  return <Box component="kbd" sx={{ bgcolor: tokens.card, p: '2px 6px', borderRadius: '3px', border: `1px solid ${tokens.line}`, fontFamily: 'inherit', fontSize: 10 }}>{children}</Box>;
}

/**
 * .cmd-palette-bg / .cmd-palette — ⌘K command palette (prototype openCmdPalette / renderCmdResults / cmdPaletteKey).
 * props: open, onClose
 */
export default function CommandPalette({ open, onClose }) {
  const { state } = useAppStore();
  const { status } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  // Server group: GET /api/search?q= once typing pauses for 250 ms.
  const serverQ = useDebounced(q.trim(), 250);
  const { data: server, error: serverError, isFetching: serverBusy } = useSearchQuery({ q: serverQ, limit: 5 }, { skip: !open || !serverQ || status !== 'signedIn' });
  const [focus, setFocus] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // openCmdPalette(): clear input, reset focus, focus the input after 50ms
  useEffect(() => {
    if (!open) return;
    setQ(''); setFocus(0);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const go = (to, opts) => navigate(to, opts);

  const items = useMemo(() => {
    const query = q.toLowerCase().trim();
    const out = [];
    // Server (API) results first, with their routes
    if (query) {
      if (server?.q === serverQ) {
        server.groups.forEach(g => g.items.forEach(it => out.push({ label: it.title, sub: [g.label, it.subtitle].filter(Boolean).join(' · '), ico: SERVER_ICON[g.key] || '🔎', do: () => go(it.route), group: 'Server' })));
      }
      if (serverError) out.push({ label: errorMessage(serverError), sub: 'Server', ico: '⚠', disabled: true, group: 'Server' });
      else if (serverBusy || serverQ !== query) out.push({ label: 'Searching the server…', sub: 'Server', ico: '…', disabled: true, group: 'Server' });
    }
    // Navigation
    [
      { label: 'Go to Dashboard', sub: 'View', ico: '📊', do: () => go('/') },
      { label: 'Go to My Meetings', sub: 'View', ico: '👥', do: () => go('/meetings') },
      { label: 'Go to My To-Do', sub: 'View', ico: '✅', do: () => go('/todo') },
      { label: 'New Ad-hoc Task', sub: 'Allocate', ico: '⚡', do: () => go('/todo', { state: { openStandaloneTask: true } }) },
      { label: 'Go to Decisions', sub: 'View', ico: '⚖', do: () => go('/decisions') },
      { label: 'Go to Templates', sub: 'View', ico: '📋', do: () => go('/templates') },
      { label: 'Go to Integrations', sub: 'View', ico: '🔗', do: () => go('/integrations') },
      { label: 'Schedule New Meeting', sub: 'Action', ico: '➕', do: () => go('/meetings/new') },
    ].forEach(x => {
      if (!query || x.label.toLowerCase().includes(query) || x.sub.toLowerCase().includes(query)) out.push({ ...x, group: 'Jump to' });
    });
    // Meetings
    state.meetings.forEach(m => {
      if (!query || m.title.toLowerCase().includes(query) || m.type.includes(query)) {
        const T = TYPES[m.type] || TYPES.other;
        out.push({ label: m.title, sub: T.name + ' · ' + formatDate(parseDate(m.date)), ico: T.icon, do: () => go('/meetings/' + m.id), group: 'Meetings' });
      }
    });
    // Actions
    state.meetings.forEach(m => (m.actions || []).forEach(a => {
      if (query && a.desc.toLowerCase().includes(query)) {
        out.push({ label: a.desc, sub: 'Action · Owner: ' + a.owner + ' · Due ' + a.deadline, ico: '✓', do: () => go('/meetings/' + m.id, { state: { tab: 'actions' } }), group: 'Actions' });
      }
    }));
    // Decisions
    state.decisions.forEach(d => {
      if (query && d.text.toLowerCase().includes(query)) {
        const m = state.meetings.find(x => x.id === d.meetingId);
        out.push({ label: d.text.slice(0, 70) + (d.text.length > 70 ? '…' : ''), sub: 'Decision · ' + (m ? m.title : ''), ico: '⚖', do: () => go('/meetings/' + d.meetingId), group: 'Decisions' });
      }
    });
    // People
    EMPLOYEES.forEach(g => g.people.forEach(p => {
      if (query && (p.name.toLowerCase().includes(query) || p.role.toLowerCase().includes(query))) {
        out.push({ label: p.name, sub: 'Person · ' + p.role, ico: '👤', do: () => dlg.alert('Person profile for ' + p.name + ' — would open their meetings, actions and recent activity.'), group: 'People' });
      }
    }));
    const limit = query ? 30 : 50;
    return out.slice(0, limit);
  }, [q, serverQ, server, serverError, serverBusy, state.meetings, state.decisions, navigate]);

  // Keep focused row visible
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-focused="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [focus, items]);

  const run = (i) => {
    if (items[i] && !items[i].disabled) { items[i].do(); onClose(); }
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') { e.preventDefault(); run(focus); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(f => Math.min(f + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => Math.max(0, f - 1)); }
  };

  let lastGroup = '';

  return (
    <Modal open={open} onClose={onClose}
      sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: '15vh', px: { xs: 1.5, md: 2.5 }, zIndex: 1400 }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(26,58,47,0.5)', backdropFilter: 'blur(4px)' } } }}>
      <Box sx={{ width: 600, maxWidth: '90vw', maxHeight: '70vh', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '14px', boxShadow: tokens.shadowLg, overflow: 'hidden', display: 'flex', flexDirection: 'column', outline: 'none' }}>
        {/* .cmd-input-wrap */}
        <Box sx={{ p: '18px 22px', borderBottom: `1px solid ${tokens.line}`, position: 'relative' }}>
          <Box component="span" sx={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: tokens.slate, pointerEvents: 'none' }}>⌘</Box>
          <InputBase inputRef={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setFocus(0); }} onKeyDown={onKey}
            placeholder="Search the server, meetings, decisions, actions, people, or jump to a view…"
            sx={{ width: '100%', fontSize: 16, fontWeight: 500, color: tokens.ink, fontFamily: 'inherit', '& .MuiInputBase-input': { p: '10px 10px 10px 32px', height: 'auto', '&::placeholder': { color: tokens.slateSoft, opacity: 1 } } }} />
        </Box>
        {/* .cmd-results */}
        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: '8px 0' }}>
          {items.length === 0 ? (
            <Box sx={{ p: '40px 20px', textAlign: 'center', color: tokens.slate, fontSize: 13 }}>No matches. Try a different search.</Box>
          ) : items.map((it, i) => {
            const showGroup = it.group !== lastGroup;
            lastGroup = it.group;
            const focused = i === focus;
            return (
              <Box key={i}>
                {showGroup && <Box sx={{ p: '10px 22px 6px', fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{it.group}</Box>}
                <Box data-focused={focused ? 'true' : 'false'} onClick={() => run(i)} onMouseEnter={() => setFocus(i)}
                  sx={{ p: '10px 22px', cursor: it.disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: 13, color: it.disabled ? tokens.slate : 'inherit', fontStyle: it.disabled ? 'italic' : 'normal', bgcolor: focused && !it.disabled ? tokens.tealSofter : 'transparent', '&:hover': { bgcolor: it.disabled ? 'transparent' : tokens.tealSofter } }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '6px', bgcolor: tokens.creamWarm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{it.ico}</Box>
                  <Box sx={{ flex: 1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</Box>
                  <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0, display: { xs: 'none', sm: 'block' }, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</Box>
                </Box>
              </Box>
            );
          })}
        </Box>
        {/* .cmd-hint */}
        <Box sx={{ p: '10px 22px', fontSize: 11, color: tokens.slate, borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm, fontFamily: fonts.mono, letterSpacing: '0.04em', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          <Box component="span"><Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate</Box>
          <Box component="span"><Kbd>↵</Kbd> to select</Box>
          <Box component="span"><Kbd>esc</Kbd> to close</Box>
        </Box>
      </Box>
    </Modal>
  );
}
