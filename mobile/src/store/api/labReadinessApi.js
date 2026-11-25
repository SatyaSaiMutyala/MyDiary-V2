import { baseApi } from './baseApi';

// /api/lab-readiness — the laboratory's daily opening and closing board.
//
// A board is three things: which unit, which day, which round. That triple is both the path and the
// cache key, so two units open at once never overwrite each other.
//
// Photographs go up as JSON carrying base64, which is what the camera already hands back
// (react-native-image-picker, includeBase64). The website posts the raw image instead; the API takes
// either. Reading one back needs the Authorization header, so an <Image> is given the header too —
// see src/lab/model.js.
//
// **Why these writes do not invalidate the board.** Every write answers with the whole board, so the
// answer is written straight into the cache. Tagging the board instead would throw the answer away
// and fetch the same thing again — a second round trip on every single tick, on a phone, in a
// laboratory. The tick is also applied before the request leaves (`onQueryStarted` below), so the
// button moves at once and is put back only if the server refuses.

const BOARD = t => ({
  type: 'LabBoard',
  id: `${t.unitKey}|${t.date}|${t.phase}`,
});
const DAY = date => ({ type: 'LabDay', id: date ?? 'today' });
const HISTORY = { type: 'LabHistory', id: 'LIST' };
/** My Activity shows the same lines, so it is refreshed whenever a round is signed or reopened. */
const MINE = { type: 'LabBoard', id: 'MINE' };

const at = t =>
  `lab-readiness/${encodeURIComponent(t.unitKey)}/${t.date}/${t.phase}`;

/** The board's own cache key — the mutation arguments carry more than this. */
const target = ({ unitKey, date, phase }) => ({ unitKey, date, phase });

/**
 * Applies a change to the board already on screen, before the server has answered, then settles it
 * with what the server actually saved.
 *
 * A write that belongs to one activity (`arg.taskKey`) only takes that activity's line, its
 * photographs and the tally out of the answer. Two writes can be in the air at once — a photograph
 * uploading while the next line is ticked — and each answer carries the whole board as it stood when
 * that one was saved, so copying an answer over wholesale could put an older board back and lose the
 * other tick. Signing off and reopening have no activity of their own and replace everything, which
 * is right: nothing else can be happening at that moment.
 *
 * @param {object} api the endpoint's lifecycle api (dispatch, queryFulfilled)
 * @param {object} arg the mutation's arguments
 * @param {(draft: any) => void} [guess] what to show immediately
 */
async function writeThrough({ dispatch, queryFulfilled }, arg, guess) {
  const patch = guess
    ? dispatch(
        labReadinessApi.util.updateQueryData('labBoard', target(arg), guess),
      )
    : null;
  try {
    const { data } = await queryFulfilled;
    if (!data?.activities) {
      return;
    }
    dispatch(
      labReadinessApi.util.updateQueryData('labBoard', target(arg), draft =>
        settle(draft, data, arg.taskKey),
      ),
    );
  } catch {
    // The server refused, or the phone is offline: put the board back as it was. The screen shows
    // the API's own message.
    patch?.undo();
  }
}

/**
 * Exported only so the rule above can be tested on its own (__tests__/lab.test.js).
 * @returns {any | undefined} a whole new board, or undefined when the draft was edited in place
 */
