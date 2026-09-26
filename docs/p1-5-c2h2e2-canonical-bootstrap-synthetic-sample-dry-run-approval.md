# P1.5-C2H2E2 Canonical Bootstrap Synthetic Sample Dry-Run Approval Gate

## Status

This is a local approval-preparation document only. It does not authorize E2A.

| Approval | State |
| --- | --- |
| E2A synthetic dry-run | `NOT_GRANTED` |
| Real authoritative input | `NOT_GRANTED` |
| Manifest persistence | `NOT_GRANTED` |
| Firestore read | `NOT_GRANTED` |
| Canonical write | `NOT_GRANTED` |
| Execution | `no` |

The permitted future E2A action is one local
`SYNTHETIC_CONTRACT_SAMPLE` run. It is not real authoritative input,
production-source data, historical recovery data, or user-record data.

## Locked Local Contract

| File | SHA-256 |
| --- | --- |
| `functions/src/migrations/canonicalBootstrapProvenance.ts` | `04f946a4a08c991a9d407d156f71e9ac541e554f6b161995851894612f4a85d2` |
| `functions/src/migrations/canonicalBootstrapDryRun.ts` | `e054a3509d086fbf4f70098887d70a0f5ef3d64c7ba8446897da86f6e0ee7be5` |
| `functions/test/canonicalBootstrapProvenance.test.ts` | `a721c579b77d56105ab6ff43e0af3c4664d065b2f08950f374a0e18751b49086` |
| `functions/test/canonicalBootstrapDryRun.test.ts` | `47665e155d2b389ad79cf192d3519fc84533c0a666060e68cfdb75cac476f7ed` |
| `functions/src/operations/operationContract.ts` | `5117ba791fbbee8e24e56b6ab29c1ff9c692ea6fea88f46bb243b90b00243bc9` |
| `functions/src/authz/resolverUtils.ts` | `f91fe3e9ff8550f5b28bac489d8c0b76a77a31fcbbfa6133a8cf66427ba3f1ab` |
| `functions/src/registries/classRegistryContract.ts` | `bd3a236ac56d2339d6304f7b2e17a2074cb218b59e173eecd5c9cb6f09a47f8b` |
| `functions/src/relationships/studentEnrollmentContract.ts` | `01a29317ed5bd4df83958ecce654107eae48173bbe435df35e95fc0a56f414ee` |

The final four files are direct dependencies for canonical hashing, document ID
validation, Class parsing, and Enrollment parsing. The dry-run planner has no
direct persistent-manifest, idempotency-repository, or CAS-store dependency.

## Exact E1 Input Contract

| Item | Actual contract |
| --- | --- |
| NORMALIZED_BOOTSTRAP_INPUT_SCHEMA | `CanonicalBootstrapInputV1` |
| NORMALIZED_BOOTSTRAP_INPUT_VERSION | `1` |
| SOURCE FINGERPRINT | `sha256-c14n-v1:<64 lowercase hex>` |
| SOURCE CANONICALIZATION | `CANONICAL_BOOTSTRAP_INPUT_C14N_V1` through `sha256Canonical` |
| DRY_RUN_RESULT_TYPE | `CanonicalBootstrapDryRunResult` |
| MANIFEST_PREVIEW_TYPE | `Readonly<Record<string, string | number | boolean | null>>` |
| SUPPORTED_AUTHORITATIVE_SOURCE_KINDS | `manual_verified_entry`, `user_approved_structured_import`, `official_current_source`, `system_generated_from_verified_current_source`, `other_explicitly_ratified_source` |

Class required fields are `classId`, `displayName`, and `status`; `schoolYear`
and `grade` are optional. `classId` is explicit and is never inferred from the
display name.

Enrollment required fields are `studentId`, `classId`, `subjectIds`, and
`status`. Its identity is `studentId`. It requires a student reference, class
reference, and every subject reference. The optional pure
`BootstrapPrerequisiteSnapshotV1` accepts `studentIds`, `subjectIds`, and
optional `classIds`.

Arrays are set-semantic after validation: Class records sort by `classId`,
Enrollment records by `studentId`, and all ID arrays by code-unit ordering.
Identical or conflicting duplicate Class/Enrollment identity fails closed.

## Proposed Synthetic E2A Fixture

The following values are proposed for a future local-only run, but are not
executed or approved by this document:

| Item | Proposed value |
| --- | --- |
| SYNTHETIC_SOURCE_KIND | `manual_verified_entry` |
| SYNTHETIC_PLAN_ID | `81c06dcbe154d76a0b6ab53a8b5a853b73dfec1285c78ef003bffd966de19b87` |
| SYNTHETIC_CLASS_COUNT | `1` |
| SYNTHETIC_ENROLLMENT_COUNT | `1` |
| Class ID | `class_test_e2a` |
| Student ID | `student_test_e2a` |
| Subject ID | `subject_test_e2a` |

