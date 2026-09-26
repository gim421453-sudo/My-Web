# P1.5-C2H2E3D-W1C-M3L1-G2R1 Post-G2 Runtime and External Capability Re-attestation

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_G2R1_RUNTIME_EXTERNAL_CAPABILITY_REATTESTATION_PASS_F4_NEXT`

This is a local-only re-attestation. No gcloud process, IAM/API call,
Firestore call, token operation, mutation, staging, commit, push, or deploy was
performed.

## Baseline and safety

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0

REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
GCLOUD_NETWORK_CALLS = 0
LIVE_IAM_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_ACCESS = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The worktree was not cleaned or normalized. Its unrelated dirty and untracked
files remain outside this result document.

## G2 lock revalidation

```text
ALL_G2_M3_RUNTIME_LOCKS_MATCH = yes
ALL_G2_M3_TEST_LOCKS_MATCH = yes
```

| Relative path | SHA-256 |
|---|---|
| `tools/authority-audit/m3RuntimeCommandGraph.mjs` | `53f948c4e2e993cf394ae22439ed8aed83ed3442c231964d08e5667498504751` |
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs` | `660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656` |
| `tools/authority-audit-tests/m3RuntimeCommandGraph.test.mjs` | `b436f7ef37df8aefdc42ec7b259f09d6e6d4cd937188a89edf1ce2455489b6f3` |
| `tools/authority-audit-tests/gcloudStderrDiagnosticAnalyzer.test.mjs` | `dbf1c53e919f8af26c6ac1249711d753f3a72d6bf514b04c2b481f408b6caf04` |

## Execution graph identity

```text
GRAPH_NODE_COUNT = 9
GRAPH_NODE_IDENTITIES_CHANGED_SINCE_G1 = no
GRAPH_EDGES_CHANGED_SINCE_G1 = no
OP_E_ARGV_CHANGED = no
ROLE_STAGE1_ARGV_CHANGED = no
ROLE_CANONICAL_ARGV_CHANGED = no
OP_A_ARGV_CHANGED = no
OP_B_ARGV_CHANGED = no
OP_C_PRE_ARGV_CHANGED = no
OP_D_PRE_ARGV_CHANGED = no
OP_C_POST_ARGV_CHANGED = no
OP_D_POST_ARGV_CHANGED = no
ARGV_DIGEST = cfbb77836f25a612050d88fc7f797f1638da3d9b5e9b1ddd3fe799417c4a8559
COMMAND_SURFACE_DIGEST = a68dfb80e7fefbd02426bb8982c69d5e21325935cf093a59ad957ae312e5c512
EXTERNAL_COMMAND_SURFACES_CHANGED = no
OP_E_CLOUD_SDK_SURFACE_CHANGED = no
MUTATION_TRANSPORT_CHANGED = no
IAM_CONCURRENCY_IMPLEMENTATION_CHANGED = no
OP_E_IAM_CONCURRENCY_SEMANTICS = PROVEN_SAFE
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
MUTATION_OUTCOME_CLASSIFIER_CHANGED = no
NEW_SUCCESS_ACCEPTANCE_PATHS = 0
```

The node sequence remains `ROLE_STAGE1`, `ROLE_CANONICAL`, `OP_A`, `OP_B`,
`OP_C_PRE`, `OP_D_PRE`, `OP_E`, `OP_C_POST`, `OP_D_POST`. The predecessor
conditions and argument templates were read from the current graph and compared
with the G1 documented graph. The G2 delta is limited to the bounded failure
diagnostic projection.

## Safe observability contract

```text
SAFE_OP_E_DIAGNOSTIC_FIELDS = [
  processStarted, exitCode, timedOut, failureClass,
  safeErrorIdentifier, stderrLineCount, stderrByteCount, mutationOutcome
]
RAW_STDERR_PERSISTED = no
RAW_STDERR_RETURNED = no
RAW_CALLER_PRINCIPAL_PERSISTED = no
WHOLE_PROCESS_RESULT_SERIALIZED = no
RAW_ERROR_OBJECT_SERIALIZED = no
EXIT_CODE_PERSISTED_AS_INTEGER_ONLY = yes
M4_RUNTIME_PATH_REACHABLE = no
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
```

## SDK capability revalidation

```text
SDK_VERSION = 580.0.0
SDK_VERSION_METADATA_RELATIVE_PATH = VERSION
SDK_VERSION_METADATA_SHA256 = 3438cbff7b43185435735f5836141b180593ac7b15f332e2504d9922afe15897
SDK_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
SDK_LAUNCHER_SHA256 = a1eccc60e26714cbff8c7f6a0aa8577a1f83073cdc33d80b671d0686f4ff2ef1
SDK_ROOT_FINGERPRINT = sha256-v1:88b370c33a4ab20a0f11eb9041e711d89f623b52a5d0344b262afce9907a659b
```

### E1

```text
E1_CAPABILITY_COUNT = 3
E1_ALL_CAPABILITY_HASHES_MATCH = yes
E1_PATH_CONTAINMENT = PASS
E1_MANIFEST = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E1_MANIFEST_MATCH = yes
```

