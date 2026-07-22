# Auth Legacy/New Regression Matrix

## Scope

This matrix compares the operational static auth interpretation with the new AuthProvider interpretation using mock fixtures only.

No production auth listener is mounted by the comparison tool. No Firestore write API is imported or executed.

## Compared Paths

| Path | Entry | Source |
| --- | --- | --- |
| Legacy operational | `index.html` + `app.js?v=111` | Modeled from `services/authService.js` and legacy role/workspace behavior |
| New provider | `/app-next.html` | Modeled from `src/auth/AuthProvider.tsx` and `src/auth/sessionService.ts` |
| Canonical recommendation | pure fixture resolver | Nested membership and canonical status/global role rules |

## Common Comparison Model

The comparison model is implemented in `src/auth/sessionComparison.ts`.

Compared fields:

- uid presence, without exposing uid
- `emailVerified`
- `phase`
- `isAuthenticated`
- `status`
- `globalRole`
- `isSystemOwner`
- workspace presence, without exposing workspace id
- `currentWorkspaceRole`
- membership source
- warnings
- error category
- destination
- automatic signOut
- Firestore write

Sensitive values are not displayed in test output or preview cards.

## Scenario Matrix

| Scenario | Expected result |
| --- | --- |
| A signed_out | login destination, no write, no signOut |
| B active user + workspace | active authenticated, workspace role from membership |
| C active user + workspace null | authenticated, workspace role null, no forced logout |
| D system_owner + workspace | global role system_owner, workspace role from membership |
| E system_owner + workspace null | authenticated global owner, workspace role null |
| F pending | account action required, no bootstrap |
| G rejected | rejected destination, no signOut |
| H disabled | disabled destination, no signOut |
| I users document missing | safe error, `USER_DOCUMENT_MISSING`, no auto creation |
| J membership missing | authenticated, workspace cleared in memory, `CURRENT_WORKSPACE_NOT_ACCESSIBLE`, no auto repair |
| K canonical membership exists | canonical membership wins over legacy membership |
| L legacy-only membership | warning `LEGACY_ONLY_MEMBERSHIP`, no migration write |
| M permission-denied | safe error category, no signOut, no retry loop |
| N resource-exhausted | quota category, no write, no retry loop |
| O network error | network category, Firebase Auth session remains conceptually valid |

## Mismatch Severity

| Severity | Meaning |
| --- | --- |
| CRITICAL | login allow/deny, system owner, auth state, forced signOut, or write behavior differs |
| HIGH | status, workspace selection, workspace role, or membership source differs |
| MEDIUM | warning, destination, or error category differs |
| LOW | display-only or diagnostic-only difference |

## Current Fixture Result Summary

The fixture suite is intentionally broad. As of the workspace-missing alignment pass, the comparison target is:

- CRITICAL: 0
- HIGH: 0

Missing, deleted, or inaccessible workspace references are normalized in memory only:

- `currentWorkspaceIdPresent = false`
- `currentWorkspaceRole = null`
- `CURRENT_WORKSPACE_NOT_ACCESSIBLE`

This does not update `users.currentWorkspaceId`, create memberships, create workspaces, clear browser storage, or sign the user out.
