# P1.5-C2H2E3D-W1C-M3L1-RG2C Final M3 Execution Composite Relock

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_RG2C_FINAL_M3_EXECUTION_COMPOSITE_RELOCK_PASS_NEW_M3L2_APPROVAL_ELIGIBLE`

RG2C is a local integrity manifest only. It does not execute or approve M3,
and it does not activate M4.

## Baseline and evidence chain

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT = 233
STAGING = 0

G2R1_REATTESTATION_EXPECTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_RECOMPUTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_MATCH = yes
F4P1_ATTESTATION_EXPECTED = e1dbafe495560eaf9e7f774505ec472759bbcdef3fd0fd24fb267d96784a3027
F4P1_ATTESTATION_RECOMPUTED = e1dbafe495560eaf9e7f774505ec472759bbcdef3fd0fd24fb267d96784a3027
F4P1_ATTESTATION_MATCH = yes
F4R1_EVIDENCE_EXPECTED = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
F4R1_EVIDENCE_RECOMPUTED = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
F4R1_EVIDENCE_MATCH = yes
RG2_EVIDENCE_HASH = 4ef6053d5435418ec147a0843302673a22f5491374038fb92c1b1de2bd6ea7c9
F4R2D_EVIDENCE_HASH = 78284e198c0ac453123a2a933eeb4f8920b7c7a2a1cc24d7142ad4f760e56b4d
F4R2G_EVIDENCE_HASH = b89a7f3f90765a797dd306a3e306e25d0d4c79f451cc3d78f3034aebc8708be3
F4R2G_EVIDENCE_MATCH = yes
F4R1_CONDITIONAL_BINDING_COUNT = 0
POLICY_VERSION_COMPATIBILITY = COMPATIBLE
POLICY_VERSION_DOWNGRADE_RISK = CLOSED
```

## Locked graph and capability contract

```text
GRAPH_NODE_COUNT = 9
GRAPH_NODE_COVERED_COUNT = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
ALL_M3_ARGV_UNCHANGED = yes
OP_E_ARGV_CHANGED = no
E1_CAPABILITIES_MATCH = yes
E3R1_CAPABILITIES_MATCH = yes
EXTERNAL_CAPABILITY_TOTAL = 15
UNBOUND_EXTERNAL_CAPABILITIES = 0
SDK_PATH_CONTAINMENT = PASS
SDK_CAPABILITY_HASHES_MATCH = yes
ACTIVE_CALLER_SELECTION_CAPABILITY_COMPLETE = yes
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
IAM_CONCURRENCY_SEMANTICS = PROVEN_SAFE
```

The graph identities are:
`ROLE_STAGE1`, `ROLE_CANONICAL`, `OP_A`, `OP_B`, `OP_C_PRE`, `OP_D_PRE`,
`OP_E`, `OP_C_POST`, and `OP_D_POST`.

The path-bound capability manifests remain E1 count `3`, manifest
`081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099`, and
E3R1 count `12`, manifest
`11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d`.
The locked SDK version is `580.0.0`.

## M3 contract

```text
OP_E_TARGET_RESOURCE = exact writer service account
OP_E_TARGET_ROLE = roles/iam.serviceAccountTokenCreator
OP_E_TARGET_MEMBER = verified active caller, transiently resolved
OP_E_MUTATION_MAX = 1
OP_E_RETRY_MAX = 0
FUTURE_M3_FRESH_TARGET_BINDING_PRECHECK = PRESENT
FUTURE_M3_PRECHECK_FAIL_CLOSED = yes
TARGET_MEMBER_REQUIREMENT_CLASS = FUTURE_FRESH_PRESTATE_REQUIREMENT
CURRENT_TARGET_MEMBER_STATE_ASSERTED = no
M3_DUPLICATE_CAUSING_PATHS = 0
```

The future precheck must freshly prove the exact caller binding is absent.
Historical M3L1 state is not used as current production state. Existing
same-role/member behavior remains no-op or append according to the locked
Cloud SDK contract; no new algorithm is introduced.

## Future live budget

```text
M3L2_FUTURE_LIVE_BUDGET = {
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
```

The nine process calls correspond to the nine locked graph nodes. Any caller,
metadata, role, audit baseline, project-wide Token Creator, prestate, timeout,
nonzero, concurrency, or poststate failure is fail-closed with no retry.

## Forbidden paths and observability

```text
M4_COMMAND_BUILDER_PRESENT = no
M4_RUNTIME_PATH_REACHABLE = no
M4_MUTATION_IN_M3_GRAPH = 0
M4_APPROVAL = NOT_GRANTED
TOKEN_GENERATION_GRAPH_NODE = absent
WRITER_IMPERSONATION_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
FIRESTORE_READS_IN_FUTURE_M3 = 0
FIRESTORE_WRITES_IN_FUTURE_M3 = 0
CLASS_WRITE_IN_FUTURE_M3 = 0
G2_FAILURE_OBSERVABILITY_READY = yes
RAW_STDERR_PERSISTED = no
RAW_CALLER_PERSISTED = no
WHOLE_PROCESS_RESULT_SERIALIZED = no
```

Bounded failure fields remain exit code, timeout, failure class, allowlisted
stderr rule ID, stderr counts, and mutation outcome. No raw policy, member,
caller, credential, token, etag, condition, or stream is persisted.

## Composite status

```text
M3_RG2C_FINAL_COMPOSITE_EXECUTION_INTEGRITY_MANIFEST_SHA256 = b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1
SECOND_RG2C_FINAL_COMPOSITE_SHA256 = b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1
RG2C_FINAL_COMPOSITE_REPRODUCIBLE = yes
RG2C_FINAL_COMPOSITE_CREATED = yes
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M3L2_LIVE_EXECUTION_AUTHORIZED = no
CURRENT_M3_BINDING_STATE_IN_RG2C = NOT_FRESHLY_VERIFIED
HISTORICAL_M3L1_ROOT_CAUSE = still_not_proven
```

The old E4 composite remains historical and is not valid for future live
execution. M3L1 mutation budget is exhausted and its approval is not
reusable.

## Local validation

```text
G2 runtime/test hash verification = PASS
F4P1/F4R1/F4R2G evidence verification = PASS
Graph identity/argv verification = PASS
External capability 15/15 verification = PASS
Fresh-prestate and duplicate-safety checks = PASS
G2 bounded failure-observability checks = PASS
Negative runtime/argv/capability/policy/retry/M4/token/Firestore checks = PASS
REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
SERVICE_ACCOUNT_KEY_ACCESS = 0
```

## Next stage

`P1.5-C2H2E3D-W1C-M3L2 NEW COMPOSITE-LOCKED EXACT WRITER-SA TOKEN-CREATOR LIVE MUTATION`

M3L2 requires a completely new explicit approval. Before any live operation,
it must recompute this composite, all runtime/test/capability locks, verify
approval budgets are unused, and stop on any drift. RG2C itself performed no
live operation.
