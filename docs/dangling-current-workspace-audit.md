# Dangling currentWorkspaceId Audit

Date: 2026-07-23

## Scope

- No Firestore data writes
- No Firebase Auth changes
- No Firestore Rules changes or deployment
- No notice create/delete/read service changes
- No timetable V111 changes

## Firestore Instance

- Project: `my-management-app-8a933`
- Database: `(default)`
- Edition: `STANDARD`
- Type: `FIRESTORE_NATIVE`
- Read methods: Firebase CLI database list, existing read-only audit scripts, Google Firestore REST read

## Confirmed Problem

The system owner user's `users.currentWorkspaceId`, `users.workspaceId`, and `users.workspace_id` point to a workspace document that no longer exists.

| Item | Result |
| --- | --- |
| Dangling workspace fingerprint | `e46e7e6e` |
| Workspace document exists | false |
| Canonical nested member exists | false |
| Legacy membership exists | true |
| AppSession currentWorkspaceId | null |
| workspaceResolutionFailureKind | `workspace-document-missing` |
| automatic signOut | none |

## Existing Workspace Documents

| Workspace fingerprint | Display name | Doc exists | Owner matches | Canonical member | Canonical role | Legacy membership | Notices | Subcollection traces | Assessment |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| `8f3199b1` | Kim Minjun workspace | true | true | true | super_manager | snake 1 / camel 1 | 0 | 23 | Safest valid owner workspace candidate |
| `18646883` | Kim Minjun workspace | true | true | false | - | snake 1 / camel 0 | 3 | 5 | Legacy-only workspace candidate; nested member normalization needed |

## Dangling Workspace Subcollection Data

The parent workspace document does not exist, but Firestore subcollections remain.

| Dangling fingerprint | Parent doc exists | Remaining subcollections |
| --- | --- | --- |
| `e46e7e6e` | false | members 1, notices 7, academicSchedules 210, assignments 1, lessons 9, timetable 14, timetableSets 4, periodTimes 46, afterschoolPrograms 2, clubPrograms 1, specialLecturePrograms 1 |

Therefore the 7 notices seen by app-next server reads are real server documents under an orphaned workspace path, not a React display-only issue.

## Operational Static App Workspace Interpretation

The operational static app V116 canonical resolver reads `users/{uid}.currentWorkspaceId` as its primary source. That value currently fingerprints to `e46e7e6e`, the deleted workspace reference.

Code-level behavior:

- Canonical source: `users.currentWorkspaceId`
- Notice refresh/create uses the canonical resolver result
- The operational notice refresh path does not block simply because the parent workspace document is missing

So if the operational app reads or writes notices by `users.currentWorkspaceId`, it can keep targeting the orphaned subcollection under `e46e7e6e`. This is a code/data conclusion; browser runtime diagnostics should still be checked manually after any recovery.

## Deleted Workspace Assessment

The `e46e7e6e` target has these characteristics:

- `workspaces/{id}` document is missing
- `workspaces/{id}/members/{ownerUid}` canonical member is missing
- Legacy `workspace_members` and `workspaceMembers` still reference it with `system_owner`
- Many subcollections still exist
- The system owner users document still points to it through current and legacy workspace fields

Assessment: `likely-deleted-but-subcollections-remain`

## Candidate Analysis

### Candidate 1: `8f3199b1`

Pros:

- Workspace document exists
- Owner matches the current system owner
- Nested member exists with `super_manager`
- Most subcollection traces among valid workspace documents
- Best fit for the new AuthProvider/AppSession structure

Risks:

- Notices count is 0
- The 7 orphaned notices will not automatically move here

### Candidate 2: `18646883`

Pros:

- Workspace document exists
- Notices count is 3
- Legacy membership contains `super_manager`

Risks:

- No canonical nested member
- Should not be used as canonical currentWorkspaceId before membership normalization

### Candidate 3: `e46e7e6e`

Pros:

- Source of the 7 notices seen in app-next
- Contains timetable, academic schedule, lesson, and program subcollection data
- users document and legacy memberships strongly indicate this was once an operational workspace

Risks:

- Parent workspace document is missing
- Canonical member is missing
- Keeping this as currentWorkspaceId requires restoring the workspace document first

## Conclusion

The safest existing canonical currentWorkspaceId candidate is `8f3199b1`.

However, if the user needs to preserve and continue using the 7 notices and the timetable/academic data under `e46e7e6e`, changing currentWorkspaceId to `8f3199b1` would make that orphaned data disappear from workspace-based screens. In that case, the missing `e46e7e6e` parent workspace should be reviewed for restoration first.

Setting currentWorkspaceId to null is not recommended because there are valid workspace candidates and null would continue to block workspace-based app-next screens.

