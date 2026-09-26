# P1.5-C2H2E3D-W1C-M3Z-E4 Complete External Capability Composite Relock

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_E4_COMPLETE_EXTERNAL_CAPABILITY_FINAL_COMPOSITE_RELOCK_PASS`

This is a local static composite relock only. No gcloud executable, IAM API,
Firebase API, Firestore API, token endpoint, or production data source was
accessed. The new M3 live approval is explicitly **not granted**.

## Baseline and scope

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
G1_RUNTIME_GRAPH = tools/authority-audit/m3RuntimeCommandGraph.mjs
G1_RUNTIME_DEFAULT_ENABLED = false
SDK_VERSION = 580.0.0
SDK_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
SDK_ROOT_FINGERPRINT = sha256-v1:88b370c33a4ab20a0f11eb9041e711d89f623b52a5d0344b262afce9907a659b
E1_MANIFEST_SHA256 = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E3R1_MANIFEST_SHA256 = 11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d
G1_RUNTIME_LOCKS = 867199eba535c3f1f94241873cc487cd9e7bd0acfd8713273fe960a5222c3ea9,512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f,2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
G1_TEST_LOCKS = 9139ebab01158cf886a9525129153514e9a22f939d3291a8ca7eb4db94ba7692
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
WRITER_SERVICE_ACCOUNT = myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
M3_ROLE = roles/iam.serviceAccountTokenCreator
EXPECTED_ACTIVE_CALLER_COUNT = 1
EXPECTED_ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
IAM_CONCURRENCY_RESPONSIBILITY = SDK_ONLY
```

The caller is represented only by the pre-existing fingerprint. No raw caller
principal is included in this composite record.

## Complete capability inventory

The current graph has 15 unique external capability records: the three exact
E1 role-read records and the twelve E3R1 records. The E1 and E3R1 manifest
hashes above are immutable references; the table below makes the path-bound
inventory auditable without requiring a live command.

| ID | Graph node(s) | Qualified component | SDK-relative path | SHA-256 |
|---|---|---|---|---|
| E1.surface.iam.roles.describe | ROLE_STAGE1, ROLE_CANONICAL | `surface.iam.roles.describe` | `lib/surface/iam/roles/describe.py` | `cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739` |
| E1.googlecloudsdk.command_lib.iam.iam_util | ROLE_STAGE1, ROLE_CANONICAL, OP_B, OP_C_PRE, OP_C_POST, OP_E | `googlecloudsdk.command_lib.iam.iam_util` | `lib/googlecloudsdk/command_lib/iam/iam_util.py` | `eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c` |
| E1.googlecloudsdk.command_lib.iam.flags | ROLE_STAGE1, ROLE_CANONICAL | `googlecloudsdk.command_lib.iam.flags` | `lib/googlecloudsdk/command_lib/iam/flags.py` | `49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2` |
| E3R1_AUTH_LIST_SURFACE | OP_A | `surface.auth.list` | `lib/surface/auth/list.py` | `5e6effb9cd500b77f157ca4ee2480ac2dbaa6a03a89a56c1bb9b8fd8c08f2c9f` |
| E3R1_AUTH_CREDENTIAL_STORE | OP_A | `googlecloudsdk.core.credentials.store` | `lib/googlecloudsdk/core/credentials/store.py` | `1fcb3b856eb1584491d6f6160983808ca1f3574e44de86f53ac8d86f882e2a6f` |
| E3R1_SA_DESCRIBE_SURFACE | OP_B | `surface.iam.service_accounts.describe` | `lib/surface/iam/service_accounts/describe.py` | `e44a2fa74029ddf2205212c4ae5242abb396926389d01e7df0b7dc84c2ad9e97` |
| E3R1_IAM_API_UTIL | OP_B, OP_C_PRE, OP_C_POST | `googlecloudsdk.api_lib.iam.util` | `lib/googlecloudsdk/api_lib/iam/util.py` | `c937f8fba54e954e6df7c36b05c15c3481cf3f491e9deb8836ca236c6f4f1ace` |
| E3R1_SA_POLICY_SURFACE | OP_C_PRE, OP_C_POST | `surface.iam.service_accounts.get_iam_policy` | `lib/surface/iam/service_accounts/get_iam_policy.py` | `d462fb1e622d70dc1396b9834a3e73cfd42253939fc8d38f018a0a2b368493cb` |
| E3R1_PROJECT_POLICY_SURFACE | OP_D_PRE, OP_D_POST | `surface.projects.get_iam_policy` | `lib/surface/projects/get_iam_policy.py` | `8c4b508f7d8edb65469e8379960af9fab9ad111b56b9867a4c1657598fa3b5b5` |
| E3R1_PROJECT_FLAGS | OP_D_PRE, OP_D_POST | `googlecloudsdk.command_lib.projects.flags` | `lib/googlecloudsdk/command_lib/projects/flags.py` | `8428e8ee07add7609a62ba6d3abf295fca96d9078a5e94e676297f2792748955` |
| E3R1_PROJECT_UTIL | OP_D_PRE, OP_D_POST | `googlecloudsdk.command_lib.projects.util` | `lib/googlecloudsdk/command_lib/projects/util.py` | `9201fc0e4a3a244ac30eaf6b7ac538c27beee36f1a9b2c9c01e1aa21baa174c6` |
| E3R1_PROJECTS_API | OP_D_PRE, OP_D_POST | `googlecloudsdk.api_lib.cloudresourcemanager.projects_api` | `lib/googlecloudsdk/api_lib/cloudresourcemanager/projects_api.py` | `e08ed37b822d57201fab09c7d117e31fa5ab2fbb840f600cbdf87402e6370823` |
| E3R1_SA_BINDING_SCHEMA | OP_E | `surface.iam.service_accounts.add_iam_policy_binding` | `lib/surface/iam/service_accounts/add_iam_policy_binding.yaml` | `fcf41f4485dcdb29457feb081a82829013ff74c78543e3d1777fe6b01ad22042` |
| E3R1_YAML_TRANSLATOR | OP_E | `googlecloudsdk.command_lib.util.apis.yaml_command_translator.AddIamPolicyBindingCommandGenerator` | `lib/googlecloudsdk/command_lib/util/apis/yaml_command_translator.py` | `45eed2296837b2b4eadc9a228f050574ba8629ceec059f5cbb546fbb9460f796` |
| E3R1_IAM_RESOURCES | OP_E | `googlecloudsdk.command_lib.iam.resources.service_account` | `lib/googlecloudsdk/command_lib/iam/resources.yaml` | `4f98b44238a7f137be027c6338283a5e4ce7e402fb2270e718c1a0ccce692ee8` |