export function settle(draft, data, taskKey) {
  if (!taskKey) {
    return data;
  }
  draft.progress = data.progress;
  draft.declaration = data.declaration;
  if (!data.run) {
    draft.run = null;
    return undefined;
  }
  if (!draft.run) {
    draft.run = { items: [], photos: [] };
  }
  const { items = [], photos = [], ...rest } = data.run;
  Object.assign(draft.run, rest); // startedAt, signedAt, late, reopenLog …
  draft.run.items = [
    ...(draft.run.items ?? []).filter(i => i.taskKey !== taskKey),
    ...items.filter(i => i.taskKey === taskKey),
  ];
  // The square must not go blank while the stored photograph is fetched, so each one that was
  // just sent hands its copy on the phone to the stored one that replaced it. The newest stored
  // photographs are the ones that were just sent, in the same order.
  const sending = (draft.run.photos ?? []).filter(
    p => p.taskKey === taskKey && p.pendingUri,
  );
  const arrived = photos.filter(p => p.taskKey === taskKey);
  const first = Math.max(0, arrived.length - sending.length);
  draft.run.photos = [
    ...(draft.run.photos ?? []).filter(p => p.taskKey !== taskKey),
    ...arrived.map((p, i) =>
      i >= first && sending[i - first]
        ? { ...p, localUri: sending[i - first].pendingUri }
        : p,
    ),
  ];
  return undefined;
}

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
        onQueryStarted: (arg, api) =>
          writeThrough(api, arg, draft => {
            const item = itemOf(draft, arg.taskKey);
            item.status = arg.status ?? null;
            if (arg.remark !== undefined) {
              item.remark = arg.remark;
            }
            // Who answered it and when, written now rather than when the server replies. The line
            // makes the row taller, and a row that grows a second after the tap shoves everything
            // below it down while the person is reading — the jump they felt. The server's own
            // stamp lands on top of this one a moment later and reads the same.
            const me = api.getState().session?.user;
            item.actionedAt = arg.status ? new Date().toISOString() : null;
            item.actionedBy = arg.status ? me?.name ?? '' : '';
          }),
      }),

      setLabRemark: build.mutation({
        query: ({ unitKey, date, phase, taskKey, remark }) => ({
          url: `${at({ unitKey, date, phase })}/items/${encodeURIComponent(
            taskKey,
          )}/remark`,
          method: 'PUT',
          body: { remark },
        }),
        onQueryStarted: (arg, api) =>
          writeThrough(api, arg, draft => {
            itemOf(draft, arg.taskKey).remark = arg.remark;
          }),
      }),

      // `photo` is { uri, base64, mimeType, name } straight from the camera. The thumbnail appears
      // at once, marked as still being sent, and is replaced by the stored one when it lands.
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
        onQueryStarted: (arg, api) =>
          writeThrough(api, arg, draft => {
            if (!draft.run) {
              draft.run = { items: [], photos: [] };
            }
            draft.run.photos = [
              ...(draft.run.photos ?? []),
              {
                id: `sending-${Date.now()}`,
                taskKey: arg.taskKey,
                name: arg.photo.name ?? 'photo.jpg',
                // Shown from the phone's own copy until the stored one can be fetched.
                pendingUri: arg.photo.uri,
              },
            ];
          }),
      }),

      removeLabPhoto: build.mutation({
        query: ({ unitKey, date, phase, photoId }) => ({
          url: `${at({ unitKey, date, phase })}/photos/${photoId}`,
          method: 'DELETE',
        }),
        onQueryStarted: (arg, api) =>
          writeThrough(api, arg, draft => {
            if (draft.run) {
              draft.run.photos = (draft.run.photos ?? []).filter(
                p => p.id !== arg.photoId,
              );
            }
          }),
      }),

      // Signing and reopening change the day's tally and the history list as well, so those two are
      // marked stale; the board itself still comes from the answer.
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
        onQueryStarted: (arg, api) => writeThrough(api, arg),
        invalidatesTags: (_r, _e, t) => [DAY(t.date), HISTORY, MINE],
      }),

      labReopen: build.mutation({
        query: ({ unitKey, date, phase, reason }) => ({
          url: `${at({ unitKey, date, phase })}/reopen`,
          method: 'POST',
          body: { reason },
        }),
        onQueryStarted: (arg, api) => writeThrough(api, arg),
        invalidatesTags: (_r, _e, t) => [DAY(t.date), HISTORY, MINE],
      }),

      // The signed-in person's own lines for a day — what My Activity shows the laboratory in
      // place of the shift tasks it used to have.
      labMine: build.query({
        query: ({ date } = {}) => ({
          url: 'lab-readiness/mine',
          params: date ? { date } : {},
        }),
        providesTags: (_r, _e, a) => [
          DAY(a?.date),
          { type: 'LabBoard', id: 'MINE' },
        ],
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

/** The line for one activity on a cached board, created on first touch. */
function itemOf(draft, taskKey) {
  if (!draft.run) {
    draft.run = { items: [], photos: [] };
  }
  draft.run.items = draft.run.items ?? [];
  let item = draft.run.items.find(i => i.taskKey === taskKey);
  if (!item) {
    item = {
      taskKey,
      status: null,
      remark: '',
      actionedAt: null,
      actionedBy: '',
    };
    draft.run.items.push(item);
  }
  return item;
}

export const {
  useLabDayQuery,
  useLabBoardQuery,
  useSetLabItemMutation,
  useSetLabRemarkMutation,
  useAddLabPhotoMutation,
  useRemoveLabPhotoMutation,
  useLabSignOffMutation,
  useLabReopenMutation,
  useLabMineQuery,
  useLabHistoryQuery,
  useLabRecordQuery,
} = labReadinessApi;