The Class has only its required fields: `classId: class_test_e2a`, a synthetic
display name, and `status: active`. The Enrollment has only its required
fields, references that Class, and has one synthetic subject. The prerequisite
snapshot contains only the synthetic student and subject IDs. No real name,
email, document ID, workspace value, or source row may be used.

`SAME_BATCH_CLASS_REFERENCE_SUPPORTED = yes`: the current planner builds its
valid Class IDs into the local reference set before checking Enrollment class
references. The synthetic Class therefore does not need to appear in the
snapshot.

## Required Future E2A Checks

E2A must validate the locked hashes, run focused E0F/E1 tests, construct only
the proposed synthetic input/snapshot, and call only
`planCanonicalBootstrapDryRun`.

Expected valid-run observations:

- `READY_FOR_APPROVAL`, zero issues, two planned mutation intents;
- two identical runs have the same source fingerprint, targets, provenance,
  replay identities, idempotency identities, summary counts, and manifest
  preview;
- every intent contains E0F `CanonicalBootstrapProvenanceV1`;
- `expectedVersion: null` and
  `CAS_EXPECTATION_UNRESOLVED`; no production version is invented;
- `firestoreReadCalls: 0`, `firestoreWriteCalls: 0`, and
  `persistenceCalls: 0`.

The planner uses the existing E0F `canonicalBootstrapReplayIdentity` contract
for `idempotencyIdentity`; it does not create a second idempotency mechanism or
call an idempotency repository. The manifest preview binds plan ID, source
fingerprint, source kind, record counts, validation status, provenance schema
version, planned mutation count, idempotency identity count, and CAS status.
It contains no raw source rows, credentials, tokens, absolute personal paths,
emails, or private keys.

E2A must also verify all of the following locally:

- change one meaningful normalized input field: fingerprint changes and
  `assertBootstrapPlanMatchesInput` throws `PLAN_REAPPROVAL_REQUIRED`;
- change only the valid synthetic plan ID: source fingerprint remains the same,
  while provenance batch/manifest identity and replay identities change;
- duplicate Class identity: `CONFLICTED`, zero intents;
- conflicting Class payload with the same identity: `CONFLICTED`, zero intents;
- duplicate Enrollment identity: `CONFLICTED`, zero intents;
- missing student, class, or subject reference: `REFERENTIAL_BLOCKED`, zero
  intents;
- shuffle valid record arrays: the fingerprint remains the same.

No E2A result can change these readiness states:

```text
CLASS_BOOTSTRAP_WRITE_READINESS = NOT_READY_FOR_WRITE
ENROLLMENT_BOOTSTRAP_WRITE_READINESS = NOT_READY_FOR_WRITE
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
```

Synthetic success does not authorize manual real data, CSV, XLSX, Google
Sheets, NEIS, historical recovery, or any production-source import. Those need
a later source-specific approval package.

## E2A Checklist

- [ ] Verify each locked E0F/E1 dependency hash.
- [ ] Run focused provenance and dry-run tests.
- [ ] Construct only the synthetic Class, Enrollment, and prerequisite snapshot.
- [ ] Use the one stable synthetic plan ID.
- [ ] Invoke only the pure dry-run planner.
- [ ] Persist nothing.
- [ ] Verify deterministic replay and one meaningful input change.
- [ ] Verify duplicate, conflict, and broken-reference fail-closed behavior.
- [ ] Inspect only the in-memory manifest preview.
- [ ] Confirm no production access, Firestore, or canonical writes.

## Exact User Approval Text

`P1.5-C2H2E2A Canonical Bootstrap Synthetic Sample Pure Dry-Run` 실행을
승인합니다. 잠긴 E0F provenance와 E1 dry-run 계약의 로컬 무결성을 검증하고,
실제 사용자·운영 데이터가 아닌 synthetic Class/Enrollment fixture 및 synthetic
prerequisite snapshot만으로 pure zero-persistence dry-run을 수행합니다.

동일 synthetic input과 planId의 deterministic replay, 의미 있는 입력 한 필드
변경 시 source fingerprint 변경과 `PLAN_REAPPROVAL_REQUIRED`, planId 변경 시
분리된 batch/replay identity, duplicate/conflict/broken-reference의 fail-closed
동작을 로컬에서 확인합니다.

Firestore/API/production source 접근, manifest persistence, canonical write,
IAM/API 변경, Rules/Indexes 변경, staging, commit, push, deploy는 수행하지
않습니다.

## Safety Counters

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
CANONICAL_WRITES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next Step

Only explicit user approval may start E2A. A successful E2A remains local and
synthetic; the next subsequent package is a design-only authoritative-source
selection and intake policy, not a production write.
