# Role / Workspace Release Gate V1

## 1. Applied Commit

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Stable baseline: `4cd0422 feat: stabilize schedules sync and add app-next read-only pilot`
- Scope of this gate: code/read-only policy audit, static release-gate tests, and manual verification checklist.
- Not changed in this step: operational `index.html`, `app.js`, root `services/*`, `src/app-next/*`, Firestore Rules, Firebase data, roles, memberships, notices, schedules, timetable V111/V120, recovery tooling.

## 2. Auth Structure

Operational app:

- Entry: `index.html`
- Runtime scripts: Firebase compat SDK, root `services/*.js`, and `app.js?v=120`
- Auth and menu guard: legacy static app state in `app.js`
- React bootstrap: not mounted from `index.html`

app-next:

- Entry: `app-next.html`
- Runtime script: `/src/app-next/main.tsx`
- Provider tree: `AuthProvider -> LegacyAuthAdapterProvider -> AppNext`
- Legacy `src/context/AuthContext.tsx`: not mounted by app-next
- Auth state source: new `AppSession` loaded by `src/auth/sessionService.ts`

## 3. Role Structure

Global roles:

| Role | Source | Notes |
| --- | --- | --- |
| `system_owner` | `systemOwners/{uid}` and global role normalization | Global role only. Must not be stored or compared as a workspace role. |
| `user` | normalized users document role | Default non-global role bucket. |

Workspace roles:

| Role | Expected behavior |
| --- | --- |
| `super_manager` | Highest workspace manager; broad workspace management. |
| `manager` | Workspace admin subset; cannot manage `super_manager` in new permission service. |
| `teacher` | Teacher/workflow features; no global admin. |
| `normal` | Normal user features only. |
| `viewer` | Read-only workspace access. |
| `print_account` | Print/read oriented access. |

`src/permissions/roles.ts` keeps `system_owner` out of `VALID_WORKSPACE_ROLES`.

## 4. Canonical Workspace Structure

Canonical fields and documents:

- User current workspace: `users/{uid}.currentWorkspaceId`
- Canonical membership: `workspaces/{workspaceId}/members/{uid}`
- App session fields: `currentWorkspaceId`, `currentWorkspaceRole`
- Legacy membership diagnostics may read `workspace_members` and `workspaceMembers`, but authority decisions are based on canonical nested membership.

System owner exception:

- Missing or dangling `currentWorkspaceId` is recorded as a warning.
- A system owner remains authenticated.
- A missing workspace role is not converted to `system_owner`.

## 5. Operational App Route Matrix

The operational static app is menu/page-key based, not React route based. Direct URL route behavior is therefore not fully represented by React guard tests.

| Page key | Auth required | Workspace required | Primary role policy | Status |
| --- | --- | --- | --- | --- |
| `systemOwner` | yes | no for global owner | `system_owner` | implemented-needs-manual-test |
| `dashboard` | yes | yes except owner admin surface | role menu | implemented-needs-manual-test |
| `personal` | yes | yes | role menu | implemented-needs-manual-test |
| `attendance` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `requests` | yes | yes | role menu | implemented-needs-manual-test |
| `schedules` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `academic` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `notices` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `schoolNotices` | yes | yes | role menu | implemented-needs-manual-test |
| `homeLetters` | yes | yes | role menu | implemented-needs-manual-test |
| `meals` | yes | yes | role menu | implemented-needs-manual-test |
| `mealApplications` | yes | yes | role menu | implemented-needs-manual-test |
| `timetable` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `subjects` | yes | yes | role menu | implemented-needs-manual-test |
| `teachers` | yes | yes | manager/teacher surfaces | implemented-needs-manual-test |
| `materials` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `lessons` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `assignments` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `examSchedules` | yes | yes | role menu | implemented-needs-manual-test |
| `exams` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `records` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `portfolios` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `projects` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `afterschool` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `specialLectures` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `clubs` | yes | yes | role menu/write permissions | implemented-needs-manual-test |
| `people` | yes | yes | manager+ | implemented-needs-manual-test |
| `friendAwards` | yes | yes | manager+ | implemented-needs-manual-test |
| `penalties` | yes | yes | manager+ | implemented-needs-manual-test |
| `budget` | yes | yes | manager+ | implemented-needs-manual-test |
| `site` | yes | yes | manager+ | implemented-needs-manual-test |
| `accounts` | yes | yes | manager+ | implemented-needs-manual-test |
| `admin` | yes | yes | manager+ | implemented-needs-manual-test |
| `system` | yes | yes | super_manager/system_owner in menu | implemented-needs-manual-test |
| `print` | yes | workspace role dependent | `print_account` and managers | implemented-needs-manual-test |

Operational page-key count: 35.

## 6. app-next Route Matrix

