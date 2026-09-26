# P1.5-C2H2E0F Canonical Bootstrap Schema / Provenance Narrow Fix

## Verdict

`P1_5_C2H2E0F_SCHEMA_PROVENANCE_NARROW_FIX_PASS`

This local-only change establishes a future bootstrap provenance contract. It
does not inspect production, create a canonical document, or enable a
production mutation path.

## Baseline and Scope

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE = 161
STAGING_BEFORE = 0

PROVENANCE_SUPPORT_BEFORE_FIX = PARTIAL
INPUT_SOURCE_FINGERPRINT_BEFORE = PARTIAL
BOOTSTRAP_BATCH_ID_BEFORE = PARTIAL
MANIFEST_REFERENCE_BEFORE = EXISTS
```

The prior source-discovery decision remains unchanged:

```text
SOURCE_DISCOVERY_POLICY = STOPPED_BY_POLICY
TRUSTWORTHY_CLASS_SOURCE_STATUS = NOT_FOUND_WITH_BOUNDED_DISCOVERY
TRUSTWORTHY_RELATIONSHIP_SOURCE_STATUS = NOT_FOUND_WITH_BOUNDED_DISCOVERY
ADDITIONAL_SOURCE_DISCOVERY_PRODUCTION_ACCESS = NOT_REQUIRED
```

The historical Workspace-2 `subjects` path remains an
`HISTORICAL_SUBJECT_SOURCE_CANDIDATE` with `AUTHORITY = NOT_VERIFIED`. This
package neither reads it nor authorizes Subject migration.

## Local Contract Inventory

| Entity | Current schema file | Required fields | Optional fields | Source/audit/version behavior |
| --- | --- | --- | --- | --- |
| StudentRegistry | `functions/src/registries/studentRegistryContract.ts` | Base registry fields including `schemaVersion`, `version`, `workspaceId`, `studentId`, `status`, `source`, timestamps, `createdBy` | `displayName`, `studentNumber` | `version` CAS in `registryMutationService`; completed idempotency and success audit |
| SubjectRegistry | `functions/src/registries/subjectRegistryContract.ts` | Same base registry fields and `subjectId`, `displayName` | `subjectCode` | Same registry safety path |
| ClassRegistry | `functions/src/registries/classRegistryContract.ts` | Same base registry fields and `classId`, `displayName` | `schoolYear`, `grade` | Same registry safety path |
| StudentEnrollment | `functions/src/relationships/studentEnrollmentContract.ts` | `schemaVersion`, `version`, `workspaceId`, `studentId`, `classId`, unique `subjectIds`, `status`, `source`, timestamps, `createdBy` | None | Existing create/update CAS, deterministic Student ID location, completed idempotency, success audit |
| TeacherAssignment | `functions/src/teacherAssignments/teacherAssignmentContract.ts` | Separate teacher scope contract | Target-specific optional validity range | Not Student academic enrollment authority |

`functions/src/migrations/persistentMigrationManifestContract.ts` already
defines a persistent migration root with `planId`, `planFingerprint`,
`mappingFingerprint`, `sourceSetFingerprint`, and operation-level
`sourceFingerprint`. The persistent root uses `planId` as its stable logical
manifest identity. The existing `sourceSetFingerprint` identifies the
classifier's selected source-fingerprint set; it is not a versioned exact
authoritative-input fingerprint, so it cannot satisfy the new input contract.

Existing transaction and recovery controls remain intact:

- `registryMutationService.ts` and `enrollmentMutationService.ts` enforce
  version/CAS and completed idempotency.
- `enrollmentReferentialValidator.ts` rejects missing, inactive, and malformed
  Student/Class/Subject references.
- `migrationManifestRecovery.ts` and the persistent manifest repository bind
  recovery to the plan identity and manifest-operation evidence.
- `migrationDryRunOrchestrator.ts` remains `DRY_RUN_ONLY`.

## Exact Gap and Selected Contract

The new pure contract is in
`functions/src/migrations/canonicalBootstrapProvenance.ts`.

```text
BOOTSTRAP_PROVENANCE_SCHEMA_NAME = CanonicalBootstrapProvenanceV1
BOOTSTRAP_PROVENANCE_SCHEMA_VERSION = 1
SCHEMA_VERSION_CHANGE = NONE

