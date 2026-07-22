# Navigation Page Session Restore

## Summary

The operational static app now keeps the last successfully rendered top-level page in the current browser tab only.

Storage key:

```text
pm-current-page-v1
```

Storage scope:

```text
sessionStorage
```

`localStorage` is not used for page restoration, so closing the browser tab clears this state naturally.

## Restore Policy

A stored page is restored only after authentication, user status, workspace, and menu availability are ready.

Allowed:

- authenticated user
- `status=active`
- page exists
- page is available in the current role menu
- workspace exists when the page requires workspace data

Blocked:

- signed out
- initializing or session loading
- pending, rejected, or disabled account states
- session error
- unknown page key
- deleted or hidden menu
- workspace-required page without a workspace

If restore is blocked, the app falls back to `dashboard`, or `systemOwner`/`print` where the existing role flow requires it.

## Logout Policy

Explicit logout and session clearing remove:

```text
pm-current-page-v1
```

The stored page is not preserved across account changes in the same tab.

## Diagnostics

Development diagnostics are available at:

```js
window.PMNavigationPersistenceDiagnostics?.snapshot?.()
```

The snapshot exposes page keys and counters only. It must not include UID, email, raw workspaceId, documentId, token, or password values.

Key fields:

- `storedPage`
- `currentPage`
- `restoreAttemptCount`
- `restoreSuccessCount`
- `fallbackCount`
- `fallbackReason`
- `navigationStateWriteCount`
- `restoreInProgress`
- `restoreCompleted`

## Non-Goals

This change does not modify Firestore Rules, Firebase data, workspace membership, AppSession role resolution, app-next auth, notice data, or timetable V111 data/save logic.
