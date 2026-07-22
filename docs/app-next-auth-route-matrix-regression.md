# app-next Auth Route Matrix Regression

## Scope

This document records the app-next guard integration regression step. It does not change the operational static app.

Operational app:

```text
http://127.0.0.1:5173/
index.html + app.js?v=120
```

Pilot app:

```text
http://127.0.0.1:5173/app-next.html
```

## Guard Responsibilities

`RequireAuth`:

- Authentication initialization
- Signed-in state
- Account status
- Authenticated child rendering

`ProtectedRoute`:

- Route-level feature or menu policy
- Global role/current workspace role menu access
- Direct URL blocking for protected app-next routes

`RequireWorkspaceRole`:

- Current workspace presence
- Current workspace role sufficiency
- Workspace-required child rendering
- `system_owner` explicit allow only when a workspace exists

Guards must not add Firebase listeners, Firestore reads, Firestore writes, workspace selection, membership creation, role changes, or automatic sign-out.

## Actual app-next Route Tree

| Route | Screen | RequireAuth | ProtectedRoute | RequireWorkspaceRole | Workspace Required |
|---|---|---:|---:|---:|---:|
| `#/login` | Login | No | No | No | No |
| `#/dashboard` | Account status | Shell state | No | No | No |
| `#/devices` | Login devices | Shell state | No | No | No |
| `#/notifications` | Notifications | Shell state | No | No | No |
| `#/notices` | Workspace notices | Yes | No | No | Data read only when workspace exists |
| `#/admin-preview` | Admin access preview | Yes | Yes | No | No |
| `#/workspace-preview` | Workspace access preview | Yes | Yes | Yes | Yes |
| `#/access-denied` | Safe denial | Shell state | No | No | No |
| `#/workspace-required` | Workspace required notice | Shell state | No | No | No |
| `#/pending` | Pending notice | No protected data | No | No | No |
| `#/rejected` | Rejected notice | No protected data | No | No | No |
| `#/disabled` | Disabled notice | No protected data | No | No | No |
| `#/error` | Error notice | No protected data | No | No | No |

## Canonical Route Matrix

The canonical policy lives in `src/app-next/appNextRouteUtils.ts`:

```text
appNextAuthRouteMatrixSnapshot()
```

It uses only:

```text
routeDecision
account state
AppSession
RequireAuth flag
ProtectedRoute flag
RequireWorkspaceRole flag
```

It does not import Firebase or Firestore.

## Route Policies

`#/login`:

- `signed_out` shows login.
- Account action states route to their own status screen.
- Active users can fall back to app-next authenticated screens.

`#/dashboard`:

- Active authenticated users can view it.
- `currentWorkspaceId = null` is allowed.
- No workspace role is required.

`#/notices`:

- Protected by `RequireAuth`.
- Active users can enter the route.
- Workspace data read is blocked by the notices screen when workspace is missing.
- Firestore write count remains 0.

`#/admin-preview`:

- Protected by `RequireAuth -> ProtectedRoute`.
- Allows `system_owner`, `super_manager`, and `manager`.
- Blocks `teacher`, `normal`, `viewer`, `print_account`, missing role, and unknown role.
- `system_owner` may enter even when workspace is null.

`#/workspace-preview`:

- Protected by `RequireAuth -> ProtectedRoute -> RequireWorkspaceRole`.
- Allows `system_owner + workspace`, `super_manager + workspace`, `manager + workspace`, and `teacher + workspace`.
- Blocks `system_owner + no workspace`, `normal`, `viewer`, `print_account`, missing role, and unknown role.
- `system_owner` remains a global role and is not copied into `currentWorkspaceRole`.

`#/workspace-required`:

- Shows a safe workspace-required message.
- Does not auto-select a workspace or create roles.

`#/access-denied`:

- Shows a safe permission message.
- Does not expose identifiers or run protected actions.

Unknown route:

- Signed out users go to login.
- Active users fall back to dashboard.
- Account action states go to their status screens.

