# RequireAuth Parallel Integration

## Summary

4단계 3차에서는 기존 `RequireAuth` 단일 소비자만 기능 플래그 아래에서 병행 전환한다.

운영 정적 앱, 기존 로그인 화면, 기존 AuthContext, `ProtectedRoute`, `RequireWorkspaceRole`, Firestore Rules, 실제 데이터는 변경하지 않는다.

## Target File

Actual repository path:

- `src/components/guards/RequireAuth.tsx`

The user-facing request used `src/components/RequireAuth.tsx`, but the project currently stores this Guard under `src/components/guards/`.

## Parallel Structure

`RequireAuth.tsx` now selects one branch:

```text
flag off
→ LegacyRequireAuthBranch
→ existing src/context/AuthContext
→ existing loading text
→ existing Navigate to /login
→ existing children render behavior

flag on
→ NewAuthRequireAuthBridge
→ new AuthProvider
→ LegacyAuthAdapterProvider
→ decideLegacyRequireAuth
→ children or safe guidance
```

## Feature Flag

Environment variable:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH=false
```

Development query:

```text
?newAuthRequireAuth=on
?newAuthRequireAuth=off
```

Priority:

```text
query -> env -> false
```

Production is blocked by `import.meta.env.DEV`; production cannot be forced on through query.

## New Mode Policy

| State | Behavior |
| --- | --- |
| initializing | Loading text, no redirect |
| loading_session | Loading text, no redirect |
| signed_out | Existing login destination if not already on `/login` |
| authenticated active | Render children |
| authenticated active + workspace null | Render children |
| pending | Keep auth, block children, show pending guidance |
| rejected | Keep auth, block children, show rejected guidance |
| disabled | Keep auth, block children, show disabled guidance |
| session error | Keep browser auth, block children, show safe guidance |

## Redirect Loop Defense

The redirect helper refuses to redirect when current path already equals the destination:

- `/login` -> `/login`
- `/pending` -> `/pending`
- `/rejected` -> `/rejected`
- `/disabled` -> `/disabled`

Loading decisions never redirect.

## Current Workspace Null

`currentWorkspaceId = null` remains a valid authenticated state for `RequireAuth`.

`RequireAuth` checks only whether the account is authenticated and active. Workspace-specific checks remain the responsibility of later workspace guards.

## Automatic SignOut

The new branch does not call signOut for:

- session loading failure
- permission-denied
- user document missing
- workspace missing
- workspace role missing
- pending
- rejected
- disabled
- network error

## Development Preview

URLs:

- `http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=on`
- `http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=off`

The preview displays:

- current mode
- feature flag value
- phase
- loading
- isAuthenticated
- status
- globalRole
- isSystemOwner
- currentWorkspaceId existence
- RequireAuth decision
- children rendered
- expected destination
- redirect occurrence
- automatic signOut occurrence

Sensitive identifiers are not displayed.

## Existing Path Preservation

With the flag off:

- existing `AuthContext` is still imported and consumed
- existing loading text remains `로그인 정보를 확인 중입니다.`
- existing signed-out redirect remains `<Navigate to="/login" replace />`
- existing children behavior remains unchanged

## Not Modified

- `src/components/ProtectedRoute.tsx`
- `src/components/guards/RequireWorkspaceRole.tsx`
- `src/pages/Login.tsx`
- `src/context/AuthContext.tsx`
- `index.html`
- `app.js`
- root `services/*`
- `firestore.rules`
- `firestore.rules.next`

## Next Candidate

Do not expand immediately. After browser verification, the next candidate can be either:

1. keep `RequireAuth` in new mode for more real-account observation, or
2. prepare `RequireWorkspaceRole` with the same feature-flagged bridge pattern.
