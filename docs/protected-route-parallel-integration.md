# ProtectedRoute Parallel Integration

Date: 2026-07-22

## Scope

This step adds a feature-flagged new AuthProvider path to `ProtectedRoute` while preserving the existing legacy branch as the default.

Not changed:

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- `firestore.rules`
- `firestore.rules.next`
- Firebase data
- user roles or workspace memberships
- `Login.tsx`
- `RequireWorkspaceRole`
- existing AuthContext removal

## Existing ProtectedRoute Audit

- Actual file: `src/components/ProtectedRoute.tsx`
- Pre-change production consumers in `src`: 0
- Dev-only consumer added in this step: `src/dev-protected-route-bridge/ProtectedRouteBridgePreviewApp.tsx`
- Overlap with `RequireAuth`: both protect authenticated content, but `ProtectedRoute` also supports optional `menuKey` access checks.
- Existing login decision: `src/context/AuthContext.useAuth()` `loading` and `session`
- Existing status decision: none
- Existing workspace decision: only implicit through `session.currentRole` when `menuKey` is provided
- Existing role decision: `resolvePermissionRole(session.globalRole, session.currentRole)`
- Existing redirect behavior: no router redirect; text fallback only
- Existing loading UI: inline text
- Existing automatic signOut: none
- Existing Firestore write: none

## New Branch Structure

`ProtectedRoute` now selects one of two branches:

```text
feature flag off
-> LegacyProtectedRouteBranch
-> existing src/context/AuthContext path

feature flag on in development
-> NewAuthProtectedRouteBridge
-> AuthProvider
-> LegacyAuthAdapterProvider
-> decideProtectedRouteAccess()
```

The legacy branch keeps the original rendering and menu permission behavior.

## Feature Flag

Environment variable:

```text
VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE=false
```

Development query override:

```text
?newAuthProtectedRoute=on
?newAuthProtectedRoute=off
```

Priority:

```text
query override
-> env
-> false
```

Production policy:

```text
query override ignored
env ignored
mode forced to legacy
```

The parser reuses the shared development feature flag resolver from `requireAuthBridgeUtils.ts`.

## New Decision Input

The new path only reads the adapter state derived from new AuthProvider:

- `phase`
- `isAuthenticated`
- `status`
- `globalRole`
- `currentWorkspaceId`
- `currentWorkspaceRole`
- `isSystemOwner`
- `warnings`

The new path does not read legacy localStorage user objects, does not directly query Firebase, and does not read Firestore.

## State Policy

| State | Decision |
| --- | --- |
| `initializing` / `loading_session` | loading UI, no redirect, no signOut |
| signed out | `/login` destination, redirect loop guarded |
| `active` + workspace exists | allow |
| `active` + `currentWorkspaceId = null` | allow for plain auth route |
| `pending` | account pending message, no signOut |
| `rejected` | account rejected message, no signOut |
| `disabled` | account disabled message, no signOut |
| error / unknown | safe error message, no signOut |

When `menuKey` is provided, menu permission is still checked. `currentWorkspaceId = null` remains a valid authenticated state, but a menu-specific check can still deny access if no permission role exists.

## system_owner

`system_owner` is treated only as a global role:

```text
globalRole = system_owner
isSystemOwner = true
```

The new path does not convert `system_owner` into `currentWorkspaceRole`. For menu checks, `resolvePermissionRole()` maps global system owner to the permission role.

## Safety

The new branch does not call:

- `signOut(auth)`
- Firestore writes
- user document repair
- membership repair
- role updates
- `currentWorkspaceId` writes
- approval status writes
- localStorage overwrite or deletion

## Browser Comparison

Use `127.0.0.1`, not `localhost`.

```text
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=off
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=on
```

Expected:

- `off`: `mode = legacy`
- `on`: `mode = new`
- signed-in active user renders protected children
- system owner renders protected children
- signed-out state shows or redirects to login depending on preview mode
- `automaticSignOutOccurred = false`

## Rollback

Immediate rollback:

```text
?newAuthProtectedRoute=off
```

or remove/disable:

```text
VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE
```

Because the default is legacy and production ignores the flag, operational rollback is immediate.

## Tests Added

Automated checks now cover:

- flag default false
- env true/false
- query on/off priority
- production query blocked
- loading no redirect
- signed-out `/login`
- redirect loop prevention
- active with workspace
- active with null workspace
- pending/rejected/disabled no signOut
- system owner with no workspace role
- menu deny for unallowed role
- session error safe handling
- no Firestore write APIs
- no Firebase Auth mutation APIs
- no browser storage deletion/write
- operational static files untouched
- `RequireWorkspaceRole` untouched
- standalone preview HTML

## Results

- `npm.cmd run typecheck`: passed
- `npm.cmd test`: passed
  - auth module tests: 314
  - timetable stability tests: 109

Build result is recorded in the completion report for this step.

## Remaining Risk

- The legacy `src/context/AuthContext.tsx` still performs automatic `signOut(auth)` on some session load failures. This step does not change that existing behavior.
- `ProtectedRoute` currently has no production `src` consumers, so browser verification is limited to the development preview page.
- Future `RequireWorkspaceRole` migration still needs separate feature-flagged handling.
