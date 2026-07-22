# AuthContext Replacement Plan

## Goal

Replace the legacy React `AuthContext` safely with the new authentication, workspace, and permission model without changing the operating static app yet.

This is a plan only. No AuthContext replacement was performed in this step.

## Strategy Comparison

| Strategy | Description | Pros | Cons | Risk |
| --- | --- | --- | --- | --- |
| A. Replace legacy AuthContext internals with new AuthProvider | Keep `src/context/AuthContext.tsx` exports but rewrite internals to call the new provider/session loader | Small consumer diff | Easy to create nested listeners or break `login()` semantics | High |
| B. Add `LegacyAuthAdapter` | New provider remains canonical; adapter exposes legacy-compatible values for old consumers | Best rollback, clear boundary, no Firestore writes | Requires wrapper ordering and tests | Low to medium |
| C. Screen-by-screen conversion | Every consumer imports new `useAuth()` directly | Clean final state | Touches login and guards broadly | Medium to high |
| D. Keep both providers in parallel | Existing Context and new AuthProvider both active | Fast experimentation | Duplicate listeners, duplicate reads, race conditions | High |

## Recommended Strategy

Use Strategy B: `LegacyAuthAdapter` as a temporary compatibility layer.

Reason:

- Existing consumers are only 4 files, but they include login and guard behavior.
- The legacy API shape is small and can be adapted from the new `AppSession`.
- The new provider already passed limited read-only integrations.
- It avoids immediately rewriting guards and login pages.
- It prevents duplicate Firebase session creation if the adapter only reads the new provider context.

## Compatibility Adapter Design

Proposed file:

- `src/context/LegacyAuthAdapter.tsx`

Adapter input:

- new `AuthProvider`
- new `useAuth()`

Adapter output shape matching legacy `src/context/AuthContext.tsx`:

| Legacy field | Source from new provider | Notes |
| --- | --- | --- |
| `session` | converted from `newSession` | null only when signed out or no usable auth state |
| `isAuthenticated` | `session?.isAuthenticated === true` | if added for convenience, read-only |
| `loading` | `phase === "initializing" || phase === "loading_session"` | do not infer from Firestore writes |
| `authError` | `error?.message ?? null` | string for legacy pages |
| `role` | do not expose unless required | avoid reviving ambiguous legacy field |
| `currentRole` | `session.currentWorkspaceRole` | display/guard compatibility only |
| `workspaceRole` | `session.currentWorkspaceRole` | display compatibility only if needed |
| `workspaceId` | `session.currentWorkspaceId` | display compatibility only if needed |
| `status` | `session.status` | preserve pending/rejected/disabled |
| `isSystemOwner` | `session.isSystemOwner` | computed, not stored |
| `login()` | calls `signInWithEmail()` only | session comes from `onAuthStateChanged` |
| `logout()` | calls explicit `signOut()` | user-triggered only |
| `reloadSession()` | calls new `reloadSession()` | failure must not auto sign out |

Adapter must not:

- write legacy role fields
- write `workspaceId`
- change `users.globalRole`
- call Firestore write APIs
- call Firebase `signOut()` except through explicit `logout()`
- create a second `onAuthStateChanged` listener

## Transition Phases

### Phase 1: Consumer Inventory Freeze

Scope:

- Keep a checked list of every `src/context/AuthContext` consumer.
- Add tests that fail when a new direct consumer is added without review.

Tests:

- Existing consumer count stays expected.
- No production static files import new React auth.

Rollback:

- Remove only the inventory test.

Entry condition:

- Current audit accepted.

Stop condition:

- New login or write page appears that depends on legacy session fields not mapped in the matrix.

### Phase 2: Read-Only Adapter Prototype

Scope:

- Add `LegacyAuthAdapter` in a development-only or test-only route.
- Do not replace existing `src/context/AuthContext.tsx`.
- Adapter maps new `AppSession` to legacy shape.

Tests:

- Owner login maps to `globalRole = system_owner`.
- `currentWorkspaceRole = super_manager` maps to `currentRole = super_manager`.
- `currentWorkspaceId = null` does not become signed out.
- `reloadSession` failure does not sign out.
- Pending/rejected/disabled map to visible status.

Rollback:

- Feature flag off.
- Remove adapter wrapper from test route.

Entry condition:

