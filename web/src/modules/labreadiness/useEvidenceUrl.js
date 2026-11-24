import { useEffect, useState } from 'react';
import { API_BASE, errorMessage, getToken, getViewAs } from '../../store/api/baseApi';

/**
 * An evidence photograph as a URL an <img> can show.
 *
 * The image routes need the Authorization header, which `<img src>` cannot send, so the bytes are
 * fetched here and handed over as a blob URL. The URL is revoked when the component unmounts or asks
 * for a different photograph, so a board full of thumbnails does not leak a blob per render.
 *
 * @param {string} path the API path, e.g. `/lab-readiness/nrl-biochemistry/2026-11-24/opening/photos/<id>`
 * @returns {{ url: string, loading: boolean, error: string }}
 */
export function useEvidenceUrl(path) {
  const [state, setState] = useState({ url: '', loading: Boolean(path), error: '' });

  useEffect(() => {
    if (!path) { setState({ url: '', loading: false, error: '' }); return undefined; }
    let url = '';
    let alive = true;
    setState({ url: '', loading: true, error: '' });

    (async () => {
      try {
        const viewAs = getViewAs();
        const res = await fetch(`${API_BASE}${path}`, {
          headers: {
            ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}),
            ...(viewAs ? { 'x-view-as': viewAs } : {}),
          },
        });
        if (!res.ok) {
          // The API's own words, when it sent any.
          let message = `The photograph could not be loaded (status ${res.status}).`;
          try { message = errorMessage({ data: await res.json() }) || message; } catch { /* not JSON */ }
          throw new Error(message);
        }
        const blob = await res.blob();
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setState({ url, loading: false, error: '' });
      } catch (err) {
        if (alive) setState({ url: '', loading: false, error: err.message || 'The photograph could not be loaded.' });
      }
    })();

    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);

  return state;
}
