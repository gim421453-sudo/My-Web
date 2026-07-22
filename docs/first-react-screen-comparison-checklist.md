# First React Screen Comparison Checklist

Use only `127.0.0.1`.

## URLs

Operational static app:

```text
http://127.0.0.1:5173/
```

app-next:

```text
http://127.0.0.1:5173/app-next.html
```

## Screen

Selected comparison screen:

```text
Workspace notices read-only
```

## Compare

| Item | Operational static notices | app-next notices | Result |
|---|---|---|---|
| Item count |  |  |  |
| Notice title |  |  |  |
| Notice subject |  |  |  |
| Notice source |  |  |  |
| Notice date |  |  |  |
| Deadline date |  |  |  |
| Content summary |  |  |  |
| Sort order |  |  |  |
| Empty state |  |  |  |
| Workspace scope |  |  |  |
| Other workspace data hidden |  |  |  |
| System owner with workspace |  |  |  |
| System owner without workspace |  |  |  |
| Permission denied handling |  |  |  |
| Quota exceeded handling |  |  |  |
| Network error handling |  |  |  |
| Sensitive info masked |  |  |  |
| Firestore write count |  |  |  |

## Role Checks

| Role | Expected |
|---|---|
| signed out | no Firestore read |
| pending | account status 안내 only |
| rejected | account status 안내 only |
| disabled | account status 안내 only |
| active + workspace null | no workspace 안내 |
| system_owner + workspace null | no workspace 안내 |
| system_owner + workspace selected | read selected workspace notices |
| super_manager | read workspace notices |
| manager | read workspace notices |
| teacher | read workspace notices |
| normal | read workspace notices |
| viewer | read workspace notices |
| print_account | read workspace notices only if membership/rules allow |

## Firestore Safety

Confirm in source and browser diagnostics:

- no `setDoc`
- no `addDoc`
- no `updateDoc`
- no `deleteDoc`
- no `writeBatch`
- no operational `saveStore`
- no operational bootstrap
- no read-status write
- no last-viewed write

## Rollback Check

- app-next notice tab can be removed without affecting operational notices.
- `http://127.0.0.1:5173/` remains unchanged.
- `http://127.0.0.1:5173/app-next.html?appNextAuth=off` disables app-next in development.
