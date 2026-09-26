# P1.5-C2H2E2AF Bootstrap Manifest Workspace Target Binding Narrow Fix

## Narrow Change

`CanonicalBootstrapDryRunResult.manifest` remains
`Readonly<Record<string, string | number | boolean | null>>`. Its only changed
builder is the successful return path of `planCanonicalBootstrapDryRun` in
`functions/src/migrations/canonicalBootstrapDryRun.ts`.

The selected field is `workspaceId`. It is copied directly from the already
validated normalized `CanonicalBootstrapInputV1.workspaceId`; there is no
separate builder parameter, fallback, path parsing, lookup, display label, or
new workspace identity format.

```text
MANIFEST_WORKSPACE_FIELD = workspaceId
WORKSPACE_FIELD_SOURCE = VALIDATED_NORMALIZED_INPUT
MANIFEST_WORKSPACE_MATCH_GUARD = not_needed_single_source
WORKSPACE_TARGET_BOUND_IN_MANIFEST_PREVIEW = yes
MANIFEST_SCHEMA_VERSION_CHANGE = NONE (additive, non-persistent preview v1)
```

Input validation already rejects an invalid workspace ID before a successful
manifest can be created. Invalid-result summaries retain no fabricated
workspace target.

## Contract Preservation

The output-only field does not participate in source canonicalization,
provenance, plan identity, replay identity, idempotency identity, or CAS.

| Contract | Result |
| --- | --- |
| SOURCE_FINGERPRINT_CHANGED_BY_MANIFEST_FIX | no |
| PLAN_ID_SEMANTICS_CHANGED | no |
| REPLAY_IDENTITY_CONTRACT_CHANGED | no |
| IDEMPOTENCY_CONTRACT_CHANGED | no |
| CAS_CONTRACT_CHANGED | no |
| PROVENANCE_CONTRACT_CHANGED | no |

The existing E0F provenance contract remains the only provenance representation.
No canonical-document or provenance backfill, production manifest migration,
or Firestore schema migration is required.

## E2A Synthetic Rerun

| Check | Result |
| --- | --- |
| Baseline status | `READY_FOR_APPROVAL` |
| Expected/actual fingerprint | `sha256-c14n-v1:6b42c710e50a6ec55d96795bdc98ef69a0666c1dc052d64c3754dfa655b11757` |
| Planned mutation count | `2` |
| CAS | `CAS_EXPECTATION_UNRESOLVED` |
| Manifest workspace present/matches input | yes / yes |
| E0F provenance on every intent | yes |
| Deterministic replay | PASS |
| Meaningful input change | fingerprint changed and `PLAN_REAPPROVAL_REQUIRED` |
| Same input, different plan ID | fingerprint same; batch/manifest/replay identity distinct |
| Duplicate Class/conflicting Class/duplicate Enrollment | `CONFLICTED`, zero intents |
| Missing prerequisite | `REFERENTIAL_BLOCKED`, zero intents |
| Set-semantic array order | PASS |
| Firestore reads/writes/persistence calls | `0 / 0 / 0` |

The non-persisted preview now has `workspaceId`, `planId`, `sourceKind`,
`sourceFingerprint`, Class/Enrollment/validation counts, planned mutation
count, `casExpectation`, and provenance schema version. It contains no source
rows, display label, ownership data, user data, credentials, tokens, or local
paths.

## Tests And Consumers

The focused E0F/E2AF test set passed `12 passed, 0 failed`. A new E2AF test
uses the exact approved synthetic fixture, asserts the workspace binding, and
asserts that the historical E2A source fingerprint is unchanged.

The only source call sites/readers are the planner's own test suite and its
package test registration; no runtime, Firestore, persistent-manifest, or
client consumer reads this preview. Those consumers are compatible because the
contract is additive and the value type already permits strings.

## Safety And Readiness

```text
PERSISTENCE_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_DOCUMENT_BACKFILL_REQUIRED = no
PROVENANCE_BACKFILL_REQUIRED = no
PRODUCTION_MANIFEST_MIGRATION_REQUIRED = no
REAL_AUTHORITATIVE_INPUT_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
```

This closes only the E2A local manifest-preview gap. It does not authorize a
production read, source intake, manifest persistence, or canonical write. The
next family remains E3: real authoritative input source selection and intake
policy, design only.
