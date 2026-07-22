# Operational Read-Only Screen Audit

## Scope

This audit covers the current operational static app:

- Entry: `index.html`
- Main script: `app.js?v=111`
- Workspace sync: `services/workspaceDataService.js`
- System/admin service: `services/systemAdminService.js`

No operational code, Firebase data, Firestore Rules, or menu wiring was changed.

## Operational Screen Inventory

| Screen | Menu key | Renderer / source | Data source | Read style | Write style | Listener | Role scope | Workspace required | Grade |
|---|---|---|---|---|---|---|---|---|---|
| Main dashboard | `dashboard` | `renderDashboardV8` / V70/V82 patches | mixed `store.*`, `systemNoticesV54` | local hydrated store | quick add buttons can write | workspace sync + system notice listener | many roles | yes for workspace data | B |
| My info | `personal` | `renderPersonalV8` / V96 | `store.profile`, `store.diary` | local store | profile/diary save | workspace sync | most roles | yes | B |
| Attendance | `attendance` | `renderCollectionV7` | `workspaces/{workspaceId}/attendance` | workspace store | add/edit/delete | workspace sync | teacher/admin/normal limited | yes | C |
| Edit requests | `requests` | `renderCollectionV7` + report box | `workspaces/{workspaceId}/requests`, `systemReports` | workspace store | submit/edit request | workspace sync | most roles | yes | C |
| Schedule management | `schedules` | `renderSchedulesV10` / collection fallback | `workspaces/{workspaceId}/schedules` | workspace store | add/edit/delete | workspace sync | many roles | yes | C |
| Academic schedule | `academic` | `renderAcademicV17` / V66/V68/V95 | `academic`, `academicSchedules` | workspace store | import/manual write | workspace sync | many roles | yes | B |
| Notices | `notices` | `renderNoticesSplitV81` | `workspaces/{workspaceId}/notices` | workspace store | add/edit/delete/download | workspace sync | many roles | yes | B |
| School notices | `schoolNotices` | `renderSchoolBoardV66` / V88/V89 | `workspaces/{workspaceId}/schoolNotices` | workspace store | import/manual write | workspace sync | selected roles | yes | B |
| Home letters | `homeLetters` | `renderSchoolBoardV66` / V88/V89 | `workspaces/{workspaceId}/homeLetters` | workspace store | import/manual write | workspace sync | selected roles | yes | B |
| Meal view/application | `meals`, `mealApplications` | `renderMealsV66`, `renderMealApplicationsV81` | `meals`, `mealApplications` | workspace store | import/apply/save | workspace sync | many roles | yes | C |
| Timetable | `timetable` | `renderTimetableV111` | `timetable`, `timetableSets`, `periodTimes` | workspace store | heavy edit/delete/save | workspace sync | many roles | yes | E |
| Subjects | `subjects` | `renderCollectionV7` | `workspaces/{workspaceId}/subjects` | workspace store | add/edit/delete | workspace sync | staff/admin | yes | C |
| Teachers | `teachers` | `renderCollectionV7` | `workspaces/{workspaceId}/teachers` | workspace store | add/edit/delete | workspace sync | staff/admin | yes | C |
| Materials | `materials` | `renderCollectionV8` | `workspaces/{workspaceId}/materials` | workspace store | add/edit/delete/download | workspace sync | many roles | yes | B |
| Lessons | `lessons` | `renderLessonsV10` / collection fallback | `workspaces/{workspaceId}/lessons` | workspace store | add/edit/delete | workspace sync | teacher/admin/normal limited | yes | C |
| Assignments | `assignments` | `renderCollectionV7` | `workspaces/{workspaceId}/assignments` | workspace store | add/edit/delete | workspace sync | many roles | yes | C |
| Exam schedules | `examSchedules` | `renderCollectionV7` | `workspaces/{workspaceId}/examSchedules` | workspace store | add/edit/delete | workspace sync | many roles | yes | B |
| Exams/grades | `exams` | `renderExamsV95` | `workspaces/{workspaceId}/exams` | workspace store | add/edit/delete/download | workspace sync | many roles, sensitive | yes | E |
| Records | `records` | `renderCollectionV7` | `workspaces/{workspaceId}/records` | workspace store | add/edit/delete | workspace sync | many roles | yes | C |
| Portfolio | `portfolios` | `renderCollectionV8` | `workspaces/{workspaceId}/portfolios` | workspace store | add/edit/delete/download | workspace sync | many roles, privacy | yes | B |
| Projects | `projects` | `renderProjectsV12` | `workspaces/{workspaceId}/projects` | workspace store | add/edit/delete | workspace sync | many roles | yes | C |
| Afterschool | `afterschool` | `renderProgramListV26` / `renderProgramPageV26` | program/schedule/attendance collections | workspace store | add/edit/delete/attendance | workspace sync | many roles | yes | E |
| Special lectures | `specialLectures` | `renderProgramListV26` | special lecture collections | workspace store | add/edit/delete/attendance | workspace sync | many roles | yes | E |
| Clubs | `clubs` | `renderProgramListV26` | club collections | workspace store | add/edit/delete/attendance | workspace sync | many roles | yes | E |
| People | `people` | `renderCollectionV7` | `workspaces/{workspaceId}/people` | filtered store | add/edit/delete | workspace sync sensitive filter | manager/admin | yes | D |
| Friend awards | `friendAwards` | `renderCollectionV7` | `workspaces/{workspaceId}/friendAwards` | filtered store | add/edit/delete | workspace sync sensitive filter | manager/admin | yes | D |
| Penalties | `penalties` | `renderPenaltiesV29` | `workspaces/{workspaceId}/penalties` | filtered store | add/edit/delete | workspace sync sensitive filter | staff/admin | yes | D |
| Budget | `budget` | `renderCollectionV7` | `workspaces/{workspaceId}/budget` | workspace store | add/edit/delete | workspace sync | manager/admin | yes | C |
| Site/homepage management | `site` | `renderSiteV20` / V86/V98 | `store.settings` | local/workspace settings | settings save | settings listener | manager/admin | yes | D |
| Accounts | `accounts` | `renderAccountsV17` | auth/users/members/invites | mixed service reads | invite/role/account write | several listeners | manager/admin | yes | D |
| Admin | `admin` | `renderAdminV12` | settings/accounts/system helpers | mixed | writes | mixed | admin | yes | D |
| System settings | `system` | `renderSystemV12` | local/system settings | local store | backup/reset/report | mixed | admin | yes | D |
| System owner console | `systemOwner` | `renderSystemOwnerConsoleV54` | `users`, `systemOwners`, `workspaces`, `adminLogs`, etc. | broad admin subscriptions | broad writes | system admin listeners | system owner | no/optional | D |
| Print | `print` | `renderPrintV95` | selected store collections | local store | download/print only | workspace sync source | print/account roles | yes | B |
| Master data | `masterData` | `renderMasterDataV95` | `masterDataVersions`, settings | workspace store | writes versions/settings | workspace sync | super/system | yes | C |
| Workspace updates | `workspaceUpdates` | `renderWorkspaceUpdatesV95` | `workspaces/{workspaceId}/workspaceUpdates` | workspace store | apply button mutates status | workspace sync | most roles view | yes | B |
| OMR forms | `omrForms` | `renderOmrFormsV95` | `workspaces/{workspaceId}/omrForms` | workspace store | create/edit/delete/download | workspace sync | many roles | yes | C |
| Chat/inquiry | `chat` | `renderChatConsoleV92` | chat service collections | service subscriptions | messages/logs write | chat listeners | route-based | yes | E |

