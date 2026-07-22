# Legacy Auth SignOut Risk Audit

Date: 2026-07-22

## Scope

This audit lists existing automatic sign-out paths in the legacy React auth context and related service. No code was changed in this step.

## Files Checked

- `src/context/AuthContext.tsx`
- `src/services/authService.ts`
- `src/services/authAccess.ts`
- `src/auth/AuthProvider.tsx`
- `src/auth/sessionService.ts`

## Legacy `src/context/AuthContext.tsx`

### 1. `reloadSession`

Location:

- `src/context/AuthContext.tsx` lines 89-131

Flow:

```text
reloadSession()
-> auth.currentUser exists
-> loadAppSession(firebaseUser)
-> catch any error
-> setAuthError
-> setSession(null)
-> await signOut(auth)
-> throw error
```

Risk:

- Network errors: yes, if `loadAppSession` throws because Firestore is unavailable.
- Permission errors: yes, if `loadAppSession` is denied by Rules.
- User document missing: yes.
- Workspace missing: depends on `loadAppSession`; current legacy `authAccess.ts` can return null workspace for missing membership but throws for missing user document and blocked statuses.
- Role missing: current legacy `authAccess.ts` tends to clear workspace role instead of throwing for invalid member role, but any unexpected error still signs out.

New path impact:

- New `AuthProvider` does not call this legacy `reloadSession`.
- New Login branch does not call this legacy `reloadSession`.

Risk level:

- High if any production React consumer still uses legacy `AuthContext`.

### 2. `onAuthStateChanged` session load

Location:

- `src/context/AuthContext.tsx` lines 133-177

Flow:

```text
onAuthStateChanged(firebaseUser)
-> loadAppSession(firebaseUser)
-> catch any error
-> setAuthError
-> setSession(null)
-> await signOut(auth)
```

Risk:

- Network errors: yes.
- Permission errors: yes.
- User document missing: yes.
- Workspace missing: lower risk if handled by `authAccess.ts`, but unexpected workspace read failures can still trigger signOut.
- Role missing: lower risk if handled by `authAccess.ts`, but unexpected errors can still trigger signOut.

New path impact:

- New `AuthProvider` has its own listener and does not use this legacy listener unless a legacy provider is mounted.
- Current guard bridges mount new `AuthProvider` inside new branches, not legacy `src/context/AuthContext`.

Risk level:

- High for any mounted legacy `AuthProvider` from `src/context/AuthContext`.

### 3. `login`

Location:

- `src/context/AuthContext.tsx` lines 179-217

Flow:

```text
login(email, password)
-> loginWithEmail(email, password)
-> catch
-> setAuthError
-> setSession(null)
-> throw
```

Direct signOut in `AuthContext.login`:

- none

Indirect signOut:

- yes through `src/services/authService.ts` `loginWithEmail`.

Risk level:

- Medium to high in legacy branch because `loginWithEmail` signs out on session load failure.

### 4. `logout`

Location:

- `src/context/AuthContext.tsx` lines 219-227

Flow:

```text
logout()
-> logoutUser()
-> setSession(null)
-> setAuthError(null)
```

Risk:

- Intended user action, not automatic.

New path impact:

- Not used by new Login branch.

## Legacy `src/services/authService.ts`

### 5. `loginWithEmail`

Location:

- `src/services/authService.ts` lines 12-40

Flow:

```text
signInWithEmailAndPassword()
-> loadAppSession()
-> catch any error
-> if auth.currentUser exists, await signOut(auth)
-> throw
```

Risk:

- Network errors: yes.
- Permission errors: yes.
- User document missing: yes.
- Workspace missing: depends on `loadAppSession`.
- Role missing: depends on `loadAppSession`.

New path impact:

- New Login branch does not call `loginWithEmail`.
- It calls `src/auth/AuthProvider.signInWithEmail`, which only performs Firebase sign-in and lets `onAuthStateChanged` load session.

Risk level:

- High if used by a production login route.

### 6. `logoutUser`

Location:

- `src/services/authService.ts` lines 42-44

Risk:

- Intended explicit logout helper.

## New `src/auth/AuthProvider.tsx` Comparison

Observed behavior:

- `signInWithEmail()` only calls Firebase `signInWithEmailAndPassword`.
- Session loading is handled from one `onAuthStateChanged` listener.
- Session load errors set `phase = "error"`.
- It does not automatically `firebaseSignOut` on session load errors.
- Explicit `signOut()` exists only as a user/action API.

Risk:

- Safer for network or permission-denied scenarios.
- Still must not be mounted redundantly in multiple active route trees.

## Risk Summary

| Path | Automatic signOut | Network error can trigger | Permission error can trigger | New branch calls it |
| --- | --- | --- | --- | --- |
| legacy `reloadSession` | yes | yes | yes | no |
| legacy `onAuthStateChanged` catch | yes | yes | yes | no unless legacy provider mounted |
| legacy `loginWithEmail` service | yes | yes | yes | no |
| legacy `logout` | explicit only | n/a | n/a | no |
| new `AuthProvider` session load | no | no forced signOut | no forced signOut | yes |

## Recommendation

Before any production React route mounts the legacy `src/context/AuthContext`, either keep it behind the already tested legacy branch only or replace the mounted provider with a compatibility adapter over the new `AuthProvider`.

Do not remove these legacy signOut paths in this audit step. Treat them as migration risks to eliminate during the actual route-shell integration.
