# Batch 10C/10D Current Status

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Head at audit start: `2ef7ba7`
- Active static cache: `app.js?v=144`; calculation service: `services/examGradeService.js?v=1`
- Manual browser URL: `http://127.0.0.1:3000/`

## Active Paths

- Record P0: `openRecordEditorV137` -> `prepareRecordEditorValidationV137` -> `bindRecordEditorSubmitV137` -> `saveLearningEditorWithServerConfirmV137`.
- Batch 10C read: `loadExamGradeDataV138`, one server read per new collection, zero listener.
- Batch 10C write: `writeExamGradeRowV138`, canonical workspace resolution -> readiness/auth check -> `set` -> server document confirmation -> local store update.
- Batch 10D portfolio: existing editor -> `saveLearningEditorWithServerConfirmV137`, title required, metadata-only attachments.

## Calculation Audit

`PMExamGradeService` is Firebase-free. Existing automated fixtures cover valid/invalid score handling, weighted totals, excluded attendance, competition/dense ranks, statistics, threshold achievement policy, five-grade preview, and CSV escaping. It has no write, listener, Drive, final-achievement, or override API.

## Manual-Only Boundaries

- Assessment and portfolio Firestore writes have not been marked PASS.
- Current client reads are full collection reads and need live authorization validation for the signed-in role.
- Five-grade finalization, policy-wide recalculation, persistent access/read/change logs, xlsx generation, Drive integration, and ended-exam automatic navigation remain HOLD.

## Release Decision

Owner Preview: **deployment blocked** pending manual validation and Rules contract review.

Private beta: **deployment blocked** pending the same conditions.

