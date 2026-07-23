# App Next Dashboard Read-Only Pilot

## Purpose

This pilot moves only the `app-next` `#/dashboard` screen to a real read-only dashboard backed by the new `AuthProvider` session.

The operational app remains `http://127.0.0.1:5173/`, served by `index.html` and `app.js?v=120`. This pilot does not replace or modify that app.

## Operational Dashboard Source

The operational dashboard is rendered in `app.js`:

- `renderPage("dashboard")`
- `renderDashboardV8()`
- `renderDashboardV6()`
- `dashboardBoxV5()`
- `visibleNotices()`

The displayed summary cards are built from the in-memory `store`:

- attendance: `store.attendance`
- schedules: `store.schedules`
- notices: `visibleNotices()` over `store.notices`
- meals: `store.meals`
- assignments: `store.assignments`
- exams: `store.exams`
- portfolios: `store.portfolios`
- penalties: `store.penalties`
- timetable: `store.timetable`
- system notice: `store.settings.systemNotice`

The dashboard renderer itself does not issue a direct Firestore query. Firestore-backed data is loaded into `store` by existing operational sync and notice paths. Those operational paths are unchanged.

## App Next Route

Pilot URL:

```text
http://127.0.0.1:5173/app-next.html#/dashboard
```

Comparison URL:

```text
http://127.0.0.1:5173/
```

The `#/dashboard` route now renders:

```text
AuthProvider
→ LegacyAuthAdapterProvider
→ RequireAuth
→ AppNextDashboardReadOnly
```

The existing account and email verification screen remains available at:

```text
http://127.0.0.1:5173/app-next.html#/account
```

## Cards

The first pilot includes only low-risk read-only cards:

- account status summary
- workspace summary
- workspace notice summary
- auth and permission pilot status

No quick registration, create, edit, delete, approval, role change, workspace switch, export, or Firestore write action is included.

## Data Sources

Account status uses the current `AppSession` from the new `AuthProvider`.

Workspace summary uses only `AppSession.currentWorkspaceId` presence and `AppSession.currentWorkspaceRole`. It does not query the workspace document for a display name in this pilot.

Notice summary uses the existing app-next read-only service:

```text
loadAppNextWorkspaceNoticesReadonly()
→ workspaces/{currentWorkspaceId}/notices
→ normalizeAppNextWorkspaceNoticeRecords()
→ summarizeAppNextDashboardNotices()
```

The dashboard shows visible notice count and the first three normalized notices, matching the app-next workspace notice pilot ordering.

## Workspace Null

`currentWorkspaceId = null` is a valid authenticated session state.

The dashboard route remains allowed. Workspace-based cards show:

```text
워크스페이스가 선택되지 않았습니다.
```

No automatic workspace selection, session mutation, sign-out, or Firestore write is performed.

## System Owner

`system_owner` remains a global role. The dashboard does not convert it into a workspace role.

If a system owner has no current workspace, the route remains allowed and workspace-based cards are disabled.

## Read, Write, Listener Policy

Allowed:

- one-time `getDocs` through the existing notice read-only service
- retry via the dashboard refresh button

Forbidden and not used:

- `addDoc`
- `setDoc`
- `updateDoc`
- `deleteDoc`
- `writeBatch`
- `runTransaction`
- `onSnapshot`
- read receipts
- last-seen updates
- route persistence writes
- workspace auto-selection writes

Expected diagnostics:

```text
dashboardWriteAttemptCount = 0
dashboardActiveListenerCount = 0
firestoreWriteAttemptCount = 0
workspaceListenerCount = 0
```

## Duplicate Load Policy

The dashboard uses a small in-module cache for notice summaries keyed by the active workspace. If a duplicate read is requested while the first request is still in flight, the second render waits for the existing promise instead of starting another Firestore read.

This is intended to prevent StrictMode and route re-render duplicate reads without introducing a broad global data cache.

## Diagnostics

Development-only API:

```javascript
window.PMAppNextDashboardDiagnostics?.snapshot?.()
```

Sensitive values are excluded. The snapshot does not include UID, email, full workspaceId, documentId, token, Firebase config, or full notice body.

Existing diagnostics remain available:

```javascript
window.PMRequireAuthDiagnostics?.snapshot?.()
window.PMProtectedRouteDiagnostics?.snapshot?.()
window.PMRequireWorkspaceRoleDiagnostics?.snapshot?.()
window.PMAppNextRouteDiagnostics?.snapshot?.()
window.PMAppNextNoticeDiagnostics?.snapshot?.()
window.PMAppNextAuthRouteMatrixDiagnostics?.snapshot?.()
```

## Manual Comparison

1. Open `http://127.0.0.1:5173/`.
2. Confirm operational dashboard still loads through `index.html + app.js?v=120`.
3. Open `http://127.0.0.1:5173/app-next.html#/dashboard`.
4. Confirm account status, global role, workspace presence, and workspace role.
5. Confirm notice visible count and recent notice order against the operational dashboard notice card.
6. Open development diagnostics and confirm write/listener counts remain zero.
7. Move to `#/notices`, then back to `#/dashboard`, and confirm no duplicate load warning unless a request was already in flight.

## Current Scope

Implemented:

- dashboard route consumer
- account/workspace/notice/pilot cards
- read-only notice summary
- workspace-null handling
- system-owner-safe display
- dashboard diagnostics
- zero-write/listener tests

Not yet migrated:

- quick registration
- attendance summary from Firestore
- schedule summary from Firestore
- meals summary
- assignments
- exams
- timetable
- full operational dashboard replacement

## Next Conditions

Before moving another operational dashboard card, confirm:

- app-next notice count matches the operational dashboard for the same workspace
- dashboard diagnostics show write count 0
- dashboard diagnostics show listener count 0
- no `Maximum update depth` error
- no automatic sign-out