| Hash route | Auth | Workspace | Guard/component | Direct URL status |
| --- | --- | --- | --- | --- |
| `#/dashboard` | required | not required for auth, data read may require workspace | `RequireAuth` | verified-complete |
| `#/account` | required | no | `RequireAuth` | verified-complete |
| `#/settings-readonly` | required | no | `RequireAuth` | verified-complete |
| `#/timetable-readonly` | required | data blocked without workspace | `RequireAuth` | verified-complete |
| `#/schedules-readonly` | required | data blocked without workspace | `RequireAuth` | verified-complete |
| `#/devices` | required by AppSession state | no | app-next screen state | implemented-needs-manual-test |
| `#/notifications` | required by AppSession state | no/workspace filtered | app-next screen state | implemented-needs-manual-test |
| `#/notices` | required | data blocked without workspace | `RequireAuth` | verified-complete |
| `#/admin-preview` | required | role dependent | `ProtectedRoute` pilot | verified-complete |
| `#/workspace-preview` | required | yes | `ProtectedRoute` + `RequireWorkspaceRole` pilot | verified-complete |
| `#/login` | no | no | login state | verified-complete |
| `#/pending` | account state | no | status panel | verified-complete |
| `#/rejected` | account state | no | status panel | verified-complete |
| `#/disabled` | account state | no | status panel | verified-complete |
| `#/error` | account state | no | status panel | verified-complete |
| `#/workspace-required` | state route | yes | panel | partial |
| `#/access-denied` | state route | role dependent | panel | partial |

app-next route count: 17.

## 7. Role Menu Matrix

Operational static menu source: `defaultRoleMenusV31()` and final `authMenuKeysV31()`.

| Role | Main entry | Admin menu | Print | Workspace-less behavior | Classification |
| --- | --- | --- | --- | --- | --- |
| `system_owner` | `systemOwner` without workspace, dashboard with workspace | yes | yes | allowed to owner console | implemented-needs-manual-test |
| `super_manager` | dashboard | yes | yes | blocked until workspace exists | implemented-needs-manual-test |
| `manager` | dashboard | admin subset | yes | blocked until workspace exists | implemented-needs-manual-test |
| `teacher` | dashboard | no global/admin user management | no by default | blocked until workspace exists | implemented-needs-manual-test |
| `normal` | dashboard | no | no by default | blocked until workspace exists | implemented-needs-manual-test |
| `viewer` | dashboard | no | no by default | blocked until workspace exists | implemented-needs-manual-test |
| `print_account` | print | no | yes | blocked until workspace exists | implemented-needs-manual-test |

app-next permission source: `resolvePermissionRole`, `canAccessMenu`, `canShowAppNextAdminPreview`, `canShowAppNextWorkspacePreview`.

## 8. State Behavior

| State | Login/session | Main entry | Data query | Logout policy | Classification |
| --- | --- | --- | --- | --- | --- |
| signed out | login screen | no protected child | no protected data | no automatic signOut | verified-complete |
| initializing/loading_session | loading | no redirect in bridge decision | no data until screen loads | no automatic signOut | verified-complete |
| active + canonical OK | authenticated | allowed | workspace scoped | no automatic signOut | verified-complete |
| active + workspace null | authenticated | allowed where auth-only | data blocked for workspace screens | no automatic signOut | verified-complete |
| pending | status panel/gate | blocked | no protected data | no automatic signOut | verified-complete |
| rejected | status panel/gate | blocked | no protected data | no automatic signOut | verified-complete |
| disabled | status panel/gate | blocked | no protected data | no automatic signOut | verified-complete |
| membership missing | user: workspace blocked; owner: warning | owner remains authenticated | user data blocked | no automatic signOut | verified-complete |
| workspace mismatch/missing document | warning | owner remains authenticated | workspace data blocked | no automatic signOut | verified-complete |

## 9. Workspace/Cross Access Results

- Canonical workspace is resolved from `users.currentWorkspaceId`.
- Canonical membership is read from `workspaces/{workspaceId}/members/{uid}`.
- `system_owner` is global and is not inserted into workspace role comparisons.
- app-next read-only screens block workspace data when `currentWorkspaceId` is null.
- Cross-workspace blocking is implemented in service/rules assumptions and workspace membership checks, but full browser validation remains manual.

## 10. Automated Test Results

Release gate script:

- Command: `node --check scripts/test-role-workspace-release-gate.mjs`
- Command: `node scripts/test-role-workspace-release-gate.mjs`
- Cases: 30
- Passed: 30
- Failed: 0
- Classification counts:
  - `verified-complete`: 22
  - `implemented-needs-manual-test`: 6
  - `code-only`: 1
  - `unknown`: 1

Full project commands must be recorded after execution:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

## 11. Manual Test Needed

- Operational static app role menus for each role.
- Operational direct page-key access through UI controls.
- system_owner without workspace opens only owner console, not ordinary workspace data.
- super_manager/manager/teacher/normal/viewer/print_account workspace menu visibility.
- Cross-workspace access from browser and Firestore server response.
- app-next `#/admin-preview` and `#/workspace-preview` with real accounts for each role.
- Refresh persistence for each account state.
- Pending/rejected/disabled screen behavior in both operational app and app-next.

## 12. Unknown/Partial Items

- Operational app has no React router; direct URL route behavior is `unknown` until a browser path/hash policy is explicitly defined.
- Some operational menu permissions are legacy `app.js` policy and need browser confirmation.
- Firestore Rules were not changed or re-tested in emulator in this step.
- Real account tests were not executed by this release-gate script.

## 13. Deployment Blockers

- Do not deploy only from static code checks.
- Complete manual role matrix with masked evidence.
- Verify Firestore Rules reject cross-workspace reads/writes for non-owner users.
- Verify no automatic logout for pending/rejected/disabled/network/quota states.
- Confirm operational app and app-next use the same canonical workspace for the tested account.

## 14. Conditions for Next Stage Workspace Invitation Link Work

The next workspace invitation link stage can start after:

- Release gate script remains green.
- Full typecheck/test/build are green.
- Manual role matrix has no critical/high blocker.
- No Firestore write/listener growth regression is observed.
- Existing intentionally dirty files remain untouched and unstaged.
