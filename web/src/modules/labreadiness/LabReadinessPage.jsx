import { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, EmptyState, Btn, DateInput, Segmented } from '../../components';
import { useDialog } from '../../components/Dialogs';
import { tokens, fonts } from '../../theme/tokens';
import { useViewerUser } from '../../auth/useViewerUser';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import {
  useAddLabPhotoMutation, useGetLabBoardQuery, useGetLabDayQuery, useGetLabHistoryQuery,
  useRemoveLabPhotoMutation, useReopenLabMutation, useSetLabItemMutation, useSetLabRemarkMutation,
  useSignOffLabMutation,
} from '../../store/api/labReadinessApi';
import { useUpdateMeMutation } from '../../store/api/authApi';
import { errorMessage } from '../../store/api/baseApi';
import ActivityRow from './components/ActivityRow';
import UnitStrip from './components/UnitStrip';
import SignedBanner from './components/SignedBanner';
import { PhotoViewerModal } from './components/PhotoThumb';
import SignOffModal from './modals/SignOffModal';
import { PHASES, bySection, clock, itemOf, photosOf, prettyDate, realToday, shiftDate } from './utils';

/**
 * VIEW: LAB READINESS — the laboratory's daily opening and closing board (TDPL-LAB-SOP-014).
 *
 * Which unit, which day and which round live in the query string, so a board can be linked to, kept
 * across a refresh, and opened straight from a notification. Everything on the screen comes from the
 * department's own checklist in Department Master: nothing here is hard-coded.
 */