## Menu and Direct URL Parity

Menu visibility and direct URL access use the same canonical helper:

```text
canShowAppNextAdminPreview()
canShowAppNextWorkspacePreview()
appNextAuthRouteMatrixSnapshot()
```

For `admin-preview` and `workspace-preview`, `policyMismatchDetected` should remain `false`.

## Feature Flags

Current flags:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH
VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE
VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE
```

Rules:

- Each flag controls only its own guard.
- String `"false"` is treated as explicit rollback.
- Development query override can disable or enable pilot guard branches.
- Production query override is ignored.

Development rollback examples:

```text
http://127.0.0.1:5173/app-next.html?newAuthRequireAuth=off#/notices
http://127.0.0.1:5173/app-next.html?newAuthProtectedRoute=off#/admin-preview
http://127.0.0.1:5173/app-next.html?newAuthRequireWorkspaceRole=off#/workspace-preview
```

## Diagnostics

Existing diagnostics remain:

```js
window.PMRequireAuthDiagnostics?.snapshot?.()
window.PMProtectedRouteDiagnostics?.snapshot?.()
window.PMRequireWorkspaceRoleDiagnostics?.snapshot?.()
window.PMAppNextRouteDiagnostics?.snapshot?.()
window.PMAppNextNoticeDiagnostics?.snapshot?.()
```

Integrated matrix diagnostics:

```js
window.PMAppNextAuthRouteMatrixDiagnostics?.snapshot?.()
```

Minimum fields:

```text
currentRoute
requestedRoute
accountPhase
accountStatus
globalRoleCategory
workspaceRoleCategory
hasWorkspace
requireAuthDecision
protectedRouteDecision
requireWorkspaceRoleDecision
finalDecision
renderedScreen
redirectCount
protectedChildRenderCount
policyMismatchDetected
firestoreReadCount
firestoreWriteAttemptCount
authListenerCount
workspaceListenerCount
restoreConflictDetected
```

No raw UID, email, workspaceId, documentId, token, user document, or membership document should be displayed.

Expected guard counts:

```text
firestoreReadCount = 0
firestoreWriteAttemptCount = 0
workspaceListenerCount = 0
```

## Manual Test URLs

Use only `127.0.0.1`:

```text
http://127.0.0.1:5173/app-next.html#/dashboard
http://127.0.0.1:5173/app-next.html#/notices
http://127.0.0.1:5173/app-next.html#/admin-preview
http://127.0.0.1:5173/app-next.html#/workspace-preview
http://127.0.0.1:5173/app-next.html#/workspace-required
http://127.0.0.1:5173/app-next.html#/access-denied
```

System owner manual expectations:

- Dashboard allowed.
- Notices route allowed; data read depends on current workspace.
- Admin preview allowed.
- Workspace preview allowed only when a current workspace exists.
- `globalRole` remains `system_owner`.
- `currentWorkspaceRole` is not set to `system_owner`.
- No automatic sign-out.
- No Maximum update depth error.
- Guard Firestore read/write counts remain 0.

## Automated Coverage

Automated tests cover:

- Actual app-next guard consumers.
- Guard chain order.
- Canonical route matrix.
- Account status matrix.
- Workspace present/null matrix.
- Role matrix.
- `system_owner` exception.
- Unknown role safe deny.
- Menu/direct URL parity.
- Feature flag rollback.
- Production query override.
- Zero guard Firestore read/write/listener.
- Diagnostic API presence and privacy.

## Current Limitations

Only the real system owner account is available for manual testing. Teacher, normal, viewer, and print-account behavior is covered by session snapshot tests until safe test accounts are available.

## Next Operating Transition Conditions

Before adding an operational app-next screen beyond the current read-only pilots:

- `typecheck` passes.
- Full test suite passes.
- Build passes.
- Route matrix diagnostics show no mismatch.
- Manual system owner smoke test passes.
- Operational `index.html + app.js` remains unchanged.
- Firestore Rules and Firebase data remain unchanged.
