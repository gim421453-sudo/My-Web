# P1.5-C2H Production Migration Inventory and Dry-Run Design

## Boundary

This is design only. It performs no production Firebase access, read, write,
deployment, Rules/index/client change, staging, commit, or push. A local
rehearsal does not authorize a production operation.

Canonical destinations remain, but are not written in C2H:

- `workspaces/{workspaceId}/studentRegistry/{studentId}`
- `workspaces/{workspaceId}/classRegistry/{classId}`
- `workspaces/{workspaceId}/subjectRegistry/{subjectId}`
- `workspaces/{workspaceId}/studentEnrollments/{studentId}`

## Future source allowlist

Every future run is bound to an approved workspace-ID list, exact path list,
page size, document-count limit, and total read budget. No root scan,
`collectionGroup`, recursive discovery, or content-derived path is allowed.
Sources are data evidence only, never authority.

| Candidate path | Purpose and status | Minimum fields | Exclude | Scope rule |
| --- | --- | --- | --- | --- |
| `workspaces/{workspaceId}/students` | Confirmed operational read candidate; `studentRosterService` currently reads it server-side | document ID, declared workspace ID if present, status only when needed | name, number, email, phone, notes, attachments | Paged per approved workspace; abort on cross-workspace or count deviation |
| Approved exact class path | Class-reference candidate; currently UNKNOWN | stable source ID or class reference, declared workspace ID | labels except redacted review context | No read until path/schema is separately approved |
| Approved exact subject path | Subject candidate; currently UNKNOWN | stable source ID/reference, declared workspace ID, active marker | labels except redacted review context | Paged per approved workspace |
| Approved exact relationship path | Enrollment candidate; currently UNKNOWN | student ID, class reference, complete subject-reference set, declared workspace ID | grades, attendance, free text | Paged per approved workspace; one atomic relationship |
| Canonical destination exact docs | Equivalence/conflict check only | structural ID/version/source/fingerprint fields | display and PII fields | Exact proposed-document lookups only |

## Denylist and PII contract

Never broadly collect secrets, passwords, MFA/security data, tokens, raw invite
codes, unrelated user PII, notification bodies, logs, free-form notes,
attachments/files, unrelated workspace content, or browser local state.
`users.role`, root `workspace_members`, `workspaceMembers`, legacy invitation
state, and `operationMode` are neither authority nor migration inputs.

Retain only workspace ID, stable structural IDs, status required for scope,
class/subject references, source kind, and deterministic source fingerprint.
Drop names, student numbers, emails, phones, and free text. Human review may
show entity type, fingerprint prefix, and masked display text only; raw display
data is not persisted in the artifact.

Canonical authority remains `systemOwners/{uid}` and
`workspaces/{workspaceId}/members/{uid}`. Legacy fields never revive authority.

## Classification and mapping

Use only existing outcomes: `SAFE_TO_CANONICALIZE`, `NEEDS_ADMIN_REVIEW`,
`MISSING_STUDENT_ID`, `MISSING_CLASS_ID`, `INVALID_SUBJECT_ID`,
`DUPLICATE_STUDENT`, `CONFLICTING_CLASS`, `CONFLICTING_SUBJECTS`,
`CROSS_WORKSPACE`, `MALFORMED`, `UNKNOWN_SOURCE`, and `ALREADY_CANONICAL`.

- Preserve an `operational_student` ID only after strict validation, uniqueness
  within the approved workspace, and workspace match. `people_fallback`,
  missing/duplicate/malformed/cross-workspace data is non-applyable. Never
  derive IDs from names, student numbers, indexes, or fuzzy matching.
- Classes require an exact reviewed mapping: source-value fingerprint, review
  status, approved canonical class ID, reviewer-evidence reference, and mapping
  version. Labels, normalization, fuzzy matching, and label hashes are never
  canonical authority.
- Strict operational subject IDs may be candidates. Label-only/legacy values
  require the exact reviewed mapping. Missing, duplicate, inactive/unknown, or
  conflicting subject mapping blocks application.
