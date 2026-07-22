# Notifications New Auth Integration

## Summary

`Notifications` was implemented as a read-only React page that can opt into the new `AuthProvider` without touching the existing production static app.

## Entry

- Page: `notifications.html`
- New auth URL: `http://127.0.0.1:5173/notifications.html?newAuthNotifications=on`
- Legacy fallback URL: `http://127.0.0.1:5173/notifications.html?newAuthNotifications=off`

## Feature Flag

Priority:

1. Query string: `?newAuthNotifications=on` or `?newAuthNotifications=off`
2. Environment variable: `VITE_ENABLE_NEW_AUTH_NOTIFICATIONS=true|false`
3. Default: `false`

Production always resolves to `false`.

## AuthProvider Scope

The page uses:

- `phase`
- `session.uid`
- `session.status`
- `session.globalRole`
- `session.isSystemOwner`
- `session.currentWorkspaceId`
- `session.currentWorkspaceRole`
- `reloadSession`

It does not use legacy role values, `window.currentUser`, app.js session state, or storage-backed role state.

## Data Source

Primary:

- Firestore `notifications`
- Query filter: `uid == session.uid`
- Query filter: `workspaceId == session.currentWorkspaceId`

Fallback:

- `localStorage.getItem("pm:notifications:v1")`
- Used only when Firestore returns no results or fails
- Filtered by the same `uid` and `workspaceId`
- Not merged with Firestore results

## Read-Only Guarantee

The implementation does not call Firestore write APIs, Auth user mutation APIs, notification read-marking, notification deletion, or browser storage writes.

Displayed fields:

- Title
- Message summary
- Type
- Created time
- Read/unread state
- Related service label

Hidden fields:

- Full UID
- Full workspaceId
- Full email
- Phone
- Invite code
- Token
- Push token
- Error stack
- Internal document path
- API key
- Raw relatedId

## State Handling

- `signed_out`: shows login-required message only.
- `loading_session` and `initializing`: show loading state only.
- `account_action_required`: shows account status message and does not query notifications.
- `authenticated + active + workspaceId`: queries only current user/current workspace notifications.
- `authenticated + active + currentWorkspaceId == null`: shows workspace guidance and does not query.
- Permission denied: shows a user-safe message and keeps login state.

## Permission Guard

Minimum client guard:

- `workspace.read`

This guard is only a UI safety gate. Firestore Rules remain the real enforcement layer.

## Rollback

Use:

`http://127.0.0.1:5173/notifications.html?newAuthNotifications=off`

No production app files were changed, so rollback is immediate.

## Operational Impact

Not modified:

- `index.html`
- `app.js`
- root `services/*`
- `firestore.rules`
- `firestore.rules.next`
- Firebase data
- Auth users
- workspace or notification data

