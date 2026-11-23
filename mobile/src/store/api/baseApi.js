import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL, API_TIMEOUT } from '../../config';

import { sessionEnded } from '../slices/sessionSlice';

// The shape every API error comes back in.

const NO_NETWORK = 'No internet connection. Check your network and try again.';
const TIMED_OUT = 'The server took too long to answer. Please try again.';
const BAD_REPLY = 'The server sent an answer the app could not read.';

const rawQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: API_TIMEOUT * 1000,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().session.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept', 'application/json');
    return headers;
  },
});

// Turns every failure into {status, message} so screens can show the
// message as it is. The API's own message always wins; the app only writes
// its own words when there was no reply at all.
const baseQuery = async (args, api, extra) => {
  const result = await rawQuery(args, api, extra);
  if (!result.error) {
    return { data: result.data };
  }
  const e = result.error;
  let error;
  if (e.status === 'FETCH_ERROR') {
    error = { status: 0, message: NO_NETWORK };
  } else if (e.status === 'TIMEOUT_ERROR') {
    error = { status: 0, message: TIMED_OUT };
  } else if (e.status === 'PARSING_ERROR') {
    error = { status: e.originalStatus, message: BAD_REPLY };
  } else if (e.status === 'CUSTOM_ERROR') {
    error = { status: 0, message: e.error || BAD_REPLY };
  } else {
    const body = e.data ?? {};
    error = {
      status: e.status,
      message: body.message || `Request failed (${e.status}).`,
      errors: body.errors,
    };
  }
  // A dead token sends the person back to the sign-in screen.
  if (error.status === 401 && api.getState().session.token) {
    api.dispatch(sessionEnded(error.message));
  }
  return { error };
};

// Every kind of data the app caches. A tag names a list or a record; writes
// invalidate tags, and anything on screen that carries that tag is fetched
// again. The same names are used to refresh a screen when it comes back
// into view, when the app returns from the background, and when a push says
// something changed.
export const ALL_TAGS = [
  'Me',
  'Users',
  'Modules',
  'Audit',
  'Search',
  'Dashboard',
  'Meetings',
  'Meeting',
  'Actions',
  'Action',
  'Requests',
  'Decisions',
  'Decision',
  'Templates',
  'Template',
  'Notifications',
  'Diary',
  'DiaryEntry',
  'Logs',
  'Log',
  'Visits',
  'Visit',
  'Projects',
  'Project',
  'Reminders',
  'Reminder',
  'Departments',
  'Department',
  'Activity',
];

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [...ALL_TAGS],
  endpoints: () => ({}),
  // Data may have changed on the website in the meantime, so a screen asks
  // again whenever it is opened, and whenever the app comes back to the
  // front. What is already cached stays on screen while the answer arrives.
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
});

// Marks data as stale so every screen showing it fetches it again.
export const refresh = tags => baseApi.util.invalidateTags([...tags]);

// Reads the message out of whatever RTK Query hands back.
export const errorMessage = (e, fallback = 'Something went wrong.') =>
  e?.message ?? fallback;

export const fieldErrors = e => {
  const errors = e?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v[0]]));
};
