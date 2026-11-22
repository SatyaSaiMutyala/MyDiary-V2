import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { globalSearch } from '../services/search.js';

export const searchQuerySchema = z
  .object({
    q: z.string({ error: 'Enter something to search for.' }).trim().min(1, 'Enter something to search for.').max(200, 'Search text is too long (max 200).'),
    limit: z
      .string()
      .regex(/^\d+$/, 'limit must be a whole number from 1 to 50.')
      .transform(Number)
      .pipe(z.number().int().min(1, 'limit must be a whole number from 1 to 50.').max(50, 'limit must be a whole number from 1 to 50.'))
      .optional(),
  })
  .strict();

/** GET /api/search?q=&limit= → { q, groups: [{ key, label, items }] } @type {import('express').RequestHandler} */
export const search = async (req, res) => {
  const { q, limit } = /** @type {any} */ (req).validQuery;
  res.json(await globalSearch(q, limit ?? 5, currentUser(req)));
};
