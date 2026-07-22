# Login Parallel Integration

Date: 2026-07-22

## Scope

This step adds a feature-flagged new AuthProvider-compatible branch to the React `Login.tsx` page.

Not changed:

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- timetable V111 code
- `ProtectedRoute`
- `RequireWorkspaceRole`
- existing `src/context/AuthContext` removal
- Firestore Rules
- Firebase data
- user roles or workspace memberships

## Login Route Audit

- React login file: `src/pages/Login.tsx`
- Production consumers found in `src`: 0
- Direct router connection found: none in the current `src` tree
- Current operational login: static `index.html` + `app.js` with compat Firebase Auth
- React `Login.tsx` relationship to static login: separate transition code, not the current static production login surface
- Existing React login dependency: `src/context/AuthContext.useAuth()`
- Existing React login flow:
  - submit email/password
  - call `login(email, password)`
  - legacy `login()` calls `src/services/authService.ts`
  - `loginWithEmail()` calls Firebase `signInWithEmailAndPassword`
  - legacy `loginWithEmail()` immediately calls `loadAppSession`
  - on success, `Login.tsx` navigates to `/`
- Existing legacy login failure behavior:
  - `src/services/authService.ts` signs out if Firebase auth succeeded but session loading failed
  - this legacy behavior is preserved only in the legacy branch
- Existing React `setPersistence` before this step: none in `Login.tsx`
- Static app persistence:
  - `app.js` V108 uses remember-login and Firebase persistence
  - this step does not modify that static implementation

## New Branch Structure

`Login.tsx` now selects one of two branches:

```text
feature flag off
-> LegacyLoginBranch
-> existing src/context/AuthContext login()

feature flag on in development
-> NewAuthProvider
-> NewLoginBranch
-> signInWithEmail()
-> AuthProvider onAuthStateChanged loads the AppSession
```

The new branch performs only the Firebase sign-in request and waits for `AuthProvider` to resolve phase/session.

## Feature Flag

Environment variable:

```text
VITE_ENABLE_NEW_AUTH_LOGIN=false
```

Development query override:

```text
?newAuthLogin=on
?newAuthLogin=off
```

Policy:

```text
query override in development
-> env
-> false
```

Production policy:

```text
query override ignored
env ignored by resolver when not development
default legacy
```

## Login Persistence Policy

The new React login branch separates Firebase persistence from tab approval markers.

```text
remember off
-> Firebase browserSessionPersistence
-> sessionStorage tab approval marker
-> same-tab refresh can continue

remember on
-> Firebase browserLocalPersistence
-> localStorage remember marker
-> browser restart and new tab can continue
```

The static `app.js` implementation is not copied or changed.

## Session State Policy

| State | New branch behavior |
| --- | --- |
| submitting | disable submit button |
| Firebase auth failure | show safe user-facing message |
| initializing/loading_session | wait, no redirect |
| active | navigate to `/` |
| active + workspace null | navigate to `/`; not a login failure |
| pending | show approval waiting guidance, no signOut |
| rejected | show rejection guidance, no signOut |
| disabled | show disabled guidance, no signOut |
| error | show session error guidance, no signOut |
| system_owner | active login success; never stored as workspace role |

## Safety

The new branch does not:

- write to Firestore
- create or repair `users` documents
- create membership documents
- change role/status/workspace
- convert `system_owner` into a workspace role
- call Firebase `signOut`
- modify the static app login

## Development Preview

Mock preview:

```text
http://127.0.0.1:5173/login-bridge-preview.html?newAuthLogin=off
http://127.0.0.1:5173/login-bridge-preview.html?newAuthLogin=on
```

The preview uses mock session states by default and does not write Firebase data.

## Rollback

Immediate rollback for React login transition testing:

```text
?newAuthLogin=off
```

Global rollback:

```text
VITE_ENABLE_NEW_AUTH_LOGIN=false
```

Because the default is legacy, removing the query switch returns the old React login branch.
