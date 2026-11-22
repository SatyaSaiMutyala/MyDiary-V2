# MyDiary V2 — Backend

Node 20 · Express 5 · ESM · MongoDB (Mongoose) · JWT. Same structure as the Trust-GateBook backend.

## Run

```bash
# Node 20 (see .nvmrc)
nvm use

npm install
cp .env.example .env     # optional: every value has a dev default
npm run dev              # nodemon, http://localhost:4000
npm start                # plain node
npm test                 # vitest + supertest against an in-memory MongoDB
npm run seed             # upsert the TDPL roster as user accounts
npm run lint             # syntax check of every .js file (no ESLint)
```

With `MONGODB_URI` empty (the default) the API starts an **embedded dev database** (`mongodb-memory-server`) on
port 27018 and keeps its data in `.data/mongo`, so nothing has to be installed and data survives restarts.
On the first boot with an empty users collection the first admin is created from `ADMIN_NAME` / `ADMIN_EMAIL` /
`ADMIN_PASSWORD`.

```bash
curl -s localhost:4000/api/health
curl -s localhost:4000/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"venkata.cherukuri@trustlab.co.in","password":"<ADMIN_PASSWORD>"}'
```

## Environment

| Variable | Default | What it does |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` requires `JWT_SECRET`, binds 127.0.0.1, logs in `combined` format |
| `PORT` | `4000` | HTTP port |
| `HOST` | all interfaces (dev) / `127.0.0.1` (prod) | Interface to bind |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins; `*` = any |
| `MONGODB_URI` | *(empty)* | Empty = embedded dev DB; otherwise a real connection string |
| `EMBEDDED_MONGO_PORT` | `27018` | Port of the embedded dev DB |
| `JWT_SECRET` | dev constant | Token signing secret (required in production) |
| `JWT_EXPIRES` | `7d` | Token lifetime |
| `ADMIN_NAME` | `Venkata Cherukuri` | First admin (created only when there are no users) |
| `ADMIN_EMAIL` | `venkata.cherukuri@trustlab.co.in` | First admin email |
| `ADMIN_PASSWORD` | `mydiary123` | First admin password — change before a real deployment |
| `SEED_PASSWORD` | `mydiary123` | Password for accounts created by the seed and by `POST /api/users` without `password` |

## Layout

```
src/
  index.js            boot: connect DB → ensure first admin → listen
  app.js              express app: helmet, cors, json 1mb, morgan (dev), audit middleware, routes, 404, errors
  config.js           env with defaults
  db.js               connectDb() (real or embedded), dbStatus()
  seed.js             TDPL roster seed (idempotent upsert by email)
  data/roster.js      copy of web/src/data/employees.js + tdplEmail()
  routes/             HTTP only: paths + middleware → controller
  controllers/        parse / validate (zod schemas live here), call services, shape the response
  services/           business logic: users.js, auth.js, audit.js (log + describeChanges), modules.js, search.js (registry)
  models/             User.js, AuditLog.js (+ serializers)
  middleware/         auth.js (requireAuth, requireRole, requireModule), validate.js (zod body/query), audit.js, errors.js
  utils/              errors.js (ApiError), listQuery.js (the list contract), paginate.js (runList), csv.js