export default function LabReadinessPage() {
  const dlg = useDialog();
  const { me, viewer } = useViewerUser();
  const { toast, show } = useToast();
  const [params, setParams] = useSearchParams();
  const [showHistory, setShowHistory] = useState(false);
  const [signing, setSigning] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);

  const date = params.get('date') || realToday();
  const phase = params.get('phase') === 'closing' ? 'closing' : 'opening';
  const unitKey = params.get('unit') || '';

  const go = (next) => setParams((p) => {
    const q = new URLSearchParams(p);
    Object.entries(next).forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k); });
    return q;
  }, { replace: true });

  const day = useGetLabDayQuery({ date });
  const units = day.data?.units ?? [];

  /**
   * Which unit this person works in, kept on their own account.
   *
   * Nobody else can know it — a job title says "Lab Technician", not whether they are in
   * Biochemistry or at Anantapur — so they are asked once, here, and the board opens on their own
   * unit every day after that. An admin can still change it in Settings · Users.
   */
  const myUnit = me?.labUnit ?? '';
  const [saveMyUnit, { isLoading: savingUnit }] = useUpdateMeMutation();
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (unitKey || units.length === 0) return;
    const own = myUnit && units.find((u) => u.key === myUnit);
    if (own) { go({ unit: own.key }); return; }
    // Not said yet: ask, and meanwhile land on the round that still has work in it.
    if (!myUnit) setAsking(true);
    const pending = units.find((u) => !u.phases[phase].signedAt) ?? units[0];
    go({ unit: pending.key });
  }, [unitKey, units, phase, myUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberUnit = async (key) => {
    try {
      await saveMyUnit({ labUnit: key }).unwrap();
      go({ unit: key });
      setAsking(false);
    } catch (err) {
      await dlg.alert(errorMessage(err));
    }
  };

  const boardArg = { unitKey, date, phase };
  const boardQ = useGetLabBoardQuery(boardArg, { skip: !unitKey });
  // Whether a board is on screen is decided by the parameters, not by the query: a skipped query
  // still hands back the board it last fetched.
  const board = unitKey ? boardQ.data : null;

  const history = useGetLabHistoryQuery({ unitKey, limit: 30 }, { skip: !showHistory || !unitKey });

  const [setItem] = useSetLabItemMutation();
  const [setRemark] = useSetLabRemarkMutation();
  const [addPhoto] = useAddLabPhotoMutation();
  const [removePhoto] = useRemoveLabPhotoMutation();
  const [signOff] = useSignOffLabMutation();
  const [reopen] = useReopenLabMutation();
  const [signOpen, setSignOpen] = useState(false);

  const locked = Boolean(board?.run?.signedAt);
  const progress = board?.progress ?? { done: 0, total: 0, missing: [], complete: false };
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const sections = useMemo(() => bySection(board?.activities ?? []), [board?.activities]);
  const basePath = unitKey ? `/lab-readiness/${encodeURIComponent(unitKey)}/${date}/${phase}` : '';

  // Every write goes through here, so the server's own message is what the person sees.
  const run = async (promise, okMessage) => {
    try {
      await promise.unwrap();
      if (okMessage) show(okMessage);
      return true;
    } catch (err) {
      show(err);
      return false;
    }
  };

  const onStatus = (activity, status) => run(setItem({ ...boardArg, taskKey: activity.key, status }));
  const onRemark = (activity, remark) => run(setRemark({ ...boardArg, taskKey: activity.key, remark }));
  const onAddPhoto = (activity, file) => run(addPhoto({ ...boardArg, taskKey: activity.key, file }), '✓ Photograph filed.');

  const onRemovePhoto = async (photo) => {
    if (!await dlg.confirm('Remove this photograph from the record?')) return;
    await run(removePhoto({ ...boardArg, photoId: photo.id }), 'Photograph removed.');
  };

  const onSign = async ({ file, role }) => {
    setSigning(true);
    try {
      await signOff({ ...boardArg, file, role }).unwrap();
      show('✓ Signed off. The record is now read-only.');
    } finally {
      setSigning(false);
    }
  };

  const onReopen = async () => {
    const reason = await dlg.prompt('Why is this record being reopened? The reason stays on the record.');
    if (reason === null) return;
    if (!reason.trim()) { await dlg.alert('A reason is needed before a signed record can be reopened.'); return; }
    await run(reopen({ ...boardArg, reason: reason.trim() }), 'Record reopened — the reason is on the record.');
  };

  const header = (
    <PageHeader
      code="TL-LAB-SOP-014"
      parts={['MyDiary · Personal', 'Daily Readiness Board']}
      icon="🔬"
      title="Lab Readiness"
      sub="The laboratory's opening and closing rounds, unit by unit. Record every activity, photograph what has to be evidenced, then sign the round off — the declaration, the time and your photograph go on the record."
      actions={unitKey ? <Btn size="sm" onClick={() => setShowHistory((s) => !s)}>{showHistory ? 'Hide past records' : '🗂 Past records'}</Btn> : null}
    />
  );

  if (day.isLoading) {
    return (
      <Box>
        {header}
        <Box sx={{ p: '30px', textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', color: tokens.slate, textTransform: 'uppercase' }}>Loading the board…</Box>
      </Box>
    );
  }

  if (day.error) {
    return (
      <Box>
        {header}
        <ApiError error={day.error} onRetry={day.refetch} />
      </Box>
    );
  }

  // Asked before the board is drawn; once answered it never comes back.
  if (asking && units.length > 0) {
    return (
      <Box>
        {header}
        <Box sx={{ p: '26px 28px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, maxWidth: 560 }}>
          <Box sx={{ fontSize: 18, fontWeight: 700, color: tokens.ink, mb: '5px' }}>Which unit do you work in?</Box>
          <Box sx={{ fontSize: 13, color: tokens.slate, mb: '16px' }}>
            Nobody else can know this, so pick it once and it is remembered — your own round opens
            here every day after that. You can still look at any other unit.
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {units.map((u) => (
              <Btn key={u.key} disabled={savingUnit} onClick={() => rememberUnit(u.key)} sx={{ justifyContent: 'space-between' }}>
                {u.name} <Box component="span" sx={{ color: tokens.slateSoft }}>›</Box>
              </Btn>
            ))}
          </Box>
          <Box onClick={() => setAsking(false)} sx={{ mt: '16px', fontSize: 12, color: tokens.slate, cursor: 'pointer', textAlign: 'center', '&:hover': { color: tokens.ink } }}>
            Not now — just show me the board
          </Box>
        </Box>
      </Box>
    );
  }

  if (units.length === 0) {
    return (
      <Box>
        {header}
        <EmptyState icon="🔬" title="No units are set up yet" desc="Add the laboratory's units under Lab Readiness in Department Master, and they will appear here." />
      </Box>
    );
  }

  const unit = units.find((u) => u.key === unitKey);

  return (
    <Box>
      {header}

      <ApiError error={boardQ.error} onRetry={boardQ.refetch} sx={{ mb: '12px' }} />
      <Fetching on={day.isFetching || boardQ.isFetching} />

      {/* The day: which date, and the two rounds */}
      <Box sx={{ p: { xs: '12px 14px', md: '14px 18px' }, bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', mb: '14px' }}>
        <Grid container spacing="12px" sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Btn size="sm" onClick={() => go({ date: shiftDate(date, -1) })} title="The day before">‹</Btn>
              <Box sx={{ width: 170 }}>
                <DateInput value={date} max={realToday()} onChange={(e) => go({ date: e.target.value })} />
              </Box>
              <Btn size="sm" disabled={date >= realToday()} onClick={() => go({ date: shiftDate(date, 1) })} title="The day after">›</Btn>
              {date !== realToday() && <Btn size="sm" onClick={() => go({ date: realToday() })}>Today</Btn>}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 'grow' }}>
            <Box sx={{ maxWidth: 320 }}>
              <Segmented
                value={phase}
                onChange={(p) => go({ phase: p })}
                options={PHASES.map((p) => ({ value: p.key, label: p.label }))}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 'auto' }}>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '0.06em', color: tokens.slate, fontWeight: 700, textAlign: { xs: 'left', md: 'right' } }}>
              {day.data.department.name} · cut-off {phase === 'opening' ? day.data.openingCutoff : day.data.closingCutoff}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <UnitStrip units={units} selected={unitKey} phase={phase} onPick={(u, p) => go({ unit: u, phase: p })} />

      {!board ? (
        <Box sx={{ p: '30px', textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', color: tokens.slate, textTransform: 'uppercase' }}>
          {boardQ.isLoading ? 'Opening the unit…' : 'Pick a unit above'}
        </Box>
      ) : (
        <>
          {/* The chosen board */}
          <Box sx={{ background: `linear-gradient(135deg, ${tokens.greenDeep}, ${tokens.tealDark})`, color: '#fff', borderRadius: '14px', p: { xs: '16px 18px', md: '20px 24px' }, mb: '16px' }}>
            <Grid container spacing="16px" sx={{ alignItems: 'center' }}>
              <Grid size="grow">
                <Typography component="h2" sx={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 700, m: 0 }}>
                  {board.unit.name}
                </Typography>
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, opacity: 0.85, mt: '4px', letterSpacing: '0.06em' }}>
                  {phase === 'opening' ? '🌅 OPENING ROUND' : '🌙 CLOSING ROUND'} · {prettyDate(board.date)}
                  {board.run?.startedAt ? ` · started ${clock(board.run.startedAt)}` : ''}
                </Typography>
                <Typography sx={{ fontSize: 13, opacity: 0.92, mt: '8px', maxWidth: 620, lineHeight: 1.5 }}>
                  {locked
                    ? `Signed off by ${board.run.signedBy.name} at ${clock(board.run.signedAt)}. The record is read-only.`
                    : progress.complete
                      ? 'Everything is recorded. Sign the round off to close it.'
                      : `${progress.total - progress.done} of ${progress.total} activities still to record.`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 'auto' }}>
                <Box sx={{ display: 'flex', gap: '18px', alignItems: 'center', justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box component="svg" viewBox="0 0 100 100" sx={{ width: 84, height: 84 }}>
                      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="38" fill="none" stroke={tokens.yellow} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 - (pct / 100) * 2 * Math.PI * 38}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.4s' }}
                      />
                      <text x="50" y="50" fill="#fff" fontFamily={fonts.serif} fontSize="19" fontWeight="700" textAnchor="middle" dominantBaseline="central">{pct}%</text>
                    </Box>
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 9, opacity: 0.85, letterSpacing: '0.1em', mt: '2px', textTransform: 'uppercase' }}>{progress.done}/{progress.total} done</Box>
                  </Box>
                  {!locked && (
                    <Btn
                      variant="dark"
                      onClick={() => setSignOpen(true)}
                      sx={{ bgcolor: progress.complete ? tokens.yellow : 'rgba(255,255,255,.14)', color: progress.complete ? tokens.greenDeep : '#fff', borderColor: progress.complete ? tokens.yellow : 'rgba(255,255,255,.4)', fontWeight: 700, '&:hover': { bgcolor: progress.complete ? tokens.goldDark : 'rgba(255,255,255,.22)' } }}
                    >
                      ✍ Sign off
                    </Btn>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>

          {locked && (
            <Box sx={{ mb: '14px', p: '10px 14px', bgcolor: tokens.okSoft, border: `1px solid ${tokens.ok}`, borderRadius: tokens.radiusSm, fontSize: 12.5, color: tokens.ink, display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Box component="span" sx={{ fontSize: 15 }}>🔒</Box>
              <span>This round is signed off, so nothing on it can be changed. Reopen it at the foot of the page if a correction is genuinely needed.</span>
            </Box>
          )}

          {sections.map((sec, si) => {
            const items = sec.items.map((a) => ({ a, item: itemOf(board.run, a.key), photos: photosOf(board.run, a.key) }));
            const doneCt = items.filter((x) => x.item?.status).length;
            return (
              <Box key={sec.heading} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', mb: '14px', overflow: 'hidden', borderLeft: `4px solid ${phase === 'opening' ? tokens.teal : tokens.orange}` }}>
                <Box sx={{ p: { xs: '12px 14px', md: '13px 18px' }, bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 700, color: tokens.ink }}>
                    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slateSoft, mr: '8px', letterSpacing: '0.08em' }}>{String(si + 1).padStart(2, '0')}</Box>
                    {sec.heading}
                  </Typography>
                  <Box sx={{ p: '4px 10px', bgcolor: doneCt === items.length ? tokens.tealDark : tokens.card, border: `1px solid ${doneCt === items.length ? tokens.tealDark : tokens.line}`, borderRadius: '12px', fontFamily: fonts.mono, fontSize: 10.5, fontWeight: 700, color: doneCt === items.length ? '#fff' : tokens.ink, letterSpacing: '0.04em' }}>
                    {doneCt}/{items.length}
                  </Box>
                </Box>
                <Box sx={{ p: { xs: '8px 10px', md: '10px 14px' } }}>
                  {items.map(({ a, item, photos }) => (
                    <ActivityRow
                      key={a.key}
                      activity={a}
                      item={item}
                      photos={photos}
                      locked={locked}
                      photoPath={basePath}
                      onStatus={(status) => onStatus(a, status)}
                      onRemark={(remark) => onRemark(a, remark)}
                      onAddPhoto={(file) => onAddPhoto(a, file)}
                      onRemovePhoto={onRemovePhoto}
                      onOpenPhoto={(p) => setViewPhoto({ photo: p, activity: a })}
                      onError={(msg) => show(msg, 'error')}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}

          {locked
            ? <SignedBanner board={board} selfiePath={`${basePath}/selfie`} canReopen onReopen={onReopen} />
            : (
              <Box sx={{ mt: '16px', p: { xs: '14px 16px', md: '16px 20px' }, bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '12px' }}>
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.slateSoft, mb: '6px' }}>
                  The declaration you will be signing
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.ink, lineHeight: 1.6, fontStyle: 'italic', mb: '12px' }}>“{board.declaration}”</Typography>

                {/* A record that was signed and opened again keeps saying so while it is open, not only
                    once it has been signed a second time. */}
                {(board.run?.reopenLog ?? []).length > 0 && (
                  <Box sx={{ mb: '12px', p: '10px 12px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radiusSm }}>
                    <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: tokens.amber, mb: '6px' }}>
                      🔓 Reopened {board.run.reopenLog.length} time{board.run.reopenLog.length === 1 ? '' : 's'} after sign-off
                    </Typography>
                    {board.run.reopenLog.map((r, i) => (
                      <Typography key={i} sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.6 }}>
                        <strong>{r.by || 'Somebody'}</strong> · {prettyDate(r.at.slice(0, 10))} {clock(r.at)} — {r.reason}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Btn variant="primary" onClick={() => setSignOpen(true)} disabled={!progress.complete}>
                  {progress.complete ? '✍ Sign off this round' : `${progress.missing.length} item${progress.missing.length === 1 ? '' : 's'} still outstanding`}
                </Btn>
              </Box>
            )}

          {showHistory && (
            <Box sx={{ mt: '18px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', overflow: 'hidden' }}>
              <Box sx={{ p: '13px 18px', bgcolor: tokens.cream, borderBottom: `1px solid ${tokens.line}` }}>
                <Typography sx={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: 700 }}>🗂 Past records · {board.unit.name}</Typography>
              </Box>
              <Box sx={{ p: '10px 14px' }}>
                {history.isLoading && <Typography sx={{ p: '10px', fontSize: 12, color: tokens.slate }}>Loading…</Typography>}
                <ApiError error={history.error} sx={{ m: '8px 0' }} />
                {(history.data ?? []).length === 0 && !history.isLoading && (
                  <Typography sx={{ p: '14px', textAlign: 'center', fontSize: 12, color: tokens.slateSoft, fontStyle: 'italic' }}>No records for this unit yet.</Typography>
                )}
                {(history.data ?? []).map((r) => (
                  <Box
                    key={r.id}
                    onClick={() => go({ unit: r.unitKey, date: r.date, phase: r.phase })}
                    sx={{ p: '10px 12px', m: '4px 0', borderRadius: '8px', border: `1px solid ${tokens.line}`, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer', '&:hover': { borderColor: tokens.teal, bgcolor: tokens.tealSofter } }}
                  >
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: tokens.ink, width: 108 }}>{prettyDate(r.date)}</Box>
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '2px 8px', borderRadius: '10px', bgcolor: r.phase === 'opening' ? tokens.tealSoft : tokens.orangeSoft, color: r.phase === 'opening' ? tokens.tealDark : tokens.orange, fontWeight: 700 }}>
                      {r.phase === 'opening' ? 'OPENING' : 'CLOSING'}
                    </Box>
                    <Box sx={{ fontSize: 12, color: tokens.slate, flex: 1, minWidth: 140 }}>
                      {r.done}/{r.total} recorded{r.deviations ? ` · ${r.deviations} deviation${r.deviations === 1 ? '' : 's'}` : ''}{r.photos ? ` · ${r.photos} photo${r.photos === 1 ? '' : 's'}` : ''}{r.reopened ? ` · reopened ${r.reopened}×` : ''}
                    </Box>
                    <Box sx={{ fontFamily: fonts.mono, fontSize: 9.5, p: '2px 8px', borderRadius: '10px', bgcolor: r.signedAt ? (r.late ? tokens.warnSoft : tokens.okSoft) : tokens.greySoft, color: r.signedAt ? (r.late ? tokens.warn : tokens.ok) : tokens.slateSoft, fontWeight: 700 }}>
                      {r.signedAt ? `${r.late ? 'LATE · ' : ''}${r.signedBy}` : 'NOT SIGNED'}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      <SignOffModal
        open={signOpen}
        board={board}
        me={me ?? viewer}
        signing={signing}
        onClose={() => setSignOpen(false)}
        onSign={onSign}
      />
      <PhotoViewerModal
        open={Boolean(viewPhoto)}
        path={viewPhoto ? `${basePath}/photos/${viewPhoto.photo.id}` : ''}
        photo={viewPhoto?.photo}
        activity={viewPhoto?.activity}
        onClose={() => setViewPhoto(null)}
      />
      {toast}

      <Box sx={{ mt: '20px', p: '12px 16px', bgcolor: tokens.creamWarm, border: `1px solid ${tokens.line}`, borderRadius: '8px', fontSize: 12, color: tokens.slate, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Box component="span" sx={{ fontSize: 16 }}>💡</Box>
        <span>
          {unit ? `${unit.name} · ` : ''}The checklist, the units and the two cut-off times come from Lab Readiness in Department Master. A signed record keeps the wording it was signed with, so correcting the master checklist later never rewrites what was signed.
        </span>
      </Box>
    </Box>
  );
}
