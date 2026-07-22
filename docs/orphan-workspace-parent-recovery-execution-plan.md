# Orphan Workspace Parent Recovery Execution Plan

Date: 2026-07-23

## Status

This plan is for a future approved step. It was not executed.

## Goal

Restore only the missing parent workspace document and, if approved, the canonical nested membership document for the existing raw workspace id represented by fingerprint `e46e7e6e`.

Do not create a new workspace id. Do not move or copy child collections. Do not change `users.currentWorkspaceId`.

## Pre-execution Checklist

1. Confirm the user has selected recovery option C.
2. Confirm `workspaces/{target}` parent is still missing.
3. Confirm child collection data is still present under the target path.
4. Confirm `users/{uid}.currentWorkspaceId` still fingerprints to `e46e7e6e`.
5. Confirm `systemOwners/{uid}` still exists.
6. Confirm legacy membership still exists.
7. Confirm whether the legacy `system_owner` membership should be converted to nested `super_manager`.
8. Back up the `users/{uid}` document.
9. Back up the legacy membership documents.
10. Record child collection counts.
11. Back up a valid existing workspace document only as a field-shape reference.

## Proposed Parent Document

The parent document should use the existing raw workspace id represented by `e46e7e6e`.

Candidate fields:

| Field | Policy |
| --- | --- |
| workspaceId | required; source `users.currentWorkspaceId` |
| name | optional; use only if confirmed from existing owner workspace or user confirmation |
| displayName | optional; use only if confirmed |
| ownerUid | required; current system owner UID |
| status | required; proposed `active` |
| createdAt | use historical evidence if available; otherwise omit or explicitly confirm recovery timestamp policy |
| updatedAt | server timestamp at execution |
| createdBy | optional; current system owner UID |
| type | optional; only if existing field-shape reference has evidence |
| version | optional; only if existing field-shape reference has evidence |

Do not copy every field from another workspace document blindly.

## Proposed Nested Membership

Path:

```text
workspaces/{targetWorkspaceId}/members/{uid}
```

Candidate fields:

| Field | Policy |
| --- | --- |
| uid | required; current system owner UID |
| workspaceId | required; target workspace id |
| role | must be explicitly approved because legacy role is `system_owner` |
| status | source legacy status if usable |
| joinedAt | source legacy joinedAt or createdAt if available |
| createdAt | source legacy createdAt if available |
| updatedAt | server timestamp at execution |
| displayName | optional from users document |
| email | optional from users document |

Important: `system_owner` is a global role, not a workspace role. A future execution must not convert it to `super_manager` without explicit approval.

## Expected Write Count

Minimum:

```text
1 parent workspace create
```

Likely:

```text
1 parent workspace create
1 nested membership create
```

Expected total if both are approved:

```text
2 writes
```

No writes should touch:

- users document
- legacy membership documents
- child collections
- Firestore Rules

## Execution Sequence

1. Create a server backup of `users/{uid}`.
2. Create a server backup of legacy membership documents.
3. Record child collection counts.
4. Create the parent workspace document.
5. Confirm parent existence with a server get.
6. Create the nested membership document if approved.
7. Confirm membership existence with a server get.
8. Confirm `users.currentWorkspaceId` did not change.
9. Reload AuthProvider session.
10. Confirm `workspacePresent=true`.
11. Confirm `workspaceResolutionFailureKind=none`.
12. Run workspace notices server read.
13. Confirm notices count remains 7.
14. Confirm timetable and academic collection counts are still present.

## WebChannel / Transport Policy

- A write request is not success by itself.
- Success requires a follow-up server get.
- If WebChannel 400 or another transport error appears, do not mark success.
- Do not proceed to the next write until the previous server confirmation succeeds.
- No automatic retry loop.
- Stop immediately on `resource-exhausted`.

## Post-execution Browser Checks

Use:

```text
http://127.0.0.1:5173/app-next.html
```

Check:

- AppSession workspace fingerprint equals `e46e7e6e`.
- `serverCurrentWorkspaceDocumentExists=true`.
- `workspaceResolutionFailureKind=none`.
- Workspace notices server read returns 7.
- Operational static app and app-next fingerprints match.

