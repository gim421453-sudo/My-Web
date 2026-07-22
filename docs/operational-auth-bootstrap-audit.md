# Operational Auth Bootstrap Audit

## Scope

This audit covers the legacy operational auth path used by the static app:

- `index.html`
- `app.js?v=111`
- `services/authService.js`

No Firestore Rules, Firebase data, workspace membership schema, timetable logic, or `services/workspaceDataService.js` were changed.

## Finding

The repeated console entry `commit user workspace bootstrap` came from `services/authService.js`, not from the app-next read-only React entry.

The operational app can call the same post-login bootstrap path from more than one place:

- Email login calls `firebaseEnsureUserStructure()`
- Google login calls `firebaseEnsureUserStructure()`
- Existing Firebase `onAuthStateChanged` restore paths in `app.js` also call `firebaseEnsureUserStructure()`
- The same paths also call `firebaseRegisterDevice()`
- Login functions additionally call `firebaseCreateWelcomeNotification()`

Because `localhost`/`127.0.0.1`, static app, and `app-next.html` can share the same Firebase Auth browser session on the same origin, auth state restoration can wake the legacy operational path after app-next login.

## Previous Write Risk

Before this change, `firebaseEnsureUserStructure()` created a Firestore batch for active users on every run and always called:

```text
commit user workspace bootstrap
```

That batch wrote:

- `users/{uid}`
- `workspaces/{workspaceId}/members/{uid}`
- `workspace_members/{workspaceId_uid}` for admin-like users
- `workspaceMembers/{workspaceId_uid}` for admin-like users

It included changing timestamp fields such as `lastLoginAt` and `updatedAt`, so even a fully correct user/membership state still produced a write.

Pending/no-workspace users also wrote a login timestamp on every run.

`firebaseRegisterDevice()` wrote `user_devices/{deviceId}` every run.

`firebaseCreateWelcomeNotification()` used a deterministic document id but still wrote the same welcome notification every login.

## Added Diagnostics

Development/runtime diagnostics are exposed as:

```js
window.PMAuthBootstrapDiagnostics.snapshot()
window.PMAuthBootstrapDiagnostics.reset()
window.PMAuthBootstrapDiagnostics.recordAuthStateEvent()
```

Tracked counters:

- `authStateEventCount`
- `sessionLoadCount`
- `bootstrapCheckCount`
- `bootstrapCommitCount`
- `bootstrapSkippedNoDiffCount`
- `bootstrapBlockedInFlightCount`
- `userWriteCount`
- `membershipWriteCount`
- `deviceWriteCount`
- `welcomeNotificationWriteCount`
- `resourceExhaustedCount`
- `backoffActive`
- `lastBootstrapReason`
- `lastChangedFields`

The diagnostics avoid storing full uid, email, token, full document path, or full workspace id.

## Resource Exhausted Handling

When Firestore returns `resource-exhausted` or a quota-like error, the operational auth bootstrap records the event and enables a one-hour local backoff.

During backoff:

- bootstrap writes are skipped
- device writes are skipped
- welcome notification writes are skipped
- no automatic retry loop is started
- no automatic sign-out is triggered from the changed code

## Remaining Known Risk

The legacy static app still has multiple `onAuthStateChanged` blocks in `app.js`. This task does not refactor those blocks because the requested scope was bootstrap write stabilization, not login architecture replacement.

