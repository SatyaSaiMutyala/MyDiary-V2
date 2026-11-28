import { useMemo, useState } from 'react';
import { Box, ButtonBase, ClickAwayListener, Popper } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';
import { initials } from '../utils/people';

/**
 * Several colleagues, picked from the real staff list.
 *
 * Typed names were the problem this replaces. A meeting's attendees, a visit's team and a project's
 * members are all matched back to accounts by name, so "N. Sharma (CFO)" typed into a box is a
 * person who does not exist: they are never shown the meeting and never notified about it, and
 * nothing looks wrong until somebody asks why they did not turn up. Picking from the directory means
 * every name stored is an account that can be found again.
 *
 * Adding stays open, because adding one person is rare and reopening for each is tedious; a name
 * already on the list shows a tick and clicking it takes them off again.
 *
 * @param {object} props
 * @param {string[]} props.value names already chosen
 * @param {(names: string[]) => void} props.onChange
 * @param {{ id: string, name: string, title?: string, department?: string }[]} props.people the directory
 * @param {string} [props.me] the signed-in person, shown first and marked
 * @param {boolean} [props.loading]
 * @param {string} [props.placeholder]
 * @param {string} [props.emptyNote] what to say when the directory is empty
 */
export default function PeoplePicker({ value = [], onChange, people = [], me, loading = false, placeholder = 'Add an employee…', emptyNote = 'No other people yet.' }) {
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const chosen = useMemo(() => new Set(value), [value]);

  /** Me first — adding yourself to your own meeting is the common case — then everyone by department. */
  const { mine, groups, matches } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (p) => !needle || [p.name, p.title, p.department].some((f) => (f ?? '').toLowerCase().includes(needle));
    const all = people.filter(hit);
    const mineRow = me ? all.find((p) => p.name === me) ?? (hit({ name: me }) ? { id: 'me', name: me } : null) : null;
    const by = new Map();
    for (const p of all) {
      if (me && p.name === me) continue;
      const key = p.department || 'No department';
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(p);
    }
    return { mine: mineRow, groups: [...by.entries()].sort(([a], [b]) => a.localeCompare(b)), matches: all.length };
  }, [people, q, me]);

  const toggle = (name) => onChange(chosen.has(name) ? value.filter((n) => n !== name) : [...value, name]);
  const close = () => { setOpen(false); setQ(''); };

  return (
    <ClickAwayListener onClickAway={close}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box component={ButtonBase} ref={setAnchor} type="button" aria-haspopup="listbox" aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
          sx={{
            width: '100%', minHeight: 38, p: '0 10px', gap: '8px', border: `1px solid ${open ? tokens.teal : tokens.line}`,
            borderRadius: '6px', bgcolor: tokens.card, fontFamily: 'inherit', fontSize: 13, color: tokens.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', cursor: 'pointer',
            boxSizing: 'border-box', transition: 'border-color .12s ease', '&:hover': { borderColor: tokens.teal },
          }}>
          <Box component="span" sx={{ fontSize: 15, color: tokens.teal, fontWeight: 700, lineHeight: 1 }}>+</Box>
          <Box sx={{ flex: 1, minWidth: 0, color: tokens.slate }}>{placeholder}</Box>
          <Box component="span" sx={{ fontSize: 10, color: tokens.faint, flexShrink: 0 }}>▼</Box>
        </Box>

        <Popper open={open} anchorEl={anchor} placement="bottom-start" style={{ zIndex: 1500 }}>
          <Box sx={{ width: anchor?.offsetWidth ?? 320, mt: '6px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', boxShadow: tokens.shadowLg, overflow: 'hidden' }}>
            <Box sx={{ p: '8px', borderBottom: `1px solid ${tokens.line}` }}>
              <Box component="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, role or department"
                onKeyDown={(e) => { if (e.key === 'Escape') { if (q) setQ(''); else close(); } }}
                sx={{ width: '100%', height: 32, p: '0 10px', fontSize: 12.5, fontFamily: 'inherit', border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.cream, color: tokens.ink, boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: tokens.card } }} />
            </Box>

            <Box sx={{ maxHeight: 300, overflowY: 'auto', p: '5px' }}>
              {loading && <Note>Loading people…</Note>}
              {!loading && people.length === 0 && <Note>{emptyNote}</Note>}
              {!loading && people.length > 0 && matches === 0 && <Note>Nobody matches “{q.trim()}”.</Note>}

              {mine && <Row name={mine.name} label={`Myself · ${mine.name}`} meta="You are organising this" mine picked={chosen.has(mine.name)} onClick={() => toggle(mine.name)} />}

              {groups.map(([dept, members]) => (
                <Box key={dept}>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.faint, p: '10px 9px 4px', fontWeight: 700 }}>{dept} · {members.length}</Box>
                  {members.map((p) => (
                    <Row key={p.id} name={p.name} label={p.name} meta={p.title || 'No title'} picked={chosen.has(p.name)} onClick={() => toggle(p.name)} />
                  ))}
                </Box>
              ))}
            </Box>

            <Box sx={{ p: '8px 12px', borderTop: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, bgcolor: tokens.cream }}>
              <Box sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.06em', color: tokens.slate, fontWeight: 700 }}>{value.length} added</Box>
              <Box component={ButtonBase} type="button" onClick={close} sx={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: tokens.teal, p: '4px 8px', borderRadius: '5px', '&:hover': { bgcolor: tokens.tealSofter } }}>Done</Box>
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

/** One person in the list; a tick means they are already on it, and clicking takes them off. */
function Row({ name, label, meta, mine = false, picked, onClick }) {
  return (
    <Box component={ButtonBase} type="button" onClick={onClick}
      sx={{ width: '100%', p: '7px 9px', gap: '9px', borderRadius: '7px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontFamily: 'inherit', bgcolor: picked ? tokens.tealSofter : 'transparent', '&:hover': { bgcolor: picked ? tokens.tealSoft : tokens.cream } }}>
      <Box sx={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 9.5, fontWeight: 700, bgcolor: mine ? tokens.yellowSoft : tokens.tealSoft, color: mine ? tokens.amber : tokens.tealDark }}>{initials(name)}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
        <Box sx={{ fontSize: 11, color: tokens.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</Box>
      </Box>
      <Box component="span" sx={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: picked ? tokens.tealDark : tokens.faint }}>{picked ? '✓' : '+'}</Box>
    </Box>
  );
}

const Note = ({ children }) => <Box sx={{ p: '14px 10px', fontSize: 12, color: tokens.faint, textAlign: 'center' }}>{children}</Box>;
