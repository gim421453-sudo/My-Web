# RequireWorkspaceRole Parallel Test Checklist

Use only the 127.0.0.1 origin:

```text
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=off
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=on
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
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=off
```

Check:

- [ ] `mode = legacy`
- [ ] feature flag is false
- [ ] existing AuthContext path is used
- [ ] existing redirect behavior is preserved
- [ ] no Firestore write
- [ ] no automatic signOut

## New Mode

URL:

```text
http://127.0.0.1:5173/require-workspace-role-bridge-preview.html?newAuthRequireWorkspaceRole=on
```

Check:

- [ ] `mode = new`
- [ ] `phase` is displayed
- [ ] `status` is displayed
- [ ] `globalRole` is displayed
- [ ] `currentWorkspaceRole` is displayed
- [ ] workspace presence is boolean only
- [ ] allowed roles are displayed
- [ ] system owner bypass value is displayed
- [ ] no full UID/email/workspaceId is displayed
- [ ] `automaticSignOutOccurred = false`

## Role Cases

| Case | Expected |
| --- | --- |
| loading | loading UI, no redirect |
| signed out | `/login`, no redirect loop |
| active + workspace null | no workspace 안내, no login failure |
| workspace role null | no-role or unauthorized decision |
| super_manager-only route + super_manager | allow |
| super_manager-only route + manager | deny |
| manager/teacher route + manager | allow |
| manager/teacher route + teacher | allow |
| manager/teacher route + normal | deny |
| system_owner + bypass on | allow |
| system_owner + bypass off + role not allowed | deny |
| pending | pending 안내, no signOut |
| rejected | rejected 안내, no signOut |
| disabled | disabled 안내, no signOut |
| session error | safe error, no signOut |

## Guardrails

- [ ] `app.js` unchanged
- [ ] `services/workspaceDataService.js` unchanged
- [ ] `index.html` unchanged
- [ ] `firestore.rules` unchanged
- [ ] `firestore.rules.next` unchanged
- [ ] `Login.tsx` not converted
- [ ] existing AuthContext not removed
- [ ] no Firebase data changed
- [ ] no user role or membership changed

## Rollback

Use:

```text
?newAuthRequireWorkspaceRole=off
```

or keep:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE=false
```

The default is legacy mode.