test/                 vitest + supertest, in-memory MongoDB per file
```

Request flow: `routes/` → `controllers/` → `services/` → `models/`. Routes never touch models; controllers never
contain business rules; services never read `req`/`res`.

## API

Everything is JSON under `/api`. All routes except `GET /api/health` and `POST /api/auth/login` need
`Authorization: Bearer <token>`. Errors always look like:

```json
{ "error": { "message": "Email or password is incorrect.", "code": "unauthorized", "details": [ { "field": "...", "message": "..." } ] } }
```

`message` is written for people and can be shown as-is. `code` is one of `validation` (400), `unauthorized` (401),
`forbidden` (403), `not_found` (404), `conflict` (409), `internal` (500). `details` is present for validation errors.

### API conventions (every list endpoint)

All reads are filtered through **query params only** (nothing in the body). Every list endpoint — users, audit and
every future module — is built with `utils/listQuery.js` + `utils/paginate.js`, so the same params work everywhere:

| Param | Meaning | Example |
| --- | --- | --- |
| `page` | page number, ≥ 1 (default 1) | `?page=2` |
| `limit` | items per page, 1–200 (default 25) | `?limit=50` |
| `sort` | `field` ascending, `-field` descending, comma-separated for several | `?sort=role,-name` |
| `search` | global, case-insensitive substring match across the endpoint's search fields (regex-escaped; array fields such as people/tags match any element) | `?search=anusha` |
| `<filter>` | any filter field; comma list = any of (`$in`); repeated params are merged; booleans `true`/`false` | `?status=open,progress` `?role=admin` |
| `from` / `to` | inclusive date range on the default date field (`to=YYYY-MM-DD` runs to end of that day) | `?from=2026-11-01&to=2026-11-22` |
| `dateField` | which date field `from`/`to` apply to | `?dateField=updatedAt&from=…` |
| `<field>_from` / `<field>_to` | range on any date field directly | `?at_from=2026-11-01` |
| `min_<field>` / `max_<field>` | numeric range on numeric fields | `?min_amount=100` |
| `fields` | projection of the returned items (`id` is always kept) | `?fields=name,role` |

Unknown params, unknown enum values, bad dates and bad sort fields all return **400** with a message naming the
param, e.g. `Unknown query parameter: colour. Allowed: createdAt_from, …`, `role must be one of: admin, manager, employee.`

Every list responds with the same envelope:

```json
{
  "items": [ … ],
  "page": 1, "limit": 25, "total": 57, "pages": 3, "hasMore": true,
  "applied": {
    "search": "anusha",
    "filters": { "role": ["admin", "manager"], "status": "active" },
    "sort": "name",
    "range": { "field": "createdAt", "from": "2026-11-01T00:00:00.000Z", "to": "2026-11-22T23:59:59.999Z" }
  }
}
```

Examples:

```
GET /api/users?search=developer&status=active&sort=-createdAt&limit=10
GET /api/users?role=admin,manager&department=Operations&fields=name,email,role
GET /api/audit?action=update,delete&module=Settings%20%C2%B7%20Users&from=2026-11-01&to=2026-11-22
GET /api/audit?user=<userId>&sort=-at&page=2
GET /api/audit/export.csv?action=auth&from=2026-11-01        (same filters, no paging)
```

Adding a list endpoint to a new module is one spec object in its controller:

```js
const MEETINGS_LIST = {
  searchFields: ['title', 'agenda', 'attendees.name', 'tags'],
  filterFields: { status: 'enum', owner: 'string', department: 'string', recurring: 'boolean' },
  enums: { status: MEETING_STATUSES },
  dateFields: ['startsAt', 'createdAt'], defaultDateField: 'startsAt',
  numberFields: ['durationMin'],
  sortFields: ['startsAt', 'title', 'status', 'createdAt'], defaultSort: '-startsAt',
  fields: ['title', 'status', 'startsAt', 'owner', 'attendees'],
};
export const list = async (req, res) => res.json(await runList(Meeting, buildListQuery(req.query, MEETINGS_LIST), serializeMeeting));
```

A filter can also be a function `(values) => mongoClause` for special cases (the audit `user=` filter accepts ids
or names this way).

### Health

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/health` | `{ ok, name, node, db: 'connected'\|'down', env }` (503 when the DB is down) |

### Auth

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` · 401 "Email or password is incorrect." · 403 "Your account is inactive. Ask an admin to reactivate it." |
| POST | `/api/auth/logout` | — | `{ ok }` (records the sign-out; tokens are stateless) |
| GET | `/api/auth/me` | — | `{ user }` |
| PATCH | `/api/auth/me` | `{ name?, title? }` | `{ user }` |
| POST | `/api/auth/change-password` | `{ current, next }` (min 8) | `{ ok }` |

`user` = `{ id, name, email, role, title, department, modules, status, createdAt, updatedAt }`. `role` is
`admin | manager | employee`; `status` is `active | inactive`; `modules` is the effective list (admins always get all).

### Users (admin only)

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/api/users` | list contract (see API conventions) | `{ items, page, limit, total, pages, hasMore, applied }` |
| GET | `/api/users/modules` | — | `{ modules, roles }` — the module registry for the permissions editor |
| POST | `/api/users` | `{ name, email, role, title?, department?, status?, modules?, password? }` | 201 `{ user }` (password defaults to `SEED_PASSWORD`) |
| GET | `/api/users/:id` | — | `{ user }` |
| PATCH | `/api/users/:id` | any of `name, email, title, department, role, status, modules` | `{ user }` |
| DELETE | `/api/users/:id` | — | `{ ok }` |
| POST | `/api/users/:id/reset-password` | `{ password }` (min 8) | `{ ok }` |

