import { useCallback, useEffect, useRef, useState } from 'react';

/** How long to wait before trying a failed save again, growing to half a minute. */
const BACKOFF = [1000, 2000, 5000, 10000, 30000];

/**
 * Keeps every captured line until the server has it.
 *
 * Spoken words cannot be said again. The first version sent each sentence on its own and dropped it
 * on any failure — a dipped wifi, a token refresh, a slow server — so the line was simply gone and
 * the only sign was a toast that scrolled past. A meeting is the one place where losing the record
 * is worse than anything else on the screen.
 *
 * So lines queue here. A send takes everything waiting, in order; a failure puts them back at the
 * front and tries again, slower each time. Nothing is dropped, nothing is reordered, and `pending`
 * says how many are still in the air so the screen can show it and warn before the meeting is
 * closed with words still unsaved.
 *
 * @param {object} opts
 * @param {(lines: any[]) => Promise<any>} opts.send does the actual POST; must reject on failure
 */
export function useTranscriptSink({ send }) {
  const queue = useRef([]);
  const flushing = useRef(false);
  const timer = useRef(null);
  const attempt = useRef(0);
  const alive = useRef(true);
  const [pending, setPending] = useState(0);
  // The lines themselves, so the screen can show words that have been said but not yet stored.
  const [waiting, setWaiting] = useState([]);
  const [failing, setFailing] = useState(false);

  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  /**
   * Set on the way in as well as cleared on the way out. React runs an effect, cleans it up and runs
   * it again in development; a flag that is only ever cleared stays cleared, and every retry below
   * then bailed out before scheduling itself — an outage lost the lot, silently. Found by cutting
   * the network for real rather than by reading the code.
   */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);

  // Held in a ref so the retry timer and the recursive drain call the current one, rather than the
  // closure capturing itself while it is still being defined.
  const flushRef = useRef(null);
  const flush = useCallback(async () => {
    if (flushing.current || !queue.current.length) return;
    flushing.current = true;
    // Taken together: one request for a burst of sentences beats one request each.
    const batch = queue.current;
    queue.current = [];
    try {
      await sendRef.current(batch);
      if (!alive.current) return;
      attempt.current = 0;
      setFailing(false);
      setPending(queue.current.length);
      setWaiting(queue.current);
    } catch {
      // Back at the front, in the order they were said, ahead of anything captured since.
      queue.current = [...batch, ...queue.current];
      if (!alive.current) return;
      setPending(queue.current.length);
      setWaiting(queue.current);
      setFailing(true);
      const wait = BACKOFF[Math.min(attempt.current, BACKOFF.length - 1)];
      attempt.current += 1;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => flushRef.current?.(), wait);
      return;
    } finally {
      flushing.current = false;
    }
    if (queue.current.length) flushRef.current?.();
  }, []);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  /** Takes one line. It is kept until the server confirms it. */
  const push = useCallback((line) => {
    queue.current = [...queue.current, line];
    setPending(queue.current.length);
    setWaiting(queue.current);
    flush();
  }, [flush]);

  /** Tries again now, for the "Retry" the screen offers while saves are failing. */
  const retryNow = useCallback(() => {
    clearTimeout(timer.current);
    attempt.current = 0;
    flushing.current = false;
    flush();
  }, [flush]);

  return { push, pending, waiting, failing, retryNow };
}
