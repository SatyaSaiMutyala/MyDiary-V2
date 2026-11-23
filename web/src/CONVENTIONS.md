# MyDiary V2 web — build conventions (read fully before writing any module)

Goal: port the single-file prototype `reference/mydiary_schedule_meeting.html` (16k lines) to React 19 + MUI 7
**pixel-for-pixel and feature-for-feature**. Nothing may be skipped or simplified. Every button, pill, badge,
empty state, prompt(), confirm(), alert(), toast, modal, filter, tab and hover state in the prototype must exist.

## Hard rules
1. **No CSS files, no className styling, no `<style>`.** Only MUI `sx` (or `styled`). Colours/fonts come from
   `src/theme/tokens.js` (`tokens`, `fonts`, `mono()`, `serifTitle()`, `TYPE_COLORS`). Copy exact px values,
   radii, shadows, gradients, letter-spacing from the prototype CSS (lines 10–4588 of the HTML).
2. **Layout = MUI 12-column Grid**: `import Grid from '@mui/material/Grid'` and `<Grid container spacing={..}>` /
   `<Grid size={{ xs: 12, sm: 6, lg: 3 }}>`. Every multi-column block in the prototype (summary rows, stat rows,
   form `.row`/`.row.three`/`.row.four`, kanban, module grids, two-pane layouts) becomes a Grid.
   Breakpoints in our theme: xs 0 · sm 600 · md 760 · lg 1100 (md = prototype's 760px sidebar break,
   lg = prototype's 1100px reflow). Everything must look right at 375px, 768px, 1280px.
3. **Responsive**: stack columns on xs/sm, scroll wide tables/boards horizontally (`overflowX: 'auto'`),
   never let content overflow the viewport. Preserve the desktop look exactly at lg+.
4. **Functionality**: keep every question the prototype asks, with the same texts — but ask it through
   MyDiary's own dialogs, never the browser's. `useDialog()` from `components/Dialogs` gives
   `alert` / `confirm` / `prompt` / `toast`; all four are async, so `await` each answer before asking
   the next. There is no `window.prompt/confirm/alert` left in `src/`, and none should be added.
   A plain helper module cannot call the hook, so it takes `dlg` as a parameter and the page hands
   its own in (see `projects/useProjectActions.js`, `departments/utils.js`, `meetings/rsvpPreview.js`).
   Keep all demo behaviours (recording simulator, AI summary 2.2s delay, RSVP preview window via
   `window.open` + `document.write` is fine, downloads via Blob, print preview via `window.open`).
5. **Fonts**: body `fonts.sans` (DM Sans), mono labels `fonts.mono` (Space Mono), display titles `fonts.serif`
   (Playfair Display). Already loaded in index.html.
6. Files: JSX (no TypeScript). One component per file where sensible; module folder `src/modules/<name>/`
   with `*Page.jsx` entry (already stubbed — replace its contents, keep the default export name), plus
   `components/`, `modals/`, `utils.js` as needed. Keep imports relative.
7. Do not touch other modules' folders, the store, theme, layouts or shared components. If you need a
   shared helper that does not exist, add it inside your module folder.

## Store — `useAppStore()` (src/store/AppStore.jsx)
```js
const { state, set, mutate, update, notify, setViewer } = useAppStore();
state.viewer            // { name, role } — the "View as" person (CURRENT_VIEWER in prototype)
state.meetings          // MEETINGS (already enriched: presence, parkingLot, preRead, contributions, carriedOver, polls, contextCard)
state.meetingRequests   // MEETING_REQUESTS
state.actionExtras      // ACTION_EXTRAS keyed by action id
state.decisions, state.notifications, state.templates, state.integrations
state.standaloneTasks, state.diaryEntries, state.discussionLogs, state.visits
state.departments       // DEPARTMENTS fully normalised (positionIds[], daysOfWeek[], reviewCadence)
state.projects, state.projTemplates (usedCount is mutable), state.activityLog (ACTIVITY_LOG)
state.recording         // { active, meetingId, elapsed, feedIdx } — live transcription state

set('meetings', list | prev => list)                 // replace one collection
mutate('meetings', ms => { const m = ms.find(..); m.status = 'done'; })   // deep clone + imperative edit (port prototype code 1:1)
update(d => { d.meetings...; d.decisions.unshift(..); })                  // multi-collection edit on a deep clone of state
notify({ type: 'action'|'meeting'|'minutes', text: '<strong>HTML</strong> string', icon: '🔔' })  // = NOTIFICATIONS.unshift(...) + dot
setViewer(name, role)
```
Notification `text` is an HTML string (prototype convention) — render with `dangerouslySetInnerHTML`.
Static constants come from `src/data/*.js` (TYPES, EMPLOYEES, DIARY_CATS, CHANNELS, VISIT_TYPES, RATING_AREAS,
OBS_CATEGORIES, OVERALL_OPTIONS, VISIT_TEMPLATES, LOG_TEMPLATES, DEPT_TEMPLATES, DEPT_SEED, EMPLOYEE_ASSIGNMENTS,
getEmployeeAssignment, DAYS_OF_WEEK(_FULL), PROJ_CATEGORIES, PROJ_STATUSES, TRANSCRIPT_DEMO, AI_SUMMARY_DEMO, logos).

## Utils
`src/utils/dates.js`: TODAY (Sat 21 Nov 2026), todayStr(), parseDate, formatDate, formatDateLong, formatTime,
daysUntil, isToday, isOverdue, addDaysISO(n), startOfWeek, parseDuration, addMinutes, timeToMinutes, nowStamp,
MONTHS, MONTHS_FULL, DAYS, DAYS_LONG.
`src/utils/people.js`: initials, normExt, rsvpSummary, RSVP_LABELS, ownerAvatarColor, tdplEmail, posPill.
`src/utils/departments.js`: tasksForPosition, describeWeekly, describeMonthly, todayFacts(), dueTodayLists(), getTaskStatus(log,…).

## Shared components — `import { … } from '../../components'`
Eyebrow, PageHeader({code, parts, icon, title, sub, actions}), Btn({variant: default|primary|ghost|danger, size: sm|md|lg}),
TextLink, QuickLinkBtn, AddBtn({ext}), Pill, PriorityPill, StatusPill, TypePill, RsvpPill, Tag, Avatar({name,size,color,external}),
SummaryCard({label,value,sub,accent}), DmsCard, Card({num,title,sub,right,badge}), VSection({icon,head,meta}),
EmptyState({icon,title,desc}), MonoHeading, GradientHero, ProgressBar({pct,color}), TabBar({tabs,value,onChange}),
FilterPill({active,count}), Segmented({options,value,onChange}), FieldLabel, TextInput, TextArea, SelectInput (native
<select>, children <option>), Field({label,req,hint}), SearchBox, FilterSelect, ToggleRow, Chip({external,noEmail,email,onRemove}),
DelBtn, ModalShell({open,onClose,width,head:'light'|'gradient'|'custom',icon,title,sub,headSlot,footer}), FootNote.
Read `src/components/*.jsx` to see exact props. Reuse them; build module-specific pieces locally.

## Navigation
react-router: `useNavigate()`. Routes: `/` dashboard · `/meetings` · `/meetings/new` · `/meetings/:id` · `/decisions` ·
`/templates` · `/my-activity` · `/diary` · `/logs` · `/todo` · `/visits` · `/projects` · `/projects/:id` ·
`/departments` · `/departments/:id` · `/integrations`.
Breadcrumbs: call `useCrumbs([{label:'Meetings', to:'/'},{label:'My Meetings', to:'/meetings'},{label: m.title}])`
from `src/store/CrumbsContext.jsx` in detail pages (prototype `showView` crumb logic). List pages don't need it.

## Porting method
Read the prototype's render function for your view (line numbers given in your brief), its CSS classes
(grep the class names in lines 10–4588), and reproduce structure, copy text, emoji, colours, spacing exactly.
Local UI state (`CURRENT_TAB`, filters, drafts, open modals) → `useState` inside the module.
Shared data mutations → `mutate`/`update`. After mutations the prototype re-rendered; React does that for you.

## Skin update (2026-11-22) — GateBook / AIMS look
The token NAMES above are unchanged but their VALUES are now the Trust GateBook (TruSentinel) palette:
IBM Plex Sans/Mono (via @fontsource in main.jsx), teal `#0F766E` accent, gold `#FFC81F`, panel title bars `#20605B`
with a gold rule, 6px corners, white table heads with mono labels and the pink rule. `fonts.serif` is aliased to
Plex Sans. Shared components already render the AIMS recipes (PageHeader = `.phead`, Card/VSection = teal title bar,
TabBar = raised segmented tabs (sunk trough, white active pill in teal), Btn = AIMS buttons, Pill = chip tones, ModalShell = AIMS dialog). Prefer them over local copies.

Shell: `src/layouts/` — DesktopRail (258/66px, pin in `md.rail.pinned`, hover-open), Topbar (60px, breadcrumb, ⌘,
View-as, bell, user menu), PhoneChrome (<861px: app bar + drawer + bottom tabs). Login: `src/auth/LoginPage.jsx`.

## Settings, permissions and the audit log
- `src/data/users.js` — MODULES / ROLES / `hasModule(user, key)` / `ROUTE_MODULE`. New module? add it to MODULES,
  ROUTE_MODULE, `src/layouts/navItems.jsx` (with `module:` key) and wrap the route in `<NeedsModule module="…">`.
- `state.users` drives permissions for the current View-as person (rail items hidden, routes redirect home).
- Every store write is diffed in `src/store/audit.js` into `state.auditLog` (create/update/delete per record;
  `notify()` → "notify"; sign-in/out and View-as → "auth"). Use `audit(action, {module, entity, details})` for
  explicit entries. Settings → Activity Log shows, filters and exports it.
- QA builds: `npx vite build --mode qa` auto-signs-in (AuthContext) so headless screenshots can reach every page.
