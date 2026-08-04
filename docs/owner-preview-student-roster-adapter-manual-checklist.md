# Owner Preview Student Roster Adapter Manual Checklist

## Scope

This checklist validates the read-only adapter only. Do not create students,
migrate `people`, change Rules, or confirm any student-related write.

Use the local Owner Preview with a `system_owner` account and the intended
workspace selected.

## School And Academy

- [ ] Select a workspace whose operation mode is `school`.
- [ ] Confirm the mode diagnostic reports `normalizedOperationMode: school`,
      a non-empty `operationModeSource`, and no workspace fingerprint mismatch.
- [ ] Confirm the first page is the `학교 운영 대시보드` with the school badge,
      workspace display name, and read-only roster status cards.
- [ ] Confirm the `학생관리` menu and page remain visible when the roster is empty.
- [ ] Confirm add, edit, delete, CSV import, and migration actions are disabled.
- [ ] Open Exam/Grade Management and confirm the roster source is shown.
- [ ] Confirm the visible student count and the displayed name, grade, class,
      and student number against the existing server documents.
- [ ] Repeat in `academy` mode and confirm the same canonical
      `workspaces/{workspaceId}/students` source is used.
- [ ] Confirm `personal` mode does not expose the workspace roster.
- [ ] Confirm `integrated_unconfigured` shows the mode setup guidance.

## Canonical And Fallback

- [ ] When active canonical students exist, confirm only canonical students are
      shown and no `people` rows are merged.
- [ ] When the canonical query succeeds with zero active students, confirm only
      explicitly student-marked `people` rows appear.
- [ ] Confirm friends, family, guardians, teachers, instructors, managers,
      inactive rows, deleted rows, and ambiguous contacts are absent.
- [ ] Confirm fallback mode shows the read-only warning.
- [ ] Confirm a fallback student cannot save an exam result.
- [ ] Confirm a fallback student cannot save a portfolio.
- [ ] Confirm the UI does not expose a full student document ID, auth UID,
      email, phone number, address, or guardian information.

## School Read Filters

- [ ] Confirm Exam/Grade Management uses the common roster selector.
- [ ] Confirm Student Management keeps year, grade, class, status, type, search,
      assigned-only, and all filters visible with zero students.
- [ ] Confirm Portfolio shows year, grade, class, subject, student, type,
      visibility, assigned-only, homeroom-only, and all read filters.
- [ ] Confirm Records shows year, grade, class, subject, student, record type,
      my-subject, homeroom-only, and all read filters.
- [ ] Confirm Assignments shows year, grade, class, subject, student, submission,
      deadline, my-subject, assigned-class, and all read filters.
- [ ] Confirm Portfolio and Records editors have no save-target student selector.
- [ ] Confirm zero students leaves the student filter visible and disabled.
- [ ] Confirm unavailable teacher assignment metadata disables the related scope
      and shows the assignment-not-connected guidance.
- [ ] Confirm teacher Portfolio and Records add actions are hidden or disabled.
- [ ] Confirm changing filters performs no additional Firestore read and uses the
      current roster/store cache only.
- [ ] Switch to another workspace and confirm the previous student selection is
      no longer selected.
- [ ] Confirm workspace A and workspace B do not share roster results.
- [ ] Return to a previously loaded workspace and confirm the workspace cache is
      reused without mixing rows.
- [ ] Wait 60 seconds without interaction and confirm no polling or listener is
      started.

## Network And Diagnostics

- [ ] Confirm the first roster load performs one server GET for
      `workspaces/{workspaceId}/students`.
- [ ] Re-render the same screen and confirm no repeated GET occurs.
- [ ] Confirm no `onSnapshot` listener is created by the roster adapter.
- [ ] Confirm no Firestore create, update, or delete occurs.
- [ ] Run `window.PMStudentRosterDiagnostics?.snapshot?.()`.
- [ ] Confirm `operationMode`, `workspaceResolved`, `source`, counts, cache
      counts, request counts, duration, and error code are present.
- [ ] Confirm the diagnostic snapshot contains no names, full student IDs,
      auth UIDs, emails, contacts, addresses, or document payloads.
- [ ] Confirm Console has no uncaught error.
- [ ] Open School Integration and confirm there is no `makeField` `tagName`
      error.
- [ ] With no explicit school API endpoint, confirm the screen reports
      `not_configured`, sends zero requests, and does not request `/api`.

## Docker Development

- [ ] Start Docker Desktop and run the commands in `docs/docker-development.md`.
- [ ] Confirm main returns HTTP 200 at `http://127.0.0.1:3000/`.
- [ ] Confirm admin returns HTTP 200 at `http://127.0.0.1:2801/`.
- [ ] Confirm admin `pm-env.js` reports `admin-standalone` without exposing
      service credentials.
- [ ] Confirm both images use `app.js?v=157`, student roster service `v=2`,
      system admin service `v=15`, and exam grade service `v=2`.
- [ ] Stop Compose and confirm ports 3000, 2801, and 5181 have zero listeners.

## Result

- [ ] Manual validation complete.
- [ ] Firebase write count remains zero.
- [ ] Owner Preview deployment remains blocked.
- [ ] Private beta deployment remains blocked.

## Deferred Contracts

- Department tabs remain future work and require an explicit `departmentId`.
- Subject and class assignments remain future work; only `super_manager` may
  manage them, while managers and teachers receive scoped read access.
- Timetable mutation requires an explicit `timetable_manager` capability for
  managers and teachers; this batch stores no capability.
- Schedule source integration (`neis`, school, department, grade, class,
  subject, personal) remains future work and adds no storage in this batch.
- Consultation and homeroom tabs remain future work and require explicit
  author/read authority and homeroom assignment metadata.
- Student self-service remains excluded until canonical `studentId`, optional
  `authUid`, and an explicit account link are available.