## Graph and budgets

```text
GRAPH_NODES = ROLE_STAGE1,ROLE_CANONICAL,OP_A,OP_B,OP_C_PRE,OP_D_PRE,OP_E,OP_C_POST,OP_D_POST
GRAPH_NODE_COUNT = 9
GRAPH_NODE_COVERED_COUNT = 9
UNBOUND_GRAPH_NODE_COUNT = 0
ALL_G1_EXTERNAL_GRAPH_NODES_COVERED = yes

STAGE1_ROLE_METADATA_READ_MAX = 1
CANONICAL_ROLE_METADATA_READ_MAX = 1
ACTIVE_CALLER_DISCOVERY_MAX = 1
WRITER_SA_METADATA_READ_MAX = 1
WRITER_SA_IAM_POLICY_PRECHECK_MAX = 1
PROJECT_IAM_POLICY_PRECHECK_MAX = 1
WRITER_SA_IAM_POLICY_POSTCHECK_MAX = 1
PROJECT_IAM_POLICY_POSTCHECK_MAX = 1
ALL_READ_RETRIES_MAX = 0
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
M4_MUTATION_MAX = 0
PROJECT_IAM_MUTATION_MAX = 0
CUSTOM_ROLE_MUTATION_MAX = 0
AUDIT_SA_MUTATION_MAX = 0
FIREBASE_ADMIN_MUTATION_MAX = 0
ACCESS_TOKEN_MAX = 0
WRITER_IMPERSONATION_MAX = 0
FIRESTORE_API_CALL_MAX = 0
SERVICE_ACCOUNT_KEY_ACCESS_MAX = 0
```

The only future mutation surface is the exact writer service-account binding
with `roles/iam.serviceAccountTokenCreator`. Project IAM mutation, custom-role
mutation, token generation, writer impersonation, Firestore, service-account
key, and M4 paths are absent.

## Precondition and stop contract