The three E1 relative-path locks were independently resolved inside the local
SDK root and matched the E1 evidence: `surface.iam.roles.describe`,
`googlecloudsdk.command_lib.iam.iam_util`, and
`googlecloudsdk.command_lib.iam.flags`.

### E3R1

```text
E3R1_NEW_CAPABILITY_COUNT = 12
ALL_E3R1_CAPABILITY_HASHES_MATCH = yes
ALL_E3R1_PATHS_MATCH = yes
E3R1_PATH_CONTAINMENT = PASS
E3R1_HISTORICAL_MANIFEST = 11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d
E3R1_SDK_CAPABILITY_CONTENT_STATUS = UNCHANGED
G2_RUNTIME_BINDING_STATUS = NEEDS_REBIND
```

All twelve E3R1 relative-path locks were resolved and matched, including the
OP-A caller-selection, OP-B metadata, OP-C policy-read, OP-D project-policy,
and OP-E binding-schema/translator/resource capabilities.

```text
CURRENT_EXTERNAL_CAPABILITY_TOTAL = 15
```

## Current coverage matrix

```text
ROLE_STAGE1 = [E1.role-describe, E1.iam-util, E1.iam-flags]
ROLE_CANONICAL = [E1.role-describe, E1.iam-util, E1.iam-flags]
OP_A = [E3R1_AUTH_LIST_SURFACE, E3R1_AUTH_CREDENTIAL_STORE]
OP_B = [E3R1_SA_DESCRIBE_SURFACE, E1.iam-util, E3R1_IAM_API_UTIL]
OP_C_PRE = [E3R1_SA_POLICY_SURFACE, E1.iam-util, E3R1_IAM_API_UTIL]
OP_D_PRE = [E3R1_PROJECT_POLICY_SURFACE, E3R1_PROJECT_FLAGS, E3R1_PROJECT_UTIL, E3R1_PROJECTS_API]
OP_E = [E3R1_SA_BINDING_SCHEMA, E3R1_YAML_TRANSLATOR, E1.iam-util, E3R1_IAM_RESOURCES]
OP_C_POST = [E3R1_SA_POLICY_SURFACE, E1.iam-util, E3R1_IAM_API_UTIL]
OP_D_POST = [E3R1_PROJECT_POLICY_SURFACE, E3R1_PROJECT_FLAGS, E3R1_PROJECT_UTIL, E3R1_PROJECTS_API]
```

```text
GRAPH_NODE_COVERED_COUNT = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
ALL_G2_EXTERNAL_GRAPH_NODES_COVERED = yes
OP_A_ACTIVE_CALLER_SELECTION_CAPABILITY_COMPLETE = yes
OP_B_WRITER_METADATA_CAPABILITY_COMPLETE = yes
OP_C_WRITER_IAM_READ_CAPABILITY_COMPLETE = yes
OP_D_PROJECT_IAM_READ_CAPABILITY_COMPLETE = yes
OP_E_EXTERNAL_CAPABILITY_COMPLETE = yes
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
```

## Deterministic re-attestation

The local canonical payload binds the six G2 runtime/test locks, SDK launcher
and root fingerprints, SDK version metadata, the E1 and E3R1 manifests and
relative-path locks, the nine-node identity/edge/argv digests, coverage matrix,
safe diagnostic fields, concurrency contract, and forbidden-path invariants.
It contains no timestamp, raw caller, raw stderr, token, credential, policy
payload, or personal absolute path.

```text
M3_G2R1_RUNTIME_EXTERNAL_CAPABILITY_REATTESTATION_SHA256 = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
SECOND_G2R1_REATTESTATION_SHA256 = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_REPRODUCIBLE = yes
G2R1_IS_FINAL_LIVE_COMPOSITE = no
```

Synthetic negative checks confirmed that a one-bit runtime drift, an OP-E argv
drift, an unbound graph node, or forbidden-path reachability rejects the
attestation. No production command was run for these checks.

## Required next stage and status

```text
F4_POLICY_STRUCTURE_DIAGNOSTIC_STILL_POTENTIALLY_USEFUL = yes
F4_REQUIRED_BEFORE_NEW_M3_APPROVAL = yes
OLD_E4_COMPOSITE_VALID_FOR_FUTURE_LIVE = no
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
PRODUCTION_RUNTIME_CODE_CHANGED = 0 (G2R1 audit only)
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3L1-F4_BOUNDED_EXACT_WRITER_SA_IAM_POLICY_STRUCTURE_READ`.

F4 remains a separately approved, read-only diagnostic. It must not be
executed as part of this re-attestation, and this document is not a final live
composite or M3 approval.

## Local verification

```text
FOCUSED_TEST_COUNT = 10 authority-audit test modules
FOCUSED_TEST_RESULT = PASS
G2R1_NEGATIVE_SYNTHETIC_CHECKS = PASS
TYPECHECK = PASS (prior G2 verification)
BUILD = PASS (approved external Vite build; sandbox build had known spawn EPERM)
GIT_DIFF_CHECK = PASS with pre-existing CRLF warnings only
SENSITIVE_SCAN = PASS; no raw caller, stderr, token, Authorization, credential JSON, private key, full policy, or personal absolute path in G2/G2R1 evidence
```

Only this G2R1 result document was added for this re-attestation. No code,
Rules, Indexes, Firebase data, or external capability was changed.
