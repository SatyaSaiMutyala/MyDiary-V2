import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { VSection, TextLink } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { initials, ownerAvatarColor } from '../../../utils/people';

/** renderTeamPane() */
export default function TeamPane({ p, actions }) {
  const ext = p.external || [];
  const team = p.team || [];
  return (
    <>
      <VSection head="👥 Internal Team" meta={`${team.length} members`}>
        {team.length === 0 && <Box sx={{ fontSize: 12, color: tokens.slate, fontStyle: 'italic', mb: '8px' }}>Nobody on the internal team yet.</Box>}
        <Grid container spacing="10px">
          {team.map((t, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '12px 14px', bgcolor: tokens.cream, borderRadius: '6px', borderLeft: `3px solid ${tokens.teal}`, height: '100%' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: ownerAvatarColor(t.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initials(t.name)}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}><Box sx={{ fontSize: 13, fontWeight: 700 }}>{t.name}</Box><Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{t.role || 'Team Member'}</Box></Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: '12px' }}><TextLink onClick={() => actions.inviteMember(p.id)}>+ Invite TDPL Member</TextLink></Box>
      </VSection>
      {ext.length ? (
        <VSection head="🌐 External Collaborators" meta={ext.length}>
          <Grid container spacing="10px">
            {ext.map((e, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '12px 14px', bgcolor: tokens.blueSoft, borderRadius: '6px', borderLeft: `3px solid ${tokens.blue}`, height: '100%' }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: tokens.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initials(e.name)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontSize: 13, fontWeight: 700 }}>{e.name}</Box>
                    <Box sx={{ fontSize: 11, color: tokens.slate, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{e.role || 'External'}</Box>
                    <Box sx={{ fontSize: 10, color: tokens.blue, fontFamily: fonts.mono, letterSpacing: '0.02em', mt: '2px', overflowWrap: 'anywhere' }}>📧 {e.email}</Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: '12px' }}><TextLink onClick={() => actions.inviteExternal(p.id)}>+ Invite External</TextLink></Box>
        </VSection>
      ) : (
        <Box sx={{ mt: '12px', p: '12px 16px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '6px', fontSize: 12, color: tokens.slate }}>💡 No external collaborators on this project yet. <TextLink onClick={() => actions.inviteExternal(p.id)}>+ Invite External</TextLink></Box>
      )}
    </>
  );
}
