# RequireAuth Operational Test Checklist

Use only `127.0.0.1` URLs for browser verification.

## URLs

- Operational app: `http://127.0.0.1:5173/`
- RequireAuth preview, default new auth: `http://127.0.0.1:5173/require-auth-bridge-preview.html`
- RequireAuth preview, rollback: `http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=off`

## Automated Checks

Run:

```powershell
node --check app.js
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- Typecheck passes
- Auth module tests pass
- Timetable stability tests remain passing
- Build passes

## Browser Checks

- Signed-out account redirects to the existing login route.
- Loading states do not redirect.
- Active account renders protected content.
- Active account with `currentWorkspaceId=null` remains authenticated.
- Active `system_owner` with `currentWorkspaceId=null` remains authenticated.
- Pending account does not render protected children and is not signed out.
- Rejected account does not render protected children and is not signed out.
- Disabled account does not render protected children and is not signed out.
- Session error shows a safe fallback and does not automatically sign out.
- Login redirect loop does not occur when already on `/login`.
- Saved navigation is restored only after an active authenticated state.
- Logout still lands on the login screen.

## Diagnostics Expectations

Run:

```js
window.PMRequireAuthDiagnostics?.snapshot?.()
```

Expected fields:

- `providerMode` is `new` by default, or `legacy` with `?newAuthRequireAuth=off`
- `sessionPhase` reflects current AuthProvider phase
- `redirectCount` does not increase repeatedly for the same state
- `authListenerCount` stays stable for a single mounted RequireAuth tree
- no UID, email, full workspaceId, token, document ID, or Firestore path

## Regression Boundaries

Confirm there is no unexpected change to:

- timetable V111 loading/save/delete behavior
- workspaceDataService listener/write counts
- notice read/delete behavior
- Firestore Rules
- app-next standalone auth pages