Rules: you cannot deactivate, demote or delete yourself; `modules` must be keys from the registry (unknown keys →
400 "Unknown module: x."); admin-only modules (`settings`, `integrations`) are silently dropped for other roles;
admins are always stored with every module; changing a role without sending `modules` resets them to the new
role's defaults.

### Activity Log (admin only)

Every successful `POST` / `PATCH` / `PUT` / `DELETE` by a signed-in user is recorded automatically
(`middleware/audit.js`): action `create | update | delete` from the method, `module` from the route
(`/api/users` → "Settings · Users"), `entity` / `entityId` / `details` from `res.locals.audit` when the route sets
it. Sign in / out, password changes and CSV exports are logged explicitly with `services/audit.log()`.

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/api/audit` | list contract (see API conventions) | `{ items, page, limit, total, pages, hasMore, applied }` newest first |
| GET | `/api/audit/export.csv` | same filters | CSV download (BOM, CRLF; up to 10 000 rows); writes an `export` entry |

Entry = `{ id, at, user: { id, name }, action, module, entity, entityId, details, ip }`. `user=` accepts user ids
or exact names (comma list of either).

### Global search

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/api/search` | `?q=&limit=` (limit per group, 1–50, default 5) | `{ q, groups: [{ key, label, items: [{ id, title, subtitle, route }] }] }` |

One endpoint for the command palette. `services/search.js` is a registry: each module calls
`registerSearch({ key, label, canUse?(user), search(q, limit, user) })` once and its group appears for the users
allowed to see it. Groups with no hits are dropped, so the palette only shows sections that have something in
them. Registered now: `meetings`, `actions`, `requests`, `decisions` (anyone with the matching module) and
`users`, `audit` (admins).

### Per-endpoint list fields

| Endpoint | `search` fields | filters | date fields (default) | sort fields (default) |
| --- | --- | --- | --- | --- |
| `GET /api/users` | name, email, title, department | `role`, `status`, `department` | createdAt, updatedAt (createdAt) | name, email, title, department, role, status, createdAt, updatedAt (`name`) |
| `GET /api/audit` | entity, details, module, user.name, entityId | `action`, `module`, `user` (id or name), `entityId` | at (at) | at, action, module, entity, user.name (`-at`) |
| `GET /api/meetings` | title, chair, loc, attendees, external.name, agenda, clientName, subBadge | `type`, `status`, `chair`, `mode`, `clientCode`, `organiser`, `attendee`, `mine=true` | date, createdAt (date) | date, title, type, status, chair, createdAt (`date,time`) |
| `GET /api/action-items` | desc, owner, meetingTitle | `status`, `priority`, `owner`, `ownerType`, `meetingId`, `overdue=true`, `mine=true` | deadline, createdAt (deadline) | deadline, priority, status, owner, meetingTitle, createdAt (`deadline`) |
| `GET /api/meeting-requests` | topic, notes, from, to | `status`, `routedTo`, `box=inbox\|sent` | proposedDate, createdAt (proposedDate) | proposedDate, createdAt, status (`-createdAt`) |
| `GET /api/decisions` | text, decidedBy, department, meetingTitle | `meetingId`, `department`, `tag`, `decidedBy` | createdAt (createdAt) | createdAt, department, decidedBy (`-createdAt`) |
| `GET /api/notifications` | text, entity | `unread=true`, `type` | createdAt (createdAt) | createdAt (`-createdAt`) |
| `GET /api/diary` | title, notes, loc, attendees, external.name, owner | `cat`, `addedBy`, `reminder`, `allDay`, `owner`, `attendee`, `mine=false` | days, date, createdAt (days) | date, startTime, title, cat, owner, createdAt, updatedAt (`date,startTime`) |
| `GET /api/visits` | title, org.name, org.branch, org.city, host.name, team, purpose, scope, references, tags, executiveSummary, observations, actionItems, owner | `status`, `type`, `owner`, `site`, `city`, `overallAssessment`, `severity`, `followUpRequired`, `tag`, `category`, `mine=true` | date, nextVisitDate, submittedAt, createdAt, updatedAt (date) | date, title, type, status, owner, overallAssessment, org.name, submittedAt, createdAt (`-date`) |

