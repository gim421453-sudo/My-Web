# P1.5-C2H2E3D-W1C-M3L2-G4R2 Post-G4 Final M3 Execution Composite Relock

## Verdict

`P1_5_C2H2E3D_W1C_M3L2_G4R2_FRESH_PRESTATE_IDENTITY_CONTRACT_UNRESOLVED`

This is a local-only composite relock. No gcloud command, IAM read or
mutation, token operation, Firestore call, M3 execution, M4 operation, cloud
logging access, staging, commit, push, or deploy was performed.

## Attested inputs

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
G4R1_VERDICT = P1_5_C2H2E3D_W1C_M3L2_G4R1_POST_G4_RUNTIME_CAPABILITY_REATTESTATION_PASS_G4R2_REQUIRED
G4R1_ATTESTATION_EXPECTED = 5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e
G4R1_ATTESTATION_RECOMPUTED = 5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e
G4R1_ATTESTATION_MATCH = yes
G4R1_RESULT_DOCUMENT_EXPECTED = 753b7c270685c141a68a51001c1b5ab064fc36c237b90c55b3b708eacf56e514
G4R1_RESULT_DOCUMENT_RECOMPUTED = 753b7c270685c141a68a51001c1b5ab064fc36c237b90c55b3b708eacf56e514
G4R1_RESULT_DOCUMENT_HASH_MATCH = yes
G4_ATTESTATION_MATCH = yes
G4_RESULT_DOCUMENT_HASH_MATCH = yes
R1B4_EVIDENCE_MATCH = yes
R1B4_RESULT_DOCUMENT_HASH_MATCH = yes
```

The historical G4, G4R1, and R1B4 documents were read only. None was
modified. R1B4 remains historical/current-state evidence and is not reusable
as a fresh M3 prestate.

## Current graph and locks

```text
POST_G4_GRAPH_NODE_COUNT = 9
POST_G4_GRAPH_EDGE_COUNT = 10
G4R1_GRAPH_MATCH = yes
POST_G4_GRAPH_IDENTITY_SHA256 = 130d98d84838da0a45b49f96bfed0d5b709bee8db9c4e3e8205795cdda165d8e
POST_G4_GRAPH_UNBOUND_EXTERNAL_NODES = 0
POST_G4_EXTERNAL_CAPABILITY_COUNT = 15
POST_G4_EXTERNAL_CAPABILITY_MATCHED = 15
POST_G4_EXTERNAL_CAPABILITY_UNBOUND = 0
ALL_EXTERNAL_CAPABILITY_LOCKS_MATCH = yes
ALL_POST_G4_RUNTIME_LOCKS_MATCH = yes
ALL_POST_G4_TEST_LOCKS_MATCH = yes
SDK_PATH_CONTAINMENT = PASS
SDK_IDENTITY_MATCH = yes
```

The current runtime entry remains `runM3Dormant` in
`tools/authority-audit/m3RuntimeCommandGraph.mjs`. The nine nodes are
`ROLE_STAGE1`, `ROLE_CANONICAL`, `OP_A`, `OP_B`, `OP_C_PRE`, `OP_D_PRE`,
`OP_E`, `OP_C_POST`, and `OP_D_POST`; the ten predecessor edges were
recomputed from current source.

## Command and mutation contract

```text
OP_E_TARGET = LOCKED_WRITER_SERVICE_ACCOUNT
OP_E_TARGET_ROLE = roles/iam.serviceAccountTokenCreator
OP_E_ARGV_CHANGED_FROM_G4R1 = no
OP_C_ARGV_CHANGED_FROM_G4R1 = no
M3_EXTERNAL_COMMAND_SURFACE_CHANGED_FROM_G4R1 = no
OP_E_CONCURRENCY_CHANGED_FROM_G4R1 = no
OP_E_MUTATIONS_MAX_PER_APPROVAL = 1
OP_E_AUTOMATIC_RETRIES = 0
OP_E_AUTOMATIC_ROLLBACKS = 0
FUTURE_M3_FRESH_PRESTATE_REQUIRED = yes
FUTURE_M3L3_SECOND_MUTATION_REACHABLE = no
FUTURE_M3L3_RETRY_AFTER_INDETERMINATE = no
```

The future sequence is hard-bound to local gates, a fresh exact prestate, OP-E
only when the state is ABSENT, fail-closed classification, and exact poststate
verification or STOP. Approval is consumed when the fresh prestate read
begins.

## Fresh-prestate blocker

The current OP-A path selects one active caller and compares a fixed short
fingerprint before passing the caller value to OP-E. The G4R1 graph proves the
surface and capability binding, but it does not prove that this legacy
fingerprint gate is an identity-safe exact target-member contract. The G4R2
policy explicitly forbids using that old fingerprint as identity proof.

```text
FUTURE_PRESTATE_IDENTITY_CONTRACT = UNRESOLVED_OLD_FINGERPRINT_ONLY
R1B4_STATE_SUFFICIENT_AS_FUTURE_M3_PRESTATE = no
M3L3_APPROVAL_ELIGIBLE = no
G4R2_COMPOSITE_RELOCK = STRUCTURALLY_VALID_BUT_BLOCKED
```

Until a separately approved design establishes the exact target member without
that legacy fingerprint-only proof, no M3 mutation may be authorized.

## Fail-closed classifier and poststate

```text
POST_G4_CLASSIFIER_CONNECTED_TO_OP_E = yes
UNKNOWN_NONZERO_CLASSIFICATION = INDETERMINATE
ERROR_PREFIX_V1_PROVES_REMOTE_NON_APPLICATION = no
TIMEOUT_AFTER_MUTATION_START = INDETERMINATE
UNKNOWN_MUTATION_RESULT_DEFAULT = INDETERMINATE
OP_E_CONFIRMED_FAILURE_RULES = []
FUTURE_M3_POSTSTATE_READ_REQUIRED = yes
```

The current runtime performs OP-C/OP-D postchecks after a successful OP-E
process result. A future success therefore cannot be treated as durable final
authority without those exact poststate reads; ambiguity is STOP.

## Forbidden reachability and privacy

```text
M4_REACHABLE_FROM_M3_RUNTIME = no
FIRESTORE_REACHABLE_FROM_M3_RUNTIME = no
ACCESS_TOKEN_GENERATION_REACHABLE = no
WRITER_IMPERSONATION_REACHABLE = no
SERVICE_ACCOUNT_KEY_ACCESS_REACHABLE = no
CLOUD_LOGGING_REACHABLE_FROM_M3_RUNTIME = no
PROJECT_IAM_MUTATION_REACHABLE = no
SERVICE_ACCOUNT_JSON_KEY_PATH = ABSENT
```

No raw principal/member, IAM policy, stdout/stderr, etag, condition,
credential, token, Authorization header, or personal absolute path is stored
in the G4R2 evidence.

## Future live budget design, not approval

```text
FUTURE_M3L3_LIVE_BUDGET = freshPrestateReadsMax=2; mutationAttemptsMax=1; poststateReadsMax=2; retriesMax=0; callerDiscoveryMax=1; projectIamReadsMax=2; cloudLoggingReadsMax=0; tokenCallsMax=0; firestoreCallsMax=0; m4MutationsMax=0
```

This is a derived safety budget only. It grants no live authority. A future
M3L3 approval must be separately issued after the identity contract blocker is
resolved and a new prestate gate is reviewed.

## Reproducible composite

```text
CANONICAL_PAYLOAD_SCHEMA = myweb.m3l2.g4r2.post-g4-final-m3-execution-composite.v1
CANONICAL_PAYLOAD_PATH = docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r2-post-g4-final-m3-execution-composite-v1.json
CANONICALIZER_VERIFIER = tools/authority-audit/g4r2PostG4FinalM3ExecutionComposite.mjs
M3_M3L2_G4R2_POST_G4_FINAL_M3_EXECUTION_COMPOSITE_SHA256 = 790c903219ec3cb7f9aa536c2c3881b8fc889471fd0505f05c38060d1835d0c1
SECOND_G4R2_COMPOSITE_SHA256 = 790c903219ec3cb7f9aa536c2c3881b8fc889471fd0505f05c38060d1835d0c1
G4R2_COMPOSITE_REPRODUCIBLE = yes
```

The canonicalizer sorts object keys recursively, preserves array order, and
hashes compact UTF-8 JSON. It rejects runtime drift, capability loss, unsafe
reachability, privacy violations, approval grants, and unsafe mutation
limits.

## Verification

```text
G4R1_TEST_RESULT = PASS
G4_TEST_RESULT = PASS
M3_GRAPH_TEST_RESULT = PASS
G4R2_TEST_RESULT = PASS
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS
TYPECHECK = PASS
BUILD = PASS
NEW_WHITESPACE_ERRORS = 0
```

```text
CURRENT_M3_EFFECTIVE_STATE = ABSENT_PROVEN
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = CORRECTED_AND_POST_G4_RUNTIME_REATTESTED
POST_G4_FINAL_EXECUTION_COMPOSITE = UNLOCKED
M3L3_LIVE_APPROVAL = NOT_GRANTED
M4_READINESS = BLOCKED_M3_REQUIRED_BINDING_ABSENT
M4_APPROVAL = NOT_GRANTED
```

```text
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_LIVE_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next action

`P1.5-C2H2E3D-W1C-M3L3_NEW_POST_G4_IDENTITY_CONTRACT_DESIGN_AND_EXPLICIT_APPROVAL`

No M3L3 execution, IAM read, token operation, or M4 operation is authorized by
this G4R2 result.

```text
G4R2_RESULT_DOCUMENT_SHA256 = EXTERNAL_FINAL_REPORT_ONLY
```
