import { useMemo, useState } from 'react';
import { Box, ButtonBase, ClickAwayListener, Popper } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';
import Btn from './Btn';
import { DAYS, MONTHS, todayStr } from '../utils/dates';

/**
 * The app's date, time and duration fields.
 *
 * These replace `<input type="date">` and `<input type="time">` everywhere. The native controls
 * look different in every browser, cannot be styled to match the rest of the app, and on some of
 * them a date can only be typed rather than picked. These are pickers: a month grid for a date,
 * hour and minute columns for a time.
 *
 * `DurationInput` is the same idea for "how long?": the old duration dropdowns began at 30
 * minutes, so a 5- or 15-minute agenda line could not be picked at all, and agenda rows were bare
 * text boxes where '15m' had to be typed by hand.
 *
 * All three keep the same contract as the inputs they replace — `value` is 'YYYY-MM-DD' or 'HH:MM',
 * and `onChange` receives an event-shaped `{ target: { value } }` — so a call site only changes
 * its element name, and an empty string still means "not set".
 */

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** 'YYYY-MM-DD' → 'Tue 24 Nov 2026', the way the rest of the app prints a date. */
function prettyDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]} ${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** 'HH:MM' → '2:30 PM'. */
function prettyTime(value) {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

const fieldSx = (open, disabled) => ({
  width: '100%',
  minHeight: 36,
  p: '8px 10px',
  border: `1px solid ${open ? tokens.teal : tokens.line}`,
  borderRadius: '6px',
  bgcolor: disabled ? tokens.sunk : tokens.card,
  fontSize: 13,
  fontFamily: 'inherit',
  color: tokens.ink,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  cursor: disabled ? 'default' : 'pointer',
  textAlign: 'left',
  transition: 'box-shadow .12s ease, border-color .12s ease',
  ...(open ? { boxShadow: '0 0 0 3px rgba(15,118,110,.12)' } : {}),
  '&:hover': disabled ? {} : { borderColor: open ? tokens.teal : tokens.faint },
});

const panelSx = {
  bgcolor: tokens.card,
  border: `1px solid ${tokens.line}`,
  borderRadius: '10px',
  boxShadow: tokens.shadowLg,
  p: '12px',
  zIndex: 1400,
};

/** The field itself: a button that shows the value and opens the panel. */
function PickerField({ open, disabled, glyph, text, placeholder, onToggle, anchorRef, sx }) {
  return (
    <Box
      component={ButtonBase}
      ref={anchorRef}
      aria-haspopup="dialog"
      aria-expanded={open}
      type="button"
      disabled={disabled}
      onClick={onToggle}
      sx={{ ...fieldSx(open, disabled), ...sx }}
    >
      <Box component="span" sx={{ color: text ? tokens.ink : tokens.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text || placeholder}
      </Box>
      <Box component="span" sx={{ fontSize: 13, opacity: 0.6, flexShrink: 0 }}>{glyph}</Box>
    </Box>
  );
}

/**
 * A date field. `min` and `max` ('YYYY-MM-DD') grey out days outside the range, the way the
 * native input's own min/max did.
 */
export function DateInput({ value, onChange, min, max, disabled = false, placeholder = 'Select date', sx, inputSx, ...rest }) {
  // The anchor is state, not a ref: Popper needs the element itself to position against, and a
  // ref read during render does not re-render the Popper once it is set.
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => value || todayStr());

  // Opening jumps the grid to the chosen month — done here rather than in an effect, so there is
  // no second render just to move it.
  const toggle = () => {
    if (!open) setCursor(value || todayStr());
    setOpen((o) => !o);
  };

  const [cy, cm] = useMemo(() => {
    const [y, m] = (cursor || todayStr()).split('-').map(Number);
    return [y, m - 1];
  }, [cursor]);

  // Monday-first grid, with the leading blanks the month needs.
  const cells = useMemo(() => {
    const first = new Date(cy, cm, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(cy, cm + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [cy, cm]);

  const step = (by) => {
    const d = new Date(cy, cm + by, 1);
    setCursor(iso(d.getFullYear(), d.getMonth(), 1));
  };
  const pick = (d) => { onChange?.({ target: { value: iso(cy, cm, d) } }); setOpen(false); };
  const blocked = (d) => {
    const v = iso(cy, cm, d);
    return (min && v < min) || (max && v > max);
  };
  const today = todayStr();

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%', ...sx }}>
        <PickerField
          open={open}
          disabled={disabled}
          glyph=""
          text={prettyDate(value)}
          placeholder={placeholder}
          anchorRef={setAnchor}
          onToggle={toggle}
          sx={inputSx}
          {...rest}
        />
        <Popper open={open} anchorEl={anchor} placement="bottom-start" style={{ zIndex: 1400 }}>
          <Box sx={{ ...panelSx, width: 268, mt: '6px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
              <ButtonBase onClick={() => step(-1)} sx={navSx} aria-label="Previous month">‹</ButtonBase>
              <Box sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
                {MONTHS[cm]} {cy}
              </Box>
              <ButtonBase onClick={() => step(1)} sx={navSx} aria-label="Next month">›</ButtonBase>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: '4px' }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <Box key={d} sx={{ textAlign: 'center', fontSize: 9.5, fontFamily: fonts.mono, color: tokens.slate, fontWeight: 700, letterSpacing: '0.06em', py: '3px' }}>{d}</Box>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {cells.map((d, i) => {
                if (d === null) return <Box key={`b${i}`} />;
                const v = iso(cy, cm, d);
                const chosen = v === value;
                const off = blocked(d);
                return (
                  <ButtonBase
                    key={v}
                    disabled={off}
                    onClick={() => pick(d)}
                    sx={{
                      height: 32, borderRadius: '6px', fontSize: 12.5, fontFamily: 'inherit',
                      fontWeight: chosen || v === today ? 700 : 500,
                      color: off ? tokens.faint : chosen ? '#fff' : tokens.ink,
                      bgcolor: chosen ? tokens.teal : 'transparent',
                      border: !chosen && v === today ? `1px solid ${tokens.teal}` : '1px solid transparent',
                      '&:hover': off ? {} : { bgcolor: chosen ? tokens.tealDark : tokens.tealSoft },
                    }}
                  >
                    {d}
                  </ButtonBase>
                );
              })}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '8px', mt: '10px', pt: '10px', borderTop: `1px solid ${tokens.lineSoft}` }}>
              <Btn size="sm" variant="ghost" onClick={() => { onChange?.({ target: { value: '' } }); setOpen(false); }}>Clear</Btn>
              <Btn size="sm" onClick={() => { onChange?.({ target: { value: today } }); setOpen(false); }}>Today</Btn>
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

const navSx = { width: 28, height: 28, borderRadius: '6px', fontSize: 16, color: tokens.slate, '&:hover': { bgcolor: tokens.tealSoft, color: tokens.teal } };

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/** A time field — hours down one column, five-minute steps down the other. */
export function TimeInput({ value, onChange, disabled = false, placeholder = 'Select time', sx, inputSx, ...rest }) {
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const [h, m] = value ? value.split(':') : ['', ''];

  const set = (nextH, nextM) => onChange?.({ target: { value: `${nextH}:${nextM}` } });

  const column = (title, list, chosen, onPick) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ fontSize: 9.5, fontFamily: fonts.mono, color: tokens.slate, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: '4px', textAlign: 'center' }}>{title}</Box>
      <Box sx={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {list.map((n) => {
          const on = n === chosen;
          return (
            <ButtonBase
              key={n}
              onClick={() => onPick(n)}
              sx={{
                minHeight: 30, borderRadius: '6px', fontSize: 12.5, fontFamily: fonts.mono, fontWeight: on ? 700 : 500,
                color: on ? '#fff' : tokens.ink, bgcolor: on ? tokens.teal : 'transparent',
                '&:hover': { bgcolor: on ? tokens.tealDark : tokens.tealSoft },
              }}
            >
              {n}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%', ...sx }}>
        <PickerField
          open={open}
          disabled={disabled}
          glyph=""
          text={prettyTime(value)}
          placeholder={placeholder}
          anchorRef={setAnchor}
          onToggle={() => setOpen((o) => !o)}
          sx={inputSx}
          {...rest}
        />
        <Popper open={open} anchorEl={anchor} placement="bottom-start" style={{ zIndex: 1400 }}>
          <Box sx={{ ...panelSx, width: 200, mt: '6px' }}>
            <Box sx={{ display: 'flex', gap: '8px' }}>
              {column('Hour', HOURS, h, (n) => set(n, m || '00'))}
              {column('Min', MINUTES, m, (n) => set(h || '09', n))}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '8px', mt: '10px', pt: '10px', borderTop: `1px solid ${tokens.lineSoft}` }}>
              <Btn size="sm" variant="ghost" onClick={() => { onChange?.({ target: { value: '' } }); setOpen(false); }}>Clear</Btn>
              <Btn size="sm" variant="primary" onClick={() => setOpen(false)}>Done</Btn>
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

/* ------------------------------------------------------------------ duration */

/**
 * The quick choices in the panel. Minutes are the one true unit inside this component — every
 * value is parsed into minutes and printed back out in whatever notation the call site stores.
 */
const DURATION_PRESETS = [
  { min: 5 }, { min: 10 }, { min: 15 }, { min: 20 },
  { min: 30 }, { min: 45 }, { min: 60 }, { min: 90 },
  { min: 120 }, { min: 180 }, { min: 240, note: 'Half day' }, { min: 480, note: 'Full day' },
];

/**
 * Anything a duration has ever been written as in this app → minutes.
 *
 * Accepts a number (90), a compact string ('1h 30m', '45m'), words ('1 hour 30 minutes',
 * '5 min', '1.5 hours'), the two day presets ('Half day'), and a bare number of minutes ('30').
 * Returns null when there is nothing to read, so an empty field stays empty.
 */
export function durationToMinutes(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('half day')) return 240;
  if (raw.includes('full day')) return 480;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw));

  const hours = raw.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hr|hour)/);
  const mins = raw.match(/(\d+(?:\.\d+)?)\s*(?:m\b|min)/);
  if (!hours && !mins) return null;
  const total = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  return total > 0 ? Math.round(total) : null;
}

/**
 * Minutes → the notation a field stores.
 *  'compact' → '1h 30m'   (meeting `dur`, agenda times, template agenda)
 *  'words'   → '1 hr 30 min'  (discussion-log duration, which is read as prose)
 *  'minutes' → '90'       (meeting-request `durationMin`, cadence minutes)
 */
export function formatDuration(mins, format = 'compact') {
  if (mins === null || mins === undefined || !Number.isFinite(mins) || mins <= 0) return '';
  const m = Math.round(mins);
  if (format === 'minutes') return String(m);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (format === 'words') {
    if (!h) return `${rest} min`;
    return rest ? `${h} hr ${rest} min` : `${h} hr`;
  }
  if (!h) return `${rest}m`;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** What the closed field reads — always words, whatever is stored underneath. */
const prettyDuration = (mins) => {
  if (mins === 240) return '4 hr · half day';
  if (mins === 480) return '8 hr · full day';
  return formatDuration(mins, 'words');
};

const CUSTOM_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * A duration field — tap and pick, instead of typing '15m' and hoping.
 *
 * Replaces both the old "30 minutes / 45 minutes / 1 hour …" dropdowns (which started at half an
 * hour, so a five-minute agenda line could not be chosen at all) and the bare text boxes on
 * agenda rows. The panel offers the twelve lengths actually used here, from 5 minutes to a full
 * day, and a Custom pair of columns for anything else.
 *
 * `format` decides what is written back ('compact' | 'words' | 'minutes'); `size="sm"` is the
 * narrow mono field that sits on an agenda row.
 */
export function DurationInput({
  value, onChange, format = 'compact', presets = DURATION_PRESETS, size = 'md',
  disabled = false, placeholder = 'Select duration', maxHours = 12, sx, inputSx, ...rest
}) {
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const mins = durationToMinutes(value);
  // Anything that is not one of the chips is a custom length, so the columns open showing it.
  const isPreset = presets.some((p) => p.min === mins);
  const [custom, setCustom] = useState(false);
  const showCustom = custom || (mins !== null && !isPreset);
  const small = size === 'sm';

  const emit = (next) => onChange?.({ target: { value: next === null ? '' : formatDuration(next, format) } });
  const pick = (next) => { emit(next); setCustom(false); setOpen(false); };

  const toggle = () => {
    if (open) setCustom(false);
    setOpen((o) => !o);
  };

  const ch = Math.floor((mins ?? 0) / 60);
  const cm = (mins ?? 0) % 60;
  const setCustomParts = (h, m) => emit(h * 60 + m);

  const column = (title, list, chosen, onPick, render) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ fontSize: 9.5, fontFamily: fonts.mono, color: tokens.slate, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: '4px', textAlign: 'center' }}>{title}</Box>
      <Box sx={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {list.map((n) => {
          const on = n === chosen;
          return (
            <ButtonBase
              key={n}
              onClick={() => onPick(n)}
              sx={{
                minHeight: 28, borderRadius: '6px', fontSize: 12.5, fontFamily: fonts.mono, fontWeight: on ? 700 : 500,
                color: on ? '#fff' : tokens.ink, bgcolor: on ? tokens.teal : 'transparent',
                '&:hover': { bgcolor: on ? tokens.tealDark : tokens.tealSoft },
              }}
            >
              {render ? render(n) : n}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <ClickAwayListener onClickAway={() => { setOpen(false); setCustom(false); }}>
      <Box sx={{ position: 'relative', width: '100%', ...sx }}>
        <PickerField
          open={open}
          disabled={disabled}
          glyph={small ? '' : '⏱'}
          text={small ? formatDuration(mins, 'compact') : prettyDuration(mins)}
          placeholder={small ? '—' : placeholder}
          anchorRef={setAnchor}
          onToggle={toggle}
          sx={small
            ? {
              minHeight: 28, p: '4px 6px', fontSize: 11, fontFamily: fonts.mono, justifyContent: 'center',
              bgcolor: disabled ? tokens.sunk : tokens.card, ...inputSx,
            }
            : inputSx}
          {...rest}
        />
        {/* A narrow agenda-row field sits at the right edge, so its panel opens leftwards. */}
        <Popper open={open} anchorEl={anchor} placement={small ? 'bottom-end' : 'bottom-start'} style={{ zIndex: 1400 }}>
          <Box sx={{ ...panelSx, width: 252, mt: '6px' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {presets.map((p) => {
                const on = p.min === mins;
                return (
                  <ButtonBase
                    key={p.min}
                    onClick={() => pick(p.min)}
                    title={p.note || prettyDuration(p.min)}
                    sx={{
                      flexDirection: 'column', gap: '1px', py: '6px', borderRadius: '6px',
                      fontFamily: fonts.mono, fontSize: 12, fontWeight: on ? 700 : 500,
                      color: on ? '#fff' : tokens.ink, bgcolor: on ? tokens.teal : tokens.cream,
                      border: `1px solid ${on ? tokens.teal : tokens.line}`,
                      '&:hover': { bgcolor: on ? tokens.tealDark : tokens.tealSoft },
                    }}
                  >
                    <Box component="span">{formatDuration(p.min, 'compact')}</Box>
                    {p.note && (
                      <Box component="span" sx={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: on ? 0.9 : 0.6 }}>
                        {p.note}
                      </Box>
                    )}
                  </ButtonBase>
                );
              })}
            </Box>

            {showCustom ? (
              <Box sx={{ mt: '10px', pt: '10px', borderTop: `1px solid ${tokens.lineSoft}` }}>
                <Box sx={{ display: 'flex', gap: '8px' }}>
                  {column('Hours', Array.from({ length: maxHours + 1 }, (_, i) => i), ch, (h) => setCustomParts(h, cm))}
                  {column('Minutes', CUSTOM_MINUTES, cm, (m) => setCustomParts(ch, m), (n) => pad(n))}
                </Box>
              </Box>
            ) : null}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '8px', mt: '10px', pt: '10px', borderTop: `1px solid ${tokens.lineSoft}` }}>
              <Btn size="sm" variant="ghost" onClick={() => { emit(null); setCustom(false); setOpen(false); }}>Clear</Btn>
              {showCustom
                ? <Btn size="sm" variant="primary" onClick={() => { setCustom(false); setOpen(false); }}>Done</Btn>
                : <Btn size="sm" onClick={() => setCustom(true)}>Custom…</Btn>}
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
