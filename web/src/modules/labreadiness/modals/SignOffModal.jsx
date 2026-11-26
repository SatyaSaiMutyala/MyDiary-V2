import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ModalShell, FootNote, Btn, Field, TextInput, Icon } from '../../../components';
import { tokens, fonts } from '../../../theme/tokens';
import { errorDetails, errorMessage } from '../../../store/api/baseApi';
import { checkPhoto, prettyDate } from '../utils';

/**
 * Sign off a readiness round: the declaration, the signatory, and the photograph of the person signing.
 *
 * The photograph is the point — a tick can be made by anyone from anywhere, a face at the bench cannot.
 * `capture="user"` opens the front camera on a phone and the file picker on a desktop, so the same
 * screen works at the bench and at a desk.
 */
export default function SignOffModal({ open, board, me, onClose, onSign, signing }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [role, setRole] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFile(null); setPreview(''); setAgreed(false); setProblem(''); setError(null);
    setRole(me?.title || me?.position || '');
  }, [open, me]);

  // The preview is a blob URL, so it has to be let go of when it is replaced.
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    const bad = checkPhoto(chosen);
    setProblem(bad);
    setFile(bad ? null : chosen);
  };

  const submit = async () => {
    setError(null);
    if (!file) { setProblem('Take the sign-off photograph first.'); return; }
    try {
      await onSign({ file, role: role.trim() });
      onClose();
    } catch (err) {
      setError(err);
    }
  };

  const progress = board?.progress ?? { done: 0, total: 0, missing: [], complete: false };
  const ready = progress.complete && file && agreed;
  const details = errorDetails(error);

  return (
    <ModalShell
      open={open}
      onClose={signing ? () => {} : onClose}
      width={660}
      icon={<Icon name="rename" />}
      title={`Sign off the ${board?.phase === 'closing' ? 'closing' : 'opening'} round`}
      sub={board ? `${board.unit.name} · ${prettyDate(board.date)}` : ''}
      footer={<>
        <FootNote>{progress.done}/{progress.total} activities recorded</FootNote>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Btn onClick={onClose} disabled={signing}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={!ready || signing}>{signing ? 'Signing…' : '✍ Sign off'}</Btn>
        </Box>
      </>}
    >
      {error && (
        <Box sx={{ mb: '14px', p: '10px 14px', bgcolor: tokens.badSoft, border: `1px solid ${tokens.bad}`, borderRadius: tokens.radiusSm, fontSize: 12.5, color: tokens.bad }}>
          {errorMessage(error)}
          {details.length > 0 && (
            <Box component="ul" sx={{ m: '6px 0 0', pl: '18px' }}>
              {details.map((d, i) => <li key={i}>{d.message}</li>)}
            </Box>
          )}
        </Box>
      )}

      {!progress.complete && (
        <Box sx={{ mb: '14px', p: '12px 14px', bgcolor: tokens.yellowSoft, border: `1px solid ${tokens.amber}`, borderRadius: tokens.radiusSm }}>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.amber, mb: '6px' }}>
            Still outstanding
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: '18px', fontSize: 12.5, color: tokens.ink, lineHeight: 1.6 }}>
            {progress.missing.slice(0, 8).map((m) => <li key={m}>{m}</li>)}
            {progress.missing.length > 8 && <li>…and {progress.missing.length - 8} more</li>}
          </Box>
        </Box>
      )}

      <Grid container spacing="14px">
        <Grid size={{ xs: 12, sm: 5 }}>
          <Field label="Sign-off photograph" req hint="of the person signing">
            <Box component="input" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={pick} sx={{ display: 'none' }} />
            <ButtonBase
              onClick={() => fileRef.current?.click()}
              sx={{
                width: '100%', aspectRatio: '4 / 3', borderRadius: '10px', overflow: 'hidden',
                border: `1px ${preview ? 'solid' : 'dashed'} ${problem ? tokens.bad : preview ? tokens.teal : tokens.slateSofter}`,
                bgcolor: preview ? tokens.ink : tokens.cream, flexDirection: 'column', gap: '6px',
                color: tokens.slate, '&:hover': { borderColor: tokens.teal, color: tokens.tealDark },
              }}
            >
              {preview ? (
                <Box component="img" src={preview} alt="Sign-off photograph" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <Box sx={{ fontSize: 26 }}><Icon name="camera" /></Box>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Take the photograph</Box>
                </>
              )}
            </ButtonBase>
            {preview && (
              <Box sx={{ mt: '6px', textAlign: 'center' }}>
                <Btn size="sm" onClick={() => fileRef.current?.click()}>Retake</Btn>
              </Box>
            )}
            {problem && <Typography sx={{ mt: '6px', fontSize: 11.5, color: tokens.bad }}>{problem}</Typography>}
          </Field>
        </Grid>

        <Grid size={{ xs: 12, sm: 7 }}>
          <Field label="Signed by" sx={{ mb: '12px' }}>
            <TextInput value={me?.name ?? ''} disabled />
          </Field>
          <Field label="Designation" hint="prints beside the signature" sx={{ mb: '12px' }}>
            <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Quality Manager" />
          </Field>

          <Box
            onClick={() => setAgreed((a) => !a)}
            role="checkbox"
            aria-checked={agreed}
            sx={{
              p: '12px 14px', borderRadius: tokens.radiusSm, cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start',
              bgcolor: agreed ? tokens.tealSofter : tokens.cream,
              border: `1px solid ${agreed ? tokens.teal : tokens.line}`,
              '&:hover': { borderColor: tokens.teal },
            }}
          >
            <Box sx={{ width: 20, height: 20, borderRadius: '4px', flexShrink: 0, mt: '1px', bgcolor: agreed ? tokens.tealDark : tokens.card, border: `2px solid ${agreed ? tokens.tealDark : tokens.lineSoft}`, color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {agreed ? '✓' : ''}
            </Box>
            <Typography sx={{ fontSize: 12.5, color: tokens.ink, lineHeight: 1.55 }}>{board?.declaration}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: '14px', p: '10px 14px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: tokens.radiusSm, fontSize: 12, color: tokens.slate, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Box component="span" sx={{ fontSize: 15 }}><Icon name="lock" /></Box>
        <span>Once signed, this record is read-only and the time of signing is stamped on it. If something has to be corrected afterwards, it has to be reopened with a reason, and that reason stays on the record.</span>
      </Box>
    </ModalShell>
  );
}
