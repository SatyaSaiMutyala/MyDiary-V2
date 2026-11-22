import { useState } from 'react';
import { Box } from '@mui/material';
import { VSection, Btn, TextArea } from '../../../components';
import ActivityEntry from './ActivityEntry';

/** renderActivityPane() — timeline + add comment */
export default function ActivityPane({ p, actions }) {
  const [txt, setTxt] = useState('');
  return (
    <>
      <VSection head="💬 Activity Timeline" meta={`${(p.activity || []).length} events`}>
        {(p.activity || []).map((a, i) => <ActivityEntry key={i} a={a} />)}
      </VSection>
      <VSection head="💭 Add a Comment">
        <TextArea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Add an update, note, or comment on this project..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 60, resize: 'vertical', lineHeight: 1.5 } }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Btn variant="primary" size="sm" onClick={() => { if (actions.addProjComment(p.id, txt)) setTxt(''); }}>+ Post Comment</Btn>
        </Box>
      </VSection>
    </>
  );
}
