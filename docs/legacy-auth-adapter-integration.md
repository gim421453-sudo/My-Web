# LegacyAuthAdapter Integration

## Purpose

`LegacyAuthAdapter` is a development-only compatibility layer that converts the new `AuthProvider` state into the value shape expected by older React auth consumers.

It was added to prepare for a future AuthContext migration without replacing the current production login flow.

## Added Files

- `src/auth/legacy/LegacyAuthAdapter.tsx`
- `src/auth/legacy/legacyAuthAdapterUtils.ts`
- `src/auth/legacy/legacyAuthAdapterTypes.ts`
- `src/dev-legacy-auth-adapter/main.tsx`
- `src/dev-legacy-auth-adapter/LegacyAuthAdapterPreviewApp.tsx`
- `src/dev-legacy-auth-adapter/legacyAuthAdapterPreviewStyles.css`
- `legacy-auth-adapter-preview.html`

## Preview URL

Use only `127.0.0.1`:

`http://127.0.0.1:5173/legacy-auth-adapter-preview.html?adapter=on`

Rollback/off:

`http://127.0.0.1:5173/legacy-auth-adapter-preview.html?adapter=off`

## Feature Flag

Environment variable:

`VITE_ENABLE_LEGACY_AUTH_ADAPTER_PREVIEW=false`

Query:

- `?adapter=on`
- `?adapter=off`

Priority:

1. query
2. env
3. false

Production always resolves to off.

## Compatibility API

The adapter exposes:

- `user`
- `session`
- `loading`
- `currentRole`
- `workspaceId`
- `workspaceRole`
- `status`
- `isAuthenticated`
- `isSystemOwner`
- `error`
- `authError`
- `login`
- `logout`
- `reloadSession`

This is read-only compatibility output. It does not write legacy fields back to Firestore.

## Mapping

| New AuthProvider value | Legacy adapter value |
| --- | --- |
| `phase === "initializing"` | `loading = true` |
| `phase === "loading_session"` | `loading = true` |
| all other phases | `loading = false` |
| `session` | converted `session` |
| `session.currentWorkspaceRole` | `session.currentRole` |
| `session.currentWorkspaceId` | `session.workspaceId` and `workspaceId` |
| `session.currentWorkspaceRole` | `session.workspaceRole` and `workspaceRole` |
| `session.isSystemOwner` | `isSystemOwner` |
| `error` | user-safe string error |
| `signInWithEmail` | `login` reference |
| `signOut` | `logout` reference |
| `reloadSession` | `reloadSession` reference |

## `system_owner` Handling

`system_owner` remains a global role.

The adapter does not convert `system_owner` into a workspace role:

- `globalRole = "system_owner"`
- `isSystemOwner = true`
- `currentRole = currentWorkspaceRole ?? null`

This intentionally avoids recreating legacy `currentRole = "system_owner"` behavior.

## `currentWorkspaceId = null`

This is a valid authenticated state:

- `loading = false`
- `session` exists
- `currentRole = null`
- `workspaceId = null`
- `error = null`

The adapter does not sign out or convert this state to `signed_out`.

## Account Status Handling

The adapter preserves:

- `active`
- `pending`
- `rejected`
- `disabled`

Pending, rejected, and disabled are not Firebase Auth logout states. Future guards must decide what protected content to block based on `status`, not by assuming `session === null`.

## Error Handling

Structured errors are converted into user-safe strings.

The adapter must not expose internal words or values such as:

- Firebase
- credential
- provider
- raw Firestore document paths
- full UID
- token values

Errors never trigger:

- `signOut(auth)`
- localStorage removal
- sessionStorage removal
- Firebase Auth user mutation
- Firestore write

## Login/Logout Forwarding

`login` and `logout` are function references only:

- `login -> signInWithEmail`
- `logout -> signOut`

The development preview does not render actual login/logout buttons and does not auto-execute these functions.

## reloadSession Forwarding

`reloadSession` is forwarded to the new provider.

On failure, the preview displays:

`세션 다시 확인에 실패했습니다. 자동 로그아웃은 수행하지 않습니다.`

## Existing Consumers Not Replaced

The following files still import the old `src/context/AuthContext` and were not changed:

- `src/pages/Login.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/guards/RequireAuth.tsx`
- `src/components/guards/RequireWorkspaceRole.tsx`

## Expected Consumer Collisions

| Consumer | Expected issue |
| --- | --- |
| `Login.tsx` | Existing `login()` expects session load completion; new `signInWithEmail()` only signs into Firebase. |
| `ProtectedRoute.tsx` | Requires `currentRole`; adapter must map from `currentWorkspaceRole`. |
| `RequireAuth.tsx` | Must not treat pending/rejected/disabled as signed out during migration. |
| `RequireWorkspaceRole.tsx` | Must keep `system_owner` as global owner, not workspace role. |

## Rollback

Rollback is immediate:

- Use `?adapter=off`.
- Keep `VITE_ENABLE_LEGACY_AUTH_ADAPTER_PREVIEW=false`.
- Remove the preview entry if needed.

Since no existing consumer import was changed, production behavior is unchanged.

## Next Candidate

Next migration candidate should be a test-only wrapper around one existing guard, not `Login.tsx`.

