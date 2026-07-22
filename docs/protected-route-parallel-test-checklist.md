# ProtectedRoute Parallel Test Checklist

Use only the 127.0.0.1 origin:

```text
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=off
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=on
```

## Automated

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- typecheck passes
- auth module tests pass
- timetable stability tests pass
- build passes

## Legacy Mode

URL:

```text
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=off
```

Check:

- [ ] `mode = legacy`
- [ ] feature flag is false
- [ ] existing AuthContext path is used
- [ ] operational `index.html` is not affected
- [ ] no Firestore write
- [ ] no automatic signOut

## New Mode

URL:

```text
http://127.0.0.1:5173/protected-route-bridge-preview.html?newAuthProtectedRoute=on
```

Check:

- [ ] `mode = new`
- [ ] `phase` is displayed
- [ ] `status` is displayed
- [ ] `globalRole` is displayed
- [ ] `currentWorkspaceRole` is displayed
- [ ] workspace presence is boolean only
- [ ] no full UID/email/workspaceId is displayed
- [ ] `automaticSignOutOccurred = false`

## State Cases

| Case | Expected |
| --- | --- |
| loading | loading UI, no redirect |
| signed out | login required or `/login` destination, no loop |
| active + workspace | children rendered |
| active + workspace null | children rendered for plain auth |
| pending | pending message, no signOut |
| rejected | rejected message, no signOut |
| disabled | disabled message, no signOut |
| system_owner + no workspace role | children rendered |
| session error | safe error, no signOut |

## Guardrails

- [ ] `app.js` unchanged
- [ ] `services/workspaceDataService.js` unchanged
- [ ] `index.html` unchanged
- [ ] `firestore.rules` unchanged
- [ ] `firestore.rules.next` unchanged
- [ ] `Login.tsx` not converted
- [ ] `RequireWorkspaceRole` not converted
- [ ] no Firebase data changed
- [ ] no user role or membership changed

## Rollback

Use:

```text
?newAuthProtectedRoute=off
```

or keep:

```text
VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE=false
```

The default is legacy mode.
