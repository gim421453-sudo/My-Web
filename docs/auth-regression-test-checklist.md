# Auth Regression Test Checklist

Use `127.0.0.1` only for browser checks.

## Automated Checks

Run:

```powershell
node --check services/authService.js
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- auth module tests pass
- timetable stability checks pass
- build succeeds
- no Firestore Rules deployment
- no Firebase data mutation

## Dev Preview

Open:

```text
http://127.0.0.1:5173/auth-regression-preview.html
```

Confirm:

- fixture cards render
- no login prompt is required
- no Firebase Auth listener is started by the preview
- no Firestore write happens
- no automatic signOut happens
- no uid, full email, token, or full workspace id is displayed

## Real Browser Minimal Comparison

Operational app:

```text
http://127.0.0.1:5173/
```

New app-next:

```text
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on
```

Compare only:

- `globalRole`
- `isSystemOwner`
- workspace presence
- `currentWorkspaceRole`
- `emailVerified`
- `status`

Do not display or paste:

- full uid
- full email
- full workspace id
- token
- raw Firestore document

## Required Fixture Coverage

- A signed_out
- B active user + workspace
- C active user + workspace null
- D system_owner + workspace
- E system_owner + workspace null
- F pending
- G rejected
- H disabled
- I missing users document
- J missing membership
- K canonical membership
- L legacy-only membership
- M permission-denied
- N resource-exhausted
- O network error

## Pass Criteria

- no CRITICAL mismatch for expected stable scenarios
- no HIGH mismatch for workspace missing or membership missing scenarios
- no automatic signOut in either interpretation
- no Firestore write in comparison tools
- canonical membership wins when available
- legacy-only membership is warning-producing and non-mutating
- quota and permission errors do not trigger retry loops
- stale `localStorage` workspace id is ignored for authority but not deleted
- invalid workspace pointer keeps `status = active` and clears workspace only in memory

## Workspace Missing Regression

Confirm in `auth-regression-preview.html`:

```text
workspace missing
legacy.currentWorkspaceIdPresent = false
new.currentWorkspaceIdPresent = false
legacy.currentWorkspaceRole = null
new.currentWorkspaceRole = null
warnings include CURRENT_WORKSPACE_NOT_ACCESSIBLE
write = none
automatic signOut = none
```
