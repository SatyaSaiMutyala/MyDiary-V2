# Web → mobile flow map

Every flow the website has, and the mobile screens that carry it. This is the contract: a module is
finished when a person can do on the phone what they can do on the website, in the same order, using
the same words.

## The rule

**Same flow, phone-shaped layout.** Nothing is dropped. What changes is the arrangement:

| On the website | On the phone |
|---|---|
| Tabs side by side | the same tabs in a `SegmentedControl`, one pane at a time |
| A wide form, several fields per row | the same fields, one per row, in `FormCard` sections |
| A modal dialog | a pushed screen (`FormScreen`), or a sheet for something small |
| A wide table | a list of `Card` rows, the columns that matter on the card |
| A multi-step wizard on one page | the same steps as stacked cards you scroll |
| Hover to reveal | always visible, or behind a long-press |

Nothing invented, nothing renamed. If the website says "Owed by me", the phone says "Owed by me".

## Build order

Each module: **UI first on sample data → wire to the API → check it on a simulator**. That is how the
v1 app was built and how the website was built.

1. **Meetings** — part built, see below
2. **My To-Do** — the one people open all day
3. **My Diary**
4. **Discussion Logs**
5. **Visit Observations**
6. **Projects** — the biggest
7. **Decisions · Templates · Notifications** — small, can go together
8. **My Activity · Department Master**
9. **Settings** — account, people, permissions, activity log

---

## 1. Meetings

Web: `MeetingsListPage`, `MeetingDetailPage` (6 panes), `ScheduleMeetingPage` (5 steps),
`DetailCirculateModal`, `RequestMeetingModal`. API: `/meetings` 26, `/action-items` 8,
`/meeting-requests` 6, `/decisions` 3.

| Web flow | Mobile screen | State |
|---|---|---|
| List + search + filters + upcoming/past/all | `MeetingsScreen` | **built** (sample data) |
| Requests tab | `MeetingRequestsScreen` | to do |
| Detail · Agenda pane | `MeetingDetailScreen` → Agenda | **built**, read-only |
| Detail · Minutes pane (write discussion + decision per item, finalise) | `MeetingMinutesScreen` | to do |
| Detail · Live pane (mark present / late / absent, parking lot) | `MeetingLiveScreen` | to do |
| Detail · Actions pane (add, assign, tick, sub-tasks, comments) | `MeetingActionsScreen` | to do |
| Detail · Decisions pane (log a decision) | `MeetingDecisionsScreen` | to do |
| Detail · AI pane (summary, transcript) | read-only card inside detail | to do |
| Schedule, 5 steps | `MeetingFormScreen` | **built**, steps 1–3 only |
| Circulate minutes | `CirculateScreen` | to do |
| Request a meeting | `RequestMeetingScreen` | to do |

**Detail becomes a segmented control** across the six panes, same names the website uses.

## 2. My To-Do

Web: `MyTodoPage`, `CompleteDialog`, `StandaloneTaskModal`. API: `/action-items` 8.

| Web flow | Mobile screen |
|---|---|
| Owed by me / Delegated by me / Overdue / Done / Everything | `TodoScreen` chips — **wired** |
| Source filter: From meetings / From visits / Standalone | chips under the search |
| Open one task | `TaskDetailScreen` |
| Complete, with a note | `CompleteScreen` (sheet) |
| New standalone task | `TaskFormScreen` |
| Sub-tasks, comments, nudge the owner | inside `TaskDetailScreen` |

## 3. My Diary

Web: `DiaryPage` (month / week / day / agenda), `EntryModal`, `EntryDetailModal`, EA banner.
API: `/diary` 5 + `/meetings` for the meetings shown alongside.

| Web flow | Mobile screen |
|---|---|
| Day view | `DiaryScreen` — **built**, sample data |
| Week view | week strip — **built** |
| Month view | `MonthGrid` under the strip |
| Agenda view (next 21 days) | a third chip on the same screen |
| Open an entry | `DiaryEntryScreen` |
| New / edit entry | `DiaryEntryFormScreen` |
| "Open CMD's diary" (EA) | the same banner, when the API allows it |

## 4. Discussion Logs

