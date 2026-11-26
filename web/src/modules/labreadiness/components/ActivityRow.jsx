import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { tokens, fonts } from '../../../theme/tokens';
import { TextArea, Icon } from '../../../components';
import PhotoThumb from './PhotoThumb';
import { STATUSES, checkPhoto, statusStyle, whatIsMissing } from '../utils';

/** The three answers, as one segmented control. */
function StatusPicker({ value, locked, onPick }) {
  return (
    <Box sx={{ display: 'inline-flex', border: `1px solid ${tokens.line}`, borderRadius: '7px', overflow: 'hidden', bgcolor: tokens.card, flexShrink: 0 }}>
      {STATUSES.map((s, i) => {
        const active = value === s.key;
        return (
          <ButtonBase
            key={s.key}
            disabled={locked}
            onClick={() => onPick(active ? null : s.key)}
            title={locked ? 'This record is signed off' : active ? `Clear "${s.label}"` : s.hint}
            sx={{
              px: { xs: '9px', sm: '11px' }, py: '6px', gap: '5px', minHeight: 32,
              fontFamily: fonts.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              borderLeft: i ? `1px solid ${tokens.line}` : 'none',
              bgcolor: active ? s.color : 'transparent',
              color: active ? '#fff' : tokens.slate,
              opacity: locked && !active ? 0.45 : 1,
              '&:hover': active ? {} : { bgcolor: s.soft, color: s.color },
            }}
          >
            <Icon name={s.icon} size={12} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{s.label}</Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/**
 * One line of the readiness sheet.
 *
 * The remark keeps its own text while it is being typed and saves when the field is left, so a
 * half-written sentence is never sent and the caret never jumps mid-word. A deviation without a
 * remark, or a photo-required activity without a photograph, says so in the row itself rather than
 * waiting for the sign-off to be refused.
 */
export default function ActivityRow({
  activity, item, photos, locked, photoPath,
  onStatus, onRemark, onAddPhoto, onRemovePhoto, onOpenPhoto, onError,
}) {
  const status = item?.status ?? null;
  const look = statusStyle(status);
  const missing = whatIsMissing(activity, item, photos);
  const fileRef = useRef(null);

  // The remark field: the server's text while idle, the typed text while being written.
  //
  // It saves a moment after typing stops as well as when the field is left, so a remark typed and
  // then left alone — a tab closed, a phone locked, the Sign off button tapped — is never lost.
  const [remark, setRemark] = useState(item?.remark ?? '');
  const [typing, setTyping] = useState(false);
  const saveTimer = useRef(null);
  useEffect(() => { if (!typing) setRemark(item?.remark ?? ''); }, [item?.remark, typing]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const saved = item?.remark ?? '';
  const flush = (text) => {
    clearTimeout(saveTimer.current);
    setTyping(false);
    if ((text ?? '') !== saved) onRemark(text);
  };
  const typeRemark = (text) => {
    setTyping(true);
    setRemark(text);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flush(text), 900);
  };

  // A deviation and an N/A both have to say why; anything else may carry a note.
  const needsRemark = status === 'deviation' || status === 'na';
  const showRemark = needsRemark || (remark ?? '').trim() !== '';
  const remarkPrompt = status === 'na'
    ? 'Why does this not apply today? This is the record of the decision.'
    : 'What happened, what was done about it, and who was told — this is the deviation record.';

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkPhoto(file);
    if (problem) { onError(problem); return; }
    onAddPhoto(file);
  };

  return (
    <Box
      sx={{
        p: { xs: '11px 12px', md: '12px 14px' },
        m: '6px 0',
        bgcolor: status ? tokens.card : tokens.cream,
        border: `1px solid ${look ? look.color : tokens.line}`,
        borderLeft: `4px solid ${look ? look.color : activity.mine ? tokens.teal : tokens.lineSoft}`,
        borderRadius: '8px',
        transition: 'border-color .12s ease, background .12s ease',
        '&:hover': { borderColor: look ? look.color : tokens.slateSofter },
      }}
    >
      <Box sx={{ display: 'flex', gap: { xs: '10px', md: '14px' }, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Box sx={{ fontFamily: fonts.mono, fontSize: 10, fontWeight: 700, color: tokens.slateSoft, letterSpacing: '0.06em', pt: '7px', width: 34, flexShrink: 0 }}>
          {activity.key}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: tokens.ink, lineHeight: 1.5 }}>{activity.text}</Typography>

          <Box sx={{ display: 'flex', gap: '6px', mt: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {activity.scheduledTime && (
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '3px 8px', borderRadius: '10px', bgcolor: tokens.creamWarm, color: tokens.slate, fontWeight: 700, letterSpacing: '0.04em' }}>
                ⏱ {activity.scheduledTime}
              </Box>
            )}
            {activity.photoRequired && (
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '3px 8px', borderRadius: '10px', bgcolor: photos.length ? tokens.okSoft : tokens.yellowSoft, color: photos.length ? tokens.ok : tokens.amber, fontWeight: 700, letterSpacing: '0.04em' }}>
                <Icon name="photo" />{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'Photo required'}
              </Box>
            )}
            {/* Whose line this is. No chip at all means everyone's, exactly as an untagged
                shift task behaves. */}
            {(activity.positions ?? []).map((p) => (
              <Box
                key={p.id}
                title={activity.mine ? `Your line — ${p.name}` : `${p.name}'s line`}
                sx={{
                  fontFamily: fonts.mono, fontSize: 9.5, p: '3px 8px', borderRadius: '10px', fontWeight: 700, letterSpacing: '0.04em',
                  bgcolor: activity.mine ? tokens.tealDark : tokens.creamWarm,
                  color: activity.mine ? '#fff' : tokens.slate,
                }}
              >
                {p.name}
              </Box>
            ))}
            {item?.actionedBy && (
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '3px 8px', borderRadius: '10px', bgcolor: tokens.tealSofter, color: tokens.tealDark, fontWeight: 700, letterSpacing: '0.04em' }}>
                {item.actionedBy}
              </Box>
            )}
            {missing && !locked && (
              <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '3px 8px', borderRadius: '10px', bgcolor: tokens.badSoft, color: tokens.bad, fontWeight: 700, letterSpacing: '0.04em' }}>
                {missing}
              </Box>
            )}
          </Box>

          {showRemark && (
            <Box sx={{ mt: '8px' }}>
              <TextArea
                minRows={2}
                value={remark}
                disabled={locked}
                placeholder={needsRemark ? remarkPrompt : 'Note (optional)'}
                onChange={(e) => typeRemark(e.target.value)}
                onBlur={() => flush(remark)}
                sx={{
                  '& textarea.MuiInputBase-input': {
                    fontSize: 12.5, minHeight: 40,
                    // An unexplained deviation is the one thing that cannot be left: say so in the field.
                    ...(needsRemark && !(remark ?? '').trim() ? { borderColor: tokens.bad, bgcolor: tokens.badSoft } : {}),
                  },
                }}
              />
            </Box>
          )}

          {(photos.length > 0 || (activity.photoRequired && !locked)) && (
            <Box sx={{ display: 'flex', gap: '8px', mt: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {photos.map((p) => (
                <PhotoThumb
                  key={p.id}
                  photo={p}
                  path={`${photoPath}/photos/${p.id}`}
                  locked={locked}
                  onOpen={() => onOpenPhoto(p)}
                  onRemove={() => onRemovePhoto(p)}
                />
              ))}
              {!locked && (
                <>
                  <Box component="input" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pick} sx={{ display: 'none' }} />
                  <ButtonBase
                    onClick={() => fileRef.current?.click()}
                    title="Take or choose a photograph"
                    sx={{
                      width: 58, height: 58, borderRadius: '8px', flexDirection: 'column', gap: '2px',
                      border: `1px dashed ${activity.photoRequired && !photos.length ? tokens.amber : tokens.slateSofter}`,
                      bgcolor: activity.photoRequired && !photos.length ? tokens.yellowSoft : tokens.card,
                      color: activity.photoRequired && !photos.length ? tokens.amber : tokens.slate,
                      '&:hover': { borderColor: tokens.teal, color: tokens.tealDark, bgcolor: tokens.tealSofter },
                    }}
                  >
                    <Box sx={{ fontSize: 16 }}><Icon name="photo" /></Box>
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em' }}>ADD</Box>
                  </ButtonBase>
                </>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ pt: '2px', ml: { xs: '34px', md: 0 } }}>
          <StatusPicker value={status} locked={locked} onPick={onStatus} />
        </Box>
      </Box>
    </Box>
  );
}