### Meetings (module `meetings`)

Everything the website's Meetings screens need. Responses wrap the record in its own key — `{ meeting }`,
`{ action }`, `{ request }`, `{ decision }`, `{ notification }` — while every list follows the contract above.
A meeting embeds its action items on read (`actions`, plus `openActions` / `totalActions`); action items live in
their own collection so My To-Do can query them across meetings.

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/meetings` | List. `mine=true` limits it to meetings I chair or attend. |
| POST | `/api/meetings` | Create. `title`, `type`, `date` (YYYY-MM-DD) and `time` (HH:MM) are required; the rest default (`dur` 1h, `mode` 📍 In-person, `loc` TBD, agenda times 10m, presence/pre-read built from the attendees, the creator added as an attendee when none are given). |
| GET/PATCH/DELETE | `/api/meetings/:id` | Read, partial edit, delete (also deletes its action items). |
| POST | `/api/meetings/:id/status` | `{ status, cancelReason? }` — upcoming ⇄ completed ⇄ cancelled. |
| POST | `/api/meetings/:id/duplicate` | Copy as a fresh upcoming meeting dated +7 days, without minutes, actions, transcript or AI summary. |
| PUT | `/api/meetings/:id/minutes` | Replace the minutes map (`{ ag0: { disc, dec }, …, general: { disc } }`). |
| POST | `/api/meetings/:id/minutes/finalise` · `/reopen` | Lock or unlock the minutes. |
| POST | `/api/meetings/:id/minutes/circulate` | Stamps `minutesCirculatedAt` and returns who it reaches: `{ total, internal, externalWithEmail[], externalWithoutEmail[] }`. |
| PATCH | `/api/meetings/:id/presence` | `{ name, status }` (tbd / present / late / absent). |
| POST | `/api/meetings/:id/presence/cycle` | `{ name }` — steps tbd → present → late → absent → tbd. |
| POST/DELETE | `/api/meetings/:id/parking` · `/parking/:index` | Parking-lot items. |
| PATCH | `/api/meetings/:id/external/:index` | `{ email?, rsvp?, respondedNote? }` — stamps `respondedAt` when the RSVP changes. |
| POST | `/api/meetings/:id/rsvp` | `{ index, rsvp, note? }` — the invitee's own reply; notifies the chair. |
| POST/DELETE | `/api/meetings/:id/transcript/append` · `/transcript` | Live-transcription lines. |
| PUT | `/api/meetings/:id/ai-summary` | Store the generated summary. |
| POST | `/api/meetings/:id/ai-summary/apply-actions` · `/log-decisions` | Turn the summary into action items / decisions. |
| POST | `/api/meetings/:id/action-items` | Create an action item on this meeting. |
| POST | `/api/meetings/:id/action-items/extract` | Scan the minutes' decisions for commitment language and create the items; `{ created, count }` or `{ count: 0, message }`. |
| POST | `/api/meetings/:id/remind-owners` | Nudge every owner with an open item. |
| POST | `/api/meetings/:id/decisions` | Log a decision (defaults: `decidedBy` = chair, `tags` = ['approved'], `department` = General). |
| GET | `/api/action-items` | Across every meeting — the source for My To-Do. |
| GET/PATCH/DELETE | `/api/action-items/:id` | A status change appends to the item's history. |
| POST | `/api/action-items/:id/subtasks` · PATCH `/subtasks/:index` | Add / tick a sub-task. |
| POST | `/api/action-items/:id/comments` · `/dependencies` | Comment (stamped with the signed-in person) · depend on another item. |
| GET/POST | `/api/meeting-requests` | Peer-to-peer "can we meet?". A request **for the CMD from anyone else** is routed to the EA (`EA_NAME`): `routedTo` = the EA, `onBehalfOf` = the CMD. |
| POST | `/api/meeting-requests/:id/accept` · `/decline` · `/counter` | Accept creates the meeting and links it (`meetingId`); counter swaps the two people and goes back to pending. A decided request cannot be decided again (409). |
| GET/DELETE | `/api/decisions` · `/api/decisions/:id` | The Decisions Registry. |
| GET | `/api/notifications` | Mine only, with `unreadTotal`. |
| POST/PATCH | `/api/notifications/read-all` · `/api/notifications/:id/read` | Mark read. |

Notifications are written automatically when an action item is assigned or reassigned, a request is created,
accepted, declined or countered, minutes are circulated, and an external invitee answers an RSVP.

### Visit Observations (module `visits`)

A visit report: where the team went, when, who went, what they observed, how they rated the site, the overall
assessment, the follow-up actions it produced. Responses wrap it as `{ visit }`; the list follows the contract
above. `draft` is editable, `submitted` is signed off (stamped `submittedAt`, follow-up owners notified).

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/visits` | List. `mine=true` limits it to my own reports. |
| POST | `/api/visits` | Create. Only `title` and `date` are required, so a half-filled draft saves; `status: 'submitted'` must pass the submit checks. |
| GET/PATCH/DELETE | `/api/visits/:id` | Read, partial edit (`org`, `host` and `ratings` merge field by field), delete. |
| POST | `/api/visits/:id/status` | `{ status }` — draft ⇄ submitted. Submitting needs an organisation name, a purpose and an overall assessment, and tells every follow-up owner. |
| POST/PATCH/DELETE | `/api/visits/:id/observations` · `/observations/:index` | The detailed observations. |
| POST/PATCH/DELETE | `/api/visits/:id/action-items` · `/action-items/:index` | The follow-up actions (embedded in the visit; they are not meeting action items). |

