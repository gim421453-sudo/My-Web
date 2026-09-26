# Batch 10C/10D Manual Validation Checklist

Development URL: `http://127.0.0.1:3000/`.

All new paths remain **manual validation pending**. Do not use production data for destructive checks.

## Record First Save (P0)

| Item | Check |
|---|---|
| Feature | New learning record, activity-only first save |
| Preconditions | Signed-in authorized user, canonical workspace resolved, workspace sync ready |
| Steps | Open new record; enter only activity; click Save once |
| Expected | No memo focus; one write attempt; server confirmation; one visible record after reload |
| Code validation | `form.noValidate`, save `formNoValidate`, activity is the only required field |
| Write request | One `workspaces/{workspace}/records/{id}` set request |
| Server confirm | Same document is read with `source: server` after set |
| Refresh | Record remains after browser refresh |
| Console/Network | No native required-field focus error; no duplicate request |
| Double-click | Second click is blocked while save is in flight |
| Status | Manual validation pending |

## Exam and Grade Core

For each create operation, first confirm that the signed-in account is a system owner or workspace manager. If Firestore denies access, record `RULES-BLOCKED`; never treat the UI form submission as success.

| Feature | Procedure and expected result | Status |
|---|---|---|
| Assessment plan | Save a named plan with academic scope; server-confirmed document persists after refresh | Manual validation pending |
| Assessment / performance assessment | Select a plan; save a valid max score and weight; plan scope is copied into the assessment | Manual validation pending |
| Student result | Select assessment and student; valid score saves once; same assessment/student updates the same document | Manual validation pending |
| Total/rank/statistics | Use fixture-safe records; check percentage, weighted total, competition/dense ties, mean, median, population standard deviation, high/low | Code-tested; manual display pending |
| Achievement policy | A 51, B 41, C 31, D 21, E fallback: verify 51/A, 50/B, 41/B, 40/C, 31/C, 30/D, 21/D, 20/E, 0/E, missing/unassigned | Code-tested; manual preview pending |
| Achievement policy safety | Confirm no student-level achievement selector, `finalAchievement` editor, or override UI; preview does not write student results | Manual validation pending |
| Five-grade preview | Confirm participant count, ties, calculated grade preview and no final-grade write | Manual validation pending |
| Question | Save question; duplicate assessment/question number is blocked; document id is not shown | Manual validation pending |
| Student answer | Save answer; same assessment/student/question uses the same deterministic document key | Manual validation pending |
| CSV | Download `.csv`; Korean text, quotes, commas and line breaks render correctly; no Excel label | Manual validation pending |

## Portfolio Core

| Item | Check |
|---|---|
| First save | Enter only title and save once; document is server-confirmed and remains after refresh |
| Update | Edit the same portfolio; no second document appears |
| Metadata | Existing attachment metadata remains available without raw internal IDs |
| Drive boundary | No OAuth, upload, Drive success message, generated Drive URL, Viewer, or preview |
| Links | Invalid external links are rejected where the existing editor validates them |
| Status | Manual validation pending |

## Result Recording

For every run, record: user role, workspace availability, input title, request count, Firestore error code if any, server-confirm result, refresh result, Console/Network observations, and one of `PASS`, `FAIL`, `RULES-BLOCKED`, or `HOLD`.

