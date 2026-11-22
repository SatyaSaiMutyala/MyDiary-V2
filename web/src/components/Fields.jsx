import { Box, InputBase, Typography } from '@mui/material';
import { tokens, fonts } from '../theme/tokens';

/** AIMS field label: 12px / 500 / muted (sentence case). req → red asterisk; hint → faint inline hint. */
export function FieldLabel({ req, hint, right, sx, children }) {
  return (
    <Typography component="label" sx={{ fontSize: 12, fontWeight: 500, color: tokens.muted, mb: '5px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: right ? 'space-between' : 'flex-start', lineHeight: 1.3, ...sx }}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        {children}{req && <Box component="span" sx={{ color: tokens.bad }}>*</Box>}
        {hint && <Box component="span" sx={{ fontWeight: 400, color: tokens.faint, fontSize: 11 }}>{hint}</Box>}
      </Box>
      {right}
    </Typography>
  );
}

const inputSx = {
  width: '100%', fontSize: 13, color: tokens.ink, fontFamily: 'inherit',
  '& .MuiInputBase-input': { p: '8px 10px', minHeight: 36, border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.card, transition: 'box-shadow .12s ease, border-color .12s ease', height: 'auto', boxSizing: 'border-box', '&:hover': { borderColor: tokens.faint }, '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: '0 0 0 3px rgba(15,118,110,.12)' }, '&::placeholder': { color: tokens.faint, opacity: 1 }, '&:disabled': { bgcolor: tokens.sunk, color: tokens.faint } },
  '& textarea.MuiInputBase-input': { resize: 'vertical', minHeight: 72, lineHeight: 1.5 },
};

export function TextInput({ sx, inputSx: isx, ...rest }) {
  return <InputBase sx={{ ...inputSx, ...sx, '& .MuiInputBase-input': { ...inputSx['& .MuiInputBase-input'], ...isx } }} {...rest} />;
}
export function TextArea({ minRows = 3, sx, ...rest }) {
  return <InputBase multiline minRows={minRows} sx={{ ...inputSx, ...sx }} {...rest} />;
}
/** Native select styled like an AIMS field; children = <option> */
export function SelectInput({ sx, children, ...rest }) {
  return (
    <Box component="select" sx={{ width: '100%', minHeight: 36, p: '8px 32px 8px 10px', border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.card, fontSize: 13, color: tokens.ink, fontFamily: 'inherit', appearance: 'none', cursor: 'pointer', transition: 'box-shadow .12s ease, border-color .12s ease', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237E8A96' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', '&:hover': { borderColor: tokens.faint }, '&:focus': { outline: 'none', borderColor: tokens.teal, boxShadow: '0 0 0 3px rgba(15,118,110,.12)' }, '&:disabled': { bgcolor: tokens.sunk, color: tokens.faint }, ...sx }} {...rest}>
      {children}
    </Box>
  );
}
export function Field({ label, req, hint, sx, children }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>{label && <FieldLabel req={req} hint={hint}>{label}</FieldLabel>}{children}</Box>;
}

/** Search field with a magnifier glyph */
export function SearchBox({ sx, ...rest }) {
  return (
    <Box sx={{ position: 'relative', flex: 1, ...sx }}>
      <Box component="span" sx={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.55, pointerEvents: 'none', zIndex: 1 }}>🔍</Box>
      <InputBase sx={{ width: '100%', '& .MuiInputBase-input': { p: '8px 10px 8px 34px', minHeight: 36, border: `1px solid ${tokens.line}`, borderRadius: '6px', bgcolor: tokens.card, fontSize: 13, height: 'auto', boxSizing: 'border-box', '&:hover': { borderColor: tokens.faint }, '&:focus': { borderColor: tokens.teal, boxShadow: '0 0 0 3px rgba(15,118,110,.12)' }, '&::placeholder': { color: tokens.faint, opacity: 1 } } }} {...rest} />
    </Box>
  );
}
export function FilterSelect({ sx, children, ...rest }) {
  return <SelectInput sx={{ width: 'auto', ...sx }} {...rest}>{children}</SelectInput>;
}

/** Toggle row with an AIMS-teal switch */
export function ToggleRow({ label, desc, on, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 0', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
        {desc && <Typography sx={{ fontSize: 12, color: tokens.faint, mt: '2px' }}>{desc}</Typography>}
      </Box>
      <Box onClick={() => onChange(!on)} role="switch" aria-checked={on} sx={{ position: 'relative', width: 38, height: 22, bgcolor: on ? tokens.teal : tokens.line, borderRadius: '20px', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, '&::after': { content: '""', position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, bgcolor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' } }} />
    </Box>
  );
}

/** Person chip (AIMS chip tone); external → blue; noEmail → amber warning; onRemove shows × */
export function Chip({ external, noEmail, email, onRemove, onClick, sx, children }) {
  const ext = external && !noEmail;
  return (
    <Box component="span" onClick={onClick} sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: 26, px: '10px', bgcolor: noEmail ? tokens.warnSoft : ext ? tokens.infoSoft : tokens.tealSoft, color: noEmail ? tokens.warn : ext ? tokens.info : tokens.teal, border: `1px solid ${noEmail ? tokens.warn : ext ? 'rgba(27,94,158,.35)' : 'rgba(15,118,110,.35)'}`, borderRadius: '20px', fontSize: 12, fontWeight: 500, cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap', ...sx }}>
      {children}
      {email && <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10.5, opacity: 0.8, ml: '4px', pl: '6px', borderLeft: '1px solid rgba(27,94,158,0.3)' }}>{email}</Box>}
      {noEmail && <Box component="span" sx={{ ml: '2px', fontSize: 10 }}>⚠</Box>}
      {onRemove && <Box component="span" onClick={(e) => { e.stopPropagation(); onRemove(); }} sx={{ cursor: 'pointer', opacity: 0.7, fontSize: 15, lineHeight: 1, ml: '2px', '&:hover': { opacity: 1 } }}>×</Box>}
    </Box>
  );
}

export function DelBtn({ sx, ...rest }) {
  return <Box component="button" type="button" sx={{ width: 28, height: 28, p: 0, bgcolor: 'transparent', border: '1px solid transparent', borderRadius: '6px', color: tokens.faint, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', '&:hover': { color: tokens.bad, borderColor: tokens.bad, bgcolor: tokens.badSoft }, ...sx }} {...rest}>×</Box>;
}
