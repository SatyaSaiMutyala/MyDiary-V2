import { tokens, fonts } from '../../../theme/tokens';

/** inline task text input (prototype inline style on .dept-task-row inputs) */
export const taskTextSx = {
  p: '6px 8px', fontSize: 12, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card, fontFamily: 'inherit', width: '100%',
};

/** inline <input type="time"> style on .dept-task-row rows */
export const taskTimeSx = {
  p: '4px 6px', fontSize: 11, border: `1px solid ${tokens.line}`, borderRadius: '4px', bgcolor: tokens.card, fontFamily: fonts.mono, width: 90, color: tokens.ink, boxSizing: 'border-box',
};
