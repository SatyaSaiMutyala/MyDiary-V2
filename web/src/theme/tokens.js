// Design tokens — MyDiary V2 wears the AIMS 2.0 / Trust GateBook (TruSentinel) look.
// The keys are the prototype's names (every module reads them), the VALUES are the GateBook palette,
// so one file re-skins the whole app. No CSS files anywhere.
export const tokens = {
  // dark greens → rail / panel title bars
  greenDeep: '#20605B',   // panel title bars, dark buttons, active tabs (AIMS `head`)
  greenMid: '#134A38',
  teal: '#0F766E',        // accent: primary actions, focus, active states
  tealDark: '#0B5F58',
  tealSoft: '#E6F2F1',
  tealSofter: 'rgba(15,118,110,0.06)',
  yellow: '#FFC81F',      // gold
  yellowSoft: '#FCF1DF',
  cream: '#F4F6F8',       // page canvas
  creamWarm: '#EDF1F4',   // quiet fills (sunk)
  card: '#FFFFFF',
  line: '#DDE3E9',
  lineSoft: '#EDF1F4',
  ink: '#10151C',
  slate: '#4A5763',
  slateSoft: '#7E8A96',
  slateSofter: '#B9C3CC',
  red: '#B3261E',
  redSoft: '#FBEAE9',
  amber: '#B4700B',
  blue: '#1B5E9E',
  blueSoft: '#E8F1F9',
  purple: '#6B4E9B',
  purpleSoft: '#F0EBF7',
  orange: '#DD6B20',
  orangeSoft: 'rgba(221,107,32,0.1)',
  pink: '#D53F8C',
  pinkSoft: 'rgba(213,63,140,0.1)',

  radius: '6px',
  radiusSm: '6px',
  shadowSm: '0 1px 2px rgba(16,21,28,.06), 0 4px 12px rgba(16,21,28,.05)',
  shadow: '0 1px 2px rgba(16,21,28,.06), 0 4px 12px rgba(16,21,28,.05)',
  shadowLg: '0 10px 28px rgba(16,21,28,.16)',

  // AIMS extras
  head: '#20605B', headRule: '#F4C430', colRule: '#F94C8E', gold: '#FFC81F', goldDark: '#E0A800',
  rail: '#0E3529', railInk: '#E2EDE8', railMuted: '#8FB0A5',
  ok: '#1E7A45', okSoft: '#E7F3EC', warn: '#B4700B', warnSoft: '#FCF1DF', bad: '#B3261E', badSoft: '#FBEAE9',
  info: '#1B5E9E', infoSoft: '#E8F1F9', grey: '#5B6874', greySoft: '#EDF0F3', faint: '#7E8A96', muted: '#4A5763', sunk: '#EDF1F4',
};

/** Sidebar / phone app bar background (AIMS rail gradient). */
export const RAIL_BG =
  'radial-gradient(125% 46% at 0% 100%, rgba(45,166,143,.24) 0%, rgba(45,166,143,0) 64%), ' +
  'linear-gradient(172deg, #0A2620 0%, #0E3529 28%, #134A38 66%, #1A6249 100%)';
export const RAIL_WIDTH = 258;
export const RAIL_COLLAPSED = 66;
export const TOPBAR_HEIGHT = 60;
export const DESKTOP_MIN = 861;
export const MENU_SHADOW = '0 10px 28px rgba(16,21,28,.16)';

// IBM Plex everywhere (loaded via @fontsource in main.jsx). `serif` is aliased to Plex Sans so the
// prototype's display titles pick up the GateBook typeface automatically.
export const fonts = {
  sans: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  serif: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  body: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
};

export const mono = (size = 11, letterSpacing = '0.04em') => ({
  fontFamily: fonts.mono, fontSize: size, letterSpacing, textTransform: 'uppercase', fontWeight: 600,
});
export const serifTitle = (size) => ({ fontFamily: fonts.display, fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1.25 });

export const TYPE_COLORS = {
  internal: { color: tokens.tealDark, soft: tokens.tealSoft, line: tokens.teal },
  customer: { color: tokens.blue, soft: tokens.blueSoft, line: tokens.blue },
  supplier: { color: tokens.orange, soft: tokens.orangeSoft, line: tokens.orange },
  consultants: { color: tokens.purple, soft: tokens.purpleSoft, line: tokens.purple },
  board: { color: tokens.amber, soft: tokens.yellowSoft, line: tokens.yellow },
  other: { color: tokens.slate, soft: tokens.greySoft, line: tokens.slateSoft },
};
