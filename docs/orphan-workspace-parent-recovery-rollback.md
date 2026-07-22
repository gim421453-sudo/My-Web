# Orphan Workspace Parent Recovery Rollback

Date: 2026-07-23

## Scope

This rollback plan applies only if a future approved recovery creates:

- the missing parent workspace document
- the nested membership document

No child collections should be deleted or moved during rollback.

## Rollback Principle

Because the future recovery must not change `users.currentWorkspaceId`, legacy membership documents, or child collections, rollback should remove only the newly restored documents.

## Rollback Actions

If parent restore causes a problem:

1. Delete only the newly restored `workspaces/{target}` parent document.
2. Delete only the newly restored `workspaces/{target}/members/{uid}` nested membership document, if it was created.
3. Do not delete any child collections.
4. Do not modify `users/{uid}`.
5. Do not modify `workspace_members`.
6. Do not modify `workspaceMembers`.
7. Do not modify notices, timetable, timetableSets, periodTimes, academicSchedules, or lesson data.

## Verification After Rollback

1. Server get confirms parent document missing again.
2. Server get confirms nested membership missing again if it was created.
3. Child collection counts remain unchanged.
4. `users.currentWorkspaceId` still fingerprints to `e46e7e6e`.
5. app-next returns `workspace-document-missing` again.
6. No automatic signOut occurs.

## Non-rollback Items

Never remove:

- `workspaces/{target}/notices`
- `workspaces/{target}/academicSchedules`
- `workspaces/{target}/timetable`
- `workspaces/{target}/timetableSets`
- `workspaces/{target}/periodTimes`
- `workspaces/{target}/lessons`
- other existing child collections

## Required Evidence

Before rollback, capture:

- parent restore timestamp
- nested membership restore timestamp
- server confirmation result
- child collection counts
- app-next session diagnostics

