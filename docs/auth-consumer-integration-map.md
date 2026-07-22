# Auth Consumer Integration Map

Date: 2026-07-22

## Scope

This document separates production consumers from development preview consumers for the current authentication transition modules.

Excluded from production consumer counts:

- `src/dev-*`
- standalone preview HTML files
- tests
- docs
- comments

## Production Consumer Summary

| Component | Production consumer count | Production consumer files |
| --- | ---: | --- |
| `RequireAuth` | 0 | none |
| `ProtectedRoute` | 0 | none |
| `RequireWorkspaceRole` | 0 | none |
| `LoginPage` | 0 | none |
| new `AuthProvider` | 3 standalone read-only pages, 0 route-tree consumers | `verifyEmailMain.tsx`, `loginDevicesMain.tsx`, `notificationsMain.tsx` |
| `LegacyAuthAdapterProvider` | 0 production consumers | none |

## Standalone Read-Only React Consumers

These are direct HTML entry pages, not routed production pages.

| HTML | Entry | Uses new `AuthProvider` | Firestore write |
| --- | --- | --- | --- |
| `verify-email.html` | `src/pages/verifyEmailMain.tsx` | feature-flagged | no |
| `login-devices.html` | `src/pages/Settings/loginDevicesMain.tsx` | feature-flagged | no |
| `notifications.html` | `src/pages/Settings/notificationsMain.tsx` | feature-flagged | no |

## Development Preview Consumers

| Surface | Consumer |
| --- | --- |
| `owner-admin-diagnostics.html` | optional new `AuthProvider` |
| `auth-provider-preview.html` | new `AuthProvider` preview |
| `shadow-auth-test.html` | shadow/new provider comparison |
| `legacy-auth-adapter-preview.html` | `AuthProvider` + `LegacyAuthAdapterProvider` |
| `legacy-auth-guard-preview.html` | test-only guard decisions |
| `require-auth-bridge-preview.html` | real `RequireAuth` branch preview |
| `protected-route-bridge-preview.html` | real `ProtectedRoute` branch preview |
| `require-workspace-role-bridge-preview.html` | real `RequireWorkspaceRole` branch preview |
| `login-bridge-preview.html` | mock login branch preview |

## Component Details

### `RequireAuth`

- File: `src/components/guards/RequireAuth.tsx`
- Production consumers: 0
- Development consumer: `src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx`
- Legacy branch uses: `src/context/AuthContext`
- New branch uses: `NewAuthRequireAuthBridge` with new `AuthProvider` and `LegacyAuthAdapterProvider`
- Default: legacy

### `ProtectedRoute`

- File: `src/components/ProtectedRoute.tsx`
- Production consumers: 0
- Development consumer: `src/dev-protected-route-bridge/ProtectedRouteBridgePreviewApp.tsx`
- Legacy branch uses: `src/context/AuthContext`
- New branch uses: `NewAuthProtectedRouteBridge`
- Default: legacy

### `RequireWorkspaceRole`

- File: `src/components/guards/RequireWorkspaceRole.tsx`
- Production consumers: 0
- Development consumer: `src/dev-require-workspace-role-bridge/RequireWorkspaceRoleBridgePreviewApp.tsx`
- Legacy branch uses: `src/context/AuthContext`
- New branch uses: `NewAuthRequireWorkspaceRoleBridge`
- Default: legacy

### `LoginPage`

- File: `src/pages/Login.tsx`
- Production consumers: 0
- Router link: none found
- Legacy branch uses: `src/context/AuthContext.login`
- New branch uses: `src/auth/AuthProvider.signInWithEmail`
- Default: legacy

### New `AuthProvider`

- File: `src/auth/AuthProvider.tsx`
- Actual read-only direct-page consumers:
  - `src/pages/verifyEmailMain.tsx`
  - `src/pages/Settings/loginDevicesMain.tsx`
  - `src/pages/Settings/notificationsMain.tsx`
- Development consumers:
  - diagnostics and preview entries
- Production route-tree consumers: 0

### `LegacyAuthAdapterProvider`

- File: `src/auth/legacy/LegacyAuthAdapter.tsx`
- Production consumers: 0
- Development/bridge consumers:
  - legacy adapter preview
  - guard previews
  - new branch of `RequireAuth`
  - new branch of `ProtectedRoute`
  - new branch of `RequireWorkspaceRole`

## Current Routing Gap

`src/pages/Login.tsx`, `src/components/guards/RequireAuth.tsx`, `src/components/ProtectedRoute.tsx`, and `src/components/guards/RequireWorkspaceRole.tsx` are implemented and tested, but no production React router currently mounts them.

The next integration must therefore create or expose a real entry point before any route-level behavior can be observed in production.
