# app-next RequireWorkspaceRole Pilot

## Purpose

This step connects one real app-next consumer for the new workspace-role guard without changing the operational static app.

Operational `/` still runs `index.html + app.js`. This pilot lives only in `/app-next.html#/workspace-preview`.

## Guard Responsibilities

`RequireAuth` handles authentication phase and account status.

`ProtectedRoute` handles route-level feature or menu policy.

`RequireWorkspaceRole` handles only current workspace presence and canonical workspace role authorization for workspace-required children.

`RequireWorkspaceRole` must not create or select workspaces, create memberships, change roles, sign out users, or query Firestore.

## Route Structure

The pilot route is:

```text
AuthProvider
LegacyAuthAdapterProvider
RequireAuth
ProtectedRoute
RequireWorkspaceRole
AppNextWorkspaceAccessPreview
```

The route is available at:

```text
http://127.0.0.1:5173/app-next.html#/workspace-preview
```

The workspace-required explanation route is:

```text
http://127.0.0.1:5173/app-next.html#/workspace-required
```

## Workspace Role Policy

Allowed workspace roles:

```text
super_manager
manager
teacher
```

Blocked workspace roles:

```text
normal
viewer
print_account
null
unknown
```

Unknown or legacy roles that cannot be resolved to canonical roles are denied safely.

## system_owner Policy

`system_owner` is a global role, not a workspace role.

For this pilot, `system_owner` is allowed only when:

```text
isSystemOwner = true
globalRole = system_owner
allowSystemOwner = true
currentWorkspaceId exists
```

`system_owner + currentWorkspaceId = null` is blocked by the workspace-required condition. The guard does not write `system_owner` into `currentWorkspaceRole`.

## Missing Workspace

`active + currentWorkspaceId = null` remains an authenticated session.

`RequireAuth` may pass it. `ProtectedRoute` may pass it for route policy. `RequireWorkspaceRole` blocks workspace-required children and shows the workspace-required route or safe denial state without sign-out.

## Menu and Direct URL Parity

The app-next menu uses the same helper as the route policy:

```text
canShowAppNextWorkspacePreview(session)
```

This prevents hiding a menu while still allowing direct URL access.

## Diagnostics

Development diagnostics are available at:

```js
window.PMRequireWorkspaceRoleDiagnostics?.snapshot?.()
```

Expected fields include:

```text
providerMode
currentRoute
requestedRoute
decision
accessAllowed
hasWorkspace
workspaceRoleCategory
globalRoleCategory
isSystemOwner
allowSystemOwner
requiredWorkspaceRoles
allowCount
denyCount
redirectCount
protectedChildRenderCount
protectedChildBlockedCount
lastDenyReason
menuVisible
directUrlBlockedCount
policyMismatchDetected
authListenerCount
workspaceListenerCount
firestoreReadCount
firestoreWriteAttemptCount
restoreConflictDetected
```

Diagnostics must not include raw UID, email, workspaceId, documentId, tokens, or full user/membership documents.

## Listener and Firestore Policy

The pilot reads the existing AppSession snapshot only.

Expected counts:

```text
workspaceListenerCount = 0
firestoreReadCount = 0
firestoreWriteAttemptCount = 0
```

No `getDoc`, `getDocs`, `onSnapshot`, `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, transaction, or batch write is imported by the workspace preview component.

## Feature Flag and Rollback

The reusable guard default remains legacy unless opted in.

For app-next only, this route opts into the new branch by default. Rollback:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE=false
```

Development query rollback:

```text
http://127.0.0.1:5173/app-next.html?newAuthRequireWorkspaceRole=off#/workspace-preview
```

Production query override is ignored.

## Manual Test URLs

```text
http://127.0.0.1:5173/app-next.html#/workspace-preview
http://127.0.0.1:5173/app-next.html#/workspace-required
http://127.0.0.1:5173/app-next.html#/access-denied
http://127.0.0.1:5173/app-next.html#/dashboard
```

For the current real system owner account, verify:

```text
isSystemOwner = true
allowSystemOwner = true
accessAllowed = true only when a current workspace exists
workspaceRoleCategory remains none/null if AppSession has no workspace role
firestoreReadCount = 0
firestoreWriteAttemptCount = 0
workspaceListenerCount = 0
automatic sign-out does not occur
```

## Current Test Account Limitation

Manual testing currently focuses on the existing system owner account. Teacher, normal, viewer, and print-account cases are covered by automated session snapshot tests until separate safe test accounts are available.

## Next Step Conditions

Proceed only if:

```text
typecheck passes
test passes
build passes
workspace-preview does not trigger Maximum update depth
diagnostics remain privacy-safe
operational index.html/app.js remain unchanged
```
