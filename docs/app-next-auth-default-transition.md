# app-next Auth Default Transition

## Summary

`app-next.html` is now the default entry for the new read-only React authentication surface. It no longer requires `?appNext=on` or `?appNextLogin=on`.

## Entry

- Default URL: `http://127.0.0.1:5173/app-next.html`
- Provider stack: `AuthProvider -> LegacyAuthAdapterProvider -> AppNextErrorBoundary -> AppNext`
- Legacy `src/context/AuthContext.tsx`: not mounted
- Operational static app: unchanged (`index.html + app.js?v=111`)

## Feature Flag

The app-next auth surface is enabled by default.

- Env: `VITE_ENABLE_APP_NEXT_AUTH`
- Default: enabled
- Development rollback query: `?appNextAuth=off`
- Production query override: ignored

If disabled, app-next renders only:

```text
신규 인증 시험 화면이 비활성화되어 있습니다.
```

It does not redirect to the operational static app.

## Login Defaults

- Google login is the primary option.
- Email/password login remains available as an advanced option.
- Persistence default: local persistence, because the "remember login" option defaults to enabled.

## States

app-next handles these states without automatic sign-out:

- `loading`: waiting screen
- `signed_out`: login surface
- `active`: account/device/notification tabs
- `active + workspace null`: allowed as a valid account state
- `system_owner + workspace null`: allowed as a valid global role state
- `pending`: approval waiting message
- `rejected`: rejected account message
- `disabled`: disabled account message
- `quota_exceeded`: safe quota message
- `error`: safe error message

## Diagnostics

Development diagnostics include:

- entry
- provider
- auth mode
- feature source
- legacy AuthContext mounted
- listener count
- session load/read/write count
- bootstrap attempt count
- resource exhausted
- build marker

Sensitive identifiers, full emails, tokens, and full workspace IDs must not be displayed.

## Non-Goals

This transition does not modify:

- `index.html`
- `app.js`
- `services/authService.js`
- `services/workspaceDataService.js`
- Firestore Rules
- Firebase data
- roles, status, workspace, or membership data
