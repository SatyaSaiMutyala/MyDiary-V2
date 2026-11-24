import { baseApi } from './baseApi';

// /api/lab-readiness — the laboratory's daily opening and closing board.
//
// A board is three things: which unit, which day, which round. That triple is both the path and the
// cache key, so two units open at once never overwrite each other.
//
// Photographs go up as JSON carrying base64, which is what the camera already hands back
// (react-native-image-picker, includeBase64). The website posts the raw image instead; the API takes
// either. Reading one back needs the Authorization header, so an <Image> is given the header too —
// see photoSource() below.

const BOARD = t => ({
  type: 'LabBoard',
  id: `${t.unitKey}|${t.date}|${t.phase}`,
});
const DAY = date => ({ type: 'LabDay', id: date ?? 'today' });
const HISTORY = { type: 'LabHistory', id: 'LIST' };

// After any write: that board, the day it belongs to, and the history list.
const touches = t => [BOARD(t), DAY(t.date), HISTORY];

const at = t =>
  `lab-readiness/${encodeURIComponent(t.unitKey)}/${t.date}/${t.phase}`;

export const labReadinessApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ['LabBoard', 'LabDay', 'LabHistory', 'LabRecord'],
  })
  .injectEndpoints({
    endpoints: build => ({
      // Every unit, and where both of its rounds stand on one date.
      labDay: build.query({
        query: ({ date } = {}) => ({
          url: 'lab-readiness',
          params: date ? { date } : {},
        }),
        providesTags: (_r, _e, a) => [DAY(a?.date)],
      }),

      // One unit's round: the activities that apply, what has been recorded, what is missing.
      labBoard: build.query({
        query: t => at(t),
        providesTags: (_r, _e, t) => [BOARD(t)],
      }),

      setLabItem: build.mutation({
        query: ({ unitKey, date, phase, taskKey, ...body }) => ({
          url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(
            taskKey,
          )}`,
          method: 'PUT',
          body,
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      setLabRemark: build.mutation({
        query: ({ unitKey, date, phase, taskKey, remark }) => ({
          url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(
            taskKey,
          )}/remark`,
          method: 'PUT',
          body: { remark },
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      // `photo` is { base64, mimeType, name } straight from the camera.
      addLabPhoto: build.mutation({
        query: ({ unitKey, date, phase, taskKey, photo }) => ({
          url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(
            taskKey,
          )}/photos`,
          method: 'POST',
          body: {
            data: photo.base64,
            mimeType: photo.mimeType ?? 'image/jpeg',
            name: photo.name ?? 'photo.jpg',
          },
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      removeLabPhoto: build.mutation({
        query: ({ unitKey, date, phase, photoId }) => ({
          url: `${at({ unitKey, date, phase })}/photos/${photoId}`,
          method: 'DELETE',
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      labSignOff: build.mutation({
        query: ({ unitKey, date, phase, selfie, role }) => ({
          url: `${at({ unitKey, date, phase })}/signoff`,
          method: 'POST',
          body: {
            data: selfie.base64,
            mimeType: selfie.mimeType ?? 'image/jpeg',
            name: selfie.name ?? 'selfie.jpg',
            ...(role ? { role } : {}),
          },
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      labReopen: build.mutation({
        query: ({ unitKey, date, phase, reason }) => ({
          url: `${at({ unitKey, date, phase })}/reopen`,
          method: 'POST',
          body: { reason },
        }),
        invalidatesTags: (_r, _e, t) => touches(t),
      }),

      labHistory: build.query({
        query: (params = {}) => ({ url: 'lab-readiness/history', params }),
        transformResponse: r => r.records,
        providesTags: [HISTORY],
      }),

      labRecord: build.query({
        query: id => `lab-readiness/records/${id}`,
        providesTags: (_r, _e, id) => [{ type: 'LabRecord', id }],
      }),
    }),
  });

export const {
  useLabDayQuery,
  useLabBoardQuery,
  useSetLabItemMutation,
  useSetLabRemarkMutation,
  useAddLabPhotoMutation,
  useRemoveLabPhotoMutation,
  useLabSignOffMutation,
  useLabReopenMutation,
  useLabHistoryQuery,
  useLabRecordQuery,
} = labReadinessApi;