## A-E Classification

- A: Pure read-only candidate with a bounded Firestore read and no screen-entry write.
- B: Read-centered operational screen, but current operational UI includes write buttons or local UI-state writes.
- C: CRUD-centered workspace feature.
- D: Authentication, permission, admin, or sensitive data feature.
- E: Timetable V111 or complex operational core.

No existing operational screen is fully A as implemented, because the static app generally renders action buttons and reads from a live `store` hydrated by `services/workspaceDataService.js`. A safe first migration should therefore be a read-only React replica of one B-grade operational screen.

## Read-Only Candidate Shortlist

| Candidate | Operational screen | Candidate data path | Why possible | Main risk | Grade as React replica |
|---|---|---|---|---|---|
| Workspace notices read-only | `notices` | `workspaces/{workspaceId}/notices` | valuable, general workspace data, Rules allow workspace members read | operational screen includes write buttons, but replica can omit them | A |
| System notices read-only | dashboard/system notice panel | `systemNotices where status == active` | signed-in global read allowed in current rules | global scope, not workspace-comparison friendly | A- |
| School notices read-only | `schoolNotices` | `workspaces/{workspaceId}/schoolNotices` | simple row table | import/manual write exists, school URL/link data | B+ |
| Home letters read-only | `homeLetters` | `workspaces/{workspaceId}/homeLetters` | simple row table | import/manual write exists, link data | B+ |
| Materials list read-only | `materials` | `workspaces/{workspaceId}/materials` | general workspace read allowed | links may expose external IDs, download UI exists | B |
| Workspace basic info | no single operational screen | `workspaces/{workspaceId}`, member doc | very small read | would be a new view, not direct screen migration | B |
| Workspace updates read-only | `workspaceUpdates` | `workspaces/{workspaceId}/workspaceUpdates` | view permission broad | current screen includes apply/write button | B |
| Dashboard summary read-only | `dashboard` | many collections | high user value | many collections, hidden write risks, comparison complexity | C |

## Hidden Write Review

Operational static app hidden write risks:

- `saveStore()` can schedule Firestore writes unless called during render or with `skipRemote`.
- `renderPageV106` increments `renderDepthV106`, so render-triggered saves are forced local-only and skip remote writes.
- `renderNoticesSplitV81` itself only reads `filteredRowsV7("notices")` and renders buttons.
- Notice writes happen only through explicit actions:
  - `openEditorV7` and save flow
  - `deleteRow`
  - `saveNoticeDirectToFirestoreV52`
- Filter controls store UI state in `sessionStorage`, not Firestore.
- `services/workspaceDataService.js` uses realtime listeners for workspace collections and can bootstrap missing remote data, so app-next should not reuse this operational sync layer.

For the first React migration, use a dedicated read-only `getDocs` query and do not use operational `saveStore`, `PMWorkspaceDataService`, or admin services.

## Role and Workspace Access

The new AuthProvider fields are sufficient for a workspace notices replica:

- `status`
- `globalRole`
- `isSystemOwner`
- `currentWorkspaceId`
- `currentWorkspaceRole`

Access recommendation:

- signed out: block, show login needed
- pending/rejected/disabled: block data read, show account status
- active + `currentWorkspaceId`: read workspace notices
- active + workspace null: show no workspace selected
- system_owner + workspace null: show no workspace selected, no global notice query in first implementation
- super_manager/manager/teacher/normal/viewer/print_account: allow only if current workspace exists and membership is active

## Recommended First Candidate

Selected candidate: Workspace notices read-only.

Reason:

- It is useful for real users.
- It maps to one clear Firestore path: `workspaces/{workspaceId}/notices`.
- Current rules allow read for `isSystemOwner()` or workspace members.
- It can be implemented with one bounded `getDocs` query.
- It does not require changing the operational notice writer.
- It avoids timetable V111 and admin/auth core areas.
