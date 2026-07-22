# LegacyAuthAdapter Test-Only Guard Integration

## Summary

4단계 2차 작업은 기존 운영 Guard를 교체하지 않고, `LegacyAuthAdapter` 출력값을 입력으로 받는 개발 전용 Guard 판단층만 추가한다.

운영 앱과 기존 React 인증 구조는 그대로 둔다.

## Added Preview

- URL on: `http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=on`
- URL off: `http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=off`
- Env flag: `VITE_ENABLE_LEGACY_AUTH_GUARD_PREVIEW=false`
- Priority: query switch -> env -> false
- Production: always off

## Added Files

- `src/auth/legacy/guards/legacyGuardTypes.ts`
- `src/auth/legacy/guards/legacyGuardDecisionUtils.ts`
- `src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx`
- `src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx`
- `src/dev-legacy-guard/LegacyGuardPreviewApp.tsx`
- `src/dev-legacy-guard/main.tsx`
- `src/dev-legacy-guard/legacyGuardPreviewStyles.css`
- `legacy-auth-guard-preview.html`

## Guard Input

The test-only Guard uses only converted adapter state:

- `phase`
- `loading`
- `session`
- `isAuthenticated`
- `status`
- `currentRole`
- `workspaceId`
- `isSystemOwner`
- `error`

Workspace Guard additionally receives:

- `allowedRoles`
- `requireWorkspace`
- `allowSystemOwnerBypass`

## RequireAuth Policy

| Condition | Decision | Reason | Expected Destination |
| --- | --- | --- | --- |
| initializing | loading | `AUTH_INITIALIZING` | none |
| loading_session | loading | `SESSION_LOADING` | none |
| signed out | deny | `SIGNED_OUT` | `/login` |
| authenticated active with workspace | allow | `AUTHENTICATED_ACTIVE` | none |
| authenticated active without workspace | allow | `AUTHENTICATED_WITHOUT_WORKSPACE` | none |
| pending | deny | `ACCOUNT_PENDING` | `/pending` |
| rejected | deny | `ACCOUNT_REJECTED` | `/rejected` |
| disabled | deny | `ACCOUNT_DISABLED` | `/disabled` |
| session error | deny | `SESSION_ERROR` | `/forbidden` |

`currentWorkspaceId = null` is allowed by RequireAuth because this Guard only verifies authentication state.

## Workspace Guard Policy

| Condition | Decision | Reason | Expected Destination |
| --- | --- | --- | --- |
| base auth denied/loading | same as base auth | same | same |
| system owner + explicit bypass | allow | `SYSTEM_OWNER` | none |
| workspace missing + not required | allow | `AUTHENTICATED_WITHOUT_WORKSPACE` | none |
| workspace missing + required | deny | `WORKSPACE_REQUIRED` | `/workspace-select` |
| workspace exists + role missing | deny | `WORKSPACE_ROLE_MISSING` | `/forbidden` |
| workspace role allowed | allow | `WORKSPACE_ROLE_ALLOWED` | none |
| workspace role denied | deny | `WORKSPACE_ROLE_NOT_ALLOWED` | `/forbidden` |

## System Owner

`system_owner` remains a global role only.

- It is not converted into `currentRole`.
- It is not included in workspace role arrays.
- Workspace role bypass occurs only when `allowSystemOwnerBypass = true`.

## Safety

The preview and test-only Guard do not perform:

- actual redirect
- `signOut`
- login/logout execution
- Firestore write
- Firebase Auth user mutation
- localStorage/sessionStorage deletion
- Rules or data migration

## Existing Guard Status

No production Guard was changed:

- `src/components/ProtectedRoute.tsx`
- `src/components/guards/RequireAuth.tsx`
- `src/components/guards/RequireWorkspaceRole.tsx`

These files still depend on the existing `src/context/AuthContext.tsx`.

## Rollback

Use:

`http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=off`

or leave `VITE_ENABLE_LEGACY_AUTH_GUARD_PREVIEW=false`.

Because no operating Guard is connected to this preview, rollback is immediate.
