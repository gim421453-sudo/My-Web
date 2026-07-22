# Dangling currentWorkspaceId Recovery Plan

Date: 2026-07-23

## Current State

- System owner `users.currentWorkspaceId` fingerprint: `e46e7e6e`
- Referenced workspace parent document: missing
- Referenced workspace subcollection data: present
- app-next resolution: `workspace-document-missing`
- automatic signOut: none
- Data writes performed in this step: none

## Recovery Options

### Option A: Change `users.currentWorkspaceId` to an existing valid workspace

Recommended when:

- The user confirms `8f3199b1` is the workspace to keep.
- The 7 orphaned notices and orphaned timetable data are not required, or will be handled by a separate migration plan.

Document to update:

- `users/{systemOwnerUid}`

Field to update:

- `currentWorkspaceId`: from the raw id represented by `e46e7e6e` to the raw id represented by `8f3199b1`

Fields to leave untouched in this one-time recovery:

- `workspaceId`
- `workspace_id`
- `role`
- `currentRole`
- `workspaceRole`
- `globalRole`

Reason:

- Keep the recovery as narrow as possible.
- `currentWorkspaceId` is the canonical field for the new session model.
- Legacy fields should be handled by a separate migration plan.

Verification:

1. Reconfirm target workspace document exists.
2. Reconfirm target workspace has active nested member role `super_manager`.
3. Re-run app-next server user session recheck.
4. Confirm AppSession workspace fingerprint becomes `8f3199b1`.
5. Confirm `workspaceResolutionFailureKind=none`.
6. Run workspace notice server read.
7. Compare operational static app and app-next workspace fingerprints.

Rollback:

- Record the previous raw `currentWorkspaceId` securely before editing.
- If needed, set `users/{systemOwnerUid}.currentWorkspaceId` back to the previous raw value.
- Re-run app-next server user session recheck after rollback.

### Option B: Set `users.currentWorkspaceId` to null

Recommended when:

- No valid workspace can be selected now.
- The user wants a future UI flow to explicitly choose a workspace.

Current assessment:

- Not recommended.
- At least one valid owner workspace candidate exists.
- Null would keep workspace notices and other workspace-based app-next screens blocked.

### Option C: Restore the missing workspace parent document

Recommended when:

- The user confirms the 7 notices and the orphaned timetable/academic data under `e46e7e6e` are the intended operational data.
- The workspace was deleted by mistake.
- There is enough evidence to restore minimum fields.

Potential parent workspace fields:

- `name`: reuse an existing owner workspace name or a user-confirmed name
- `ownerUid`: current system owner UID
- `status`: `active`
- `createdAt`: value from backup if available, otherwise recovery timestamp
- `updatedAt`: recovery timestamp

Additional review:

- Whether to create `workspaces/{dangling}/members/{systemOwnerUid}`
- The nested workspace role should be `super_manager`
- Legacy `system_owner` role should not be used as a workspace role

Warnings:

- Do not execute this without explicit approval.
- Restoring parent and member documents is a real Firestore write and needs backup first.

## Recommendation

Choose between A and C after user confirmation:

- Choose A for the safest new-auth compatible state: set `currentWorkspaceId` to `8f3199b1`.
- Choose C if the 7 notices and orphaned timetable/academic data under `e46e7e6e` must remain the active operational workspace.

Based on the current data alone, A is the safest. But because `e46e7e6e` still has substantial subcollection data, C may be the better business recovery if that data is the one the user expects to keep.

## Required Manual Confirmation Before Writes

1. Confirm that the workspace represented by `8f3199b1` exists in Firebase Console.
2. Confirm `workspaces/{8f3199b1 candidate}/members/{systemOwnerUid}` exists and has role `super_manager`.
3. Confirm the parent workspace represented by `e46e7e6e` is missing.
4. Decide whether the 7 notices under `e46e7e6e` should be preserved.
5. Decide whether the timetable and periodTimes under `e46e7e6e` should be preserved.
6. Explicitly choose recovery option A, B, or C.

## Future Execution Steps

### If Option A is chosen

1. Back up `users/{systemOwnerUid}`.
2. Back up the target workspace document.
3. Record previous currentWorkspaceId fingerprint `e46e7e6e`.
4. Record target fingerprint `8f3199b1`.
5. Update only `users/{systemOwnerUid}.currentWorkspaceId`.
6. Re-run app-next server user session recheck.
7. Run workspace notice server read.
8. Compare operational static app and app-next fingerprints.
9. Roll back to the previous currentWorkspaceId if needed.

### If Option C is chosen

1. Back up subcollection summaries under `e46e7e6e`.
2. Confirm the workspace parent fields to restore.
3. Confirm whether a canonical member document should be restored.
4. Restore the parent workspace document.
5. Restore the nested member document if approved.
6. Re-run app-next server user session recheck.
7. Confirm `workspaceResolutionFailureKind=none`.
8. Confirm workspace notice server read returns 7.
9. Compare operational static app and app-next fingerprints.

## Do Not Commit

These generated audit result files are local evidence only:

- `output/auth-data-audit.json`
- `output/auth-data-audit.md`
- `output/workspace-integrity-audit.json`
- `output/workspace-integrity-audit.md`

