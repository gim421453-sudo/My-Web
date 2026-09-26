# Owner Preview Learning Management Emergency Repair Batch 10B-2A Checklist

Use `http://127.0.0.1:5173/` with a disposable test workspace where a write or
delete check is required. Record PASS, FAIL, HOLD, or EXTERNAL without copying
UIDs, emails, workspace IDs, or document IDs.

| Area | Test | Expected result | Status | Console / Network / server-confirm notes |
|---|---|---|---|---|
| A. Materials save | Save a new material | Save message appears only after document confirmation and canonical list refresh. | HOLD | |
| A. Materials list | Return to the list | The saved row appears immediately when it matches filters. | HOLD | |
| A. Materials filter | Save while a restrictive filter is active | Saved row is not falsely missing; the filter guidance message appears. | HOLD | |
| A. Materials failure | Block write or disconnect network | No success message and no local-only confirmed row. | HOLD | |
| B. Lesson bulk delete | Open whole delete with zero rows | Shows the zero-target message. | HOLD | |
| B. Lesson bulk delete | Delete disposable lesson rows | Typed confirmation, batch commit, server remaining count `0`, then success message. | HOLD | |
| B. Lesson bulk delete | Inspect after refresh | Deleted rows do not reappear from pending local state. | HOLD | |
| C. Firestore listen | Switch tabs and return | Capture page/action before any error; listener count stays stable and no retry loop occurs. | HOLD | |
| C. Firestore listen | If a 400 appears | Record safe diagnostic counts and error code only; do not treat it as a successful empty list. | HOLD | |
| D. Teacher subjects | Open teacher editor | Subject options contain canonical subject names only; no numeric, JSON, ID, or fragment labels. | HOLD | |
| D. Teacher subjects | Add/edit a subject, then reopen teacher editor | Updated subject list is available; the first option remains blank. | HOLD | |
| E. Reference filters | Change subject/teacher filters | Canonical options are used, current valid value remains, and a deleted selection resets to All. | HOLD | |
| F. Regression | Core auth, notices, schedules, timetable | No console errors, permission-denied, listener growth, or unrelated UI regression. | HOLD | |

## Safe diagnostic checks

- `window.PMOwnerPreviewCriticalRepairDiagnostics?.snapshot?.()` may expose
  counters and safe error codes only.
- `window.PMWorkspaceDataService?.diagnostics?.()` must not expose raw
  workspace identifiers.
- For material saves, check `learningMaterialSaveServerConfirmedCount`,
  `learningMaterialListRefreshCount`, and `lastLearningMaterialListCount`.
- For lesson bulk delete, check `lessonRecordBulkDeleteTargetCount`,
  `lessonRecordBulkDeleteCommittedCount`, and
  `lessonRecordBulkDeleteConfirmedRemainingCount`.

## Boundaries

- Do not use production data for bulk delete verification.
- Do not change Firestore Rules, indexes, users, roles, memberships, or
  workspace records while testing.
- Firestore WebChannel 400 remains a HOLD unless it is reproducibly tied to a
  concrete invalid query or listener lifecycle fault.
