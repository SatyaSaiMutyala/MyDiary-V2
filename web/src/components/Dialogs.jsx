import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ModalShell from './ModalShell';
import Btn from './Btn';
import { tokens, fonts } from '../theme/tokens';

/**
 * In-app replacements for the browser's alert / confirm / prompt, in the MyDiary style.
 *
 * The browser ones are grey OS boxes that say "localhost:5173 says", cannot be styled, cannot show a
 * second line properly, and freeze the whole tab. These look like the rest of the app, and because they
 * return a promise the calling code reads almost the same:
 *
 *   const dlg = useDialog();
 *   await dlg.alert('✓ Meeting scheduled.');            // one OK button
 *   if (!(await dlg.confirm('Delete this?'))) return;   // true / false
 *   const name = await dlg.prompt('New name', old);     // the text, or null if cancelled
 *   dlg.toast('✓ Saved.');                              // no dialog at all, fades by itself
 *
 * The leading mark in the message picks the colour: ✓ reads as success, ⚠ as a warning, ✗ or "Cannot"
 * as a problem. Nothing else is inferred, so the wording stays exactly what the caller wrote.
 */

const DialogCtx = createContext(null);

/** The tone a message carries, from the mark it starts with. @param {string} text */
function toneOf(text = '') {
  const t = String(text).trim();
  if (/^✓/.test(t)) return 'ok';
  if (/^(✗|❌)/.test(t) || /^(cannot|could not|unable|failed)/i.test(t)) return 'bad';
  if (/^(⚠|!)/.test(t)) return 'warn';
  return 'info';
}

const TONE = {
  ok: { icon: '✓', bg: tokens.okSoft, fg: tokens.ok },
  bad: { icon: '!', bg: tokens.badSoft, fg: tokens.bad },
  warn: { icon: '⚠', bg: tokens.warnSoft, fg: tokens.warn },
  info: { icon: 'i', bg: tokens.tealSoft, fg: tokens.teal },
};

/** The round mark beside the message. */
function ToneMark({ tone }) {
  const t = TONE[tone] ?? TONE.info;
  return (
    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0, fontFamily: fonts.mono }}>
      {t.icon}
    </Box>
  );
}

