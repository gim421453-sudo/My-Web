# Auth Role, Status, and Workspace Comparison

## Role Rules

### Global Roles

- `system_owner`
- `user`

`system_owner` is a global role. It must not be written into `currentWorkspaceRole`.

### Workspace Roles

- `super_manager`
- `manager`
- `teacher`
- `normal`
- `viewer`
- `print_account`
- `null`

Workspace role is interpreted from workspace membership data. The canonical source is:

```text
workspaces/{workspaceId}/members/{uid}
```

Legacy root membership collections can be reported as compatibility input, but comparison tools do not migrate or repair them.

## Status Priority

Recommended canonical priority:

1. explicit disabled signal
2. canonical `status`
3. legacy `active` / `disabled` fallback
4. safe default

Existing new auth normalization currently records legacy status fields as warnings. Conflicts such as `status = active` and `disabled = true` are warning-producing states and must not silently log the user out.

## Workspace Selection Priority

Recommended canonical priority:

1. `users.currentWorkspaceId` only when the workspace exists and is readable
2. canonical nested membership for that workspace
3. allowed legacy membership as warning-producing compatibility input
4. local/memory workspace values only as diagnostic input, never authority

Rules for this stage:

- missing workspace does not create a workspace
- missing membership does not create membership
- active + workspace null is allowed
- system owner does not receive an arbitrary workspace
- deleted or inaccessible workspace is not silently selected
- stale `localStorage` or memory workspace ids are not cleared automatically
- stale workspace ids are treated as `CURRENT_WORKSPACE_NOT_ACCESSIBLE`
- status remains `active` and Firebase Auth remains signed in when workspace access is invalid

Canonical in-memory result for an invalid workspace pointer:

```text
currentWorkspaceId = null
currentWorkspaceRole = null
warning = CURRENT_WORKSPACE_NOT_ACCESSIBLE
```

The stored Firestore document is not changed in this comparison stage.

## Browser Comparison Result

The current real system-owner browser checks were already confirmed before this stage:

| Field | Operational static app | app-next |
| --- | --- | --- |
| `globalRole` | system owner recognized | `system_owner` |
| `isSystemOwner` | true | true |
| workspace presence | present or safely nullable | present or safely nullable |
| `currentWorkspaceRole` | membership-derived | membership-derived |
| `emailVerified` | read from Firebase Auth | read from Firebase Auth |
| `status` | active | active |
| Firestore write | bootstrap write count remained 0 | session write count remained 0 |

No full uid, email, or workspace id is recorded here.