List fields: `search` matches title, organisation, branch, city, host, team, purpose, scope, references, tags,
executive summary, observations and follow-up actions. Filters: `status`, `type`, `owner`, `site` (contains match
on the organisation or branch), `city`, `overallAssessment`, `severity` (an alias for `overallAssessment` —
excellent … unsatisfactory), `followUpRequired`, `tag`, `category` (an observation's category) and `mine=true`.
Date fields: date, nextVisitDate, submittedAt, createdAt, updatedAt (default `date`); numeric: `photos`;
sort: date, title, type, status, owner, overallAssessment, org.name, nextVisitDate, submittedAt, createdAt,
updatedAt (default `-date`).

### Department Master (module `departments`)

The organisational backbone: departments, their positions, the four task lanes (opening / closing / weekly /
monthly), the review cadence with its agenda templates, and the people assigned to each department. Every write
answers `{ department }` with the whole record, so the screen never has to merge anything by hand. Positions,
tasks, agenda sections and agenda points are sub-documents: their `id` is what `positionIds` and the task rows
refer to.

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/departments` | List (the shared contract). |
| POST | `/api/departments` | Create. `name` is required; `code` is generated (`TDPL-NEW-001`) when it is left out. Tasks name their positions by index into the new `positions` list (`positions: [0]`), which is how the web's department templates describe them. |
| GET/PATCH/DELETE | `/api/departments/:id` | Read · edit `name`, `icon`, `description`, `code`, `order` · delete (with its tasks and activity ticks). |
| POST | `/api/departments/:id/positions` · PATCH/DELETE `/positions/:positionId` | Sub-roles. Removing one reverts its tasks to "All in department". |
| POST | `/api/departments/:id/tasks/:kind` · PATCH/DELETE `/tasks/:kind/:taskId` | `kind` = `opening\|closing\|weekly\|monthly`. Weekly tasks carry `daysOfWeek` (0 = Sun; clearing it falls back to Monday), monthly tasks `dayOfMonth` (1–31 or `'last'`). |
| PUT | `/api/departments/:id/cadence` | When the weekly / monthly review happens, its owner and primary systems. |
| POST | `/api/departments/:id/cadence/:tab/sections` · PATCH/DELETE `/sections/:sectionId` | `tab` = `weekly\|monthly`. The standing agenda. |
| POST | `…/sections/:sectionId/points` · PATCH/DELETE `…/points/:pointId` | Agenda points, each with a RAG `indicator` (`red\|amber\|green\|null`). |
| PUT | `/api/departments/:id/assignments` | Replaces the department's people (`{ name, positionId?, role? }`, role = `member\|head\|cmd\|cgo`). |
| GET | `/api/departments/assignments` | The org-wide map `{ 'Dr. Anusha Singh': { departmentId, positionId, role } }` that My Activity and the Dashboard look people up in. |
| GET | `/api/departments/activity` | `?date=&scope=me\|person\|department\|org[&person=&departmentId=]` → the shift log in the web's own shape: `{ [person]: { [date]: { opening: { [taskId]: 'done' }, closing, weekly, monthly, review } } }`. |
| PUT | `/api/departments/activity` | `{ departmentId, kind, taskId, done, date?, person? }` — tick / un-tick one task. |

Reads (`GET /`, `/:id`, `/assignments`, `/activity`) are open to `departments`, `activity` or `dashboard`;
every write needs `departments`. `GET /activity` only shows somebody else's ticks to a person who has
`dashboard` or `departments`, and `PUT /activity` only accepts a `person` other than yourself with
`departments`.

`GET /api/departments` — search: name, code, description, positions.name/description, every lane's task text,
reviewCadence.owner, reviewCadence.primarySystems, assignments.name. Filters: `code`, `name`, `icon`,
`position` (a position's exact name), `person` (somebody assigned), `owner` (cadence owner, contains),
`system` (a primary system), `reviewDay` (0–6, the weekly review's day). Date fields: createdAt, updatedAt
(default `createdAt`); numeric: `order`; sort: order, name, code, createdAt, updatedAt (default `order`).

`node scripts/seed-departments.js` fills the 18 TDPL departments from `src/data/departments.js` (a copy of the
web app's seed) with their positions, tasks, review cadences and the roster's assignments. It is idempotent and
never overwrites a department that is already there.

### My Diary (module `diary`)

The calendar screen shows two kinds of thing side by side, and each has exactly one home: **diary entries** live
here, **meetings** stay in `/api/meetings`. Nothing is copied between them — the web app asks both for the same
window and merges them in the browser, and the "tentative" blocks come from pending `/api/meeting-requests` the
same way. Every write answers `{ entry }`.

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/diary` | List (the shared contract). My own diary unless `owner=` or `mine=false` says otherwise. |
| POST | `/api/diary` | Create. `title`, `cat` and `date` are required; a timed entry also needs `startTime` (or `allDay: true`). `owner` defaults to me. |
| GET/PATCH/DELETE | `/api/diary/:id` | Read · partial edit · delete. |

An entry is `{ id, owner, ownerId, title, cat, date, endDate, startTime, endTime, allDay, loc, notes, reminder,
attendees, external, addedBy, createdBy, createdAt, updatedAt }`. `cat` is
`meeting | focus | personal | travel | ooo | reminder`; dates are `YYYY-MM-DD` and times `HH:MM`, exactly as
meetings store them. `addedBy` is `self` or `ea` — set by the server from who wrote the entry, and what the
calendar paints the yellow **EA** badge from.

**The date window.** `from` / `to` default to `days`, the list of every calendar day an entry occupies
(`date` … `endDate`, multikey-indexed). That is what makes a month / week / day request both cheap and correct:
a week out of office is returned by every window it overlaps, not only by the one containing its first day. Both
ends are inclusive (`from=2026-11-23&to=2026-11-23` returns that day's entries). `date_from` / `date_to` still
range on the start day alone.

**Whose diary.** A list is the signed-in person's own entries by default. `owner=<name>` reads a diary shared
with them, `mine=false` widens it to every diary they may read, and a diary nobody shared answers 403 with a
sentence naming the owner. Sharing is `DELEGATIONS` in `services/diary.js` — the EA's edit access to the CMD's
diary, mirroring `web/src/data/diary.js` — plus admins, who reach every diary like everywhere else in this API.
Edit access is required to create, change or delete an entry, and an entry someone else fills in for you is the
one stamped `addedBy: 'ea'`.

Notifications (composed with the `html` tagged template, like every other module): the internal invitees are told about the
invitation, the owner is told when somebody else put something on their diary, the person who added it gets the
"Invites sent" line, and a changed external RSVP is reported to the owner.

## Seed

`npm run seed` upserts the 30 roster people (`src/data/roster.js`) by email (`first.last@trustlab.co.in`):
Venkata Cherukuri and Pallavi Elisetti are admins, titles matching
`CMD|CFO|COO|CGO|Head|Director|Manager|MR|Secretary|HOD` are managers, everyone else is an employee, each with the
role's default modules and `SEED_PASSWORD`. Existing accounts only get their title and department refreshed —
role, modules, status and password are never overwritten.
