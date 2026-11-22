import { ButtonBase } from '@mui/material';
import { tokens } from '../theme/tokens';

/**
 * AIMS buttons. variant: 'default' (outlined) | 'primary' (teal) | 'dark' (title-bar teal + gold edge)
 * | 'ghost' (text) | 'danger' (outlined red) ; size: 'md' 36px | 'sm' 30px | 'lg' 44px
 */
export default function Btn({ variant = 'default', size = 'md', sx, children, ...rest }) {
  const h = size === 'sm' ? 30 : size === 'lg' ? 44 : 36;
  const px = size === 'sm' ? '10px' : size === 'lg' ? '20px' : '14px';
  const fs = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13;
  const v = {
    default: { bgcolor: tokens.card, color: tokens.muted, border: `1px solid ${tokens.line}`, '&:hover': { borderColor: tokens.faint, color: tokens.ink } },
    primary: { bgcolor: tokens.teal, color: '#fff', border: `1px solid ${tokens.teal}`, fontWeight: 600, '&:hover': { bgcolor: tokens.tealDark, borderColor: tokens.tealDark } },
    dark: { bgcolor: tokens.head, color: '#fff', border: `1.5px solid ${tokens.gold}`, fontWeight: 600, '&:hover': { bgcolor: tokens.tealDark } },
    ghost: { bgcolor: 'transparent', color: tokens.teal, border: '1px solid transparent', '&:hover': { bgcolor: tokens.tealSoft } },
    danger: { bgcolor: tokens.card, color: tokens.bad, border: `1px solid ${tokens.bad}`, '&:hover': { bgcolor: tokens.bad, color: '#fff' } },
  }[variant];
  return (
    <ButtonBase sx={{ minHeight: h, px, borderRadius: '6px', fontSize: fs, fontWeight: 500, letterSpacing: 0, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 0.75, transition: 'background-color .12s ease, border-color .12s ease, color .12s ease, box-shadow .12s ease', lineHeight: 1.3, whiteSpace: 'nowrap', '&.Mui-disabled': { opacity: 0.55 }, ...v, ...sx }} {...rest}>
      {children}
    </ButtonBase>
  );
}

export function TextLink({ sx, children, ...rest }) {
  return (
    <ButtonBase sx={{ background: 'none', border: 'none', color: tokens.teal, fontSize: 12.5, fontWeight: 600, p: '6px 0', fontFamily: 'inherit', '&:hover': { color: tokens.tealDark, textDecoration: 'underline' }, ...sx }} {...rest}>
      {children}
    </ButtonBase>
  );
}

export function QuickLinkBtn({ sx, children, ...rest }) {
  return (
    <ButtonBase sx={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500, p: '3px 10px', bgcolor: tokens.greySoft, color: tokens.grey, border: `1px solid ${tokens.line}`, borderRadius: '20px', '&:hover': { bgcolor: tokens.tealSoft, color: tokens.teal, borderColor: tokens.teal }, ...sx }} {...rest}>
      {children}
    </ButtonBase>
  );
}

/** Small dark square add-button next to inputs; ext → blue */
export function AddBtn({ ext, sx, children, ...rest }) {
  return (
    <ButtonBase sx={{ minHeight: 36, px: '12px', bgcolor: ext ? tokens.blue : tokens.teal, color: '#fff', border: 'none', borderRadius: '6px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', '&:hover': { filter: 'brightness(0.92)' }, ...sx }} {...rest}>
      {children}
    </ButtonBase>
  );
}
