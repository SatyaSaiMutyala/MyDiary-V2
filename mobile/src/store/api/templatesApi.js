import { baseApi } from './baseApi';

/**
 * Agenda templates — ready-made agendas for recurring meetings.
 *
 * Read-only on the phone, deliberately. Mirrors MyDiary-V2/Backend/src/routes/templates.js, which
 * also creates, edits, duplicates and deletes them; that is library upkeep and stays on the
 * website. What the phone wants is the one thing worth having in your hand: starting a meeting's
 * agenda from a template instead of typing six lines with a thumb.
 */

const LIST = { type: 'Templates', id: 'LIST' };

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );

export const templatesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listTemplates: build.query({
      query: params => ({ url: 'templates', params: clean(params) }),
      providesTags: [LIST],
    }),
  }),
});

// The list already carries each template's whole agenda, so the picker never needs to fetch one
// on its own — GET /templates/:id is not wired here for that reason.
export const { useListTemplatesQuery } = templatesApi;
