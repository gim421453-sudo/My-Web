# Login Parallel Test Checklist

Use `127.0.0.1` for all browser checks.

## Static App Safety

- `http://127.0.0.1:5173/`
- Existing static `index.html` + `app.js` login still loads.
- `app.js?v=111` remains unchanged by this step.
- No new `newAuthLogin` query handling appears in `index.html` or `app.js`.

## React Login Branch

If a React route later mounts `src/pages/Login.tsx`, verify:

- flag off renders the legacy login branch
- `?newAuthLogin=on` renders the new branch in development
- `?newAuthLogin=off` forces legacy even when env is true
- production ignores query override

## New Branch States

Use the mock preview first:

- `http://127.0.0.1:5173/login-bridge-preview.html?newAuthLogin=off`
- `http://127.0.0.1:5173/login-bridge-preview.html?newAuthLogin=on`

Check:

- signed out: form shown
- submitting: submit disabled
- loading: wait message, no redirect
- active: destination `/`
- active + workspace null: destination `/`, no login failure
- pending: approval waiting guidance, no signOut
- rejected: rejection guidance, no signOut
- disabled: disabled guidance, no signOut
- error: session error guidance, no signOut
- system_owner: active success without workspace role conversion

## Login Persistence

- remember off -> session persistence
- remember on -> local persistence
- remember off does not create local remember marker
- remember on stores only the remember marker and persistence mode marker
- tab approval marker is session-scoped

## Firebase Auth Failure Messages

Verify user-facing messages:

- wrong email/password -> “이메일 또는 비밀번호가 올바르지 않습니다.”
- user not found -> same safe message
- too many attempts -> retry later message
- network error -> network guidance
- disabled auth user -> administrator guidance

## Regression

- no Firestore write from the new branch
- no automatic `signOut(auth)` from the new branch
- no users document repair
- no membership creation
- no role/status/workspace mutation
- no static app login changes
- no timetable or workspace sync changes

## Commands

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