Web: `DiscussionLogsPage` (all logs / by person / open follow-ups), `LogModal`, `LogDetailModal`.
API: `/logs` 13.

| Web flow | Mobile screen |
|---|---|
| All logs / By person / Open follow-ups | `LogsScreen`, three chips |
| One person's timeline | `PersonTimelineScreen` |
| Open a log | `LogDetailScreen` |
| New / edit log | `LogFormScreen` |
| Tick a follow-up | inline on the row |

## 5. Visit Observations

Web: `VisitsPage`, `VisitModal`, `VisitDetailModal`. API: `/visits` 12.

| Web flow | Mobile screen |
|---|---|
| List, filters, stat cards | `VisitsScreen` |
| New / edit visit (org, host, team, ratings, observations, actions, photos) | `VisitFormScreen` — several `FormCard` sections |
| Open a visit | `VisitDetailScreen` |
| Submit for review | button on the detail screen |

Photos are a count today on both sides. Real upload needs S3 and is a separate decision.

## 6. Projects

Web: `ProjectsPage`, `ProjectDetailPage` (8 panes), `ProjectWizardModal`, `ProjectTemplatesModal`.
API: `/projects` 31. The biggest module.

| Web flow | Mobile screen |
|---|---|
| Portfolio, stat cards, filters | `ProjectsScreen` |
| Detail · Overview / Tasks / Milestones / Risks / Team / KPIs / Activity | `ProjectDetailScreen`, segmented control |
| Detail · Gantt | `ProjectGanttScreen` — own screen, it needs the width |
| New project wizard (4 steps) | `ProjectFormScreen`, four stacked cards |
| Template library | `ProjectTemplatesScreen` |
| Add milestone / task / risk | `MilestoneFormScreen`, sheets for the rest |

## 7. Decisions · Templates · Notifications

| Web flow | Mobile screen |
|---|---|
| Decisions register, filters | `DecisionsScreen` |
| Agenda templates: browse, use, create, edit, copy, remove | `TemplatesScreen` + `TemplateFormScreen` |
| Notifications list, mark read | `NotificationsScreen` |

## 8. My Activity · Department Master

| Web flow | Mobile screen |
|---|---|
| Shift checklist, lanes, tick | `ActivityScreen` — **built**, sample data |
| Department list | `DepartmentsScreen` |
| Department detail: positions, task lanes, review cadence, assignments | `DepartmentDetailScreen` |

Department Master is admin master-data: read on the phone, edit on the website unless asked otherwise.

## 9. Settings

| Web flow | Mobile screen |
|---|---|
| My account | `AccountScreen` |
| Change password | `ChangePasswordScreen` |
| Users: list, add, edit, permissions, reset password | `UsersScreen` + `UserFormScreen` |
| Activity log | `ActivityLogScreen` |

Admin-only, exactly as the website has it. `canOpen()` already hides what a person may not open.

---

## What "wired" means

A screen is wired when:

- it reads through an RTK Query hook in `src/store/api/<module>Api.js`, never from `src/data/sample.js`
- it shows the API's own error wording (`errorMessage(err)`), never its own
- it has a loading state, an empty state and an error state
- the list pages through the shared contract (`page`, `limit`, `search`, filters as params)
- writes invalidate the right cache tags so other screens update

`src/data/sample.js` is no longer imported by any screen. It is left on disk only because it is
not under version control; nothing in the bundle reaches it.

### Wired so far

Meetings · My To-Do · My Diary · Home · My Activity · My Projects · Notifications ·
Decisions · My Visits · Discussion Logs · Reminders · My account.

Still on stubs: Settings.

**My account** reads `GET /auth/me` and saves through `PATCH /auth/me`, which accepts only the two
things a person may change about themselves — name and job title. Email, role, department and the
modules they hold are shown but not editable: they are set in Settings on the website, and a box
that cannot be saved is worse than no box. Changing the name also updates the stored session, so
the header and the More menu do not disagree with this screen.

**Settings is deliberately not on the phone.** It is the admin console — people, permissions and the
activity log — which is desk work, like Department Master.

