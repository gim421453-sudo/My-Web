# P1.5-C2H2E3D-W1C-M3Z-E3R1 Concrete Graph Capability Reconciliation

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_E3R1_CONCRETE_GRAPH_EXTERNAL_CAPABILITY_RECONCILIATION_PASS`

This was a local static reconciliation of the concrete G1 graph. No gcloud
process, network, IAM, token, Firestore, or production operation was executed.

## Baseline and lock status

```text
G1_VERDICT = P1_5_C2H2E3D_W1C_M3Z_G1_M3_RUNTIME_COMMAND_GRAPH_IMPLEMENTATION_PASS
PREVIOUS_E3_VERDICT = P1_5_C2H2E3D_W1C_M3Z_E3_RUNTIME_COMMAND_GRAPH_INCOMPLETE
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
DIRTY_COUNT = 217

ALL_G1_M3_RUNTIME_LOCKS_MATCH = yes
ALL_G1_M3_TEST_LOCKS_MATCH = yes
DEFAULT_LIVE_EXECUTION_ENABLED = false
IMPORT_TIME_EXTERNAL_EXECUTION = 0
COMMAND_GRAPH_BUILD_EXTERNAL_EXECUTION = 0
ACCIDENTAL_LIVE_ENTRYPOINT = no

GCLOUD_LAUNCHER_SELECTION = UNIQUE
GCLOUD_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
CANONICAL_SDK_ROOT_FINGERPRINT_MATCH = yes
CLOUD_SDK_VERSION = 580.0.0
EXISTING_E1_CAPABILITY_COUNT = 3
EXISTING_E1_CAPABILITIES_MATCH = yes
E1_MANIFEST_RECOMPUTED = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E1_MANIFEST_MATCH = yes
E1_MANIFEST_MODIFIED = no
E2_FINAL_MANIFEST_STATUS = historical_invalidated_by_G1_runtime_change
```

The three E1 role-read capabilities were reused only where the qualified
runtime identity and relative path matched exactly. No E1 value was replaced.

## Graph surfaces

The source of truth was the G1 builders in
`tools/authority-audit/m3RuntimeCommandGraph.mjs`. The graph has 9 nodes:

```text
ROLE_STAGE1
ROLE_CANONICAL
OP_A
OP_B
OP_C_PRE
OP_D_PRE
OP_E
OP_C_POST
OP_D_POST
```

The concrete argv forms are:

```text
ROLE_STAGE1 / ROLE_CANONICAL:
iam roles describe <allowed-short-role-id>
--project=my-management-app-8a933 --format=json --verbosity=error

OP_A:
auth list --filter=status:ACTIVE --format=value(account) --verbosity=error

OP_B:
iam service-accounts describe <exact-writer-service-account>
--format=json --verbosity=error

OP_C_PRE / OP_C_POST:
iam service-accounts get-iam-policy <exact-writer-service-account>
--format=json --verbosity=error

OP_D_PRE / OP_D_POST:
projects get-iam-policy my-management-app-8a933
--format=json --verbosity=error