/**
 * Wrap the app once, high up, so every screen can ask for a dialog.
 * Only one dialog is shown at a time; asking again while one is open queues behind it.
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const [toasts, setToasts] = useState([]);
  const queue = useRef([]);
  const inputRef = useRef(null);
  /**
   * The dialog on screen, mirrored outside React state.
   *
   * Both of the things below have to happen exactly once — queueing a dialog, and resolving the
   * promise of the one being answered — and a setState updater is the wrong place for either:
   * React calls updaters twice under StrictMode, which queued the same dialog twice and made an
   * answered dialog reappear, so the button that opened it looked like it had done nothing.
   */
  const current = useRef(null);

  const show = useCallback((item) => {
    current.current = item;
    setValue(item?.defaultValue ?? '');
    setDialog(item);
  }, []);

  const open = useCallback((spec) => new Promise((resolve) => {
    const item = { ...spec, resolve };
    if (current.current) {
      queue.current.push(item);
      return;
    }
    show(item);
  }), [show]);

  const settle = useCallback((answer) => {
    const answered = current.current;
    if (!answered) {
      return;
    }
    // Clear it first, so a second click on the same button cannot resolve it twice.
    current.current = null;
    answered.resolve(answer);
    show(queue.current.shift() ?? null);
  }, [show]);

  const api = useMemo(() => ({
    /** One message, one OK button. Resolves when it is dismissed. */
    alert: (message, opts = {}) => open({ kind: 'alert', message, ...opts }),
    /** Resolves true when confirmed, false when cancelled or dismissed. */
    confirm: (message, opts = {}) => open({ kind: 'confirm', message, ...opts }),
    /** Resolves the typed text, or null when cancelled. */
    prompt: (message, defaultValue = '', opts = {}) => open({ kind: 'prompt', message, defaultValue, ...opts }),
    /** A line that slides in and fades by itself — for things nobody needs to acknowledge. */
    toast: (message, tone) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, tone: tone ?? toneOf(message) }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
    },
  }), [open]);

  const kind = dialog?.kind;
  const tone = dialog ? (dialog.tone ?? (kind === 'alert' ? toneOf(dialog.message) : 'info')) : 'info';
  const title = dialog?.title ?? { alert: 'MyDiary', confirm: 'Please confirm', prompt: 'MyDiary' }[kind];

  const submit = (e) => { e?.preventDefault?.(); settle(kind === 'prompt' ? value : true); };

  return (
    <DialogCtx.Provider value={api}>
      {children}

      <ModalShell
        open={Boolean(dialog)}
        onClose={() => settle(kind === 'prompt' ? null : kind === 'confirm' ? false : undefined)}
        width={460}
        title={title}
        sub={dialog?.sub}
        icon={kind === 'prompt' ? '✎' : undefined}
        bodySx={{ p: { xs: '18px', md: '20px 22px' } }}
        footer={
          <>
            <Box />
            <Box sx={{ display: 'flex', gap: '10px' }}>
              {kind !== 'alert' && (
                <Btn variant="default" size="sm" onClick={() => settle(kind === 'prompt' ? null : false)}>
                  {dialog?.cancelText ?? 'Cancel'}
                </Btn>
              )}
              <Btn variant="primary" size="sm" onClick={submit}>
                {dialog?.okText ?? (kind === 'confirm' ? 'Yes, continue' : kind === 'prompt' ? 'Save' : 'OK')}
              </Btn>
            </Box>
          </>
        }
      >
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {kind !== 'prompt' && <ToneMark tone={tone} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, color: tokens.ink, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {dialog?.message}
            </Typography>
            {kind === 'prompt' && (
              <Box
                component="input"
                ref={inputRef}
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={dialog?.placeholder ?? ''}
                sx={{ mt: '12px', width: '100%', p: '9px 11px', fontSize: 13.5, fontFamily: 'inherit', color: tokens.ink, bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radiusSm, outline: 'none', '&:focus': { borderColor: tokens.teal, boxShadow: `0 0 0 3px ${tokens.tealSofter}` } }}
              />
            )}
          </Box>
        </Box>
      </ModalShell>

      {/* toasts — bottom right, newest last, never blocking anything */}
      {toasts.length > 0 && (
        <Box sx={{ position: 'fixed', right: 18, bottom: 18, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 'calc(100vw - 36px)' }}>
          {toasts.map((t) => {
            const c = TONE[t.tone] ?? TONE.info;
            return (
              <Box key={t.id} role="status"
                sx={{ display: 'flex', alignItems: 'center', gap: '10px', bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderLeft: `3px solid ${c.fg}`, borderRadius: tokens.radiusSm, boxShadow: tokens.shadowLg, p: '10px 14px', fontSize: 13, color: tokens.ink, maxWidth: 420, animation: 'mdToastIn .18s ease', '@keyframes mdToastIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } }}>
                <Box sx={{ color: c.fg, fontWeight: 700, fontFamily: fonts.mono, flexShrink: 0 }}>{c.icon}</Box>
                <Box sx={{ whiteSpace: 'pre-line' }}>{t.message}</Box>
              </Box>
            );
          })}
        </Box>
      )}
    </DialogCtx.Provider>
  );
}

/**
 * The dialogs, from any screen inside DialogProvider.
 * @returns {{ alert: (m: string, o?: object) => Promise<void>, confirm: (m: string, o?: object) => Promise<boolean>, prompt: (m: string, d?: string, o?: object) => Promise<string|null>, toast: (m: string, tone?: string) => void }}
 */
export function useDialog() {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error('useDialog() needs <DialogProvider> above it — see components/Dialogs.jsx');
  return ctx;
}
