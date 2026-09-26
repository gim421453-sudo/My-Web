# P1.5-C2H2E3 Real Authoritative Input Source Selection And Intake Policy

## Scope

This is a local policy document only. It does not ingest real data, open a
source file, call an external service, read Firestore, persist a manifest, or
authorize a canonical write. Source discovery remains `STOPPED_BY_POLICY`;
Workspace 3 and historical probing remain closed.

E2AF synthetic mechanics are validated, but synthetic success is not authority
for real data.

## Existing E1 Source Kinds

Exact accepted values from `CanonicalBootstrapInputV1`:

| Source kind | Implemented | Synthetic test | Real use |
| --- | --- | --- | --- |
| `manual_verified_entry` | yes | yes | not ratified |
| `user_approved_structured_import` | yes | no | not ratified |
| `official_current_source` | yes | no | not ratified |
| `system_generated_from_verified_current_source` | yes | no | not ratified |
| `other_explicitly_ratified_source` | yes | no | not ratified |

No source kind is added. Enum support is not trust evidence.

## Authority Contract

`SCHEMA_VALID` and `AUTHORITATIVE` are separate decisions. A real source is
authoritative only when origin, identity, workspace/scope, currentness,
operator intent, completeness, normalization, reproducible fingerprint, and
exact approval are known. No silent inference is allowed.

Validity covers E1 fields, IDs, status, duplicates, and normalization.
Authenticity covers origin and evidence. Authority is explicit approval for an
entity and scope. Freshness is `CURRENT`, bounded `AS_OF_DATE`,
`HISTORICAL_RECOVERY`, or `UNKNOWN`. Scope covers workspace/school, academic
period, grade/class, and entity range. Approval binds the exact workspace,
source, scope, fingerprint, plan, and preview. Valid JSON, CSV, XLSX, or an
official-looking export is not authoritative by itself.

## Candidate Source Policies

`manual_verified_entry` means a strict reviewed record, not free-form typing or
operator guess. Each real record needs an evidence basis, such as a current
verified roster, official current document, teacher-provided current record, or
separately ratified evidence. Suitability is Class `HIGH` for a small set and
Enrollment `MEDIUM` because of typo, omission, stale evidence, and prerequisite
risk.

`user_approved_structured_import` is a later isolated CSV/XLSX adapter. It must
record producer, date/version, target scope, currentness, alteration status,
completeness, and approval. Its flow is:

`raw source -> source adapter -> CanonicalBootstrapInputV1 -> sha256-c14n-v1 -> pure dry-run -> review -> separate approval`

Suitability is Class `MEDIUM` and Enrollment `MEDIUM`; file existence alone is
insufficient.

`official_current_source` is `CONDITIONAL`, not ratified. No external service
is called in E3. Future use requires currentness, deterministic identity
mapping, target scope, canonical semantic compatibility, and proof that no
relationship is manufactured. Official source authority is domain-specific: an
official timetable does not prove Student-Class-Subject enrollment.

`system_generated_from_verified_current_source` requires a verified generator
and deterministic, reviewable, fingerprinted transformation. Guesses,
probabilistic reconstruction, unrelated joins, and timetable-to-enrollment
inference are rejected. `other_explicitly_ratified_source` is a documented
exception, never a default or bypass.

| Source kind | Class | Enrollment | Human review | Adapter/metadata | Status |
| --- | --- | --- | --- | --- | --- |
| manual verified | small set | prerequisites required | yes | strict schema / yes | candidate |
| structured import | conditional | conditional | yes | yes / yes | candidate |
| official current | conditional | relationship proof | yes | yes / yes | not ratified |
| system generated | conditional | conditional | yes | yes / yes | not ratified |
| other ratified | conditional | conditional | yes | source-specific / yes | not ratified |

## Primary Selection

```text
CLASS_PRIMARY_REAL_SOURCE_KIND = manual_verified_entry
ENROLLMENT_PRIMARY_REAL_SOURCE_KIND = manual_verified_entry
CLASS_SOURCE_MAY_DIFFER_FROM_ENROLLMENT_SOURCE = yes
FIRST_REAL_INTAKE_DOMAIN = CLASS
INITIAL_REAL_INTAKE_OPERATION = NEW_BOOTSTRAP_CREATE
```

Class goes first because it is an Enrollment prerequisite and easiest to review
as a small explicit set. Enrollment may use another source later; the initial
manual choice minimizes ambiguity.

