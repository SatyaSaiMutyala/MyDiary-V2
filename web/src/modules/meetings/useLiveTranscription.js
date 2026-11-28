import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live speech-to-text from the microphone, through the browser's own recogniser.
 *
 * What this replaces: a timer that played twelve canned lines back, two seconds apart, whatever was
 * said in the room. The lines were saved to the server for real, which made it look like it worked.
 *
 * The recogniser is the browser's (`SpeechRecognition`), so nothing is sent to a transcription
 * service of ours and there is no per-minute cost. Chrome and Edge have it; Firefox does not, and
 * Safari's is unreliable, so `supported` is checked before anything is offered.
 *
 * Two things about it are worth knowing, because both decide how this is written:
 *  - it stops on its own, after a pause or roughly a minute, and it is meant to be restarted. The
 *    `onend` handler restarts it for as long as the person is still recording, so a meeting runs to
 *    its end rather than to the recogniser's.
 *  - it needs a secure context. Over plain http (other than localhost) the browser refuses the
 *    microphone, which `start` reports rather than failing silently.
 *
 * @param {object} opts
 * @param {(text: string) => void} opts.onLine called once per finished sentence
 * @param {string} [opts.lang] BCP-47, e.g. 'en-IN'
 */
export function useLiveTranscription({ onLine, lang = 'en-IN' }) {
  const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = Boolean(Recognition);
  const secure = typeof window === 'undefined' || window.isSecureContext;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [problem, setProblem] = useState('');

  const ref = useRef(null);
  const wantedRef = useRef(false);
  const onLineRef = useRef(onLine);
  useEffect(() => { onLineRef.current = onLine; }, [onLine]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    setListening(false);
    setInterim('');
    const r = ref.current;
    ref.current = null;
    if (r) {
      // Dropped first: without this the end handler would start it again, and stop would not stop.
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try { r.stop(); } catch { /* already stopped */ }
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) { setProblem('This browser cannot listen to the microphone. Use Chrome or Edge on a computer.'); return false; }
    if (!secure) { setProblem('The microphone only works over https. Open MyDiary on its https address and try again.'); return false; }
    if (ref.current) return true;

    setProblem('');
    const r = new Recognition();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        const text = (res[0]?.transcript ?? '').trim();
        if (!text) continue;
        if (res.isFinal) onLineRef.current?.(text);
        else pending += `${text} `;
      }
      setInterim(pending.trim());
    };

    /** Give the microphone back and stop wanting it, without reporting a problem of its own. */
    const release = () => {
      wantedRef.current = false;
      setListening(false);
      setInterim('');
      try { r.stop(); } catch { /* already down */ }
      if (ref.current === r) ref.current = null;
    };

    r.onerror = (e) => {
      // "no-speech" and "aborted" are ordinary: a quiet room, or our own stop(). Neither is worth
      // interrupting somebody mid-meeting for, and the end handler starts listening again.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      // Both are fatal for this attempt, so the microphone is handed back rather than left held by
      // a recogniser that is no longer going to produce anything.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setProblem('MyDiary was refused the microphone. Allow it in the browser’s address bar, then press Record again.');
        release();
        return;
      }
      if (e.error === 'audio-capture') { setProblem('No microphone was found. Plug one in or pick one in the browser’s settings.'); release(); return; }
      if (e.error === 'network') { setProblem('The recogniser could not be reached. Check the connection — anything already captured is saved.'); return; }
      setProblem(`The recogniser stopped: ${e.error}.`);
    };

    // It gives up by itself after a pause; while the person is still recording, that is not the end.
    r.onend = () => {
      setInterim('');
      if (!wantedRef.current) { setListening(false); return; }
      try { r.start(); } catch { setListening(false); }
    };

    wantedRef.current = true;
    try {
      r.start();
      ref.current = r;
      setListening(true);
      return true;
    } catch {
      setProblem('The microphone could not be started. Close anything else using it and try again.');
      wantedRef.current = false;
      return false;
    }
  }, [Recognition, lang, secure, supported]);

  // Leaving the page mid-sentence must not leave the microphone on.
  useEffect(() => stop, [stop]);

  return { supported, secure, listening, interim, problem, start, stop, clearProblem: () => setProblem('') };
}

/** What the recogniser is asked to listen for. The three MyDiary meetings are actually held in. */
export const TRANSCRIPT_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'hi-IN', label: 'हिन्दी · Hindi' },
  { code: 'te-IN', label: 'తెలుగు · Telugu' },
];
