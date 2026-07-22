# RequireAuth Operational Transition

## Summary

RequireAuth is the first operational auth guard moved to the new AppSession/AuthProvider decision path. The legacy branch remains available as a rollback path.

## Current Implementation

- Guard file: `src/components/guards/RequireAuth.tsx`
- New branch: `src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx`
- Decision helpers: `src/auth/legacy/guards/legacyGuardDecisionUtils.ts`
- Feature flag helper: `src/auth/legacy/guards/requireAuthBridgeUtils.ts`
- Production React consumers: none at the time of this transition
- Development consumer: `require-auth-bridge-preview.html`

## Auth Source

The new RequireAuth branch reads the canonical new session through:

1. `AuthProvider`
2. `LegacyAuthAdapterProvider`
3. `decideLegacyRequireAuth`

The new branch does not read legacy localStorage/sessionStorage role state and does not call Firestore write APIs.

## State Policy

| State | RequireAuth result |
| --- | --- |
| `initializing` | loading UI, no redirect |
| `loading_session` | loading UI, no redirect |
| `signed_out` | redirect to `/login`, with loop prevention |
| `active` | allow protected children |
| `active + currentWorkspaceId=null` | allow; workspace guards decide workspace needs later |
| `pending` | account-status message, no signOut |
| `rejected` | account-status message, no signOut |
| `disabled` | account-status message, no signOut |
| `error` | safe error message, no automatic signOut |
| `system_owner` | allow when active, even with null workspace |

## Rollback

Default mode is now new auth for RequireAuth.

Rollback options:

- Development runtime: `?newAuthRequireAuth=off`
- Build/runtime env: `VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH=false`

The rollback branch keeps the existing `src/context/AuthContext.tsx` based RequireAuth behavior.

## Diagnostics

Development and browser console diagnostics are exposed as:

```js
window.PMRequireAuthDiagnostics?.snapshot?.()
```

The snapshot includes:

- `providerMode`
- `sessionPhase`
- `isAuthenticated`
- `accountStatus`
- `decision`
- `redirectCount`
- `renderAllowedCount`
- `blockedCount`
- `lastBlockReason`
- `authListenerCount`
- `restoreConflictDetected`

The snapshot intentionally excludes UID, email, full workspaceId, tokens, document IDs, and Firestore paths.

## Non-Goals

This step did not change:

- `index.html`
- `app.js`
- timetable V111
- notice data
- `services/workspaceDataService.js`
- Firestore Rules
- Firebase data
- ProtectedRoute
- RequireWorkspaceRole
- Login production flow
- workspace parent recovery tools

## Manual Check

Use `http://127.0.0.1:5173/` for operational checks and `http://127.0.0.1:5173/require-auth-bridge-preview.html` for RequireAuth branch inspection.

Recommended console checks:

```js
window.PMRequireAuthDiagnostics?.snapshot?.()
window.PMNavigationPersistenceDiagnostics?.snapshot?.()
window.PMTimetableDiagnostics?.workspaceSync?.()
window.PMWorkspaceDataService?.diagnostics?.()
window.PMFirebaseRuntimeDiagnostics?.snapshot?.()
```

