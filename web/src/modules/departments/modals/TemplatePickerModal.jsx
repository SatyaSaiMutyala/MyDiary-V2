import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, FootNote, Btn, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';

/**
 * Pick a department template to start from — the ready-made kits (clinical lab, admin, field ops …),
 * each carrying its own positions and shift tasks.
 *
 * The prototype asked for this as a numbered list typed into a pop-up ("1. 🔬 Clinical Lab…").
 * Picking one here opens the department form with everything pre-filled, so the name and
 * description can still be changed before anything is created.
 */
export default function TemplatePickerModal({ open, templates, onClose, onPick }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      width={840}
      icon={<Icon name="clipboard" />}
      title="Start from a template"
      sub={`${templates.length} ready-made departments`}
      bodySx={{ bgcolor: tokens.creamWarm }}
      footer={<>
        <FootNote>Each template brings its own positions and opening / closing tasks</FootNote>
        <Btn onClick={onClose}>Cancel</Btn>
      </>}
    >
      <Grid container spacing="12px">
        {templates.map((t) => {
          const p = t.preset || {};
          return (
            <Grid key={t.id} size={{ xs: 12, sm: 6 }}>
              <Box
                component="button"
                type="button"
                onClick={() => onPick(t)}
                sx={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderTop: `4px solid ${tokens.teal}`,
                  borderRadius: '10px', p: '14px 16px', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  transition: 'box-shadow .15s ease, transform .15s ease, border-color .15s ease',
                  '&:hover': { boxShadow: tokens.shadowLg, transform: 'translateY(-2px)', borderColor: tokens.slateSoft, borderTopColor: tokens.teal },
                }}
              >
                <Box sx={{ mb: '6px' }}><Icon name={t.icon} size={26} /></Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.ink, mb: '4px' }}>{t.name}</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, mb: '10px', flex: 1 }}>{t.description}</Typography>
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', pt: '10px', borderTop: `1px dashed ${tokens.line}` }}>
                  <Chip>{(p.positions || []).length} positions</Chip>
                  <Chip>{(p.openingTasks || []).length} opening</Chip>
                  <Chip>{(p.closingTasks || []).length} closing</Chip>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </ModalShell>
  );
}

function Chip({ children }) {
  return (
    <Box component="span" sx={{ p: '3px 8px', bgcolor: tokens.tealSofter, color: tokens.tealDark, borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>
      {children}
    </Box>
  );
}
