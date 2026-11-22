import mongoose from 'mongoose';
import { log, moduleFromPath } from '../services/audit.js';

const ACTION_BY_METHOD = { POST: 'create', PATCH: 'update', PUT: 'update', DELETE: 'delete' };

/**
 * Automatic Activity Log: every successful (2xx) mutating request (POST / PATCH / PUT / DELETE) made by a
 * signed-in user is recorded as create / update / delete, with the module derived from the route.
 *
 * Routes can enrich or silence the entry through `res.locals.audit`:
 *   res.locals.audit = { entity: 'Ravi Kumar', entityId: id, details: 'role: employee → manager' }
 *   res.locals.audit = { action: 'auth', ... }   // override the method-derived action
 *   res.locals.audit = false                      // the route logged itself with services/audit.log()
 *
 * The entry is written BEFORE the JSON body goes out (res.json is wrapped), so a client that reads
 * GET /api/audit right after a mutation always sees it. Handlers therefore respond with res.json().
 * @type {import('express').RequestHandler}
 */
export const auditRequests = (req, res, next) => {
  const action = ACTION_BY_METHOD[req.method];
  if (!action) return next();

  const originalJson = res.json.bind(res);
  res.json = /** @type {any} */ (
    (body) => {
      const user = /** @type {any} */ (req).user;
      const opts = res.locals.audit;
      if (opts === false || !user || res.statusCode >= 400) return originalJson(body);
      const o = opts && typeof opts === 'object' ? opts : {};
      const entry = {
        user,
        action: o.action ?? action,
        module: o.module ?? moduleFromPath(req.baseUrl + req.path),
        entity: o.entity ?? '',
        entityId: o.entityId ?? idFromPath(req.baseUrl + req.path) ?? (body && body.id ? String(body.id) : ''),
        details: o.details ?? '',
        ip: req.ip ?? '',
      };
      log(entry).finally(() => originalJson(body));
      return res;
    }
  );
  next();
};

/** First ObjectId-looking path segment, e.g. the `:id` of /api/users/:id. @param {string} path */
function idFromPath(path) {
  return path.split('/').find((s) => mongoose.isValidObjectId(s) && /^[0-9a-f]{24}$/i.test(s));
}