OP_E:
iam service-accounts add-iam-policy-binding <exact-writer-service-account>
--member=<transient-verified-caller>
--role=roles/iam.serviceAccountTokenCreator --condition=None --quiet
--verbosity=error
```

No raw caller value is persisted in this document.

## New capability records

```text
NEW_E3R1_EXTERNAL_CAPABILITY_LOCK_COUNT = 12
```

| ID | Graph nodes | Qualified component | SDK-relative path | SHA-256 | Security role |
|---|---|---|---|---|---|
| `E3R1_AUTH_LIST_SURFACE` | OP_A | `surface.auth.list` | `lib/surface/auth/list.py` | `5e6effb9cd500b77f157ca4ee2480ac2dbaa6a03a89a56c1bb9b8fd8c08f2c9f` | active-account selection |
| `E3R1_AUTH_CREDENTIAL_STORE` | OP_A | `googlecloudsdk.core.credentials.store` | `lib/googlecloudsdk/core/credentials/store.py` | `1fcb3b856eb1584491d6f6160983808ca1f3574e44de86f53ac8d86f882e2a6f` | active-account state |
| `E3R1_SA_DESCRIBE_SURFACE` | OP_B | `surface.iam.service_accounts.describe` | `lib/surface/iam/service_accounts/describe.py` | `e44a2fa74029ddf2205212c4ae5242abb396926389d01e7df0b7dc84c2ad9e97` | exact service-account metadata |
| `E3R1_SA_POLICY_SURFACE` | OP_C_PRE, OP_C_POST | `surface.iam.service_accounts.get_iam_policy` | `lib/surface/iam/service_accounts/get_iam_policy.py` | `d462fb1e622d70dc1396b9834a3e73cfd42253939fc8d38f018a0a2b368493cb` | exact service-account policy read |
| `E3R1_IAM_API_UTIL` | OP_B, OP_C_PRE, OP_C_POST | `googlecloudsdk.api_lib.iam.util` | `lib/googlecloudsdk/api_lib/iam/util.py` | `c937f8fba54e954e6df7c36b05c15c3481cf3f491e9deb8836ca236c6f4f1ace` | resource request construction |
| `E3R1_PROJECT_POLICY_SURFACE` | OP_D_PRE, OP_D_POST | `surface.projects.get_iam_policy` | `lib/surface/projects/get_iam_policy.py` | `8c4b508f7d8edb65469e8379960af9fab9ad111b56b9867a4c1657598fa3b5b5` | exact project policy read |
| `E3R1_PROJECT_FLAGS` | OP_D_PRE, OP_D_POST | `googlecloudsdk.command_lib.projects.flags` | `lib/googlecloudsdk/command_lib/projects/flags.py` | `8428e8ee07add7609a62ba6d3abf295fca96d9078a5e94e676297f2792748955` | project ID argument contract |
| `E3R1_PROJECT_UTIL` | OP_D_PRE, OP_D_POST | `googlecloudsdk.command_lib.projects.util` | `lib/googlecloudsdk/command_lib/projects/util.py` | `9201fc0e4a3a244ac30eaf6b7ac538c27beee36f1a9b2c9c01e1aa21baa174c6` | project resource parsing |
| `E3R1_PROJECTS_API` | OP_D_PRE, OP_D_POST | `googlecloudsdk.api_lib.cloudresourcemanager.projects_api` | `lib/googlecloudsdk/api_lib/cloudresourcemanager/projects_api.py` | `e08ed37b822d57201fab09c7d117e31fa5ab2fbb840f600cbdf87402e6370823` | project IAM request |
| `E3R1_SA_BINDING_SCHEMA` | OP_E | `surface.iam.service_accounts.add_iam_policy_binding` | `lib/surface/iam/service_accounts/add_iam_policy_binding.yaml` | `fcf41f4485dcdb29457feb081a82829013ff74c78543e3d1777fe6b01ad22042` | exact binding command contract |
| `E3R1_YAML_TRANSLATOR` | OP_E | `googlecloudsdk.command_lib.util.apis.yaml_command_translator.AddIamPolicyBindingCommandGenerator` | `lib/googlecloudsdk/command_lib/util/apis/yaml_command_translator.py` | `45eed2296837b2b4eadc9a228f050574ba8629ceec059f5cbb546fbb9460f796` | policy read-modify-set and etag |
| `E3R1_IAM_RESOURCES` | OP_E | `googlecloudsdk.command_lib.iam.resources.service_account` | `lib/googlecloudsdk/command_lib/iam/resources.yaml` | `4f98b44238a7f137be027c6338283a5e4ce7e402fb2270e718c1a0ccce692ee8` | exact service-account target parsing |

Duplicate basenames were resolved by qualified component identity. No full SDK
hash was performed.

## Coverage matrix

```text
ROLE_STAGE1 = [E1.surface.iam.roles.describe, E1.googlecloudsdk.command_lib.iam.iam_util, E1.googlecloudsdk.command_lib.iam.flags]
ROLE_CANONICAL = [E1.surface.iam.roles.describe, E1.googlecloudsdk.command_lib.iam.iam_util, E1.googlecloudsdk.command_lib.iam.flags]
OP_A = [E3R1_AUTH_LIST_SURFACE, E3R1_AUTH_CREDENTIAL_STORE]
OP_B = [E3R1_SA_DESCRIBE_SURFACE, E1.googlecloudsdk.command_lib.iam.iam_util, E3R1_IAM_API_UTIL]
OP_C_PRE = [E3R1_SA_POLICY_SURFACE, E1.googlecloudsdk.command_lib.iam.iam_util, E3R1_IAM_API_UTIL]
OP_D_PRE = [E3R1_PROJECT_POLICY_SURFACE, E3R1_PROJECT_FLAGS, E3R1_PROJECT_UTIL, E3R1_PROJECTS_API]
OP_E = [E3R1_SA_BINDING_SCHEMA, E3R1_YAML_TRANSLATOR, E1.googlecloudsdk.command_lib.iam.iam_util, E3R1_IAM_RESOURCES]
OP_C_POST = [E3R1_SA_POLICY_SURFACE, E1.googlecloudsdk.command_lib.iam.iam_util, E3R1_IAM_API_UTIL]
OP_D_POST = [E3R1_PROJECT_POLICY_SURFACE, E3R1_PROJECT_FLAGS, E3R1_PROJECT_UTIL, E3R1_PROJECTS_API]

