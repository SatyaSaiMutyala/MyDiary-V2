// One RTK Query API for the whole app. Module slices add their endpoints with `baseApi.injectEndpoints`.
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** `${VITE_API_URL}/api` in a deployed build; `/api` in dev (Vite proxies it to the backend). */
export const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : '/api';

/** localStorage key for `{ token, user }`. */
export const AUTH_KEY = 'md.auth';
export function readAuth() {
  try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeAuth(session) {
  try { if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session)); else localStorage.removeItem(AUTH_KEY); } catch { /* storage blocked */ }
}
export const getToken = () => readAuth()?.token || null;

export const NO_CONNECTION = 'No connection to the server. Check your network and try again.';

/** True when the request never reached our API (network down, proxy target down, non-JSON reply). */
export function isUnreachable(err) {
  const s = err?.status;
  return s === 'FETCH_ERROR' || s === 'TIMEOUT_ERROR' || s === 'PARSING_ERROR';
}

/**
 * The one place error text comes from: the server's `error.message` verbatim, or the no-connection
 * line when there was no (JSON) response at all.
 */
export function errorMessage(err) {
  if (!err) return '';
  if (err.data?.error?.message) return err.data.error.message;
  if (isUnreachable(err)) return NO_CONNECTION;
  if (typeof err.data?.message === 'string') return err.data.message;
  if (typeof err.message === 'string' && err.message) return err.message;
  if (typeof err.status === 'number') return `The server replied with status ${err.status}.`;
  return 'Something went wrong. Try again.';
}
/** `details` of a validation error: [{ field, message }]. */
export const errorDetails = (err) => (Array.isArray(err?.data?.error?.details) ? err.data.error.details : []);
/** `code` of the server error (validation / unauthorized / forbidden / not_found / conflict / internal). */
export const errorCode = (err) => err?.data?.error?.code || (isUnreachable(err) ? 'network' : '');

/** Turn an RTK error into a thrown Error with the same message (for `await mutation().unwrap()` call sites). */
export function toError(err) {
  const e = new Error(errorMessage(err));
  e.status = err?.status; e.code = errorCode(err); e.details = errorDetails(err); e.unreachable = isUnreachable(err);
  return e;
}

/** AuthContext registers a handler here; a 401 on any call (except the ones below) signs the person out. */
export const onUnauthorized = { handler: null };
/** 401s that mean "wrong password", not "session expired". */
const KEEP_SESSION_ON_401 = new Set(['login', 'changePassword']);

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQuery = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401 && !KEEP_SESSION_ON_401.has(api.endpoint) && getToken()) onUnauthorized.handler?.(errorMessage(result.error));
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'User', 'Modules', 'Audit', 'Search', 'Meeting', 'Action', 'Request', 'Decision', 'Notification', 'Department', 'Template', 'Integration', 'Visit', 'Log', 'DiaryEntry', 'Project'],
  endpoints: () => ({}),
});

/** Drop undefined / '' params so the server never sees `role=` (it would reject an empty enum value). */
export function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') out[k] = v; });
  return out;
}
