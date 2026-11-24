# Parked components

These came from the v1 app and are wired to v1 models or v1 API slices, so they do not
compile here yet. They are kept because their LOOK is what v2 should have.

When a v2 module is built, pull its component back into `src/components/` and point it at the
v2 model instead — the markup and styles stay exactly as they are.

| file | bring back with |
|---|---|
| ActivityRow | My Activity |
| DiscussionRow | Discussion Logs |
| ProjectRow, KpiRow | Projects |
| PersonPicker, DepartmentPicker | any screen that picks a person |
| RepeatFields | recurring diary entries |
| AlertRow, ReminderRow | v1 only — no v2 module uses these yet |
| PeopleField | needs PersonPicker, so it comes back with it |

Brought back so far: **ChecklistItemRow, LabSections, LabRecordRow, ReopenLog** — with Lab Readiness
(`src/screens/LabReadinessScreen.js`), pointed at the v2 board instead of v1's `lab/model.ts`.