UNBOUND_GRAPH_NODE_COUNT = 0
ALL_G1_EXTERNAL_GRAPH_NODES_COVERED = yes
ROLE_READ_EXTERNAL_CAPABILITY_COVERAGE = E1_EXACT_MATCH
OP_A_EXTERNAL_CAPABILITY_PROVEN = yes
OP_B_EXTERNAL_CAPABILITY_PROVEN = yes
OP_C_EXTERNAL_CAPABILITY_PROVEN = yes
OP_D_EXTERNAL_CAPABILITY_PROVEN = yes
OP_E_EXTERNAL_CAPABILITY_PROVEN = yes
OP_A_ACTIVE_CALLER_SELECTION_CAPABILITY_COMPLETE = yes
OP_B_WRITER_METADATA_CAPABILITY_COMPLETE = yes
OP_C_WRITER_IAM_READ_CAPABILITY_COMPLETE = yes
OP_D_PROJECT_IAM_READ_CAPABILITY_COMPLETE = yes
OP_E_EXTERNAL_CAPABILITY_COMPLETE = yes
```

The concurrency responsibility is `SDK_ONLY`: the YAML translator retrieves
the current policy, applies `iam_util.AddBindingToIamPolicy`, and sends the
policy containing its etag through the set-policy request. The static evidence
is in the translator's `_GetIamPolicy` and add-binding flow and the IAM helper's
binding function. No retry is introduced by the repository runtime.

```text
IAM_CONCURRENCY_RESPONSIBILITY = SDK_ONLY
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
M4_COMMAND_BUILDER_PRESENT = no
M4_RUNTIME_PATH_REACHABLE = no
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
```

## Supplemental manifest

The canonical payload binds SDK identity, the immutable E1 manifest, all three
G1 runtime hashes, the 12 new records, and the matrix above. It contains no
timestamp, absolute user path, raw caller, token, or policy payload.

```text
M3_E3R1_CONCRETE_GRAPH_EXTERNAL_CAPABILITY_MANIFEST_SHA256 =
11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d
```

## Validation and safety

```text
FOCUSED_TEST_COUNT = G1 synthetic graph test plus local static path/hash checks
FOCUSED_TEST_RESULT = PASS
E3R1_LOCAL_HELPER_FUTURE_RUNTIME_DEPENDENCY = no
PRODUCTION_RUNTIME_CODE_CHANGED = 0

REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0

NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

No raw caller, token, authorization value, credential JSON, private key, full
IAM policy, or unnecessary personal absolute path was persisted.

Recommended next action:
`P1.5-C2H2E3D-W1C-M3Z-E4_COMPLETE_EXTERNAL_CAPABILITY_FINAL_COMPOSITE_RELOCK`.