Before any future M3 approval could be considered, both exact custom roles,
one active caller matching the locked fingerprint, an enabled exact writer
service account, a safe fresh audit baseline, and the required absence/presence
predicates must be re-established. A timeout, nonzero exit, ambiguous result,
or failed postcondition stops with zero retry and no automatic rollback.

```text
DEFAULT_LIVE_EXECUTION_ENABLED = false
IMPORT_TIME_EXTERNAL_EXECUTION = 0
COMMAND_GRAPH_BUILD_EXTERNAL_EXECUTION = 0
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
M4_COMMAND_BUILDER_PRESENT = no
M4_RUNTIME_PATH_REACHABLE = no
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
AUTOMATIC_IAM_ROLLBACK = no
```

## Canonical composite payload

The following newline-delimited payload is the sole input to the composite
manifest hash. It intentionally excludes timestamps, dirty counts, raw caller
principals, absolute local paths, credentials, and policy payloads.

```text
M3_E4_COMPOSITE_V1
project=my-management-app-8a933
projectNumber=607154464656
writerServiceAccount=myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
m3Role=roles/iam.serviceAccountTokenCreator
expectedActiveCallerCount=1
expectedActiveCallerFingerprint=sha256/12:5e6692dda08c
sdkVersion=580.0.0
launcherRelativeIdentity=bin/gcloud.cmd
sdkRootFingerprint=sha256-v1:88b370c33a4ab20a0f11eb9041e711d89f623b52a5d0344b262afce9907a659b
e1Manifest=081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
e3r1Manifest=11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d
g1RuntimeLocks=867199eba535c3f1f94241873cc487cd9e7bd0acfd8713273fe960a5222c3ea9,512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f,2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
g1TestLocks=9139ebab01158cf886a9525129153514e9a22f939d3291a8ca7eb4db94ba7692
graph=ROLE_STAGE1,ROLE_CANONICAL,OP_A,OP_B,OP_C_PRE,OP_D_PRE,OP_E,OP_C_POST,OP_D_POST
coverage=ROLE_STAGE1:E1;ROLE_CANONICAL:E1;OP_A:E3R1_AUTH_LIST_SURFACE+E3R1_AUTH_CREDENTIAL_STORE;OP_B:E3R1_SA_DESCRIBE_SURFACE+E1_IAM_UTIL+E3R1_IAM_API_UTIL;OP_C_PRE:E3R1_SA_POLICY_SURFACE+E1_IAM_UTIL+E3R1_IAM_API_UTIL;OP_D_PRE:E3R1_PROJECT_POLICY_SURFACE+E3R1_PROJECT_FLAGS+E3R1_PROJECT_UTIL+E3R1_PROJECTS_API;OP_E:E3R1_SA_BINDING_SCHEMA+E3R1_YAML_TRANSLATOR+E1_IAM_UTIL+E3R1_IAM_RESOURCES;OP_C_POST:E3R1_SA_POLICY_SURFACE+E1_IAM_UTIL+E3R1_IAM_API_UTIL;OP_D_POST:E3R1_PROJECT_POLICY_SURFACE+E3R1_PROJECT_FLAGS+E3R1_PROJECT_UTIL+E3R1_PROJECTS_API
concurrency=SDK_ONLY
readBudgets=1,1,1,1,1,1,1,1
mutationBudgets=M3:1,M4:0,PROJECT_IAM:0,CUSTOM_ROLE:0,AUDIT_SA:0,FIREBASE_ADMIN:0
forbidden=TOKEN_GENERATION:0,WRITER_IMPERSONATION:0,FIRESTORE:0,SERVICE_ACCOUNT_KEY:0,PROJECT_IAM_MUTATION_NODE:absent,M4_RUNTIME:unreachable
```

```text
M3_E4_COMPOSITE_MANIFEST_SHA256 = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
```

## Local validation and approval state

```text
G1_RUNTIME_LOCK_RECOMPUTED = yes
G1_TEST_LOCK_RECOMPUTED = yes
E1_MANIFEST_RECOMPUTED = yes
E1_MANIFEST_MATCH = yes
E3R1_MANIFEST_RECOMPUTED = yes
E3R1_MANIFEST_MATCH = yes
CAPABILITY_COUNT = 15
GRAPH_COVERAGE = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
```

This document is the final local relock and approval gate only. It does not
authorize, schedule, or execute the future M3 mutation.
