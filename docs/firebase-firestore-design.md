# Firebase / Firestore design

This is the planned data model for the current site. It is intentionally scoped to this site only, but it can later be shared by Android, PC, or another website through the same Firebase project.

## Collections

### `users/{uid}`

- `uid`
- `email`
- `displayName`
- `emailVerified`
- `globalRole`: `system_owner` or `user`
- `createdAt`
- `lastLoginAt`
- `disabled`

### `workspaces/{workspaceId}`

- `workspaceId`
- `name`
- `ownerUid`
- `plan`
- `createdAt`
- `updatedAt`

### `workspace_members/{id}`

- `id`
- `workspaceId`
- `uid`
- `role`: `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`
- `status`
- `joinedAt`
- `invitedBy`

### `invitations/{invitationId}`

- `invitationId`
- `workspaceId`
- `email`
- `role`
- `tokenHash`
- `expiresAt`
- `usedAt`
- `invitedBy`
- `status`

### `user_devices/{deviceId}`

- `deviceId`
- `uid`
- `workspaceId`
- `deviceName`
- `deviceType`
- `browser`
- `os`
- `lastLoginAt`
- `lastActiveAt`
- `pushToken`
- `isCurrentDevice`
- `revokedAt`

### `notifications/{notificationId}`

- `notificationId`
- `workspaceId`
- `uid`
- `type`
- `title`
- `message`
- `read`
- `createdAt`
- `relatedId`

## Workspace-scoped app collections

Prepare all app collections with `workspaceId`:

- `students`
- `friends`
- `teachers`
- `classes`
- `assignments`
- `attendance`
- `exams`
- `notices`
- `files`
- `settings`
- `logs`

## Security rules draft

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function notDisabled() {
      return signedIn() && userDoc().data.disabled != true;
    }

    function isSystemOwner() {
      return notDisabled() && userDoc().data.globalRole == "system_owner";
    }

    function isWorkspaceMember(workspaceId) {
      return notDisabled() && exists(/databases/$(database)/documents/workspace_members/$(workspaceId + "_" + request.auth.uid));
    }

    function memberRole(workspaceId) {
      return get(/databases/$(database)/documents/workspace_members/$(workspaceId + "_" + request.auth.uid)).data.role;
    }

    function canManageWorkspace(workspaceId) {
      return isSystemOwner() || (isWorkspaceMember(workspaceId) && memberRole(workspaceId) in ["super_manager", "manager"]);
    }

    match /users/{uid} {
      allow read: if isSystemOwner() || (notDisabled() && request.auth.uid == uid);
      allow write: if isSystemOwner();
    }

    match /workspaces/{workspaceId} {
      allow read: if isSystemOwner() || isWorkspaceMember(workspaceId);
      allow write: if isSystemOwner() || (notDisabled() && request.auth.uid == request.resource.data.ownerUid);
    }

    match /workspace_members/{id} {
      allow read: if isSystemOwner() || isWorkspaceMember(resource.data.workspaceId);
      allow write: if canManageWorkspace(request.resource.data.workspaceId);
    }

    match /invitations/{invitationId} {
      allow read, write: if canManageWorkspace(request.resource.data.workspaceId);
    }

    match /user_devices/{deviceId} {
      allow read: if isSystemOwner() || (notDisabled() && resource.data.uid == request.auth.uid);
      allow write: if isSystemOwner() || (notDisabled() && request.resource.data.uid == request.auth.uid);
    }

    match /notifications/{notificationId} {
      allow read, update: if isSystemOwner() || (notDisabled() && resource.data.uid == request.auth.uid);
      allow create: if canManageWorkspace(request.resource.data.workspaceId);
    }

    match /{collection}/{docId} {
      allow read: if isSystemOwner() || isWorkspaceMember(resource.data.workspaceId);
      allow write: if canManageWorkspace(request.resource.data.workspaceId);
    }
  }
}
```

Token values should never be stored in plaintext. Store invitation token hashes only, with expiry and one-time use fields.