Inactive fallback order:

```text
Class: user_approved_structured_import -> official_current_source after review -> system_generated_from_verified_current_source
Enrollment: user_approved_structured_import with prerequisites -> official_current_source only with relationship proof -> system_generated_from_verified_current_source
```

Manual entry stops being suitable when the set is no longer small and
reviewable. Medium sets need a structured adapter; large/automated sets need an
authenticated source. These are policy categories, not schema limits.

## Future Intake Contract

A future real intake must provide exact `workspaceId`, one E1 source kind,
entity domain, source scope, date/version, freshness, authority basis/evidence
reference, completeness mode, raw-input identity, approval reference, and
normalization version. The core policy is
`NOT_PERSISTED_BY_BOOTSTRAP_CORE` and `TEMPORARILY_LOCAL_ONLY` for raw input
unless separately approved.

Names, emails, phone numbers, owner identifiers, and raw rows do not belong in
plan ID, manifest metadata, source fingerprint metadata, or replay identity.
`sha256-c14n-v1` covers exactly the normalized input used by the dry-run. The
exact workspace ID is bound before normalization; there is no current-workspace
fallback, display-name matching, session inference, or path-derived target.

`SOURCE_SCOPE_MATCHES_TARGET = yes` is mandatory before `READY_FOR_APPROVAL`.
Freshness must be `CURRENT` or an explicitly permitted `AS_OF_DATE`; `UNKNOWN`
is rejected and `HISTORICAL_RECOVERY` requires separate recovery policy.
Workspace-2 `subjects` remains a historical candidate with
`AUTHORITY = NOT_VERIFIED`; it is not read or promoted.

Initial completeness policy:

- `SINGLE_RECORD_ENTRY`: allowed for a small manual Class and Enrollment only
  with verified prerequisites;
- `FULL_SNAPSHOT`: later structured-import option with completeness evidence;
- `PARTIAL_PATCH`: not allowed for the first real bootstrap.

`SOURCE_ABSENCE_IMPLIES_DELETE = no`. Existing identities are not blindly
overwritten; CAS remains unresolved and separately gated.

## Enrollment And Review Gates

Enrollment cannot become ready without valid Student, Class, and Subject
references under E1. The first intake may use same-batch Class plus an approved
prerequisite snapshot. A future canonical-state read is separately approved;
no production read is automatic. Same-batch support is technical, not authority
proof: both source evidences must be authoritative and scope-consistent.

The process has two stages: (A) authority, scope, freshness, completeness, and
intake approval; (B) normalized real dry-run and exact manifest review. Human
review is mandatory for evidence, workspace/scope, normalization,
invalid/conflict output, manifest, and final pre-write approval. Review is not
write authorization.

Fail closed on unknown authority/workspace, scope mismatch, disallowed
freshness, unsupported source, invalid normalization, duplicates/conflicts,
missing prerequisites, fingerprint mismatch, or plan/input mismatch.

## Required State And Next Package

```text
SYNTHETIC_PURE_DRY_RUN_STATUS = VALIDATED
SOURCE_DISCOVERY_POLICY = STOPPED_BY_POLICY
WORKSPACE_BINDING_REQUIRED = yes
SOURCE_SCOPE_BINDING_REQUIRED = yes
SOURCE_FRESHNESS_REQUIRED = domain-specific yes
SOURCE_ABSENCE_IMPLIES_DELETE = no
RAW_INPUT_RETENTION_POLICY = NOT_PERSISTED_BY_BOOTSTRAP_CORE / TEMPORARILY_LOCAL_ONLY
HUMAN_REVIEW_REQUIRED = yes
NORMALIZED_SOURCE_FINGERPRINT_REQUIRED = yes
DRY_RUN_REQUIRED = yes
PLAN_REAPPROVAL_ON_INPUT_CHANGE = yes
REAL_AUTHORITATIVE_INPUT_APPROVAL = NOT_GRANTED
PRODUCTION_SOURCE_ACCESS_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3A MANUAL VERIFIED REAL INPUT INTAKE APPROVAL GATE
```

This next package remains design/preflight and must not be a production write
gate.

## Safety Counters

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
PRODUCTION_SOURCE_READS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
REAL_DATA_RECORDS_INGESTED = 0
REAL_SOURCE_FILES_OPENED = 0
REAL_SOURCE_ROWS_PARSED = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_WRITES = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

This E3 package is documentation-only; no implementation or real authority was
activated.
