# Legacy Guard Compatibility Matrix

## Existing Guard Comparison

| Guard | Current Input | Current Redirect | Loading | Workspace Null | System Owner | Account Status | Test-Only Difference |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/ProtectedRoute.tsx` | Existing `AuthContext` `session`, `loading` | none, inline messages | inline loading text | menu access can show workspace missing | permission role resolver | not explicitly separated | Test-only returns structured decisions and expected destination only |
| `src/components/guards/RequireAuth.tsx` | Existing `AuthContext` `session`, `loading` | `<Navigate to="/login" />` | inline loading text | allowed if session exists | no special case | not explicitly separated | Test-only never redirects and separates pending/rejected/disabled |
| `src/components/guards/RequireWorkspaceRole.tsx` | Existing `AuthContext` `session`, `loading` | `/login`, `/unauthorized` | inline loading text | likely unauthorized if role check fails | automatic bypass through utility | not explicitly separated | Test-only supports explicit `allowSystemOwnerBypass` and `WORKSPACE_REQUIRED` |

## API Compatibility

| Legacy Consumer Expectation | LegacyAuthAdapter Field | Guard Preview Use | Risk |
| --- | --- | --- | --- |
| `loading` | `loading` | loading decision | Low |
| `session` exists | `session` | signed in decision | Low |
| `session.currentRole` | `currentRole` | workspace role decision | Medium, because `system_owner` is no longer a workspace role |
| `workspaceId` | `workspaceId` | workspace required decision | Medium, because `null` can be a valid authenticated state |
| `status` | `status` | pending/rejected/disabled decisions | Low |
| system owner flag | `isSystemOwner` | explicit bypass only | Medium, because existing Guard bypasses more broadly |

## Redirect Loop Risk

| Scenario | Test-Only Behavior | Loop Risk |
| --- | --- | --- |
| loading | no redirect | blocked |
| signed out | expected `/login`, no redirect | blocked in preview |
| pending | expected `/pending`, no redirect | blocked in preview |
| rejected | expected `/rejected`, no redirect | blocked in preview |
| disabled | expected `/disabled`, no redirect | blocked in preview |
| workspace null | RequireAuth allow, Workspace Guard configurable | reduced |
| system owner without workspace role | explicit bypass only | visible, not hidden |

## Before Real Guard Replacement

Required decisions before touching operating Guards:

1. Whether system owners should bypass all workspace role checks.
2. Which real route should represent `/pending`, `/rejected`, `/disabled`, and `/workspace-select`.
3. Whether `currentWorkspaceId = null` screens should render a selector or guidance.
4. Whether `ProtectedRoute` menu checks should share the same decision utility.
5. How existing `AuthContext` consumers will migrate to `LegacyAuthAdapter` or the new `AuthProvider`.
