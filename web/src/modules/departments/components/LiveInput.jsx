import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { tokens } from '../../../theme/tokens';
import { taskTimeSx } from './styles';

/**
 * Live-bound text input (prototype `oninput="..."`): keeps its own text while focused so the caret never
 * jumps, reports every change through onCommit (the page debounces the PATCH behind it), and re-syncs from
 * the server value whenever that changes while the field is not focused.
 *
 * It deliberately does NOT reset to the server value on blur: a debounced save may still be in flight, and
 * snapping back to the old text would look like the edit was lost.
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
      sx={{ fontFamily: 'inherit', color: tokens.ink, boxSizing: 'border-box', minWidth: 0, ...sx }}
      {...rest}
    />
  );
}

/** Native <input type="time">, bound the same way so a half-typed time is never overwritten mid-save. */
export function TimeInput({ value, onCommit, sx, ...rest }) {
  const ref = useRef(null);
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    if (document.activeElement !== ref.current) setLocal(value ?? '');
  }, [value]);
  return (
    <Box
      component="input"
      type="time"
      ref={ref}
      value={local || ''}
      onChange={(e) => { setLocal(e.target.value); onCommit(e.target.value); }}
      sx={{ ...taskTimeSx, ...sx }}
      {...rest}
    />
  );
}
