# AuthContext Replacement Audit

## Scope

This document audits the current React authentication structure before replacing the legacy `src/context/AuthContext.tsx`.

No production app files, Firebase data, Firestore Rules, guards, or existing auth behavior were changed during this audit.

## Current React Entry Shape

The repository currently does not contain `src/App.tsx`, `src/main.tsx`, or `src/routes/*`.

The active production UI is still the static app path:

- `index.html`
- `app.js`
- root `services/*.js`

The React/TypeScript area is made of individual pages and development-only entry points. AuthProvider replacement should therefore be treated as a module-level migration, not as a single app-root swap.

## Existing AuthContext

File:

- `src/context/AuthContext.tsx`

Current exported values:

| Value | Meaning | Source |
| --- | --- | --- |
| `session` | Legacy `AppSession` or null | `src/services/authAccess.ts` |
| `loading` | Boolean loading state | local React state |
| `authError` | user-facing string error | local React state |
| `login(email, password)` | calls `loginWithEmail` | `src/services/authService.ts` |
| `logout()` | calls `logoutUser` | `src/services/authService.ts` |
| `reloadSession()` | calls `loadAppSession` | `src/services/authAccess.ts` |

Legacy `AppSession` fields:

- `uid`
- `email`
- `displayName`
- `globalRole`
- `status`
- `currentWorkspaceId`
- `currentRole`

Notably, legacy session uses `currentRole`, while the new auth module uses `currentWorkspaceRole`.

## Existing AuthContext Consumers

Direct imports of `src/context/AuthContext` found: 4 files.

| File | Context values used | Role/workspace usage | Redirect behavior | Firestore use | Difficulty | Operational impact |
| --- | --- | --- | --- | --- | --- | --- |
| `src/pages/Login.tsx` | `login`, `loading`, `authError` | none | calls `navigate("/")` after `login()` | indirect via `loginWithEmail` and `loadAppSession` | High | High because login currently creates session directly |
| `src/components/ProtectedRoute.tsx` | `session`, `loading` | `session.globalRole`, `session.currentRole` | no router redirect, renders text fallback | none | Medium | Medium, menu permission behavior depends on role mapping |
| `src/components/guards/RequireAuth.tsx` | `session`, `loading` | none | `<Navigate to="/login" replace />` when no session | none | Low to medium | Medium if phase mapping is wrong |
| `src/components/guards/RequireWorkspaceRole.tsx` | `session`, `loading` | `isSystemOwner(session)`, `hasWorkspaceRole(session, allowedRoles)` using `currentRole` | redirects to `/login` or `/unauthorized` | none | Medium | High for protected workspace pages |

## Existing Auth Service Dependencies

Files:

- `src/services/authService.ts`
- `src/services/authAccess.ts`
- `src/services/sessionService.ts`

Important behavior:

- `loginWithEmail()` calls Firebase `signInWithEmailAndPassword`, then immediately calls `loadAppSession`.
- If Firebase Auth succeeds but `loadAppSession` fails, it calls `signOut(auth)`.
- Legacy `AuthContext.reloadSession()` calls `loadAppSession`.
- If `reloadSession()` fails, it calls `signOut(auth)`.
- Legacy `AuthContext.onAuthStateChanged()` calls `loadAppSession`.
- If automatic session restore fails, it calls `signOut(auth)`.

This conflicts with the new policy: session loading failures must not automatically sign out unless the error is explicitly session-ending.

## New AuthProvider

Files:

- `src/auth/AuthProvider.tsx`
- `src/auth/sessionService.ts`
- `src/auth/authRepository.ts`
- `src/auth/authTypes.ts`
- `src/auth/useAuth.ts`

New values:

- `phase`
- `firebaseUser`
- `session`
- `error`
- `signInWithEmail`
- `signOut`
- `reloadSession`
- `switchWorkspace`

New `AppSession` fields:

- `uid`
- `email`
- `displayName`
- `emailVerified`
- `status`
- `globalRole`
- `currentWorkspaceId`
- `currentWorkspaceRole`
- `isSystemOwner`
- `isAuthenticated`
- `warnings`

Key differences:

- Login function only signs in. Session creation is handled by `onAuthStateChanged`.
- Session loading uses request generation to prevent stale async results from overwriting current state.
- `systemOwners/{uid}` can compute `globalRole = system_owner`.
- Legacy role mismatches are warnings, not login failures.
- Missing or deleted `currentWorkspaceId` does not automatically fail system owner login.
- `reloadSession()` does not call Firebase sign-out on ordinary session errors.

## New AuthProvider Consumers Already Verified

These pages already use the new provider in limited or read-only modes:

- `owner-admin-diagnostics`
- `auth-provider-preview`
- `shadow-auth-test`
- `VerifyEmail`
- `LoginDevices`
- `Notifications`

These integrations intentionally do not replace the production `app.js` login path.

## Guard Inventory

### `src/components/ProtectedRoute.tsx`

Existing input:

- legacy `session`
- `loading`
- optional `menuKey`

Behavior:

