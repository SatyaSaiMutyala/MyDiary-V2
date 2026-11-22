import { Router } from 'express';
import * as diary from '../controllers/diary.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/diary — the person's own diary entries (My Diary).
 *
 * The calendar screen shows diary entries and meetings side by side, but only the entries live here:
 * meetings are read from /api/meetings and merged in the browser, so no meeting is duplicated into
 * this collection. The 'tentative' blocks for pending meeting requests are derived in the browser
 * from /api/meeting-requests the same way.
 *
 * Every list follows the shared contract (Backend/README.md): page, limit, search, sort, fields,
 * filters as query params (comma = any of) and `from` / `to`, which run against every day an entry
 * occupies so one month, week or day can be asked for and multi-day entries still come back.
 * Lists default to the signed-in person's own diary; `owner=` reads a diary shared with them and
 * `mine=false` widens the list to every diary they may read.
 */
export const diaryRouter = Router();
diaryRouter.use(requireAuth, requireModule('diary'));

diaryRouter.get('/', diary.list);
diaryRouter.post('/', validateBody(diary.createSchema), diary.create);
diaryRouter.get('/:id', diary.get);
diaryRouter.patch('/:id', validateBody(diary.patchSchema), diary.update);
diaryRouter.delete('/:id', diary.remove);
