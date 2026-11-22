import { useState } from 'react';
import { Box } from '@mui/material';
import { VSection, Btn, TextArea } from '../../../components';
import { tokens } from '../../../theme/tokens';
import ActivityEntry from './ActivityEntry';

/** renderActivityPane() — timeline + add comment. The feed comes from the API (the real change history). */
export default function ActivityPane({ p, actions }) {
  const [txt, setTxt] = useState('');
  const [posting, setPosting] = useState(false);
  const feed = p.activity || [];
  const post = async () => {
    setPosting(true);
    const ok = await actions.addProjComment(p.id, txt);
    setPosting(false);
    if (ok) setTxt('');
  };
  return (
    <>
      <VSection head="💬 Activity Timeline" meta={`${feed.length} events`}>
        {feed.length
          ? feed.map((a, i) => <ActivityEntry key={i} a={a} />)
          : <Box sx={{ color: tokens.slate, fontSize: 12, fontStyle: 'italic' }}>Nothing has happened on this project yet.</Box>}
      </VSection>
      <VSection head="💭 Add a Comment">
        <TextArea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Add an update, note, or comment on this project..." sx={{ '& textarea.MuiInputBase-input': { minHeight: 60, resize: 'vertical', lineHeight: 1.5 } }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Btn variant="primary" size="sm" disabled={posting} onClick={post}>+ Post Comment</Btn>
        </Box>
      </VSection>
    </>
  );
}
