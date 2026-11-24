import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts } from '../../../theme/tokens';
import { UNIT_KINDS, phaseLook } from '../utils';

/** One round's state as a small chip — two of these sit on every unit card. */
function PhasePip({ icon, state }) {
  const look = phaseLook(state);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
      <Box component="span" sx={{ fontSize: 11 }}>{icon}</Box>
      <Box sx={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', p: '2px 7px', borderRadius: '10px', bgcolor: look.soft, color: look.color, whiteSpace: 'nowrap' }}>
        {look.label}
      </Box>
      {state?.deviations > 0 && (
        <Box title={`${state.deviations} deviation${state.deviations === 1 ? '' : 's'}`} sx={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, p: '2px 6px', borderRadius: '10px', bgcolor: tokens.warnSoft, color: tokens.warn }}>
          ⚠{state.deviations}
        </Box>
      )}
    </Box>
  );
}

/**
 * The unit picker: every laboratory, department and collection point that runs a board, with where
 * both of its rounds stand today. Clicking a unit opens it; clicking a round opens that round.
 */
export default function UnitStrip({ units = [], selected, phase, onPick }) {
  return (
    <Grid container spacing="10px" sx={{ mb: '18px' }}>
      {units.map((u) => {
        const kind = UNIT_KINDS[u.kind] ?? UNIT_KINDS.nrl;
        const active = u.key === selected;
        const bothSigned = u.phases.opening.signedAt && u.phases.closing.signedAt;
        return (
          <Grid key={u.key} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Box
              sx={{
                height: '100%', bgcolor: tokens.card, borderRadius: '10px', p: '12px 14px',
                border: `1px solid ${active ? tokens.teal : tokens.line}`,
                borderLeft: `4px solid ${active ? tokens.teal : bothSigned ? tokens.ok : tokens.lineSoft}`,
                boxShadow: active ? tokens.shadowSm : 'none',
                transition: 'border-color .12s ease, box-shadow .12s ease',
                '&:hover': { borderColor: tokens.teal, boxShadow: tokens.shadowSm },
              }}
            >
              <ButtonBase
                onClick={() => onPick(u.key, phase)}
                sx={{ display: 'block', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '8px' }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: active ? tokens.tealDark : tokens.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}
                  </Typography>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', p: '2px 7px', borderRadius: '10px', bgcolor: kind.soft, color: kind.color, flexShrink: 0 }}>
                    {kind.label}
                  </Box>
                </Box>
              </ButtonBase>
              <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['opening', 'closing'].map((p) => (
                  <ButtonBase key={p} onClick={() => onPick(u.key, p)} title={`Open the ${p} round`} sx={{ borderRadius: '10px', p: '1px 2px', fontFamily: 'inherit', '&:hover': { bgcolor: tokens.tealSofter } }}>
                    <PhasePip icon={p === 'opening' ? '🌅' : '🌙'} state={u.phases[p]} />
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
