# app-next RequireAuth Notice Pilot

## Summary

`app-next.html` now has the first real app-next `RequireAuth` consumer. The pilot protects the read-only workspace notices screen only. The operational static app at `/` remains `index.html + app.js?v=120` and is not connected to this pilot.

## Entry And Route

- Entry: `app-next.html`
- React bootstrap: `src/app-next/main.tsx`
- Route dispatcher: `src/app-next/appNextRouteUtils.ts`
- Protected route: `#/notices`
- Browser check URL: `http://127.0.0.1:5173/app-next.html#/notices`

The dispatcher uses hash routes only and does not write `pm-current-page-v1` or any operational static-app navigation key.

## Provider Stack

`app-next` keeps the existing stack:

```text
AuthProvider
LegacyAuthAdapterProvider
AppNext
```

The `#/notices` route renders:

```text
RequireAuth(useExistingAuthProvider, previewMode)
AppNextWorkspaceNotices
```

`useExistingAuthProvider` prevents `RequireAuth` from mounting a second `AuthProvider` inside app-next.

## State Policy

- `loading` and `signed_out`: route resolves to `#/login` view.
- `pending`: route resolves to pending account status view.
- `rejected`: route resolves to rejected account status view.
- `disabled`: route resolves to disabled account status view.
- `error` and quota errors: route resolves to safe error view.
- `active`: dashboard/devices/notifications/notices can render.
- `active + currentWorkspaceId = null`: RequireAuth still allows authentication, but `AppNextWorkspaceNotices` does not query notices and shows the existing workspace-required guidance.
- `system_owner`: treated as a global role. It is not converted into a workspace role.

No state path performs automatic sign-out.

## Notice Read Scope

The notice screen reuses `AppNextWorkspaceNotices` and `loadAppNextWorkspaceNoticesReadonly`.

- Data source: `workspaces/{workspaceId}/notices`
- Read mode: one-time `getDocs` by default, dev server mode uses `getDocsFromServer`
- Listener count: `0`
- Write API imported: `false`
- Create/update/delete/read-receipt: not implemented

## Rollback

`VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH=false` or, in development only, `?newAuthRequireAuth=off` disables the protected notices pilot. In that state app-next displays a local rollback message and does not mount the legacy `src/context/AuthContext.tsx` branch.

## Diagnostics

Development-only windows:

- `window.PMRequireAuthDiagnostics?.snapshot?.()`
- `window.PMAppNextRouteDiagnostics?.snapshot?.()`
- `window.PMAppNextNoticeDiagnostics?.snapshot?.()`

Diagnostics mask workspace identity with fingerprints and do not expose UID, email, full workspaceId, document IDs, Firestore paths, or tokens.

## Operational Impact

Not changed:

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- Firestore Rules
- Firebase data
- timetable V111
- operational notice create/edit/delete flows

The operational static app still uses its own `app.js` authentication guard logic.
