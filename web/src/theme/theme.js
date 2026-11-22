// MUI theme in the AIMS 2.0 / GateBook look: teal primary, gold accent, IBM Plex, 6px corners,
// teal panel title bars, white table heads with a pink rule, light only.
import { createTheme } from '@mui/material/styles';
import { tokens as t, fonts, DESKTOP_MIN, MENU_SHADOW } from './tokens';

const SHADOW = t.shadowSm;
const heading = { fontFamily: fonts.display, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' };
const monoLabel = { fontFamily: fonts.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' };
const tone = (fg, bg) => ({ backgroundColor: bg, color: fg });

const theme = createTheme({
  cssVariables: { cssVarPrefix: 'md' },
  palette: {
    mode: 'light',
    primary: { main: t.teal, dark: t.tealDark, light: t.tealSoft, contrastText: '#fff' },
    secondary: { main: t.gold, dark: t.goldDark, contrastText: t.ink },
    success: { main: t.ok, contrastText: '#fff' },
    warning: { main: t.warn, contrastText: '#fff' },
    error: { main: t.bad, contrastText: '#fff' },
    info: { main: t.info, contrastText: '#fff' },
    background: { default: t.cream, paper: t.card },
    text: { primary: t.ink, secondary: t.muted, disabled: t.faint },
    divider: t.line,
    gb: { ...t, accent: t.teal, accentSoft: t.tealSoft, accentDark: t.tealDark, surface: t.card, bg: t.cream, line2: t.lineSoft },
  },
  breakpoints: { values: { xs: 0, sm: 600, md: DESKTOP_MIN, lg: 1100, xl: 1536 } },
  shape: { borderRadius: 6 },
  tokens: t,
  fonts,
  typography: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeightRegular: 400, fontWeightMedium: 500, fontWeightBold: 700,
    h1: { ...heading, fontSize: '1.25rem' },
    h2: { ...heading, fontSize: '1.125rem' },
    h3: { ...heading, fontSize: '1rem' },
    h4: { ...heading, fontSize: '0.875rem', letterSpacing: '0.01em' },
    h5: { ...heading, fontSize: '0.8125rem', letterSpacing: '0.01em' },
    h6: { ...heading, fontSize: '0.75rem', letterSpacing: '0.02em' },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { fontFamily: fonts.body, fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '0.8125rem' },
    mono: { fontFamily: fonts.mono, fontWeight: 500, fontSize: '0.8125rem', letterSpacing: 0, fontVariantNumeric: 'tabular-nums' },
    eyebrow: { fontFamily: fonts.mono, fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.4 },
    overline: { fontFamily: fonts.mono, fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.4 },
    display: { fontFamily: fonts.mono, fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  },
  shadows: ['none', SHADOW, SHADOW, ...Array(22).fill(MENU_SHADOW)],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { overscrollBehavior: 'none' },
        body: { backgroundColor: t.cream, color: t.ink, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', fontSize: 14, overscrollBehavior: 'none' },
        '::selection': { background: t.tealSoft },
        ':focus-visible': { outline: `2px solid ${t.teal}`, outlineOffset: 2 },
        'button, input, select, textarea': { fontFamily: 'inherit' },
        '@media (prefers-reduced-motion: reduce)': { '*, *::before, *::after': { transitionDuration: '0.01ms !important', animationDuration: '0.01ms !important' } },
      },
    },
    MuiTypography: { defaultProps: { variantMapping: { mono: 'span', eyebrow: 'div', display: 'div' } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none', backgroundColor: t.card }, rounded: { borderRadius: 6 }, outlined: { borderColor: t.line, boxShadow: SHADOW } } },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 36, borderRadius: 6, paddingInline: 14, whiteSpace: 'nowrap', transition: 'background-color .12s ease, border-color .12s ease, color .12s ease, box-shadow .12s ease' },
        sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: '0.78rem' },
        sizeLarge: { minHeight: 44, fontSize: '0.9375rem', paddingInline: 20, fontWeight: 600 },
        startIcon: { marginRight: 6 },
        outlined: { borderColor: t.line, color: t.muted, backgroundColor: t.card, '&:hover': { borderColor: t.faint, color: t.ink, backgroundColor: t.card } },
        outlinedError: { borderColor: t.bad, color: t.bad, '&:hover': { backgroundColor: t.bad, borderColor: t.bad, color: '#fff' } },
        text: { color: t.teal, '&:hover': { backgroundColor: t.tealSoft } },
        containedPrimary: { backgroundColor: t.teal, color: '#fff', border: `1px solid ${t.teal}`, '&:hover': { backgroundColor: t.tealDark, borderColor: t.tealDark } },
      },
      variants: [{ props: { variant: 'exit' }, style: { backgroundColor: t.head, color: '#fff', border: `1.5px solid ${t.gold}`, fontWeight: 600, '&:hover': { backgroundColor: t.tealDark }, '&.Mui-disabled': { opacity: 0.45, color: '#fff' } } }],
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 6, '&:hover': { backgroundColor: t.tealSoft } } } },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 20, fontWeight: 500, fontSize: '0.6875rem', height: 22 },
        sizeMedium: { height: 26, fontSize: '0.75rem' },
        label: { paddingInline: 8 },
        filled: tone(t.grey, t.greySoft),
        colorPrimary: tone(t.teal, t.tealSoft), colorSuccess: tone(t.ok, t.okSoft), colorWarning: tone(t.warn, t.warnSoft), colorError: tone(t.bad, t.badSoft), colorInfo: tone(t.info, t.infoSoft),
        outlined: { borderColor: t.line, color: t.muted },
      },
    },
    MuiInputLabel: { defaultProps: { shrink: true }, styleOverrides: { root: { position: 'relative', transform: 'none', marginBottom: 5, fontSize: '0.75rem', fontWeight: 500, color: t.muted, whiteSpace: 'normal', '&.Mui-focused': { color: t.muted } }, asterisk: { color: t.bad } } },
    MuiOutlinedInput: {
      defaultProps: { notched: false },
      styleOverrides: {
        root: {
          minHeight: 36, fontSize: '0.8125rem', borderRadius: 6, backgroundColor: t.card, transition: 'box-shadow .12s ease',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.line, top: 0 },
          '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.faint },
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(15,118,110,.12)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.teal, borderWidth: 1 },
          '&.Mui-disabled': { backgroundColor: t.sunk, color: t.faint },
        },
        input: { paddingTop: 8, paddingBottom: 8, paddingInline: 10 },
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiPopover: { styleOverrides: { paper: { border: `1px solid ${t.line}`, boxShadow: MENU_SHADOW } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '0.8125rem', minHeight: 34, '&:hover': { backgroundColor: t.tealSoft }, '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: t.tealSoft, color: t.teal, fontWeight: 600 } } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 40, borderBottom: `1px solid ${t.line}` }, indicator: { backgroundColor: t.teal, height: 2 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 40, paddingInline: 14, fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none', color: t.muted, '&.Mui-selected': { color: t.teal, fontWeight: 600 } } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: t.lineSoft, fontSize: '0.8125rem', padding: '9px 11px' },
        head: { ...monoLabel, backgroundColor: t.card, color: t.ink, fontSize: '0.6875rem', padding: '11px 11px 9px', whiteSpace: 'nowrap', borderBottom: 'none', boxShadow: `inset 0 -1px 0 ${t.colRule}` },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#FAFCFD' } } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 14, backgroundImage: 'none', boxShadow: '0 24px 60px rgba(16,21,28,.42)' } } },
    MuiBackdrop: { styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' } } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1rem', fontWeight: 700, padding: '14px 18px 12px', borderBottom: `1px solid ${t.line}`, marginBottom: 14 } } },
    MuiDialogActions: { styleOverrides: { root: { borderTop: `1px solid ${t.line}`, padding: '10px 16px', gap: 6 } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: t.ink, fontSize: '0.72rem', borderRadius: 6, padding: '6px 9px' }, arrow: { color: t.ink } } },
    MuiCheckbox: { styleOverrides: { root: { color: t.faint, '&.Mui-checked': { color: t.teal } } } },
    MuiLinearProgress: { styleOverrides: { root: { backgroundColor: t.tealSoft }, bar: { backgroundColor: t.teal } } },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { color: t.railMuted, minWidth: 0, paddingInline: 4, '&.Mui-selected': { color: '#fff' } },
        label: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem', '&.Mui-selected': { fontSize: '0.66rem' } },
      },
    },
  },
});

export default theme;
