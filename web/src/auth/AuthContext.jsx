import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { baseApi, onUnauthorized, readAuth, toError, writeAuth } from '../store/api/baseApi';
import { spectate } from '../features/spectate';
import { authApi, useLoginMutation, useLogoutMutation } from '../store/api/authApi';

const AuthContext = createContext(null);
const RETRY_MS = 4000;

/** `vite build --mode qa` signs in with the dev admin so screenshot tooling can reach every page (needs the API up). */
const QA = import.meta.env.MODE === 'qa'
  ? { email: import.meta.env.VITE_QA_EMAIL || 'venkata.cherukuri@trustlab.co.in', password: import.meta.env.VITE_QA_PASSWORD || 'mydiary123' }
  : null;

/**
 * Real sessions (GateBook shape: status / user / login / logout).
 *  - login(email, password) → POST /api/auth/login, stores { token, user } in localStorage `md.auth`
 *  - on load: with a stored token, status is 'loading' until GET /api/auth/me answers; 401 clears the
 *    session, an unreachable server keeps the token and retries every 4 s
 *  - logout() → POST /api/auth/logout, then clears the session and every cached API result
 *  - any 401 from any endpoint signs the person out (baseApi → onUnauthorized)
 */
export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [session, setSession] = useState(() => readAuth());
  const [status, setStatus] = useState(() => (readAuth()?.token || QA ? 'loading' : 'signedOut'));
  const [connectionError, setConnectionError] = useState(null);
  const [loginCall] = useLoginMutation();
  const [logoutCall] = useLogoutMutation();
  const retryRef = useRef(null);

  const save = useCallback((next) => { writeAuth(next); setSession(next); }, []);

  const clear = useCallback(() => {
    clearTimeout(retryRef.current);
    // Leaving spectator mode on would follow the next person into their session — and for anyone who
    // is not an admin every request would then be refused.
    spectate(null);
    save(null);
    setStatus('signedOut');
    setConnectionError(null);
    dispatch(baseApi.util.resetApiState());
  }, [dispatch, save]);

  const login = useCallback(async (email, password) => {
    if (!email.trim() || !password) throw new Error('Enter your email and password.');
    let data;
    try { data = await loginCall({ email: email.trim(), password }).unwrap(); } catch (err) { throw toError(err); }
    spectate(null);   // a fresh sign-in always starts in your own view
    dispatch(baseApi.util.resetApiState());
    save({ token: data.token, user: data.user });
    setStatus('signedIn');
    setConnectionError(null);
    return data.user;
  }, [dispatch, loginCall, save]);

  const logout = useCallback(async () => {
    try { await logoutCall().unwrap(); } catch { /* the token may already be dead; sign out locally anyway */ }
    clear();
  }, [clear, logoutCall]);

  /** Replace the cached user (after PATCH /api/auth/me). */
  const updateUser = useCallback((user) => setSession((s) => { const next = s ? { ...s, user } : s; writeAuth(next); return next; }), []);

  // 401 anywhere → signed out.
  useEffect(() => { onUnauthorized.handler = () => clear(); return () => { onUnauthorized.handler = null; }; }, [clear]);

  // Restore the session on load: GET /api/auth/me with the stored token (or QA auto sign-in).
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const stored = readAuth();
      if (!stored?.token) {
        if (!QA) { setStatus('signedOut'); return; }
        try { await login(QA.email, QA.password); } catch (err) {
          if (cancelled) return;
          if (err.unreachable) { setConnectionError(err.message); retryRef.current = setTimeout(restore, RETRY_MS); } else { setStatus('signedOut'); }
        }
        return;
      }
      const result = await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
      if (cancelled) return;
      if (result.data) { save({ token: stored.token, user: result.data }); setStatus('signedIn'); setConnectionError(null); return; }
      const err = toError(result.error);
      if (err.status === 401) { clear(); return; }
      // Server unreachable (or a 5xx): keep the token, say so, try again shortly.
      setConnectionError(err.message);
      retryRef.current = setTimeout(restore, RETRY_MS);
    };
    if (status === 'loading') restore();
    return () => { cancelled = true; clearTimeout(retryRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ status, user: session?.user ?? null, token: session?.token ?? null, connectionError, login, logout, updateUser }),
    [status, session, connectionError, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