- Enrollment is one current record per student/workspace and is atomic over the
  student, reviewed class, and complete subject-ID set. One unsafe dependency
  blocks the entire enrollment; partial-subject migration is forbidden.

An existing destination is `ALREADY_CANONICAL` only when structurally exact;
any other existing destination is a non-overwritable conflict.

## Inventory and dry-run artifacts

`ProductionInventory` contains no raw production document:

```text
inventoryVersion, projectFingerprint, workspaceScope, approvedSourcePaths,
sourceDocumentCounts, sourceFingerprintSet, classifierVersion,
mappingArtifactVersion, generatedAt, safeCategoryCounts,
reviewRequiredCounts, blockedCounts, readCount, abortReason?
```

Its deterministic fingerprint binds project fingerprint, workspace scope,
approved source paths, sorted safe-source fingerprints, classifier version,
mapping version, canonical destination contract version, and proposed operation
coverage. A source/mapping/version/workspace/destination change makes the plan
stale.

Future production dry-run is read-only: increment `productionReadCount`; keep
production canonical/audit/idempotency/manifest writes at zero. Report totals,
safe/review-required students/classes/subjects/enrollments, blocked enrollments,
already-canonical/conflict/cross-workspace/malformed/unknown counts, proposed
operation count, `applyable`, and explicit block reasons. Store evidence outside
canonical production collections only after separately approved design.

## Fail-closed eligibility

One unresolved safety-critical record means `applyable=false`. Block on
cross-workspace data, duplicate student, conflicting class/subjects, malformed
authority ID, unknown authority inference, stale inventory/mapping, destination
conflict, or unavailable manifest prerequisite. There is no percentage
tolerance for authority conflicts.

Before a future apply, require verified backup evidence for exact workspace
scope, source/canonical pre-state snapshot method, project identity, timestamp,
counts, restore procedure, retention, and access control. Also require an
approved exact MigrationPlan, production-ready persistent manifest with
deterministic IDs/fingerprint and exact coverage, `createdByPlan` evidence,
source fingerprints, equivalent-plan Emulator rehearsal, fresh recovery and
rollback proof, and no ownership reconstruction.

## Workflow and approval gates

Workflow: approved inventory -> classifier -> review queue -> explicit reviewer
decision -> versioned mapping artifact -> regenerated dry-run -> final approval.
Review never writes canonical production data.

| Gate | Separate explicit approval |
| --- | --- |
| A | Read-only production inventory: project/database/workspace/path/read budget |
| B | Reviewed mappings and reviewer evidence |
| C | Read-only production dry-run and evidence destination |
| D | Backup creation and verification |
| E | Apply, exact plan/manifest, and rollback readiness |
| F | Post-apply verification or rollback decision |
| G | Legacy dependency retirement |

No gate is automatic. Future activation must separately sequence transition
Rules, canonical population, legacy dependency elimination, and strict Rules.
C2H changes none of them.

## Future execution safety and stop conditions

Use a read-only, least-privileged identity bound to verified project ID/fingerprint,
project number, Firestore database, workspace/path allowlists, and read budget.
Emit aggregates only: read/classified/review/planned/already-canonical/conflict/
rollback/failed counts plus manifest and operation-status distributions. Never
log payloads.

Abort immediately on wrong project, project number, database, workspace, path,
collection, schema, or count; cross-workspace data; classifier/mapping mismatch;
production-write detection; or attempted Rules/index mutation. Final execution
planning must separately budget Firestore reads, runtime/logging, backup/export
cost, and quotas.

## Result

Production Firebase access/read/write: `0/0/0`. No runtime code, Rules,
indexes, deployment, staging, commit, or push occurred.

**Verdict: `P1_5_C2H_PRODUCTION_INVENTORY_DRYRUN_DESIGN_PASS`**

Next design-only package: **P1.5-C2H1 Production Read-Only Inventory Execution
Plan / Approval Checklist**. It must not run a production read without new,
explicit approval.
