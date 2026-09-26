# P1.5-C2H2E3D-W1C-M3L1 Composite-Locked Exact Writer-SA Token Creator Live Mutation

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_MUTATION_FAILURE`

The new M3L1 approval was executed once through the locked G1 runtime. The
pre-mutation gate passed, but the exact OP-E IAM mutation returned a confirmed
nonzero failure. Per the approval contract, execution stopped immediately.
There was no retry, rollback, post-success assumption, M4 operation, token
generation, writer impersonation, or Firestore access.

## Approval and baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
M3L1_APPROVAL_TYPE = NEW_INDEPENDENT_LIVE_APPROVAL
OLD_M3_APPROVAL_REUSED = no
E4C_VERDICT = P1_5_C2H2E3D_W1C_M3Z_E4C_M3L1_APPROVAL_ELIGIBILITY_PASS
CURRENT_COMPOSITE_MANIFEST_EXPECTED = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
CURRENT_COMPOSITE_MANIFEST_RECOMPUTED = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
CURRENT_COMPOSITE_MANIFEST_MATCH = yes
ALL_G1_RUNTIME_LOCKS_MATCH = yes
ALL_G1_TEST_LOCKS_MATCH = yes
E1_MANIFEST_MATCH = yes
E3R1_MANIFEST_MATCH = yes
CURRENT_EXTERNAL_CAPABILITY_TOTAL = 15
GRAPH_NODE_COVERED = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
```

The E4 historical document was not modified. The E4C eligibility attestation
was not treated as a mutation approval; the attached M3L1 approval was the
new independent approval used for this single attempt.

## Pre-mutation gate result

All preconditions required by the locked G1 graph passed sufficiently to reach
OP-E:

```text
STAGE1_ROLE_STATE = EXISTS_EXACT
CANONICAL_ROLE_STATE = EXISTS_EXACT
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
WRITER_SA_STATE = EXISTS_ENABLED
M3_BINDING_PRESTATE = ABSENT
M4_BINDING_PRESTATE = ABSENT
CALLER_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = ABSENT
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = ABSENT
FRESH_AUDIT_BASELINE = SAFE
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
WRITER_SA_IAM_CONCURRENCY_GUARD = PASS
PRE_MUTATION_FINAL_GATE = PASS
```

Only the locked exact writer service-account resource and
`roles/iam.serviceAccountTokenCreator` operation were eligible. No project-wide
binding or alternate role mutation was attempted.

## Mutation result and counters

```text
M3_MUTATION_ATTEMPTED = yes
M3_MUTATION_ATTEMPT_COUNT = 1/1
M3_MUTATION_OUTCOME = CONFIRMED_FAILURE
M3_MUTATION_RETRY_COUNT = 0
M3_POSTSTATE = not_reached
M3_BINDING_FINAL = not_reached
M4_BINDING_FINAL = not_reached
WRITER_DATA_CREATE_AUTHORITY_FINAL = not_reached
CALLER_PROJECT_WIDE_TOKEN_CREATOR_FINAL = not_reached
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_FINAL = not_reached
AUDIT_BASELINE_FINAL = not_reached

REAL_GCLOUD_EXECUTIONS = 7
STAGE1_ROLE_METADATA_READS = 1/1
CANONICAL_ROLE_METADATA_READS = 1/1
ACTIVE_CALLER_DISCOVERY_CALLS = 1/1
WRITER_SA_METADATA_READS = 1/1
WRITER_SA_IAM_POLICY_PRECHECK_READS = 1/1
PROJECT_IAM_POLICY_PRECHECK_READS = 1/1
M3_MUTATION_ATTEMPTS = 1/1
WRITER_SA_IAM_POLICY_POSTCHECK_READS = 0/1
PROJECT_IAM_POLICY_POSTCHECK_READS = 0/1
ALL_READ_RETRY_COUNT = 0
M4_MUTATION_ATTEMPTS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
```

The runtime returned only the safe failure classification and counters. Raw
stdout, stderr, caller principal, policy, token, authorization value, or
credential material was not persisted or reported.

## Prohibited-operation accounting

```text
PROJECT_IAM_MUTATIONS = 0
CUSTOM_ROLE_MUTATIONS = 0
AUDIT_SA_MUTATIONS = 0
FIREBASE_ADMIN_MUTATIONS = 0
WRITER_METADATA_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
AUTOMATIC_IAM_ROLLBACK = no
```

## Stop and recovery disposition

The confirmed failure requires a hard stop. No second OP-E invocation is
permitted under the current approval. The next action, if desired, requires a
separate approval for bounded exact writer-SA IAM poststate recovery and must
not assume whether the failed request was applied.

```text
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L1-R BOUNDED EXACT WRITER-SA IAM POSTSTATE RECOVERY
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

M4 remains unapproved and no Class write was attempted.

## Security and repository state

```text
RAW_CALLER_PERSISTED = no
FULL_IAM_POLICY_PERSISTED = no
TOKEN_PERSISTED = no
AUTHORIZATION_PERSISTED = no
CREDENTIAL_JSON_PERSISTED = no
PRIVATE_KEY_PERSISTED = no
PERSONAL_ABSOLUTE_PATH_PERSISTED = no
RULES_CHANGES = 0
INDEX_CHANGES = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

Only this result document was added for M3L1. Existing unrelated dirty and
untracked files were preserved.
