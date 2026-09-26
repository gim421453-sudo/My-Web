# P1.5-C2H2E2A Canonical Bootstrap Synthetic Sample Pure Dry-Run

## Execution Boundary

This execution used the already compiled local pure planner only. It used a
synthetic contract sample, no production source, and no Firestore or manifest
persistence adapter. It did not create a runtime production path.

| Safety counter | Result |
| --- | --- |
| Firestore reads/writes | `0 / 0` |
| Planner persistence calls | `0` |
| Manifest persistence | `0` |
| Canonical writes | `0` |
| Production source reads | `0` |
| Cloud/IAM/API calls or mutations | `0` |
| Rules/Indexes changes | `0 / 0` |
| Staging/commit/push/deploy | `0 / 0 / 0 / 0` |

## Integrity And Focused Validation

All four primary E0F/E1 locks and all four direct dependency locks from E2
matched their approved SHA-256 values. The focused local E0F/E1 suite passed:
`11 passed, 0 failed`.

## Synthetic Baseline

| Item | Result |
| --- | --- |
| Plan ID | `81c06dcbe154d76a0b6ab53a8b5a853b73dfec1285c78ef003bffd966de19b87` |
| Source kind | `manual_verified_entry` |
| Synthetic Class count | `1` |
| Synthetic Enrollment count | `1` |
| Dry-run status | `READY_FOR_APPROVAL` |
| Source fingerprint | `sha256-c14n-v1:6b42c710e50a6ec55d96795bdc98ef69a0666c1dc052d64c3754dfa655b11757` |
| Planned mutation count | `2` |
| Planned synthetic targets | `class_test_e2a`, `student_test_e2a` |
| Provenance | every intent has valid E0F provenance v`1` |
| CAS status | `CAS_EXPECTATION_UNRESOLVED` |
| Idempotency/replay identity | two deterministic existing-contract identities |

The supplied prerequisite snapshot contained only the synthetic student and
subject. The Enrollment successfully referenced the Class created in the same
planned batch.

## Determinism And Fail-Closed Checks

| Check | Result |
| --- | --- |
| Exact input and plan replay | PASS; fingerprint, targets, identities, and summary equal |
| Same input, same plan replay identity | yes |
| One meaningful Class field change | fingerprint changed |
| Changed input under original plan context | `PLAN_REAPPROVAL_REQUIRED` |
| Same input, different valid plan ID | fingerprint unchanged; batch, manifest reference, and replay identities changed |
| Duplicate Class | `CONFLICTED`, zero intents |
| Conflicting Class payload | `CONFLICTED`, zero intents |
| Duplicate Enrollment | `CONFLICTED`, zero intents |
| Missing subject reference | `REFERENTIAL_BLOCKED`, zero intents |
| Set-semantic array shuffle | PASS; fingerprint unchanged |
| Every negative case | zero reads, writes, and persistence counters |

## In-Memory Manifest Preview

The planner generated a non-persisted, minimized preview. It contains plan ID,
source kind/fingerprint, provenance schema version, Class/Enrollment counts,
valid/invalid/conflict counts, planned mutation count, validation status, CAS
expectation, and idempotency identity count. It contains no raw input rows,
credentials, tokens, emails, private keys, or absolute personal paths.

However, the actual preview does **not** contain a workspace target field.
`CanonicalBootstrapDryRunResult.input` retains the validated workspace ID, but
`CanonicalBootstrapDryRunResult.manifest` omits it. E2A's required manifest
inspection contract calls for workspace-target binding, so the synthetic run
does not fully close that requirement.

## Readiness And Stop

```text
ALL_E2_INTEGRITY_LOCKS_MATCH = yes
FOCUSED_E0F_E1_TESTS = PASS
MANIFEST_PREVIEW_GENERATED = yes
MANIFEST_PERSISTED = no
MANIFEST_WORKSPACE_TARGET_BOUND = no
REAL_AUTHORITATIVE_INPUT_APPROVAL = NOT_GRANTED
CLASS_BOOTSTRAP_WRITE_READINESS = NOT_READY_FOR_WRITE
ENROLLMENT_BOOTSTRAP_WRITE_READINESS = NOT_READY_FOR_WRITE
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
```

No real input, production read, persistence, or write is authorized by this
result. A narrow local contract fix must add a non-sensitive workspace target
binding to the in-memory manifest preview, with regression tests, before E2A
can receive a PASS verdict. The next policy family remains E3 only after that
contract gap is closed.