SELECTED_SOURCE_FINGERPRINT_CONTRACT = sha256-c14n-v1:<64 lowercase hex>
SELECTED_BATCH_ID_CONTRACT = existing persistent planId (64 lowercase hex)
SELECTED_MANIFEST_REFERENCE_CONTRACT = existing persistent planId (64 lowercase hex)
```

The source fingerprint is an independent versioned identity for the exact
future authoritative input. It must be supplied by the future input/dry-run
contract; this package does not implement CSV, Excel, or official-source
canonicalization. It must not identify a resulting document, environment,
absolute path, credential, or raw source content.

Under the existing manifest model, one immutable `planId` identifies both the
approved manifest and its single logical bootstrap batch. The validator requires
`bootstrapBatchId === manifestReference`, preventing a batch from being bound
to a different approved plan. Future E1 code must bind that logical reference
to a prepared manifest before any persistence adapter runs.

The required envelope is deliberately small:

```text
schemaVersion
authoritativeInputFingerprint
bootstrapBatchId
manifestReference
```

It does not duplicate existing `source`, timestamps, creator, CAS version,
idempotency, or audit fields, and it does not copy a full manifest into each
record.

## Validation and Fail-Closed Behavior

`validateCanonicalBootstrapProvenance` is pure and has no network or Firestore
dependency. It rejects malformed input with structured local issues:

- `MISSING_SOURCE_FINGERPRINT` / `INVALID_SOURCE_FINGERPRINT`
- `MISSING_BATCH_ID` / `INVALID_BATCH_ID`
- `MISSING_MANIFEST_REFERENCE` / `INVALID_MANIFEST_REFERENCE`
- `MANIFEST_BATCH_MISMATCH`
- `PROVENANCE_VERSION_UNSUPPORTED`

The accepted fingerprint has the explicit canonicalization label
`sha256-c14n-v1:` and a lowercase SHA-256 digest. Batch and manifest values
must be 64-character lowercase hash identifiers, so local or temporary paths
cannot be treated as canonical identifiers.

`canonicalBootstrapReplayIdentity` deterministically binds the validated
provenance to workspace, entity type, and entity ID. The same manifest, batch,
input fingerprint, and target produce one replay identity; a changed input,
manifest/batch, or target does not silently reuse it. This complements rather
than replaces the existing operation idempotency repository.

```text
NEW_BOOTSTRAP_WRITE_PROVENANCE_REQUIRED = yes
OLD_DOCUMENT_READ_COMPATIBILITY = PASS
EXISTING_DOCUMENT_BACKFILL_REQUIRED = no
PRODUCTION_BACKFILL_APPROVAL = NOT_GRANTED
```

Legacy registry and Enrollment parsers remain unchanged. Old documents without
this future-only envelope continue to parse under their current schema. A
future bootstrap write must validate this envelope before it reaches a
persistence adapter; existing unrelated registry, enrollment, migration, and
assignment paths are not reinterpreted by E0F.

## Entity and Audit Boundary

The generic contract is safe for future ClassRegistry, StudentEnrollment,
StudentRegistry, and SubjectRegistry bootstrap because it carries only shared
input/manifest identity. It does not change any entity's stored schema.

Future bootstrap audit records may refer to the three envelope identifiers,
but must not log raw rows, names, emails, phone numbers, spreadsheet content,
tokens, credentials, authorization headers, or local paths. The current
`securityAuditLogs` and `trustedOperationIdempotency` mechanics remain the
only existing audit/replay infrastructure; E0F does not add a production audit
write.

## Compatibility and Readiness

```text
PROVENANCE_SUPPORT_AFTER_FIX = SUFFICIENT
BOOTSTRAP_VERSION_GUARD_AVAILABLE = yes
BOOTSTRAP_IDEMPOTENCY_SUPPORT = yes
BOOTSTRAP_REPLAY_PROTECTION = yes
BOOTSTRAP_DRY_RUN_MANIFEST_PROVENANCE_READY = yes

CLASS_BOOTSTRAP_READINESS = NOT_READY_FOR_WRITE
RELATIONSHIP_BOOTSTRAP_READINESS = NOT_READY_FOR_WRITE
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_ENROLLMENT_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_REGISTRY_WRITE_APPROVAL = NOT_GRANTED
PRODUCTION_MIGRATION_EXECUTION_APPROVAL = NOT_GRANTED
```

`SUFFICIENT` means the local contract can now represent and validate the
required provenance chain. It does not ratify any actual authoritative input,
approve a migration, create Class or Enrollment data, or authorize a write.

## Focused Validation

`functions/test/canonicalBootstrapProvenance.test.ts` covers:

- complete valid envelope and approved-manifest builder;
- missing or malformed source fingerprint, batch, manifest, and version;
- synthetic local-path rejection without retaining a personal path;
- legacy ClassRegistry parser compatibility;
- stable same-batch replay identity and changed input/batch distinction;
- provenance validation before a local persistence callback can run.

Focused regression execution also covers the migration classifier, dry-run
orchestrator, existing registry/enrollment mutations, and operation executor.
No code path adds a listener, production client, or Firestore request.

Validation completed locally:

```text
npm.cmd --prefix functions run build = PASS
npm.cmd --prefix functions test = PASS (550 passed, 0 failed)
git diff --check = PASS (pre-existing CRLF warnings only)
```

## Changed Call Sites

| Path | Classification | E0F effect |
| --- | --- | --- |
| `canonicalBootstrapProvenance.ts` | New pure contract | Future-only validation/builder/replay identity |
| `canonicalBootstrapProvenance.test.ts` | Test | Focused local contract coverage |
| `functions/package.json` | Test runner | Includes the new test in the existing Functions unit suite |
| Registry/Enrollment contracts and mutation services | Existing mutation | Unchanged |
| Persistent manifest contract/repository | Existing manifest/recovery | Unchanged; `planId` naming is reused as logical reference only |
| Migration classifier and dry-run orchestrator | Dry run | Unchanged |

## Safety Accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
PRODUCTION_MIGRATION_EXECUTIONS = 0
CANONICAL_WRITES = 0
PRODUCTION_BACKFILLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## One Next Action

`RECOMMENDED_NEXT_ACTION = P1.5-C2H2E1 CANONICAL BOOTSTRAP INPUT CONTRACT AND
DRY-RUN READINESS (LOCAL / DESIGN ONLY)`

E1 may define accepted authoritative input forms, canonicalization ownership,
field mapping, dry-run manifest assembly, approval, quarantine, and the future
write gate. It must not reopen speculative source discovery or authorize a
production write.
