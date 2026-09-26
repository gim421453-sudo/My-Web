# P1.5-C2H2E3D-W1C-M3L2 Exact Writer-SA Token-Creator Mutation

## Verdict

`P1_5_C2H2E3D_W1C_M3L2_CONFIRMED_MUTATION_FAILURE_NO_RETRY`

This was the newly approved M3L2 attempt under the RG2C composite. The exact
locked graph ran until the single OP-E mutation failed. No retry, rollback,
M4 activation, token generation, or Firestore operation occurred.

## Pre-live gates

```text
RG2C_VERDICT = P1_5_C2H2E3D_W1C_M3L1_RG2C_FINAL_M3_EXECUTION_COMPOSITE_RELOCK_PASS_NEW_M3L2_APPROVAL_ELIGIBLE
RG2C_FINAL_COMPOSITE_EXPECTED = b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1
RG2C_FINAL_COMPOSITE_RECOMPUTED = b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1
RG2C_FINAL_COMPOSITE_MATCH = yes
ALL_G2_RUNTIME_LOCKS_MATCH = yes
ALL_G2_TEST_LOCKS_MATCH = yes
GRAPH_NODE_COUNT = 9
GRAPH_NODE_COVERED_COUNT = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
ALL_M3_ARGV_MATCH = yes
E1_CAPABILITIES_MATCH = yes
E3R1_CAPABILITIES_MATCH = yes
EXTERNAL_CAPABILITY_TOTAL = 15
SDK_PATH_CONTAINMENT = PASS
SDK_CAPABILITY_HASHES_MATCH = yes
POLICY_VERSION_COMPATIBILITY = COMPATIBLE
POLICY_VERSION_DOWNGRADE_RISK = CLOSED
CURRENT_TARGET_MEMBER_STATE_ASSERTED_BEFORE_LIVE = no
```

The local SDK version/launcher and all 15 path-bound capability hashes
matched. The graph and argv were unchanged.

## Fresh graph result

```text
ACTIVE_CALLER_SELECTION = PASS
WRITER_METADATA = PASS
TARGET_BINDING_PRESTATE = ABSENT
BROAD_IAM_PRECHECK = PASS
AUDIT_BASELINE_PRECHECK = PASS
IAM_CONCURRENCY_PRECONDITIONS = PASS
OP_E_ELIGIBLE = yes
```

The exact target binding was absent in the fresh prestate, so OP-E became
eligible. The current member identity was transient only; this document keeps
only the approved caller fingerprint.

## OP-E bounded outcome

```text
M3L2_MUTATION_ATTEMPTS = 1
OP_E_EXIT_CODE = 1
OP_E_TIMED_OUT = no
OP_E_FAILURE_CLASS = UNKNOWN_NONZERO
OP_E_STDERR_RULE_ID = ERROR_PREFIX_V1
OP_E_STDERR_LINE_COUNT = 7
OP_E_STDERR_BYTE_COUNT = 419
MUTATION_OUTCOME = CONFIRMED_FAILURE
TARGET_BINDING_POSTSTATE = NOT_REACHED
BROAD_IAM_POSTCHECK = NOT_REACHED
M3L2_EFFECTIVE_STATE = NOT_VERIFIED
M3L2_POSTSTATE_VERIFIED = no
M3L2_RESULT = CONFIRMED_FAILURE
M3L2_RETRY_COUNT = 0
```

Because the process returned a nonzero exit code, the failure was confirmed by
the locked runtime classifier. No second OP-E and no rollback mutation were
performed.

## Budget and prohibited paths

```text
LOCKED_M3L2_FUTURE_LIVE_BUDGET = {
  realGcloudExecutionsMax: 9,
  opAMax: 1,
  opBMax: 1,
  opCPreMax: 1,
  opDPreMax: 1,
  opEMutationMax: 1,
  opCPostMax: 1,
  opDPostMax: 1,
  retriesMax: 0,
  m4MutationsMax: 0,
  tokenCallsMax: 0,
  firestoreCallsMax: 0
}
ACTUAL_M3L2_LIVE_COUNTERS = {
  realGcloudExecutions: 7,
  opA: 1,
  opB: 1,
  opCPre: 1,
  opDPre: 1,
  opEMutation: 1,
  opCPost: 0,
  opDPost: 0,
  retries: 0
}
LIVE_BUDGET_VIOLATION = no
M3L2_APPROVAL_CONSUMED = yes
M3L2_MUTATION_BUDGET = EXHAUSTED
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
CLASS_WRITES = 0
```

The process count is seven because the locked graph stopped immediately at
the confirmed OP-E failure; postchecks were not reached.

## Privacy and evidence

```text
RAW_CALLER_PERSISTED = no
RAW_IAM_POLICY_PERSISTED = no
RAW_STDOUT_PERSISTED = no
RAW_STDERR_PERSISTED = no
IAM_MEMBER_IDENTITIES_PERSISTED = 0
ETAG_VALUE_PERSISTED = no
CONDITION_EXPRESSIONS_PERSISTED = no
ACCESS_TOKEN_PERSISTED = no
AUTHORIZATION_HEADER_PERSISTED = no
CREDENTIAL_JSON_PERSISTED = no
PRIVATE_KEY_PERSISTED = no
```

Only bounded process diagnostics and the logical execution result were
retained.

```text
M3_M3L2_EXECUTION_RESULT_EVIDENCE_SHA256 = 4ec4415863f1432a72f2e1e9b7d682da92b947c69a0fda315551b5f72247cdb4
SECOND_M3L2_RESULT_EVIDENCE_SHA256 = 4ec4415863f1432a72f2e1e9b7d682da92b947c69a0fda315551b5f72247cdb4
M3L2_RESULT_EVIDENCE_REPRODUCIBLE = yes
```

## Final status

```text
HISTORICAL_M3L1_ROOT_CAUSE = still_not_proven
M4_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

Recommended next action is a new local forensic analysis of the bounded
`ERROR_PREFIX_V1` failure. No additional IAM authority is granted
automatically. Any future attempt requires a new stage and explicit approval.
