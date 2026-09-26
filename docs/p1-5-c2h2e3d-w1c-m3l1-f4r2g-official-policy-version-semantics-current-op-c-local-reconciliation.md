# P1.5-C2H2E3D-W1C-M3L1-F4R2G Official Policy-Version Semantics Reconciliation

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F4R2G_POLICY_VERSION_RESOLVED_COMPATIBLE_RG2C_NEXT`

This was a local reconciliation only. No gcloud execution, live IAM read,
IAM mutation, M3/M4 operation, token operation, or Firestore operation was
performed.

## Integrity and baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
F4R2D_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F4R2D_POLICY_VERSION_SEMANTICS_STILL_UNRESOLVED
G2R1_REATTESTATION_MATCH = yes
F4P1_ATTESTATION_MATCH = yes
F4R1_EVIDENCE_MATCH = yes
G2_RUNTIME_LOCKS = MATCH
G2_TEST_LOCKS = MATCH
OP-C_ARGV = UNCHANGED
OP-E_ARGV = UNCHANGED
M3_GRAPH = UNCHANGED
IAM_CONCURRENCY_IMPLEMENTATION = UNCHANGED
```

The current OP-C builder produces the existing service-account
`get-iam-policy` surface with JSON output and quiet verbosity. The service
account identity is represented here only by the logical placeholder
`EXACT_WRITER_SERVICE_ACCOUNT`.

```text
CURRENT_OP_C_COMMAND_SURFACE = gcloud iam service-accounts get-iam-policy
CURRENT_OP_C_ARGV_TEMPLATE = [iam, service-accounts, get-iam-policy, EXACT_WRITER_SERVICE_ACCOUNT, --format=json, --verbosity=error]
CURRENT_OP_C_EXPLICIT_POLICY_VERSION_FLAG = none
EXPLICIT_GCLOUD_POLICY_VERSION_FLAG_AVAILABLE = no
```

The supplied official evidence identifies this as the documented gcloud
service-account policy-read surface:

```text
CURRENT_OP_C_OFFICIAL_SURFACE_BINDING = EXACT_MATCH
CURRENT_OP_C_SURFACE_SUPPORTS_VERSION_REQUEST = no explicit user flag; automatic CLI handling applies
```

No guessed policy-version flag was introduced.

## F4R1 bounded condition evidence

Only the persisted bounded projection was used:

```text
F4R1_CONDITION_STRUCTURE_FIELDS = [conditionalBindingCount, targetRoleBindingCount, etagPresent]
F4R1_POLICY_HAS_CONDITIONAL_BINDINGS = no
POLICY_VERSION_FIELD_PERSISTED = no
```

`conditionalBindingCount = 0` is sufficient for the bounded conclusion that
the returned policy structure contains no conditional bindings. No raw policy,
members, etag value, conditions, stdout, or stderr was reconstructed.

## Policy-version reconciliation

The supplied official IAM semantics state that gcloud selects the allow-policy
version automatically, while policies without conditional role bindings are
represented without the condition-preservation requirement that makes version
3 material. The current OP-C surface is the exact documented gcloud surface,
and F4R1 proves the condition count is zero. Therefore the missing persisted
`version` field does not prevent the bounded compatibility conclusion.

```text
POLICY_VERSION_SEMANTIC_RESOLUTION = RESOLVED
POLICY_VERSION_INFERRED_FROM_OFFICIAL_SEMANTICS = yes
POLICY_VERSION_DOWNGRADE_RISK = CLOSED
POLICY_VERSION_COMPATIBILITY = COMPATIBLE
```

This conclusion is limited to the absence-of-conditions case supported by the
bounded evidence. It does not claim a numeric response field was persisted.

## Target member carry-forward

```text
TARGET_MEMBER_REQUIREMENT_CLASS = FUTURE_FRESH_PRESTATE_REQUIREMENT
TARGET_MEMBER_REOPENED = no
```

Before any future OP-E execution, the locked M3 precheck must freshly prove
that the exact caller Token Creator binding is absent. No current member
state is asserted here.

## Readiness and future path

```text
NEW_M3_RETRY_READINESS = READY_FOR_FINAL_COMPOSITE_RELOCK
STRUCTURED_REQUESTED_POLICY_VERSION_DIAGNOSTIC_NEEDED = no
FINAL_M3_LIVE_COMPOSITE_CREATED = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
NEW_POLICY_VERSION_LIVE_READ_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
```

No new policy-version read is required. The next action is the separate local
`P1.5-C2H2E3D-W1C-M3L1-RG2C FINAL M3 EXECUTION COMPOSITE RELOCK`; RG2C must
still construct new execution authority and must not reuse the exhausted M3L1
approval.

## Safety invariants

```text
PRODUCTION_M3_RUNTIME_CHANGED = 0
F4P1_DIAGNOSTIC_RUNTIME_CHANGED = 0
G2R1_M3_RUNTIME_ATTESTATION_IMPACT = NONE
M3L1_MUTATION_BUDGET = EXHAUSTED
F4R1_READ_BUDGET = EXHAUSTED
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

## Local validation and evidence

F4P1 parser and M3 command-graph synthetic tests passed. The decision matrix
covered exact surface/no conditions, explicit version fixtures, condition
structure unresolved, surface mismatch semantics, incompatibility handling,
downgrade-risk closure, and target-member fresh-prestate deferral.

```text
M3_F4R2G_OFFICIAL_POLICY_VERSION_RECONCILIATION_SHA256 = b89a7f3f90765a797dd306a3e306e25d0d4c79f451cc3d78f3034aebc8708be3
F4R2G_EVIDENCE_REPRODUCIBLE = yes
RECOMMENDED_NEXT_ACTION = P1_5_C2H2E3D_W1C_M3L1_RG2C final M3 execution composite relock
```

No final composite or production approval is created by this document.
