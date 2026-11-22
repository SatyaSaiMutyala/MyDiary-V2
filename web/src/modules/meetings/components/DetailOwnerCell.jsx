import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { EMPLOYEES } from '../../../data/employees';
import { initials, ownerAvatarColor } from '../../../utils/people';

/**
 * renderOwnerCell — combobox for Action Item responsibility.
 *  open / onToggle / onClose are controlled by the pane (only one picker open at a time).
 *  onSelect(name, isExternal)
 */
export default function DetailOwnerCell({ action: a, open, onToggle, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  const isExternal = a.ownerType === 'external';
  const avatarBg = isExternal ? '#2563EB' : ownerAvatarColor(a.owner);

  // Focus the search on open; close on click outside (document listener like the prototype)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('click', onDoc);
    return () => { clearTimeout(t); document.removeEventListener('click', onDoc); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = q.toLowerCase().trim();
  const groups = EMPLOYEES.map(g => ({ group: g.group, people: g.people.filter(p => !query || p.name.toLowerCase().includes(query) || p.role.toLowerCase().includes(query)) })).filter(g => g.people.length);
  const visible = groups.flatMap(g => g.people);
  const showExtCta = query.length > 0;

  const addExternal = () => { const name = q.trim(); if (!name) return; onSelect(name, true); };
  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If exactly one visible employee → select it. Otherwise if there's a query → add as external.
      if (visible.length === 1) onSelect(visible[0].name, false);
      else if (q.trim().length > 0) addExternal();
    } else if (e.key === 'Escape') onClose();
  };

  return (
    <Box ref={ref} sx={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', minWidth: 0 }}>
      <Box component="button" type="button" onClick={() => { setQ(''); onToggle(); }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '7px 10px', border: `1px solid ${open ? tokens.teal : 'transparent'}`, borderRadius: '5px', cursor: 'pointer', bgcolor: open ? '#fff' : 'transparent', boxShadow: open ? `0 0 0 2px ${tokens.tealSoft}` : 'none', width: '100%', minHeight: 34, textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: tokens.ink, transition: 'all 0.1s', minWidth: 0, '&:hover': open ? {} : { borderColor: tokens.line, bgcolor: tokens.cream } }}>
        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{a.ownerShort || '??'}</Box>
        {a.owner ? (
          <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.owner}
            {isExternal && <Box component="span" sx={{ display: 'inline-block', bgcolor: tokens.blueSoft, color: tokens.blue, fontFamily: fonts.mono, fontSize: 8, p: '2px 5px', borderRadius: '8px', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', ml: '4px', verticalAlign: 'middle', flexShrink: 0 }}>Ext</Box>}
          </Box>
        ) : (
          <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tokens.slateSoft, fontStyle: 'italic' }}>— Assign owner —</Box>
        )}
        <Box component="span" sx={{ color: tokens.slateSoft, fontSize: 10, ml: 'auto' }}>▾</Box>
      </Box>

      {open && (
        <Box onClick={(e) => e.stopPropagation()} sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 340, maxWidth: 'calc(100vw - 48px)', maxHeight: 420, bgcolor: '#fff', border: `1px solid ${tokens.line}`, borderRadius: '10px', boxShadow: tokens.shadowLg, zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: '10px', borderBottom: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm, position: 'relative', '&::before': { content: '"🔍"', position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.5, pointerEvents: 'none' } }}>
            <Box component="input" ref={inputRef} type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search TDPL employees or type external name..."
              sx={{ width: '100%', p: '9px 12px 9px 32px', border: `1px solid ${tokens.line}`, borderRadius: '6px', fontSize: 13, bgcolor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', color: tokens.ink, '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: `0 0 0 3px ${tokens.tealSoft}` } }} />
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: '6px 0', maxHeight: 280 }}>
            {groups.map(g => (
              <Box key={g.group}>
                <Box sx={{ p: '10px 14px 4px', fontFamily: fonts.mono, fontSize: 9, color: tokens.slateSoft, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{g.group}</Box>
                {g.people.map(p => {
                  const current = a.owner === p.name && !isExternal;
                  return (
                    <Box key={p.name} onClick={() => onSelect(p.name, false)} sx={{ p: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 13, transition: 'background 0.1s', bgcolor: current ? tokens.tealSoft : 'transparent', '&:hover': { bgcolor: current ? tokens.tealSoft : tokens.tealSofter }, ...(current ? { '&::after': { content: '"✓"', color: tokens.tealDark, fontWeight: 700, ml: 'auto', fontSize: 14 } } : {}) }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: ownerAvatarColor(p.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(p.name)}</Box>
                      <Box sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Box>
                      <Box sx={{ fontSize: 9, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase', bgcolor: tokens.creamWarm, p: '3px 7px', borderRadius: '10px', fontWeight: 700, flexShrink: 0 }}>{p.role}</Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
          {showExtCta && visible.length === 0 && <Box sx={{ p: '16px 14px', textAlign: 'center', fontSize: 12, color: tokens.slate, fontStyle: 'italic' }}>No TDPL employee matches. Add as external?</Box>}
          <Box sx={{ p: '8px 10px 4px', fontSize: 10, color: tokens.slateSoft, fontFamily: fonts.mono, letterSpacing: '0.04em', textAlign: 'center', textTransform: 'uppercase' }}>Can't find them in TDPL?</Box>
          {showExtCta && (
            <Box sx={{ p: '10px', borderTop: `1px solid ${tokens.line}`, bgcolor: tokens.creamWarm }}>
              <Box component="button" type="button" onClick={addExternal} sx={{ width: '100%', p: '10px 12px', bgcolor: tokens.blue, color: '#fff', border: 'none', borderRadius: '6px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, transition: 'all 0.15s', '&:hover': { bgcolor: '#1D4ED8' } }}>
                <span>+</span>
                <Box component="span" sx={{ opacity: 0.8, fontWeight: 600 }}>Add</Box>
                <Box component="span" sx={{ fontWeight: 700 }}>"{q}"</Box>
                <Box component="span" sx={{ opacity: 0.8, fontWeight: 600 }}>as external</Box>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
