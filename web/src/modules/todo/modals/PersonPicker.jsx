import { useMemo, useState } from 'react';
import { Box, ButtonBase, ClickAwayListener, Popper } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { initials } from '../../../utils/people';

/**
 * Who a task is going to.
 *
 * A plain `<select>` leaves this to the operating system, which draws a bare list of names in
 * whatever font it likes — no titles, no departments, nothing to tell two people apart by. On a
 * long staff list that is a guessing game, so the list is drawn here: each person with their
 * initials, their title and their department, under their department's heading, with a search box
 * once there are enough of them to need one.
 *
 * @param {object} props
 * @param {string} props.value the chosen person's name; '' means the signed-in person
 * @param {(name: string) => void} props.onChange
 * @param {{ id: string, name: string, title?: string, department?: string }[]} props.people everybody else
 * @param {string} props.me the signed-in person's name
 * @param {boolean} [props.loading]
 */
export default function PersonPicker({ value, onChange, people = [], me, loading = false }) {
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = people.filter((p) =>
      !needle || [p.name, p.title, p.department].some((f) => (f ?? '').toLowerCase().includes(needle)));
    const by = new Map();
    for (const p of matches) {
      const key = p.department || 'No department';
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(p);
    }
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [people, q]);

  const chosen = value ? people.find((p) => p.name === value) : null;
  const close = () => { setOpen(false); setQ(''); };
  const choose = (name) => { onChange(name); close(); };

  return (
    <ClickAwayListener onClickAway={close}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box
          component={ButtonBase}
          ref={setAnchor}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          sx={{
            width: '100%', height: 40, p: '0 10px', gap: '9px',
            border: `1px solid ${open ? tokens.teal : tokens.line}`,
            borderRadius: '6px', bgcolor: tokens.card, fontFamily: 'inherit', fontSize: 13,
            color: tokens.ink, display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box',
            transition: 'border-color .12s ease, box-shadow .12s ease',
            '&:hover': { borderColor: tokens.teal },
          }}
        >
          <Avatar name={chosen ? chosen.name : me} mine={!chosen} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chosen ? chosen.name : `Myself · ${me}`}
            </Box>
          </Box>
          <Box component="span" sx={{ fontSize: 10, color: tokens.faint, flexShrink: 0 }}>▼</Box>
        </Box>

        <Popper open={open} anchorEl={anchor} placement="bottom-start" style={{ zIndex: 1500 }}>
          <Box
            sx={{
              width: anchor?.offsetWidth ?? 300, mt: '6px', bgcolor: tokens.card,
              border: `1px solid ${tokens.line}`, borderRadius: '10px', boxShadow: tokens.shadowLg, overflow: 'hidden',
            }}
          >
            {people.length > 6 && (
              <Box sx={{ p: '8px', borderBottom: `1px solid ${tokens.line}` }}>
                <Box
                  component="input"
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, role or department"
                  sx={{
                    width: '100%', height: 32, p: '0 10px', fontSize: 12.5, fontFamily: 'inherit',
                    border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.cream,
                    color: tokens.ink, boxSizing: 'border-box',
                    '&:focus': { outline: 'none', borderColor: tokens.teal, bgcolor: tokens.card },
                  }}
                />
              </Box>
            )}

            <Box sx={{ maxHeight: 290, overflowY: 'auto', p: '5px' }}>
              <Row
                name={me}
                label={`Myself · ${me}`}
                meta="The task stays on your own list"
                mine
                selected={!value}
                onClick={() => choose('')}
              />

              {loading && <Note>Loading people…</Note>}
              {!loading && people.length === 0 && <Note>No one else to allocate to yet.</Note>}
              {!loading && people.length > 0 && groups.length === 0 && <Note>Nobody matches “{q}”.</Note>}

              {groups.map(([dept, members]) => (
                <Box key={dept}>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.faint, p: '10px 9px 4px', fontWeight: 700 }}>
                    {dept} · {members.length}
                  </Box>
                  {members.map((p) => (
                    <Row
                      key={p.id}
                      name={p.name}
                      label={p.name}
                      meta={p.title || 'No title'}
                      selected={value === p.name}
                      onClick={() => choose(p.name)}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

/** One person in the list. */
function Row({ name, label, meta, mine = false, selected, onClick }) {
  return (
    <Box
      component={ButtonBase}
      type="button"
      onClick={onClick}
      sx={{
        width: '100%', p: '7px 9px', gap: '9px', borderRadius: '7px', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontFamily: 'inherit',
        bgcolor: selected ? tokens.tealSofter : 'transparent',
        '&:hover': { bgcolor: selected ? tokens.tealSofter : tokens.cream },
      }}
    >
      <Avatar name={name} mine={mine} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
        <Box sx={{ fontSize: 11, color: tokens.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</Box>
      </Box>
      {selected && <Box component="span" sx={{ color: tokens.tealDark, fontSize: 13, flexShrink: 0 }}>✓</Box>}
    </Box>
  );
}

function Avatar({ name, mine }) {
  return (
    <Box
      sx={{
        width: 26, height: 26, flexShrink: 0, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 9.5,
        fontWeight: 700, letterSpacing: '0.02em',
        bgcolor: mine ? tokens.yellowSoft : tokens.tealSoft,
        color: mine ? tokens.amber : tokens.tealDark,
      }}
    >
      {mine ? '⚡' : initials(name)}
    </Box>
  );
}

const Note = ({ children }) => (
  <Box sx={{ p: '14px 10px', fontSize: 12, color: tokens.faint, textAlign: 'center' }}>{children}</Box>
);
