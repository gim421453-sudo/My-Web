# Exam/Grade and Portfolio Operational Closure Checklist

Manual browser address: `http://127.0.0.1:3000/`. Do not mark a write flow PASS until its server confirmation is observed. Use `RULES-BLOCKED` for permission denial and `HOLD` for intentionally deferred features.

| ID | Area | Expected result | Status |
| --- | --- | --- | --- |
| A1 | Cache and service | Network shows `app.js?v=151` and `services/examGradeService.js?v=2`, both 200. | Pending manual validation |
| B1 | Renderer split | `시험 일정` remains the legacy schedule screen; `시험·성적 관리` opens the advanced score shell. | Pending manual validation |
| C1 | Grade list | Default advanced tab is Grade list; all visible tabs open a non-empty panel or an explicit safe empty state. | Pending manual validation |
| D1 | Plans | Plan create/view/edit/delete is current-workspace scoped and server-confirmed. Weight totals warn below/above 100 without automatic adjustment. | Pending manual validation |
| E1 | Assessments | Exam/performance-task type, score, weight, and feedback fields are visible. Existing schedule records are not repurposed as assessments. | Pending manual validation |
| F1 | Score entry | Personal mode contains no student selector. Unconfigured school/academy mode has no invented student list. | Pending manual validation |
| G1 | Totals/ranks | Missing scores remain incomplete; competition/dense ranks and five-grade results are preview-only. | Pending manual validation |
| H1 | Achievement policy | Policy ranges preview impact; no finalAchievement or override input is visible. | Pending manual validation |
| I1 | Questions/answers | Composite duplicate handling, edit/delete controls, and identifier-safe display are checked. | Pending manual validation |
| J1 | Analysis/CSV | Summary uses service calculations. CSV has BOM, escaping, and formula-cell protection; it is not labelled XLSX. | Pending manual validation |
| K1 | Exam deletion | Confirm, existing provider reauthentication, remote delete, server absence check, then list refresh. Cancel/failure causes zero writes. | Pending manual validation |
| L1 | Portfolio base save | Title-only save succeeds once; attachment save sends canonical metadata only and is server-confirmed. | Pending manual validation |
| M1 | Portfolio attachment | A PDF displays name, friendly format, friendly size, and reselection status. No raw MIME, local path, File, Blob, base64, Drive ID, or object URL is persisted. | Pending manual validation |
| N1 | Portfolio URL | `example.com` is normalized; `1`, ordinary text, dangerous schemes, and local paths are blocked. | Pending manual validation |
| O1 | Portfolio delete | Checkbox, select-all, selected delete, and current-workspace-all delete are visible. Reauthentication cancellation leaves the list unchanged. | Pending manual validation |
| P1 | Mode contract | Personal mode hides all student selectors. School/academy selector is shown only with a canonical source; otherwise the connection remains HOLD. | Pending manual validation |
| Q1 | Record first save | Activity name only: one click, one server-confirmed write at most, no memo focus, no duplicate. | Pending manual validation |
| R1 | Regression | Notices, schedules, attendance, timetable V111/V120/V124, listener lifecycle, and app-next are unchanged. | Pending manual validation |

## Explicit Holds

- Final five-grade and bulk achievement recalculation writes
- XLSX export
- Google Drive OAuth, upload, viewer, and preview
- Advanced rubric/submission workflow
- School/academy student-management connection
- Ended-exam automatic tab movement

## Rules Note

No Rules or index changes are part of this batch. A denial from the current workspace rules is not a client success and must be recorded as `RULES-BLOCKED`.
