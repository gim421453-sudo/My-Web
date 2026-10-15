# app-next Workspace Notices Test Checklist

Use `127.0.0.1`, not `localhost`.

```text
http://127.0.0.1:5173/app-next.html
```

## Automated

- `node --check services/authService.js`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`

Expected:

- auth module tests pass
- timetable stability checks pass
- build succeeds
- notice write-policy tests match active membership roles
- CRUD service verifies server state after create/update/delete
- mutation controls are guarded by `RequireWorkspaceRole`
- no `signOut(...)` in the workspace notice screen

## Browser Comparison

Compare the same account and same workspace in the operational app and app-next.

Check:

- visible count matches expected workspace notice count
- title/name display matches the canonical title rule
- category labels match legacy card meta as closely as possible
- summary uses the same first available body field
- detail opens and closes
- detail exposes no UID, full email, workspace ID, token, or Firebase path
- date-only `noticeDate` values are shown as dates, not invented times
- Firestore Timestamp values are formatted as Korean date/time
- pinned items appear before unpinned items
- newer dated items appear before older dated items
- same-date/no-date items keep source order
- unknown schemas are visible and counted in diagnostics

## Mixed Schema Fixtures

Verify these document shapes:

- modern workspace notice:
  `authorEmail`, `authorUid`, `title`, `createdFrom`, `scope`, `status`, `pinned`, `authorRole`, `priority`, `content`
- legacy notice:
  `noticeDate`, `title`, `visibility`, `importance`, `deadline`, `memo`, `content`
- school notice
- academy notice
- system notice
- workspace notice
- `공통 · 학교` category label
- Timestamp date document
- string `noticeDate` document
- missing date document
- safe `authorName` document
- `authorUid` only document
- unknown schema document

## Development Diagnostics

Confirm aggregate diagnostics only:

- `rawReadCount`
- `schemaKindCounts`
- `unknownSchemaCount`
- `sourceCounts`
- `filteredCount`
- `displayedCount`
- `sortPolicy`
- `contentMappingBySchema`
- `authorMappingBySchema`
- `dateMappingBySchema`
- `categoryMappingBySchema`
- `listener count = 0`
- `write API imported = true`
- write attempt/create/update/delete counts
- last server-confirmation or error category
- `automatic signOut = none`

## CRUD Role Matrix

Use only a demo project and loopback Auth/Firestore Emulator:

- `system_owner`, `super_manager`, and `manager` can manage App Next-marked notices in the selected workspace
- `teacher` and `normal` can create and manage only their own App Next-marked notices
- `viewer` and `print_account` can read but cannot see write controls or write through Firestore
- non-active, signed-out, and workspace-less sessions cannot write
- cross-workspace path/payload mismatch is rejected by Rules
- create/update/delete show completion only after server confirmation; simulate permission denial and network loss
- legacy and system notice documents without the App Next marker never receive edit/delete controls

## Must Not Happen

- write to an unmarked legacy/system notice
- viewer or print-account write
- cross-workspace write
- optimistic success before server confirmation
- listener creation
- read receipt update
- automatic sign out
- raw UID/email/workspace ID exposure
- operational app redirect
- `index.html` or `app.js` behavior change

## Remaining Manual Comparison

Because the operational general notice tab and the system-owner workspace notice table use different ordering rules, manually decide which legacy surface is the comparison target before final sign-off:

- general notice tab: `store.notices` filtered order
- system-owner workspace notice management: `createdAt` descending

App Next follows the existing stable workspace-notice read order:

```text
pinned desc -> published/created/notice date desc -> legacy snapshot order -> document id asc
```

## Final Review Results (2026-10-15)

- `npm run test:recovery:browser`: PASS, 13 tests / 13 pass / 0 fail / 0 skipped / 0 todo. This covers seven legacy roles, role switching, pending/rejected/disabled fail-closed, protected App Next URL, role CRUD with Firestore state, input/permission/error/server-confirmation delay UI, and runtime/loopback safety.
- `npm test`: PASS (exit code 0).
- `npm run typecheck`: PASS (exit code 0).
- `npm run build`: PASS (exit code 0).
- `npm run build:admin`: PASS (exit code 0).
- `git diff --check`: PASS. Generated Firebase config files had no diff; prohibited Rules/dependency manifests and lockfiles had zero diff. Emulator-generated `firestore-debug.log` was unlocked and removed after Emulator shutdown.
- Emulator used demo project `demo-myweb-recovery-e2e` and loopback services only. No stale listener or locator was present before execution; no process needed termination. Existing Vite non-module script and React Router `use client` messages were non-blocking build warnings.
- Automatic browser checks have no remaining `MANUAL_REQUIRED`. Manual comparison of legacy notice display/order against the operational app remains a separate visual sign-off item.
- No production Firebase/data access, deployment, IAM, Rules, Functions, or dependency changes.
