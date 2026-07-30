# School/Academy Student Grade Data Contract

## Current read adapter

The exam/grade UI uses only already-loaded workspace references. Its selection order is:

1. `students` records that are active and not deleted.
2. `people` records only when they explicitly carry student-shaped data: `studentName`, `studentNo`, `role: student`, or `isStudent: true`.

No users, accounts, attendance rows, program rosters, or synthetic fixtures are treated as a student source. The adapter does not issue a new listener or create data.

## Display and result linkage

- Internal identity: existing `id`, `uid`, or `studentUid`; it remains internal to the selector value.
- Display label: `studentName`/`name`/`displayName`, with optional grade and class/group.
- Optional context: `gradeLevel`/`grade`, `className`/`class`/`cohort`.
- Result linkage: `assessmentResults.studentId` matches the internal source identity.
- Scope: all records must already be loaded for the active workspace; no cross-workspace fallback is allowed.

## Mode behavior

- Personal: no selector; the currently signed-in person is used internally.
- School/academy: selector requires a source above. Required policy context is academic year, grade, term, and subject.
- Integrated/unconfigured: no mode write or invented student data. The user sees a safe configuration/empty-state message.

## Rules and future work

The current client adapter cannot prove Firestore read permission or canonical collection ownership. If a source is unavailable because of Rules, it remains an empty state. A later approved batch must establish a server/Roles contract before adding direct student collection reads, profile migration, or persistent mode changes.
