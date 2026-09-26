# P1.5-C2H2E1 Canonical Bootstrap Input Contract And Dry-Run Readiness

## Scope And Boundary

This is a local, pure-input contract. It does not inspect a production source,
read Firestore, call an API, upload a file, persist a manifest, or create a
canonical registry or enrollment record. Source discovery remains stopped.
Workspace 3 is not inspected or used.

The intended pipeline is:

`approved source adapter -> CanonicalBootstrapInputV1 -> pure validation and canonicalization -> dry-run plan -> E0F provenance -> later separately approved persistent migration/write`.

`planId` is an approved logical plan identity. It is deliberately separate
from the authoritative input fingerprint, so a semantic source change cannot
be hidden by retaining a plan ID.

## Contract

| Field | Value |
| --- | --- |
| NORMALIZED_INPUT_CONTRACT | `CanonicalBootstrapInputV1` |
| SCHEMA_VERSION | `1` |
| SOURCE_FINGERPRINT_ALGORITHM | `sha256-c14n-v1` |
| SOURCE_FINGERPRINT_PREFIX | `sha256-c14n-v1:` |
| CANONICALIZATION_CONTRACT | `CANONICAL_BOOTSTRAP_INPUT_C14N_V1` material, UTF-8 canonical JSON via existing `sha256Canonical` |
| ARRAY_ORDER_POLICY | set-semantic: class IDs, enrollment student IDs, subject IDs, and prerequisite IDs are code-unit sorted before hashing |
| DUPLICATE_POLICY | reject; identical and conflicting duplicates both block a plan |
| CONFLICT_POLICY | reject; no last-row-wins behavior |
| INVALID_RECORD_POLICY | quarantine as minimal issue metadata and produce no executable intents |
| SOURCE_CHANGE_POLICY | `PLAN_REAPPROVAL_REQUIRED` |

The canonical material contains schema version, workspace ID, source kind,
normalized classes, normalized enrollments, and an optional normalized
prerequisite snapshot. It excludes raw source rows, source paths, credentials,
tokens, display-only source labels, and `planId`. Object keys use the existing
canonical serializer; no locale sorting, case folding, or Unicode normalization
is applied. The same validated input therefore has the same fingerprint across
locales, while a semantic field change has a different one.

Only these source categories are expressible by this contract:

| Source kind | Explicit approval required | Fingerprint and dry-run required |
| --- | --- | --- |
| `manual_verified_entry` | yes | yes |
| `user_approved_structured_import` | yes | yes |
| `official_current_source` | yes | yes |
| `system_generated_from_verified_current_source` | yes | yes |
| `other_explicitly_ratified_source` | yes | yes |

They are labels for a later, approved adapter. This E1 code does not implement
CSV, spreadsheet, API, Firestore, or production-source ingestion.

## Class And Enrollment Inputs

A Class input requires an explicit `classId`, `displayName`, and active/inactive
`status`; `schoolYear` and `grade` are optional. IDs are never derived from a
display name. Its normalized shape is validated through the existing Class
registry parser.

An Enrollment input requires `studentId`, `classId`, non-duplicate
`subjectIds`, and active/inactive `status`. The student ID is the enrollment
identity. Its normalized shape is validated through the existing canonical
enrollment parser.

An optional pure `prerequisiteSnapshot` can contain known student, subject, and
class IDs. It permits a local structural reference check only:

- enrollment `studentId` must be present;
- enrollment `classId` must be present in the snapshot or this plan's Class
  inputs;
- each enrollment `subjectId` must be present.

Missing input or a missing reference produces `REFERENTIAL_BLOCKED`, with only
entity kind, field, index or stable ID, and error category recorded. No raw row
or source payload is retained. This is not proof that production registry
documents exist. `ENROLLMENT_PRODUCTION_REFERENTIAL_VALIDATION_READY = no`
until a separately approved production inventory and read contract exists.

## Dry-Run Output

`planCanonicalBootstrapDryRun` returns a pure report with zeroed counters:

| Counter | Value |
| --- | --- |
| Firestore reads | `0` |
| Firestore writes | `0` |
| persistence calls | `0` |
| listeners | `0` |
| production API calls | `0` |

For valid structural input and satisfied snapshot references it returns Class
and Enrollment `create` intents. Every intent has an E0F
`CanonicalBootstrapProvenanceV1` object and a deterministic replay identity.
The existing canonical hash mechanism is reused for that identity. This phase
does not invoke an idempotency repository or persist a manifest.

Existing persistent migration-manifest concepts remain compatible: `planId`,
mapping/source fingerprints, and existing dry-run status are not replaced.
E1 adds the versioned authoritative-input fingerprint and provenance envelope
needed before a future write phase. Old canonical registry records without the
new provenance remain parseable; E1 does not reinterpret them.

CAS is intentionally unresolved during an input-only dry run. Each proposed
intent uses `expectedVersion: null` and
`CAS_EXPECTATION_UNRESOLVED`; it never invents version `0` or asserts a create
precondition against an unobserved production document.

## Readiness

| Check | State |
| --- | --- |
| CLASS_DRY_RUN_READY | ready for validated local structural input |
| ENROLLMENT_DRY_RUN_READY | ready only with a supplied local prerequisite snapshot |
| ENROLLMENT_PRODUCTION_REFERENTIAL_VALIDATION_READY | no |
| DRY_RUN_MANIFEST_READY | yes, as a non-persistent summary only |
| E0F_PROVENANCE_READY | yes |
| EXISTING_IDEMPOTENCY_IDENTITY_READY | yes, deterministic identity only |
| EXISTING_CAS_READY | partial; intentionally unresolved pending an approved read phase |
| AUTHORITATIVE_REAL_SOURCE_AVAILABLE | no |
| PRODUCTION_EXECUTION_READY | no |

`assertBootstrapPlanMatchesInput` recalculates the source fingerprint and
provenance manifest reference. A changed source fingerprint or different plan
provenance throws `PLAN_REAPPROVAL_REQUIRED`. No partial executable plan is
returned when schema, duplicate, conflict, or reference errors exist.

## Verification

The local tests cover valid Class and Enrollment input, invalid schema,
identical duplicate Class input, duplicate Enrollment input, missing
prerequisites, set-order invariance, semantic source changes, non-ASCII
determinism, reapproval, and source-path-shaped unknown fields. They also
assert zero persistence counters.

Verification commands for this package:

```text
npm.cmd --prefix functions run build
npm.cmd --prefix functions test
git diff --check
```

## Next Controlled Step

The next safe package is a separately approved authoritative-input sample and
dry-run approval gate. It must use only a user-ratified local sample or a later
explicit production read approval, retain the zero-write boundary, and stop on
any source, duplicate, reference, provenance, or CAS-readiness mismatch.
