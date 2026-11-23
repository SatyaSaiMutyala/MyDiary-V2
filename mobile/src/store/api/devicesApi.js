import { baseApi } from './baseApi';

/**
 * Where to push.
 *
 * A phone registers its Firebase address when someone signs in, and gives it back on sign-out, so
 * a push never reaches a phone that person has left. Mirrors MyDiary-V2/Backend/src/routes/devices.js.
 */

/** The address last given to the server, so sign-out can take it back. */
let current = null;
export const lastPushToken = () => current;
export const setLastPushToken = token => {
  current = token;
};

export const devicesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    registerDevice: build.mutation({
      query: body => ({ url: 'devices', method: 'POST', body }),
    }),
    unregisterDevice: build.mutation({
      query: body => ({ url: 'devices', method: 'DELETE', body }),
    }),
  }),
});

export const { useRegisterDeviceMutation, useUnregisterDeviceMutation } = devicesApi;
