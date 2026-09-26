# P1.5-C2H2E3D-W1C-M3Z-G1 M3 Runtime Command Graph

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_G1_M3_RUNTIME_COMMAND_GRAPH_IMPLEMENTATION_PASS`

G1 adds a dormant, local-only M3 command graph. It is not imported by the web
application, Functions runtime, package lifecycle, scheduled jobs, or deploy
hooks. No real gcloud process is used by the G1 test suite.

## Baseline and invalidated historical locks

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
DIRTY_COUNT = 216
E3_PREVIOUS_VERDICT = P1_5_C2H2E3D_W1C_M3Z_E3_RUNTIME_COMMAND_GRAPH_INCOMPLETE

M3_RUNTIME_CALLER_EXISTS = yes
OP_A_RUNTIME_CALLER_EXISTS = yes
OP_B_RUNTIME_CALLER_EXISTS = yes
OP_C_RUNTIME_CALLER_EXISTS = yes
OP_D_RUNTIME_CALLER_EXISTS = yes
OP_E_RUNTIME_CALLER_EXISTS = yes
ROLE_READ_RUNTIME_CALLER_EXISTS = yes

DEFAULT_LIVE_EXECUTION_ENABLED = false
ACCIDENTAL_LIVE_ENTRYPOINT = no
```

The old A2 runtime locks and E2 final execution manifest are historical only
and are invalid for future live execution after this G1 runtime addition.
E1 historical evidence was not modified.

## Runtime graph

The concrete graph is exported by
`tools/authority-audit/m3RuntimeCommandGraph.mjs`:

```text
ROLE_STAGE1 -> ROLE_CANONICAL -> OP_A -> OP_B -> OP_C_PRE -> OP_D_PRE
  -> final pre-mutation gate -> OP_E -> OP_C_POST -> OP_D_POST
```

Each node has a pure argv builder, structured-output contract, maximum call
count, zero retry, predecessor conditions, mutation flag, and sensitive-field
classification. Raw caller data is accepted only transiently by the OP-E
builder and is never returned by the result serializer.

## Command surfaces and static SDK evidence

The supported command forms were checked against the installed Cloud SDK source
without executing gcloud:

| Operation | Command surface | SDK-relative source evidence |
|---|---|---|
| ROLE-1/ROLE-2 | `iam roles describe` | `lib/surface/iam/roles/describe.py` |
| OP-A | `auth list` | `lib/surface/auth/list.py` |
| OP-B | `iam service-accounts describe` | `lib/surface/iam/service_accounts/describe.py` |
| OP-C / OP-C-POST | `iam service-accounts get-iam-policy` | `lib/surface/iam/service_accounts/get_iam_policy.py` |
| OP-D / OP-D-POST | `projects get-iam-policy` | `lib/surface/projects/get_iam_policy.py` |
| OP-E | `iam service-accounts add-iam-policy-binding` | `lib/surface/iam/service_accounts/add_iam_policy_binding.yaml`; generated command path uses `lib/googlecloudsdk/command_lib/util/apis/yaml_command_translator.py` and `lib/googlecloudsdk/command_lib/iam/iam_util.py` |

All external execution passes through the existing
`windowsGcloudProcessAdapter.mjs`. Commands use argument arrays, bounded
timeouts, separate in-memory stdout/stderr, exact exit status, and no retry.

## Safety state machine

The runtime rejects OP-E unless both exact role reads, caller count/fingerprint,
writer metadata, writer policy, project policy, and all audit/M4/project-wide
Token Creator predicates pass. OP-E is bounded by `M3_MUTATION_MAX = 1` and
`M3_RETRY_MAX = 0`. Results are `CONFIRMED_SUCCESS`, `CONFIRMED_FAILURE`, or
`INDETERMINATE`; the latter two stop without post-success assumptions or retry.

Static Cloud SDK inspection shows the add-binding command obtains the current
policy, adds one binding, and sends the policy containing its etag through the
set-policy request. This is the required optimistic concurrency mechanism for
the selected surface:

```text
OP_E_IAM_CONCURRENCY_SEMANTICS = PROVEN_SAFE
PROJECT_IAM_MUTATION_COMMAND_COUNT = 0
M4_COMMAND_BUILDER_PRESENT = no
M4_RUNTIME_PATH_REACHABLE = no
TOKEN_GENERATION_COMMAND_REACHABLE = no
FIRESTORE_COMMAND_OR_API_PATH_REACHABLE = no
SA_KEY_LIST_PATH_REACHABLE = no
SA_KEY_CREATE_PATH_REACHABLE = no
SA_KEY_USE_PATH_REACHABLE = no
```

No project IAM mutation builder exists. No custom-role M4 binding, access-token,
Firestore, or service-account-key path exists in the graph.

## Runtime and test locks

```text
G1_M3_RUNTIME_DEPENDENCIES =
[
  tools/authority-audit/m3RuntimeCommandGraph.mjs,
  tools/authority-audit/windowsGcloudProcessAdapter.mjs,
  tools/authority-audit/invokeWindowsExecutable.ps1
]

G1_M3_RUNTIME_LOCKS =
[
  867199eba535c3f1f94241873cc487cd9e7bd0acfd8713273fe960a5222c3ea9,
  512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f,
  2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
]

G1_M3_TEST_LOCKS =
[
  9139ebab01158cf886a9525129153514e9a22f939d3291a8ca7eb4db94ba7692
]
```

The runtime lock list includes the new graph and the existing adapter files it
directly relies on. The test lock covers the synthetic graph test only.

## Validation

```text
FOCUSED_TEST_COUNT = 1 test module
FOCUSED_TEST_RESULT = PASS
TEST_REAL_GCLOUD_SPAWNS = 0
NODE_SYNTAX_CHECK = PASS
TYPECHECK = PASS
EXTERNAL_CAPABILITY_RECONCILIATION_COMPLETE = no
A2_RUNTIME_LOCKS_VALID_FOR_NEW_LIVE_EXECUTION = no
E2_FINAL_MANIFEST_VALID_FOR_NEW_LIVE_EXECUTION = no
OLD_M3Z_APPROVAL_REUSABLE = no
```

G1 does not create final external capability locks. E3R1 must path-bind the
actual graph and SDK surfaces from this implementation before any new live
approval.

## Counters and next stage

```text
PRODUCTION_FIRESTORE_READS = 0
PRODUCTION_FIRESTORE_WRITES = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3Z-E3R1_CONCRETE_COMMAND_GRAPH_EXTERNAL_CAPABILITY_RECONCILIATION`.

No staging, commit, push, deploy, Rules, Indexes, Firebase, IAM, token, or
production data operation was performed.