- loading: text fallback
- no session: text fallback, no redirect
- role: `resolvePermissionRole(session.globalRole, session.currentRole)`
- no role for menu: workspace missing text
- denied: access denied text

Risks:

- Uses `currentRole`, not `currentWorkspaceRole`.
- `system_owner` is handled as global role.
- `currentWorkspaceId == null` is treated as missing permission for menu pages.
- No explicit pending/rejected/disabled distinction.

### `src/components/guards/RequireAuth.tsx`

Existing input:

- legacy `session`
- `loading`

Behavior:

- loading: text fallback
- no session: redirect `/login`
- session: render children

Risks:

- New `phase = account_action_required` must not look like normal authenticated content.
- New `phase = error` must not always redirect to login or force sign-out.

### `src/components/guards/RequireWorkspaceRole.tsx`

Existing input:

- legacy `session`
- `loading`
- `allowedRoles`

Behavior:

- loading: text fallback
- no session: redirect `/login`
- not system owner and missing allowed `currentRole`: redirect `/unauthorized`

Risks:

- Uses `currentRole` instead of `currentWorkspaceRole`.
- If a system owner has no workspace role, global owner bypass currently works only if `globalRole` is correct.
- Pending/rejected/disabled users become `session == null` under the legacy loader because `validateUserStatus()` throws.
- Missing workspace or missing member silently becomes `currentWorkspaceId = null` and `currentRole = null`.

### `src/auth/RouteGuard.tsx`

Existing input:

- new `phase`
- new `session`
- `requireWorkspace`
- `requiredPermission`

Behavior:

- loading phases: text fallback
- signed out: redirect `/login`
- no session: redirect `/login`
- `account_action_required`: redirect `/account-status`
- `error`: redirect `/unauthorized`
- required workspace missing: redirect `/select-workspace`
- missing permission: redirect `/unauthorized`

Risks:

- Requires routes `/account-status`, `/select-workspace`, and `/unauthorized` to exist before broad use.
- Error phase redirects to `/unauthorized`; for network or transient permission errors, a read-only message may be safer.
- If wrapped inside another legacy guard, nested redirects can create loops.

## Automatic Sign-Out Paths

| File | Path | Current action | Classification |
| --- | --- | --- | --- |
| `src/services/authService.ts` | `loginWithEmail()` catch after sign-in/session-load failure | `signOut(auth)` | Remove or restrict during migration |
| `src/context/AuthContext.tsx` | `reloadSession()` catch | `signOut(auth)` | Remove for non-session-ending errors |
| `src/context/AuthContext.tsx` | `onAuthStateChanged()` catch | `signOut(auth)` | Remove for non-session-ending errors |
| `src/context/AuthContext.tsx` | `logout()` | `logoutUser()` | Keep, user-triggered |
| `src/auth/AuthProvider.tsx` | `signOut()` | Firebase sign-out | Keep, user-triggered |
| `src/services/sessionService.ts` | `logoutCurrentDevice()` | Firebase sign-out | Keep only when explicitly invoked |

The highest migration risk is accidental sign-out when Firestore rejects or temporarily fails a session read.

## Risk Analysis

| Risk | Current cause | Impact | Mitigation |
| --- | --- | --- | --- |
| Session loading failure causes sign-out | Legacy context and auth service catch blocks call `signOut(auth)` | Owner and normal accounts can be forced out by Firestore errors | Introduce read-only compatibility adapter first, then remove automatic sign-out only after tests |
| `currentWorkspaceId` null treated as failure | Guards often expect role or workspace | Valid active accounts without workspace may be redirected or denied | Model null workspace as a display state, not authentication failure |
| `system_owner` compared as workspace role | Legacy data may contain `role/currentRole/workspaceRole = system_owner` | Invalid workspace role warnings can become false denial | Use `isSystemOwner` and `globalRole` separately |
| Legacy role fields mixed with canonical membership | `currentRole` comes from nested member, while older data can have role fields | Role changes can appear inconsistent | Adapter maps canonical `currentWorkspaceRole` to legacy `currentRole` for display only |
| Duplicate providers/listeners | Existing context and new provider both call `onAuthStateChanged` | Double reads and state races | Use only one provider per React tree during each step |
| Duplicate session writes | `switchWorkspace` writes `users.currentWorkspaceId` while legacy code may assume old fields | Workspace changes may not reflect in legacy session | Avoid broad workspace switching until adapter is proven |
| Guard redirect loops | Multiple guards can redirect to missing routes | Blank or bouncing pages | Confirm route targets exist before guard replacement |
| Pending/rejected/disabled behavior differs | Legacy throws and clears session; new provider returns `account_action_required` | Existing pages may think user is signed out | Adapter must expose status and distinguish action-required states |
| Owner forced logout | Legacy sign-out on session read error | Existing known owner with legacy mismatch may be logged out | New provider warning behavior must remain authoritative |

## Audit Conclusion

The safest next step is not a direct replacement. The existing Context has a compact consumer set, but those consumers sit on login and guard paths. Replace via a compatibility adapter that presents the legacy field names while sourcing state from the new `AuthProvider`.

