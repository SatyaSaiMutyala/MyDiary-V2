import { baseApi } from './baseApi';
import { userUpdated } from '../slices/sessionSlice';

/**
 * Signing in, and the signed-in person.
 *
 * The shape here is the v2 API's, not the old Laravel one: ids are strings, names are plain
 * words, and `modules` is the list of screens this person is allowed to open — the phone hides
 * everything that is not in it, exactly as the website does.
 * See MyDiary-V2/Backend/src/models/User.js `serializeUser` and src/routes/auth.js.
 */

/**
 * Switches the app reads before sign-in, including the minimum version a phone must run.
 * The v2 API does not serve `GET /api/app/config` yet — until it does this query simply fails,
 * and `useForceUpdate` treats any failure as "let the person in", so nobody is ever blocked by
 * a missing endpoint. See MyDiary-V2/mobile/src/update/useForceUpdate.ts.
 */

export const authApi = baseApi.injectEndpoints({
  endpoints: build => ({
    appConfig: build.query({
      query: () => 'app/config',
      keepUnusedDataFor: 3600,
    }),
    login: build.mutation({
      query: body => ({ url: 'auth/login', method: 'POST', body }),
    }),
    logout: build.mutation({
      query: () => ({ url: 'auth/logout', method: 'POST' }),
    }),
    // Both answer { user }; the screens want the person, not the envelope.
    me: build.query({
      query: () => 'auth/me',
      transformResponse: r => r.user ?? r,
      providesTags: ['Me'],
    }),
    updateMe: build.mutation({
      query: body => ({ url: 'auth/me', method: 'PATCH', body }),
      transformResponse: r => r.user ?? r,
      invalidatesTags: ['Me'],
      // The name in the header and the More menu comes from the stored session, so it has to be
      // told too — otherwise the account screen shows the new name and the rest of the app the old.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(userUpdated(data));
          }
        } catch {
          // The screen shows the server's message; nothing to update.
        }
      },
    }),
    changePassword: build.mutation({
      query: body => ({ url: 'auth/change-password', method: 'POST', body }),
    }),
  }),
});

export const {
  useAppConfigQuery,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
} = authApi;

/**
 * True when this person may open that screen.
 *
 * `modules` can be missing — an older saved session, or a reply that did not carry it — so it is
 * never assumed to be there. An admin may open everything regardless.
 */
export const canOpen = (user, moduleKey) => {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return Array.isArray(user.modules) && user.modules.includes(moduleKey);
};
