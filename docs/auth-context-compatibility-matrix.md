# AuthContext Compatibility Matrix

## Existing API to New API

| Existing AuthContext value | New AuthProvider value | Direct mapping | Adapter needed | Meaning difference | Risk |
| --- | --- | --- | --- | --- | --- |
| `session` | `session` | Partial | Yes | Types differ. Legacy has `currentRole`; new has `currentWorkspaceRole`, `isSystemOwner`, `warnings`, `emailVerified`. | Direct replacement breaks existing guards that read `currentRole`. |
| `session.uid` | `session.uid` | Yes | No | Same Firebase UID. | Low. |
| `session.email` | `session.email` | Yes | No | New value can be null and includes Auth fallback. | Low. |
| `session.displayName` | `session.displayName` | Yes | No | New value can be null and includes Auth fallback. | Low. |
| `session.globalRole` | `session.globalRole` | Yes | No | New value may be computed from `systemOwners/{uid}` even if `users.globalRole` is stale. | Medium if UI expects raw Firestore value. |
| `session.status` | `session.status` | Yes | No | New provider keeps pending/rejected/disabled as action-required states. Legacy loader throws before returning a session. | High for login/guard behavior. |
| `session.currentWorkspaceId` | `session.currentWorkspaceId` | Yes | No | New provider may repair invalid owner current workspace by using owner workspace fallback in memory only. | Medium. |
| `session.currentRole` | `session.currentWorkspaceRole` | No | Yes | New naming clarifies this is a workspace role. | High if omitted. |
| `session.workspaceRole` | `session.currentWorkspaceRole` | No | Yes if legacy consumers appear | Legacy data may store invalid `system_owner` as workspace role. | High if revived as authority. |
| `session.workspaceId` | `session.currentWorkspaceId` | No | Yes if legacy consumers appear | Legacy field is not canonical. | Medium. |
| `loading` | `phase` | Partial | Yes | New phase distinguishes `initializing`, `loading_session`, `signed_out`, `authenticated`, `account_action_required`, `error`. | High if `account_action_required` is treated as not loading and authenticated. |
| `authError` | `error` | Partial | Yes | New error is structured `AuthSessionError`, not string. | Low to medium. |
| `login(email, password)` | `signInWithEmail(email, password)` | Partial | Yes | Legacy login returns after session loading. New login only signs into Firebase; session is loaded by auth listener. | High. |
| `logout()` | `signOut()` | Yes | Maybe | Both explicit sign-out. | Low if only user-triggered. |
| `reloadSession()` | `reloadSession()` | Yes | Maybe | New failure sets error phase and rethrows without automatic sign-out. | Medium for legacy callers expecting logout on failure. |
| `isAuthenticated` | `session.isAuthenticated` or `phase === "authenticated"` | No legacy field | Optional | New has explicit boolean. | Low if adapter adds read-only field. |
| `isSystemOwner` | `session.isSystemOwner` | No legacy field | Optional | New computes from canonical global ownership. | Medium if legacy code only reads `globalRole`. |

## Phase Mapping

| New phase | Suggested legacy adapter output |
| --- | --- |
| `initializing` | `loading = true`, `session = null`, `authError = null` |
| `loading_session` | `loading = true`, `session = previous or null`, `authError = null` |
| `signed_out` | `loading = false`, `session = null`, `authError = null` |
| `authenticated` | `loading = false`, converted legacy session |
| `account_action_required` | `loading = false`, converted legacy session with `status` retained |
| `error` | `loading = false`, session should be preserved if safe, `authError = error.message` |

Open decision:

- Whether legacy adapter should expose `session` for pending/rejected/disabled users. For safety, expose session plus status in account-status views, but guards should not render protected content.

## Role Mapping

| Concept | Canonical source | Compatibility output |
| --- | --- | --- |
| Global system owner | `systemOwners/{uid}` plus normalized session | `session.globalRole = "system_owner"`, `session.isSystemOwner = true` |
| Workspace role | `workspaces/{workspaceId}/members/{uid}.role` | `session.currentRole = session.currentWorkspaceRole` |
| Legacy role fields | `users.role`, `users.currentRole`, `users.workspaceRole` | warnings only, not authority |
| Missing workspace | `session.currentWorkspaceId = null` | not signed out |
| Missing member | warning and no workspace role | not signed out |

## Guard Compatibility Matrix

| Guard | Legacy inputs | New inputs | Adapter mapping | Main risk |
| --- | --- | --- | --- | --- |
| `ProtectedRoute` | `loading`, `session.globalRole`, `session.currentRole` | `phase`, `session.globalRole`, `session.currentWorkspaceRole` | `loading` from phase, `currentRole` from `currentWorkspaceRole` | Menu permissions denied if `currentRole` is not mapped. |
| `RequireAuth` | `loading`, `session` | `phase`, `session` | `loading` from phase, `session` null only for signed-out or unrecoverable states | Pending users may be incorrectly treated as authenticated content. |
| `RequireWorkspaceRole` | `loading`, `session.currentRole`, `globalRole` | `phase`, `currentWorkspaceRole`, `isSystemOwner` | map `currentRole`, preserve `globalRole` | Owner bypass fails if global owner is not mapped. |
| `RouteGuard` | none, new-only | `phase`, `session`, permission | no legacy adapter needed | Requires route targets to exist before broad adoption. |

## Sign-Out Policy Matrix

| Situation | Legacy behavior | New behavior | Target behavior |
| --- | --- | --- | --- |
| User clicks logout | sign out | sign out | sign out |
| Login password invalid | no session | no session | no session |
| Firestore permission denied while loading session | sign out in legacy paths | error phase | no automatic sign-out |
| Network unavailable | sign out in legacy paths | error phase | no automatic sign-out |
| User document missing | sign out in legacy paths | error | policy decision, likely session-ending |
| Account pending | throws, clears session | account action required | status page, no protected data |
| Account rejected | throws, clears session | account action required | status page, no protected data |
| Account disabled | throws, clears session | account action required | status page or explicit sign-out only after policy |
| Workspace missing | clears workspace role | warning and fallback for owner | no automatic sign-out |
| Membership missing | clears workspace role | warning | no automatic sign-out |

## Consumer Difficulty

| Consumer | Difficulty | Reason |
| --- | --- | --- |
| `src/pages/Login.tsx` | High | Current login assumes session is created inside `login()`, while new login defers to `onAuthStateChanged`. |
| `src/components/ProtectedRoute.tsx` | Medium | Needs `currentRole` compatibility and status-aware protected content policy. |
| `src/components/guards/RequireAuth.tsx` | Low to medium | Simple auth check, but account-action states need care. |
| `src/components/guards/RequireWorkspaceRole.tsx` | Medium | Needs owner bypass and role mapping. |

## Recommended Adapter Shape

```ts
interface LegacyCompatibleSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  globalRole: "system_owner" | "user";
  status: "pending" | "active" | "rejected" | "disabled";
  currentWorkspaceId: string | null;
  currentRole: WorkspaceRole | null;
  isAuthenticated?: boolean;
  isSystemOwner?: boolean;
}
```

The adapter should be read-only and derived from the new session on every render. It must not persist compatibility fields back to Firestore.

