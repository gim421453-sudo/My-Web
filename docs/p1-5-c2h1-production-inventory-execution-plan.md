# P1.5-C2H1 Production Read-Only Inventory Execution Plan

## Scope

This document is preflight design only. It grants no production-read approval and performs no production Firebase access, read, write, IAM/API mutation, Rules/index/client change, deployment, staging, commit, or push.

Current status is `LEVEL 0 - DESIGN ONLY`:

| Entity | Status | Candidate path |
| --- | --- | --- |
| Student | `KNOWN_CANDIDATE` | `workspaces/{workspaceId}/students` |
| Class | `UNKNOWN` | none |
| Subject | `UNKNOWN` | none |
| Relationship/enrollment | `UNKNOWN` | none |

`FULL_RELATIONSHIP_INVENTORY_READY = no`. Unknown paths must never be guessed.

## State and scope gates

```text
NOT_APPROVED -> SOURCE_SCOPE_INCOMPLETE | READY_FOR_READ_ONLY_PREFLIGHT
-> PREFLIGHT_VERIFIED -> APPROVED_FOR_SINGLE_READ_ONLY_RUN
-> INVENTORY_RUNNING -> INVENTORY_COMPLETED | INVENTORY_ABORTED | STALE | REVIEW_REQUIRED
```

No state advances automatically to apply/write. Changes to workspace, path, limit, classifier version, mapping version, or principal produce `STALE`.

`STUDENT_ONLY_INVENTORY` can eventually inspect only the approved student path. It cannot claim class, subject, enrollment, full-plan, or apply readiness. `FULL_RELATIONSHIP_MIGRATION_INVENTORY` remains blocked until every required source follows `UNKNOWN -> CANDIDATE -> LOCALLY_SUPPORTED -> APPROVED_FOR_READ_ONLY_INSPECTION -> VERIFIED -> APPROVED_SOURCE`. Each transition requires exact path, provenance, schema, source-only authority status, allowed/forbidden fields, and separate approval.

## Identity and exact allowlist

Before any future read, the one-run approval artifact must match project ID `my-management-app-8a933`, project number `607154464656`, production Firestore database identity, approved read-only principal fingerprint, workspace IDs, paths, and environment. Alternate alias or Emulator-variable confusion is an immediate pre-read abort with `readCount=0`.

Each approved workspace records its ID, purpose, inventory mode, source paths, expected approximate count when known, approval reference/timestamp, and optional expiry. All-workspaces scan, automatic workspace discovery, and `collectionGroup` discovery are prohibited.

Executable allowlist entries have this shape:

```text
workspaceId; collectionPathTemplate; allowedOperations=[get,list/query];
maxDocuments; allowedFields; forbiddenFields; schemaVersionExpectation; purpose
```

Only `workspaces/{workspaceId}/students` may become executable after a specific single-run approval. Class/subject/relationship UNKNOWN entries cannot be executable.

## Principal and zero-write contract

Use a specifically approved, least-privileged read-only identity: no Owner, Editor, Firebase Admin, unnecessary Datastore User, write-capable custom role, Service Account Token Creator, broad impersonation, or downloaded service-account JSON key. Use short-lived controlled credentials only where separately approved. Credentials never appear in the repository, `.env`, logs, artifacts, screenshots, or reports.

Preflight verifies absence of canonical-write capability by IAM/permission inspection, never by attempting a production write. Future tooling must be a separate read-only boundary and must not instantiate mutation services, migration apply/rollback adapters, manifest writers, audit writers, or idempotency writers. A detected write attempt aborts, invalidates results, retains only safe guard-violation evidence, and requires investigation.

## Limits, pagination, and fields

Recommended conservative design limits, adjustable only before approval:

| Limit | Value |
| --- | ---: |
| `MAX_WORKSPACES_PER_RUN` | 1 |
| `MAX_SOURCE_PATHS_PER_RUN` | 1 |
| `MAX_DOCUMENTS_PER_PATH` | 500 |
| `MAX_TOTAL_DOCUMENTS` | 500 |
| `MAX_TOTAL_FIRESTORE_READS` | 600 |
| `MAX_PAGES` | 10 |
| `MAX_EXECUTION_DURATION` | 5 minutes |
| page size | 50 |

