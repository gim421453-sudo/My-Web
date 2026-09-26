# Owner Preview Exam/Grade and Portfolio UI Manual Checklist

Browser: `http://127.0.0.1:3000/` only. This checklist is a manual-validation record; do not mark an item PASS until it is observed in the browser and, for writes, confirmed by the server response.

## A. Entry and Service

| Check | Expected result | Status |
| --- | --- | --- |
| Open Exam/Grade Management | The default tab is `Grade list`; no empty or hidden tab is selected. | Pending manual validation |
| Browser Network/Sources | `services/examGradeService.js?v=2` and `app.js?v=151` are loaded. | Pending manual validation |
| Service failure | A safe unavailable message is shown; no blank page or false success. | Pending manual validation |
| Tab navigation | Grade list, plan, assessment, score entry, subject total, rank/grade, achievement policy, questions/answers, analysis, and CSV each open a visible panel. | Pending manual validation |

## B. Exam and Grade Operations

| Check | Expected result | Status |
| --- | --- | --- |
| Assessment plan | Create, view, edit, filter, and server-confirm a plan within the current workspace. | Pending manual validation |
| Assessment/performance task | Type, full score, weight, feedback, and metadata save only after server confirmation. | Pending manual validation |
| Score entry | Personal mode has no student selector. Unconfigured school/academy mode shows the connection hold instead of an invented student list. | Pending manual validation |
| Subject total | Missing assessments remain visibly incomplete; no automatic zero. | Pending manual validation |
| Rank and five-grade view | Competition/dense comparison and five-grade output are previews only; no final-grade write occurs. | Pending manual validation |
| Achievement policy | Score ranges are policy-managed, previewed before any future recalculation, and no per-student override field appears. | Pending manual validation |
| Questions and answers | Duplicate composite keys are blocked by the existing server-confirmed write path. | Pending manual validation |
| CSV | Download is CSV, not XLSX. Cells beginning `=`, `+`, `-`, or `@` are prefixed defensively. | Pending manual validation |

## C. Destructive Operations

| Check | Expected result | Status |
| --- | --- | --- |
| Single delete | Confirmation, existing Google/email reauthentication, current-workspace check, remote delete, server absence check, then local refresh. | Pending manual validation |
| Selected/all delete | Scope and count are visible. Parent rows with dependent rows are blocked; no automatic cascade occurs. | Pending manual validation |
| Reauthentication cancel/failure | No delete request and no success message. | Pending manual validation |
| Rules failure | A failure is visible; the local list remains unchanged and no success is claimed. | Pending manual validation |

## D. Portfolio

| Check | Expected result | Status |
| --- | --- | --- |
| Editor | Title is required. Links support multiple entries; the attachment control records only safe file metadata. | Pending manual validation |
| URL handling | `example.com` becomes `https://example.com`; dangerous schemes, local paths, and ordinary sentences are rejected. | Pending manual validation |
| Legacy edit | Existing `file_link`, `image_link`, `video_link`, and `result_link` populate the structured link editor without exposing IDs. | Pending manual validation |
| Attachments | File name, type, size, status, and removal are visible. No Drive upload, fake Drive link, base64, or local path is stored. | Pending manual validation |
| Delete | Single, selected, and current-workspace-all actions use the same reauthentication and server-confirm flow. | Pending manual validation |

## E. Regression and Safety

| Check | Expected result | Status |
| --- | --- | --- |
| Record first save | Enter only an activity name and save once: one write at most, no memo focus, no duplicate record. | Pending manual validation |
| Existing functions | Notices, schedules, attendance, and timetable V111/V120/V124 remain unchanged. | Pending manual validation |
| Diagnostics | No UID, email, workspace ID, token, raw JSON, or file path is exposed. | Pending manual validation |
| Holds | Final five-grade writes, full recalculation writes, XLSX, Drive/OAuth/upload/viewer, advanced rubric workflow, and school/academy student-management connection remain HOLD. | Pending manual validation |

## Rules and Data Notes

- No Firestore Rules, indexes, or data were changed in this batch.
- Current generic workspace rules permit owner/manager paths subject to their existing predicates. Teacher-or-lower writes to the new assessment collections remain `RULES-BLOCKED` until a separately approved Rules change.
- Any server-confirm failure, permission denial, unavailable result, or resource exhaustion must be recorded as FAIL or RULES-BLOCKED, never as PASS.
