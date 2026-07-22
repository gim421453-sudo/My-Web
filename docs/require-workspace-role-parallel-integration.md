# RequireWorkspaceRole Parallel Integration

Date: 2026-07-22

## Scope

This step adds a feature-flagged new AuthProvider path to `RequireWorkspaceRole` while preserving the existing legacy branch as the default.

Not changed:

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- `firestore.rules`
- `firestore.rules.next`
- Firebase data
- user roles or workspace memberships
- `Login.tsx`
- existing AuthContext removal
- timetable V111 code

## Existing RequireWorkspaceRole Audit

- Actual file: `src/components/guards/RequireWorkspaceRole.tsx`
- Production consumers found in `src`: 0
- Dev-only consumer added in this step: `src/dev-require-workspace-role-bridge/RequireWorkspaceRoleBridgePreviewApp.tsx`
- Existing auth decision: `src/context/AuthContext.useAuth()` `loading` and `session`
- Existing status decision: none
- Existing workspace decision: none beyond role helper
- Existing role decision: `hasWorkspaceRole(session, allowedRoles)`
- Existing system owner handling: `isSystemOwner(session)` bypasses workspace role check
- Existing redirects: `/login` when signed out, `/unauthorized` when role check fails
- Existing loading UI: inline text
- Existing automatic signOut: none
- Existing Firestore read/write: none
- Existing direct storage access: none

## New Branch Structure

`RequireWorkspaceRole` now selects one of two branches:

```text
feature flag off
-> LegacyRequireWorkspaceRoleBranch
-> existing src/context/AuthContext path

feature flag on in development
-> NewAuthRequireWorkspaceRoleBridge
-> AuthProvider
-> LegacyAuthAdapterProvider
-> decideWorkspaceRoleAccess()
```

The legacy branch keeps the original rendering and redirect behavior.

## Feature Flag

Environment variable:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE=false
```

Development query override:

```text
?newAuthRequireWorkspaceRole=on
?newAuthRequireWorkspaceRole=off
```

Policy:

```text
query override in development
-> env
-> false
```

Production policy:

```text
query override ignored
env ignored
mode forced to legacy
```

The shared development feature flag resolver from `requireAuthBridgeUtils.ts` is reused.

## New Decision Input

The new branch only reads values from the new AuthProvider through `LegacyAuthAdapter`:

- `phase`
- `isAuthenticated`
- `status`
- `globalRole`
- `currentWorkspaceId`
- `currentWorkspaceRole`
- `isSystemOwner`
- `warnings`

The new branch does not directly read Firebase, Firestore, localStorage, or sessionStorage.

## Role Model

Global roles:

```text
system_owner
user
```

Workspace roles:

```text
super_manager
manager
teacher
normal
viewer
print_account
```

`system_owner` is never treated as a workspace role. It is used only through:

```text
globalRole = system_owner
isSystemOwner = true
allowSystemOwnerBypass = true
```

## State Policy

| State | Decision |
| --- | --- |
| `initializing` / `loading_session` | loading UI, no redirect, no signOut |
| signed out | `/login`, redirect loop guarded |
| `pending` | pending message or destination, no signOut |
| `rejected` | rejected message or destination, no signOut |
| `disabled` | disabled message or destination, no signOut |
| `active` + workspace null | `WORKSPACE_REQUIRED`, not login failure |
| role null | `WORKSPACE_ROLE_MISSING` |
| role not in `allowedRoles` | `WORKSPACE_ROLE_NOT_ALLOWED` |
| allowed workspace role | allow |
| system owner + bypass true | allow |
| system owner + bypass false | normal workspace role policy applies |

## system_owner Bypass

The new branch supports:

```ts
allowSystemOwnerBypass?: boolean
```

Default for the new branch is `false`. This prevents every workspace route from automatically allowing `system_owner` unless the route explicitly opts in.

The legacy branch keeps the historical behavior where `system_owner` bypasses the role check.

## Redirect Policy

The new branch can compute these destinations:

- `/login`
- `/pending`
- `/rejected`
- `/disabled`
- `/workspace-select`
- `/unauthorized`

To avoid disruptive route behavior during migration, actual navigation is limited to:

- signed out
- missing workspace role
- role not allowed

Workspace missing and account status states render safe messages instead of forcing login or logout.

## Dev Preview

Use `127.0.0.1`, not `localhost`.

```text
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=off
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=on
```

The preview shows:

- mode
- phase
- status
- workspace presence
- current workspace role
- allowed roles
- system owner bypass
- decision
- redirect target
- automatic signOut flag

No full UID, email, or workspaceId is displayed.

## Safety

The new branch does not call:

- `signOut(auth)`
- Firestore writes
- membership creation or repair
- workspace role repair
- `currentWorkspaceId` writes
- status updates
- localStorage/sessionStorage writes or deletion

## Tests Added

Automated checks now cover:

- flag default false
- development query on/off
- production query blocked
- loading no redirect
- signed out `/login`
- login redirect loop guard
- active workspace null -> no workspace
- super_manager-only route denies manager
- manager/teacher route allows manager
- manager/teacher route allows teacher
- manager/teacher route denies normal
- null workspace role
- system owner bypass true
- system owner bypass false
- pending/rejected/disabled no signOut
- no Firestore write APIs
- no Firebase Auth mutation APIs
- no browser storage writes/deletion
- operational static files untouched
- `Login.tsx` untouched
- standalone preview HTML

## Results

- `npm.cmd run typecheck`: passed
- `npm.cmd test`: passed
  - auth module tests: 336
  - timetable stability tests: 109

Build result is recorded in the completion report for this step.

## Remaining Risk

- Production has no current `RequireWorkspaceRole` consumers in `src`, so real route impact is limited but also not broadly browser-proven.
- The legacy `src/context/AuthContext.tsx` still contains older automatic signOut behavior on some session load failures. This step does not change it.
- Future broad adoption should explicitly set `allowSystemOwnerBypass` route by route.
