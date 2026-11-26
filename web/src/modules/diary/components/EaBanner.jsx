import { Box } from '@mui/material';
import { Btn } from '../../../components';
import { tokens } from '../../../theme/tokens';
import { eaBadgeSx } from '../utils';
import { useDialog } from '../../../components/Dialogs';

const EA = () => <Box component="span" sx={eaBadgeSx()}>EA</Box>;

/** .ea-banner — three variants (renderDiary 9739–9767) */
export default function EaBanner({ viewer, owner, canEdit, onSwitchOwner }) {
  const dlg = useDialog();
  const isDelegated = owner !== viewer.name;
  let body, action;
  if (isDelegated) {
    body = <>You are viewing <strong>{owner}'s</strong> diary as <strong>{viewer.name}</strong> ({canEdit ? 'edit access · EA' : 'view-only'}). New entries you add will show as <EA />.</>;
    action = <Btn size="sm" sx={{ ml: 'auto' }} onClick={() => onSwitchOwner(viewer.name)}>← Back to my diary</Btn>;
  } else if (viewer.name === 'Pallavi Elisetti') {
    body = <>As EA to the CMD, you can manage <strong>Venkata Cherukuri's</strong> diary alongside your own.</>;
    action = <Btn size="sm" variant="primary" sx={{ ml: 'auto' }} onClick={() => onSwitchOwner('Venkata Cherukuri')}>Open CMD's Diary →</Btn>;
  } else {
    body = <><strong>Pallavi Elisetti (EA)</strong> has edit access to this diary. Entries she adds for you are marked <EA />.</>;
    action = <Btn size="sm" sx={{ ml: 'auto' }} onClick={() => dlg.alert('Delegation settings → manage who can view/edit your diary, set visibility for different categories (e.g., Personal always private).')}>⚙ Delegation Settings</Btn>;
  }
  const ico = isDelegated ? '' : '';
  return (
    <Box sx={{ background: `linear-gradient(90deg, ${tokens.yellowSoft}, ${tokens.tealSofter})`, border: `1px solid ${tokens.yellow}`, borderLeft: `4px solid ${tokens.yellow}`, borderRadius: '6px', p: '10px 14px', mb: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 12, flexWrap: 'wrap', '& strong': { color: tokens.ink } }}>
      <Box component="span" sx={{ fontSize: 18 }}>{ico}</Box>
      <Box component="span" sx={{ flex: '1 1 260px', minWidth: 0 }}>{body}</Box>
      {action}
    </Box>
  );
}
