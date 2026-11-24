import express, { Router } from 'express';
import * as board from '../controllers/labReadiness.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/lab-readiness — the daily opening and closing board for a laboratory unit (TDPL-LAB-SOP-014).
 *
 * A board is identified by three things, so they are in the path: /:unitKey/:date/:phase, for example
 * /nrl-biochemistry/2026-11-24/opening. The master checklist itself lives in Department Master and is
 * edited through /api/departments/:id/lab-readiness.
 *
 * Photographs are sent as a raw image body rather than a multipart form: there is exactly one file per
 * request, and raw bytes mean no form parser on the server and no FormData juggling in the apps. The
 * JSON parser mounted in app.js ignores an image content-type, so these two parsers do not collide.
 */
export const labReadinessRouter = Router();
labReadinessRouter.use(requireAuth);

const use = requireModule('labReadiness', 'departments');

/**
 * A photograph arrives one of two ways, and both end up as a Buffer in `req.body`:
 *
 *   · the image itself, with an image content-type — what the website sends, and the cheapest;
 *   · `{ "data": "<base64>", "mimeType": "image/jpeg", "name": "…" }` — what the phone sends, because
 *     React Native cannot put a file in a request body except through a form, and the camera hands
 *     back base64 already (react-native-image-picker's includeBase64).
 *
 * 8 MB of image either way; base64 is about a third bigger on the wire, hence the larger JSON ceiling.
 */
const image = [
  express.raw({ type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], limit: '8mb' }),
  express.json({ type: 'application/json', limit: '11mb' }),
];

// Fixed paths first, so they are not read as /:unitKey.
labReadinessRouter.get('/', use, board.overview);
labReadinessRouter.get('/history', use, board.history);
labReadinessRouter.get('/records/:id', use, board.record);

const at = '/:unitKey/:date/:phase';
labReadinessRouter.get(at, use, board.board);

// One activity: its status, its remark, its photographs.
labReadinessRouter.put(`${at}/items/:taskKey`, use, validateBody(board.itemSchema), board.putItem);
labReadinessRouter.put(`${at}/items/:taskKey/remark`, use, validateBody(board.remarkSchema), board.putRemark);
labReadinessRouter.post(`${at}/items/:taskKey/photos`, use, image, board.addPhoto);
labReadinessRouter.get(`${at}/photos/:photoId`, use, board.getPhoto);
labReadinessRouter.delete(`${at}/photos/:photoId`, use, board.removePhoto);

// Sign-off, the photograph behind it, and reopening a signed record.
labReadinessRouter.post(`${at}/signoff`, use, image, board.signoff);
labReadinessRouter.get(`${at}/selfie`, use, board.getSelfie);
labReadinessRouter.post(`${at}/reopen`, use, validateBody(board.reopenSchema), board.reopen);
