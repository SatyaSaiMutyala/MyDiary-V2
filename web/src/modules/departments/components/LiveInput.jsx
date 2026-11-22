import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { tokens } from '../../../theme/tokens';
import { taskTimeSx } from './styles';

/**
 * Live-bound text input (prototype `oninput="..."`): keeps its own text while focused so the caret
 * never jumps, commits every change to the store via onCommit, and re-syncs from the store value
 * when not focused (or on blur).
 */
export default function LiveInput({ value, onCommit, sx, type = 'text', ...rest }) {
  const ref = useRef(null);
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    if (document.activeElement !== ref.current) setLocal(value ?? '');
  }, [value]);
  return (
    <Box
      component="input"
      type={type}
      ref={ref}
      value={local}
      onChange={(e) => { setLocal(e.target.value); onCommit(e.target.value); }}
      onBlur={() => setLocal(value ?? '')}
      sx={{ fontFamily: 'inherit', color: tokens.ink, boxSizing: 'border-box', minWidth: 0, ...sx }}
      {...rest}
    />
  );
}

/** Native <input type="time"> bound to the store (controlled — no caret issues) */
export function TimeInput({ value, onCommit, sx, ...rest }) {
  return <Box component="input" type="time" value={value || ''} onChange={(e) => onCommit(e.target.value)} sx={{ ...taskTimeSx, ...sx }} {...rest} />;
}