**Discussion Logs** is three screens — the list, the log in full, the editor — and the list carries
the website's three views: everything newest-first grouped by day, one row per person spoken with,
and every follow-up across every log. The two groupings come from the server's own endpoints
(`/logs/people`, `/logs/followups`), so the phone never folds the list itself and the counts cannot
drift from the desk's. Every read goes out with `mine=true`: a log belongs to whoever wrote it and
is private unless shared.

A follow-up is flipped with `POST /followups/:id/toggle`, so the phone never has to know which way
round it currently is.

**My Visits** is three screens: the list, the editor and the signed-off report. A draft opens
straight into the editor, a submitted report opens read-only — the same split the website makes.
Submitting goes through `POST /visits/:id/status`, not a field on the record, because the server
stamps the time, writes the Activity Log line and notifies the follow-up owners. Observations and
follow-up actions are addressed by their position in the list, which is the server's contract.

The website's eight visit templates are client-side presets, not API data, and are not ported —
the editor starts blank on the phone.

**The decisions registry is read-only**, as it is on the website: a decision is made in a meeting
and recorded there, so it is changed there too. Tapping one opens the meeting that produced it.
The meeting-type filter resolves to that type's meeting ids first and goes out as
`meetingId=a,b,c`, because decisions are filtered by meeting, not by meeting type.

**Agenda templates are not a module here.** Managing the library — create, edit, duplicate,
delete — is desk work and stays on the website. The one part worth having in your hand is using
one, so "Start from a template" sits inside the meeting form: the picker hands back a
`templateId`, and the meeting's type and agenda lines are filled from it, exactly as the website's
"Load from template…" link does. The phone reads `GET /templates` and nothing else.

### Notifications — two things the phone does differently

- **The icon comes from the type, not the server's emoji.** Every notification carries an emoji
  (`✓`, `🔔`, `📧`). `AppText` pins Poppins, which has no emoji glyphs, so one would render as a
  tofu box — `action` / `meeting` / `minutes` pick a lucide icon instead.
- **`<em>` is tealed, not italicised.** Poppins ships here in four upright weights and no italic
  face, so an italic run would fall back to another typeface. The website italicises what a
  notification is *about* — a meeting or action title — so that run is tealed, which is how the app
  points at a meeting everywhere else. `<strong>` uses the semibold face, as on the desk.

The text itself is parsed, never rendered as markup (`utils/richText.js`), for the same reason the
website parses it: the text is built from things people type.

### My Projects — where it differs from the website

Same eight panes, same words, same sums. Two deliberate differences:

- **The four-step wizard is one short form.** `POST /projects` accepts a whole project including its
  milestones and tasks, but filling that in on a phone is punishing. The form creates the project
  and opens it; milestones, tasks, risks, KPIs and people are added from the project's own panes,
  each through its own endpoint. Nothing the website can produce is out of reach.
- **The Gantt is a vertical track.** A pinch-zoom Gantt does not work at phone width. Timeline shows
  the project's window, the days left, and every milestone as a dot on one track — done in green,
  overdue in red.

### Reminders ring like an alarm

A push alone is a quiet banner, so the phone books its own local alarm for every upcoming reminder
(`src/reminders/alarms.js`, ported from the v1 app). It therefore rings with no network and even if
the app is never opened again.

- **Android** — one notification whose sound loops (`FLAG_INSISTENT`), times out after two minutes,
  shown over the lock screen, with a Stop action. Needs the exact-alarm switch on Android 12+, which
  is asked for once.
- **iPhone** — a notification sound is capped at 30 seconds, so four are booked 30 seconds apart;
  stopping or opening one cancels the rest.

`alarm.wav` ships on both platforms already (`android/app/src/main/res/raw/`, and in the Xcode
target). The alarm id carries the reminder and the minute, so moving a reminder books a new alarm
and the old one is cleared as stale.

### Push notifications

Every in-app notification is also pushed (`Backend/src/services/notifications.js` → `push.js`). The
phone registers its Firebase address on sign-in and hands it back on sign-out, so a shared phone
never pushes the previous person's notifications. Push is off when `FCM_CREDENTIALS` is unset and
nothing fails — the in-app notification is written either way.
