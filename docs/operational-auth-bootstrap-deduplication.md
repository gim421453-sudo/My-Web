# Operational Auth Bootstrap Deduplication

## Goal

Prevent repeated Firestore writes when the operational static app and app-next share the same Firebase Auth browser session.

## Implemented Policy

### 1. In-flight deduplication

`firebaseEnsureUserStructure()` now keeps one in-flight bootstrap promise per uid.

If the same uid enters bootstrap again while the first call is still running, the second caller awaits the existing promise instead of starting a second Firestore read/write sequence.

### 2. Diff before write

Active user bootstrap now compares existing Firestore data with the expected minimal fields before writing.

If all checked fields already match:

```text
bootstrapSkippedNoDiffCount += 1
lastBootstrapReason = active-user-structure-no-diff
```

No `batch.commit()` is executed.

Pending/no-workspace users follow the same no-diff policy and no longer write login timestamps on every restore.

### 3. Minimal changed fields

When a write is required, only changed fields are merged. Timestamp fields are added only when there is another structural change.

The bootstrap no longer treats `lastLoginAt` alone as a reason to write.

### 4. Membership writes

The nested membership document remains the authority path:

```text
workspaces/{workspaceId}/members/{uid}
```

Legacy root membership documents are only repaired for system-owner/admin-like accounts and only when the compared fields differ.

### 5. Device write guard

`firebaseRegisterDevice()` now:

- uses a stable device id from `PMDeviceService.currentDeviceId()` or `pm:device:id`
- reads `user_devices/{deviceId}` before writing
- skips the write when the stored fields already match
- does not create a new timestamp-based device id on every call

### 6. Welcome notification guard

`firebaseCreateWelcomeNotification()` now reads `notifications/welcome_{uid}` first.

If it already exists, it does not write again.

## Expected Stable Existing User Behavior

For an existing active user whose `users` document, nested membership, device document, and welcome notification already match:

```text
bootstrapCommitCount: unchanged
bootstrapSkippedNoDiffCount: increases
userWriteCount: unchanged
membershipWriteCount: unchanged
deviceWriteCount: unchanged
welcomeNotificationWriteCount: unchanged
```

## What Was Not Changed

- Firestore Rules
- Firebase data
- workspace membership schema
- `app.js` auth listener structure
- `services/workspaceDataService.js`
- timetable V111 code
- app-next read-only policy

