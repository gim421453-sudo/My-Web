# Batch 10C/10D Rules and Index Requirements

This is a read-only audit of the active client code and current local `firestore.rules`. No Rules or indexes were changed.

## Current Rule Position

The generic workspace subcollection rule grants reads to a system owner or eligible workspace member. It grants create/update to a system owner or workspace manager. Its teacher exception lists only `attendance`, `assignments`, `lessons`, `exams`, and `records`; it does not list the six new Batch 10C collections. Therefore system owner/workspace manager writes are **CODE-READY subject to live Rules validation**. Teacher-or-lower writes to the six collections are **RULES-BLOCKED** under the current text.

| Entity | Active canonical collection | Create/update function | Read function | Delete function | ID / duplicate rule | Server confirm | Current status | Rules requirement | Index candidate |
|---|---|---|---|---|---|---|---|---|---|
| Assessment plan | `workspaces/{canonicalWorkspaceId}/assessmentPlans` | `writeExamGradeRowV138("plans")` | `loadExamGradeDataV138` | Not implemented | time/hash id; no plan uniqueness rule | `set`, then document `get({source:"server"})` | CODE-READY for owner/manager | Restrict create/update/delete to owner/manager; validate scope and immutable creator fields | None for current full collection read; later scope + status ordering may need composite index |
| Assessment | `workspaces/{canonicalWorkspaceId}/assessments` | `writeExamGradeRowV138("assessments")` | same | Not implemented | time/hash id | same | CODE-READY for owner/manager | Validate plan relationship, score range, weight and status transition | None currently; later plan/status/date queries may need composite index |
| Assessment result | `workspaces/{canonicalWorkspaceId}/assessmentResults` | `writeExamGradeRowV138("results")` | same | Not implemented | deterministic `assessmentId + studentId` | same | CODE-READY for owner/manager | Validate student/assessment workspace scope; prevent unauthorized edits and direct final fields | None currently; later assessment/student lookup and ranking order may need composite index |
| Achievement policy | `workspaces/{canonicalWorkspaceId}/achievementPolicies` | `writeExamGradeRowV138("policies")` | same | Not implemented | time/hash id | same | CODE-READY for owner/manager | Owner/manager only; validate thresholds, one fallback, scope and version/lock transition | None currently; later active policy by scope/version may need composite index |
| Question | `workspaces/{canonicalWorkspaceId}/examQuestions` | `writeExamGradeRowV138("questions")` | same | Not implemented | deterministic `assessmentId + questionNumber`; duplicate UI block | same | CODE-READY for owner/manager | Owner/manager only; validate assessment scope, number and point range | None currently; later assessment + questionNumber ordering may need composite index |
| Student answer | `workspaces/{canonicalWorkspaceId}/studentAnswers` | `writeExamGradeRowV138("answers")` | same | Not implemented | deterministic `assessmentId + studentId + questionNumber` | same | CODE-READY for owner/manager | Define whether student self-write is allowed; otherwise owner/manager only; validate score and target student scope | None currently; later assessment/student/question query may need composite index |
| Portfolio | `workspaces/{canonicalWorkspaceId}/portfolios` | `saveLearningEditorWithServerConfirmV137` | existing workspace collection path | `deleteLearningRowWithServerConfirmV137` | editor id or `portfolios-{timestamp}` | same | CODE-READY for owner/manager; validate live role path | Keep metadata-only attachment fields; reject Drive tokens/URLs that imply upload state | Existing full collection reads need none; later subject/project filtering may need composite index |
| Learning record | `workspaces/{canonicalWorkspaceId}/records` | `saveLearningEditorWithServerConfirmV137` | existing workspace collection path | `deleteLearningRowWithServerConfirmV137` | editor id or `records-{timestamp}` | same | Existing path; manual P0 validation pending | Current teacher exception exists; schema validation remains a future Rules task | None for current read path |

## Required Future Rule Controls

1. Use explicit per-collection validators for create and update; do not rely only on role checks.
2. Keep `workspaceId`, immutable creation fields, assessment scope, and student ownership/reference fields protected on update.
3. Do not permit client writes of `finalAchievement`, `achievementOverride`, or final five-grade fields.
4. Lock policy/result state transitions explicitly. Policy preview must remain read-only; whole-cohort recalculation needs a separate privileged contract.
5. Keep student answer visibility scoped to the student, authorized teacher/manager, or system owner according to the approved policy.
6. Do not grant teacher write access to a new collection merely by adding it to a broad allowlist without a schema validator.

## Index Position

`loadExamGradeDataV138` performs six unfiltered, one-time collection reads. It uses no `where`, `orderBy`, collection-group query, or listener, so no composite index is required for the active code. The listed candidates are future-query requirements only and must not be deployed from this audit.

