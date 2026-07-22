# app-next ProtectedRoute Pilot

## Purpose

This step adds the first real `ProtectedRoute` consumer inside the standalone React `app-next.html` entry. It does not connect React guards to the operational static app at `/`.

Operational app remains:

```text
index.html
app.js?v=120
```

## Responsibility Split

`RequireAuth`:

- authentication initialization
- signed-in state
- account status handling
- whether protected children may render at all

`ProtectedRoute`:

- route-level access policy for an already active authenticated user
- global role and current workspace role checks
- direct URL blocking
- menu visibility parity with route access
- safe fallback without sign-out

`ProtectedRoute` does not read Firestore, write Firestore, create listeners, switch workspaces, mutate roles, or perform button-level CRUD authorization.

## app-next Routes

Manual browser URLs use `127.0.0.1`:

```text
http://127.0.0.1:5173/app-next.html#/dashboard
http://127.0.0.1:5173/app-next.html#/notices
http://127.0.0.1:5173/app-next.html#/admin-preview
http://127.0.0.1:5173/app-next.html#/access-denied
```

`#/notices` is still protected by `RequireAuth` and then the notice component gates workspace reads.

`#/admin-preview` is protected by:

```text
RequireAuth
ProtectedRoute(menuKey="admin")
AppNextAdminAccessPreview
```

The admin preview page is read-only and displays only sanitized role categories and route policy information.

## Canonical Role Policy

Global role:

- `system_owner`
- `user`

Workspace roles:

- `super_manager`
- `manager`
- `teacher`
- `normal`
- `viewer`
- `print_account`
- `null`

No new arbitrary role strings are introduced. `system_owner` remains a global role and is not converted into `currentWorkspaceRole`.

## Route Access Matrix

### dashboard

Allowed:

- authenticated active users
- all canonical global roles
- all canonical workspace roles
- `active + currentWorkspaceId = null`

### notices

Allowed by route:

- authenticated active users

Data read:

- only when `currentWorkspaceId` exists
- workspace-null users see guidance and no notice query starts

### admin-preview

Allowed:

- `system_owner`
- `super_manager`
- `manager`

Denied:

- `teacher`
- `normal`
- `viewer`
- `print_account`
- ordinary user with `currentWorkspaceRole = null`

`system_owner + currentWorkspaceId = null` is allowed by global role.

## Menu And Direct URL Parity

The admin menu button uses the same helper as route access:

```text
canShowAppNextAdminPreview(session)
```

Direct access to `#/admin-preview` is still checked by `ProtectedRoute(menuKey="admin")`; hiding the menu is not treated as sufficient security.

## Feature Flag And Rollback

Existing `ProtectedRoute` behavior remains legacy by default outside this app-next pilot.

For app-next only, the pilot opts into the new path:

```text
defaultEnabled: true
```

Rollback:

```text
VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE=false
```

Development-only query rollback:

```text
http://127.0.0.1:5173/app-next.html?newAuthProtectedRoute=off#/admin-preview
```

Production query override remains ignored. Query parameters cannot disable the guard in production.

## Diagnostics

Existing diagnostics remain available:

```text
window.PMRequireAuthDiagnostics?.snapshot?.()
window.PMAppNextRouteDiagnostics?.snapshot?.()
window.PMAppNextNoticeDiagnostics?.snapshot?.()
```

New diagnostics:

```text
window.PMProtectedRouteDiagnostics?.snapshot?.()
```

Expected safe fields include:

- provider mode
- current/requested route
- required policy
- allow/deny decision
- role categories
- workspace presence
- system owner flag
- menu visible
- child render/block counts
- direct URL block count
- Firestore read count `0`
- Firestore write attempt count `0`

UID, email, full workspaceId, document IDs, Firestore paths, tokens, Firebase config, and raw user/member documents are not included.

## Known Limitations

- The operational static app is not converted yet.
- `ProtectedRoute` now has an actual app-next consumer, but not a `/` consumer.
- `RequireWorkspaceRole` remains a later step.
- The admin preview is not a real admin page and must not be expanded into role changes or workspace management in this step.

## Manual Test Checklist

Use only `127.0.0.1` URLs.

1. `#/dashboard` opens for an active user.
2. `#/notices` still shows the same 7 notice records for the current workspace.
3. `#/notices` with workspace null shows workspace guidance and starts no notice listener.
4. `#/admin-preview` allows `system_owner`.
5. `#/admin-preview` allows `super_manager`.
6. `#/admin-preview` allows `manager`.
7. `#/admin-preview` blocks `teacher`.
8. `#/admin-preview` blocks `normal`.
9. `#/admin-preview` blocks `viewer`.
10. `#/admin-preview` blocks `print_account`.
11. Admin menu visibility matches direct URL result.
12. Denied users remain logged in.
13. Diagnostics show Firestore read/write `0` for ProtectedRoute itself.
14. No redirect loop occurs.

## Next Step Condition

Move to the RequireWorkspaceRole actual consumer pilot only after:

- app-next admin-preview menu and direct URL results match
- no automatic sign-out is observed
- `PMProtectedRouteDiagnostics` remains privacy-safe
- typecheck, test, and build pass