Pagination uses stable document-ID order where supported, records page/count totals, rejects cursor repetition and overlap duplicates, and aborts at a bound. It never expands scope.

Current known student fields: required stable document ID and declared workspace ID only if present; optional review status only when necessary; forbidden names, student number, email, phone, notes, attachments, and raw document dumps. Unknown schema is pending, not inferred. Review output is an opaque workspace-scoped source ID, source fingerprint prefix, classification, mapping reason, and only an objectively necessary masked display hint.

## Approval artifact and precheck order

`InventoryExecutionApproval` is not a migration manifest:

```text
executionPlanVersion, approvedProjectId, approvedProjectNumber, approvedDatabase,
approvedWorkspaceIds, approvedSourcePaths, allowedInventoryMode, readLimits,
classifierVersion, mappingVersion, expectedSchemaConstraints,
approvedPrincipalFingerprint, approvalTimestamp, approvalReference
```

Future order: load approval; verify project ID; verify project number; verify database; verify read-only principal; verify workspace allowlist; verify source allowlist; verify selected mode has no required UNKNOWN source; verify limits and classifier/mapping versions; initialize zero-write guard; then permit first read. Any earlier failure keeps reads at zero.

## Abort behavior and evidence

Abort on unexpected collection/nesting/workspace/document type, schema mismatch, invalid ID, required authority inference, malformed relationship, cross-workspace reference, or count beyond approved limit. Count evidence records expected, observed, maximum, path, and workspace; it never auto-raises the bound.

Failure categories are `PROJECT_ID_MISMATCH`, `PROJECT_NUMBER_MISMATCH`, `DATABASE_MISMATCH`, `PRINCIPAL_NOT_READ_ONLY`, `WORKSPACE_NOT_APPROVED`, `SOURCE_NOT_APPROVED`, `SOURCE_UNKNOWN`, `READ_LIMIT_EXCEEDED`, `SCHEMA_MISMATCH`, `CROSS_WORKSPACE_REFERENCE`, `CLASSIFIER_VERSION_MISMATCH`, `MAPPING_VERSION_MISMATCH`, `UNEXPECTED_WRITE_CAPABILITY`, `WRITE_ATTEMPT_DETECTED`, `STALE_APPROVAL`, and `OTHER_FAIL_CLOSED`.

The future report is a secure local artifact, never an automatic Firestore write: `migration-inventory-{workspace-scope-fingerprint}-{timestamp}-v{n}.json` plus a redacted report. It has artifact hash, project/database/scope fingerprints, retention, and access restriction. It excludes raw documents, credentials, and secrets. Safe evidence includes principal fingerprint, scope, start/end, read/document/page/classification counts, abort reason, and zero-write assertion.

## Human approval checklist

```text
[ ] PROJECT and project number verified
[ ] DATABASE identity verified
[ ] PRINCIPAL is read-only; no write capability
[ ] WORKSPACES and purpose approved
[ ] SOURCE PATHS approved; no required UNKNOWN source
[ ] INVENTORY MODE explicitly selected
[ ] READ LIMITS approved
[ ] PII minimization approved
[ ] CLASSIFIER and MAPPING versions pinned
[ ] OUTPUT LOCATION approved
[ ] ZERO-WRITE GUARD and abort conditions reviewed

Action: [ ] APPROVE ONE PRODUCTION READ-ONLY INVENTORY RUN
        [ ] DO NOT APPROVE
```

C2H1 checks neither action box and cannot become standing authorization.

## Result

Production Firebase access/read/write, IAM/API mutations, Rules/index/client changes, deploy, staging, commit, and push are `0`.

**Verdict: `P1_5_C2H1_PRODUCTION_INVENTORY_EXECUTION_PLAN_PASS`**

Next design-only package: **P1.5-C2H2 Production Migration Source-Resolution Plan**. It begins with local code/contracts; any production schema inspection requires new explicit approval.