- New provider remains passing on VerifyEmail, LoginDevices, Notifications.

Stop condition:

- Adapter requires Firestore writes or a second auth listener.

### Phase 3: Non-Critical Consumer Switch

Scope:

- Switch one non-write React consumer from legacy Context to adapter.
- Candidate: `ProtectedRoute` with text fallback only, or a non-production test route using the guard.

Tests:

- No redirect loop.
- No automatic logout.
- Permission allowed/denied labels match previous behavior.

Rollback:

- Restore import to legacy `src/context/AuthContext`.

Entry condition:

- Adapter prototype tests pass.

Stop condition:

- Any owner account loses visible authenticated state.

### Phase 4: Guard Conversion

Scope:

- Convert `RequireAuth` and `RequireWorkspaceRole` to the adapter or new `RouteGuard`.
- Ensure route targets exist before redirects are enabled.

Tests:

- signed out -> login guidance or `/login`
- pending -> account status
- rejected -> account status
- disabled -> account status
- no workspace -> select workspace guidance, not logout
- system owner -> allowed where expected
- manager/teacher/normal/viewer/print_account permissions
- no infinite redirects

Rollback:

- Restore old guard files.
- Disable new guard feature flag.

Entry condition:

- Required route targets exist.

Stop condition:

- Browser history loops or blank route on refresh.

### Phase 5: Login Flow Conversion

Scope:

- Change `Login.tsx` to call new `signInWithEmail`.
- Remove direct `loadAppSession` from login submit path.
- Let `onAuthStateChanged` create the session.

Tests:

- owner login remains authenticated.
- normal login remains authenticated.
- pending/rejected/disabled show status without forced sign-out.
- network error does not sign out a previously valid session.
- permission-denied logs a session error without clearing Firebase Auth unless session-ending.

Rollback:

- Restore old `Login.tsx` and `src/context/AuthContext.tsx` implementation.

Entry condition:

- Guard conversion passes.

Stop condition:

- Login success requires two submits or session never appears after sign-in.

### Phase 6: Legacy Context Removal

Scope:

- Replace all `src/context/AuthContext` consumers.
- Remove compatibility adapter after no consumers remain.
- Remove legacy `src/services/authAccess.ts` session loader only after parity tests.

Tests:

- Full auth module tests.
- Browser owner, manager, teacher, normal, viewer, print_account checks.
- Refresh and fast account switching.
- Multiple tabs logout behavior.

Rollback:

- Keep legacy files until this phase is complete.
- Re-enable adapter route if direct conversion fails.

Entry condition:

- No direct consumer remains except test adapters.

Stop condition:

- Any role or workspace regression appears in production React pages.

## Guard Migration Notes

Do not replace every guard in one commit.

Recommended order:

1. Add adapter-backed guard helpers.
2. Convert `ProtectedRoute`.
3. Convert `RequireAuth`.
4. Convert `RequireWorkspaceRole`.
5. Introduce the new `RouteGuard` only when all target routes exist.

## Sign-Out Policy

Maintain explicit sign-out only:

- User clicks logout.
- Firebase Auth reports an auth-required state such as user disabled or token invalid.
- User document is truly missing and policy says the account cannot continue.

Never sign out only because of:

- `permission-denied`
- network unavailable
- workspace missing
- nested membership missing
- invalid legacy role warning
- `currentWorkspaceId == null`

## Required Tests Before Replacement

1. Owner login 유지
2. Normal login 유지
3. Pending account status
4. Rejected account status
5. Disabled account status
6. `currentWorkspaceId == null`
7. Workspace role 없음
8. Workspace role 있음
9. `system_owner`
10. `reloadSession` 실패
11. Network error
12. Permission denied
13. Duplicate provider 없음
14. Duplicate auth listener 없음
15. Automatic signOut 없음
16. Guard redirect loop 없음
17. Fast logout then login as another account
18. Refresh session restore
19. Multiple browser tabs logout
20. Legacy owner warning only

## Rollback Switch

Until Phase 6, every migration should keep one of:

- query flag
- environment flag
- old import path restoration
- adapter bypass

The production static app must remain the fallback baseline.

## Next Step Recommendation

Next step should be Phase 1 plus a test-only `LegacyAuthAdapter` design spike. Do not modify production `index.html`, `app.js`, root services, Firestore Rules, or real data.

