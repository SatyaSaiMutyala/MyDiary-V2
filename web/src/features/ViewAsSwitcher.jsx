import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ClickAwayListener } from '@mui/material';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthContext';
import { viewerRole } from '../data/users';
import { useListUsersQuery } from '../store/api/usersApi';
import { errorMessage } from '../store/api/baseApi';
import { initials, ownerAvatarColor } from '../utils/people';
import { useDebounced } from '../utils/useDebounced';
import { tokens, fonts } from '../theme/tokens';

const vadHead = { p: '12px 16px', borderBottom: `1px solid ${tokens.line}`, fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, bgcolor: tokens.creamWarm };
const groupHead = { ...vadHead, p: '8px 14px 2px', fontSize: 9, borderBottom: 'none', bgcolor: 'transparent' };
const noteRow = { p: '24px 16px', textAlign: 'center', fontSize: 12.5, color: tokens.slate };

/** .vad-opt row — avatar · name · role pill · ✓ when current */
function Opt({ name, label, role, current, onClick }) {
  return (
    <Box onClick={onClick} sx={{ p: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 13, transition: 'background 0.1s', bgcolor: current ? tokens.tealSoft : 'transparent', '&:hover': { bgcolor: current ? tokens.tealSoft : tokens.tealSofter } }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: ownerAvatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{initials(name)}</Box>
      <Box sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || name}</Box>
      {role ? <Box sx={{ fontSize: 9, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: tokens.creamWarm, p: '2px 6px', borderRadius: '8px', fontWeight: 700, flexShrink: 0 }}>{role}</Box> : null}
      {current && <Box component="span" sx={{ ml: 'auto', color: tokens.tealDark, fontWeight: 700 }}>✓</Box>}
    </Box>
  );
}

/**
 * .view-as-chip + .view-as-dropdown — look at the whole app through another person's eyes.
 *
 * Picking someone switches every screen to their data (the API swaps the user behind each read —
 * see features/spectate.js), and it is read-only: the server refuses any write made while watching.
 *
 * Admins only: the list comes from GET /api/users, which the API itself restricts to admins, so for
 * anyone else this renders nothing rather than showing a control that would only ever 403. The people
 * listed are the real accounts on this installation (active ones, grouped by department) — not the
 * bundled sample roster, which is why someone you have just created appears here straight away.
 */
export default function ViewAsSwitcher() {
  const { state, setViewer } = useAppStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 250);
  const boxRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  // Only ask the server once the panel is actually opened.
  // The search goes to the server rather than filtering what arrived: on an installation with more
  // people than one page holds, filtering the page would quietly hide the person being looked for.
  const { data, isLoading, isFetching, error } = useListUsersQuery(
    { limit: 200, sort: 'name', status: 'active', search, fields: 'name,title,department,role,modules,status' },
    { skip: !open || !isAdmin },
  );

  // Opening the panel puts the cursor in the search box.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => boxRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  /** Closing forgets what was typed, so the panel opens clean next time. */
  const close = () => { setOpen(false); setQ(''); };

  const viewer = state.viewer;
  const ME = { name: user?.name || viewer.name, role: viewerRole(user) || viewer.role, short: user?.title || 'Me' };
  const isMe = viewer.name === ME.name;

  const rows = useMemo(() => (data?.items ?? []).filter((u) => u.name !== ME.name), [data, ME.name]);
  const searching = Boolean(search);

  /** Everyone but me, gathered under their department heading. */
  const groups = useMemo(() => {
    /** @type {Map<string, typeof rows>} */
    const byDept = new Map();
    for (const u of rows) {
      const key = u.department || 'Other';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key).push(u);
    }
    return [...byDept.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (!isAdmin) return null;

  const pick = (name, role, record) => { setViewer(name, role, record); close(); };

  return (
    <ClickAwayListener onClickAway={close}>
      <Box sx={{ position: 'relative' }}>
        <Box component="button" type="button" id="view-as-chip" onClick={() => (open ? close() : setOpen(true))} title={isMe ? 'See MyDiary as another user' : `Seeing MyDiary as ${viewer.name} — click to switch back`} aria-label="View as"
          sx={{ width: 34, height: 34, borderRadius: '6px', bgcolor: isMe ? tokens.card : tokens.gold, border: `1px solid ${isMe ? tokens.line : tokens.gold}`, color: tokens.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', '&:hover': { bgcolor: isMe ? tokens.tealSoft : tokens.gold } }}>
          <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />
        </Box>

        {open && (
          <Box onClick={(e) => e.stopPropagation()}
            sx={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 420, bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', boxShadow: tokens.shadowLg, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={vadHead}>See MyDiary as another TrustLab user · read-only</Box>
            <Box sx={{ p: '10px 12px', borderBottom: `1px solid ${tokens.line}` }}>
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <SearchOutlinedIcon sx={{ position: 'absolute', left: 9, fontSize: 16, color: tokens.slateSoft, pointerEvents: 'none' }} />
                <Box component="input" ref={boxRef} type="text" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, role or department"
                  onKeyDown={(e) => { if (e.key === 'Escape') { if (q) setQ(''); else close(); } }}
                  sx={{ width: '100%', height: 34, p: '0 30px 0 30px', border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.cream, fontSize: 13, fontFamily: 'inherit', color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: tokens.card } }} />
                {q ? (
                  <Box component="button" type="button" onClick={() => { setQ(''); boxRef.current?.focus(); }} aria-label="Clear search"
                    sx={{ position: 'absolute', right: 6, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', bgcolor: 'transparent', color: tokens.slateSoft, cursor: 'pointer', fontSize: 15, lineHeight: 1, borderRadius: '4px', '&:hover': { color: tokens.ink, bgcolor: tokens.creamWarm } }}>×</Box>
                ) : null}
              </Box>
            </Box>
            <Box sx={{ overflowY: 'auto', maxHeight: 320, p: '4px 0' }}>
              {/* Myself stays out of the way of a search: looking someone up should not have the
                  person doing the looking at the top of the results. */}
              {!searching && <Opt name={ME.name} label={`Myself (${ME.name})`} role={ME.short} current={isMe} onClick={() => pick(ME.name, ME.role, null)} />}

              {error ? (
                <Box sx={{ ...noteRow, color: tokens.bad }}>{errorMessage(error)}</Box>
              ) : isLoading ? (
                <Box sx={noteRow}>Loading people…</Box>
              ) : rows.length === 0 ? (
                <Box sx={noteRow}>{searching ? <>Nobody matches “{search}”.</> : 'No other active users yet. Add people in Settings → Users.'}</Box>
              ) : searching ? (
                // A search is answered as one ranked list; department headings over one name each
                // are more to read, not less.
                <Box sx={{ opacity: isFetching ? 0.55 : 1, transition: 'opacity .12s' }}>
                  {rows.map((p) => (
                    <Opt key={p.id} name={p.name} label={p.department ? `${p.name} · ${p.department}` : p.name} role={p.title || p.role} current={viewer.name === p.name} onClick={() => pick(p.name, p.title || p.role, p)} />
                  ))}
                </Box>
              ) : (
                groups.map(([dept, people]) => (
                  <Box key={dept}>
                    <Box sx={groupHead}>{dept}</Box>
                    {people.map((p) => (
                      <Opt key={p.id} name={p.name} role={p.title || p.role} current={viewer.name === p.name} onClick={() => pick(p.name, p.title || p.role, p)} />
                    ))}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
