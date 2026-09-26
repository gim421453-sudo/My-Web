# P1.5-C2H2E3D-W1C-M3Y-E1 Cloud SDK Canonical Path and Hash Reconciliation

## Verdict

`P1_5_C2H2E3D_W1C_M3Y_E1_CANONICAL_SDK_PATH_HASH_RECONCILIATION_PASS`

This was local external-capability forensics only. No gcloud executable was invoked,
and no live cloud or IAM operation occurred.

## Prior-stage accounting

```text
M3Y_VERDICT = P1_5_C2H2E3D_W1C_M3Y_EXTERNAL_CAPABILITY_DRIFT_ABORT
M3Y_LIVE_GCLOUD_EXECUTIONS = 0
M3Y_LIVE_IAM_READS = 0
M3Y_IAM_MUTATIONS = 0
OLD_M3Y_APPROVAL_REUSED = no
A2_VERDICT = P1_5_C2H2E3D_W1C_M3X_A2_FINAL_RELOCK_NEW_M3_APPROVAL_GATE_PASS
A2_EXTERNAL_CAPABILITY_LOCK_COUNT = 3
A2_EXTERNAL_CAPABILITY_LOCK_PATH_BOUND = no
```

## Launcher and SDK root

The repository's future local process adapter is
`tools/authority-audit/windowsGcloudProcessAdapter.mjs`. Its deterministic precedence
is `GCLOUD_PATH`, then `where.exe gcloud.cmd`, then the `LOCALAPPDATA` Cloud SDK
location. Static inspection found no `GCLOUD_PATH`, no PATH `gcloud.cmd`, and one valid
LOCALAPPDATA candidate. The launcher is therefore selected without executing it.

```text
GCLOUD_LAUNCHER_RESOLUTION_COUNT = 1
GCLOUD_LAUNCHER_SELECTION = UNIQUE
FUTURE_M3_GCLOUD_SELECTION_MECHANISM = windowsGcloudProcessAdapter.mjs explicit local resolution, then PowerShell -File argument-array host
FUTURE_M3_GCLOUD_RUNTIME_SELECTION_PROVEN = yes
GCLOUD_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
GCLOUD_LAUNCHER_SHA256 = a1eccc60e26714cbff8c7f6a0aa8577a1f83073cdc33d80b671d0686f4ff2ef1
CANONICAL_CLOUD_SDK_ROOT = RESOLVED
CANONICAL_SDK_ROOT_FINGERPRINT = sha256-v1:88b370c33a4ab20a0f11eb9041e711d89f623b52a5d0344b262afce9907a659b
```

The root was cross-checked by the launcher, `VERSION`, and
`lib/googlecloudsdk` sentinels. The root fingerprint uses the normalized absolute
Windows path, converts separators to `/`, removes the trailing separator, lowercases
for Windows case-insensitive identity, then SHA-256 hashes the UTF-8 bytes. The
absolute user path is not persisted.

```text
CLOUD_SDK_VERSION = 580.0.0
SDK_VERSION_METADATA_RELATIVE_PATH = VERSION
SDK_VERSION_METADATA_SHA256 = 3438cbff7b43185435735f5836141b180593ac7b15f332e2504d9922afe15897
```

## A2 lock reconciliation

A2 did not record logical filenames separately; its three logical identities and hashes
were recovered exactly. Static source tracing of the approved `iam roles describe`
command binds them to the following qualified components and paths:

```text
CAPABILITY_1_A2_LOGICAL_IDENTITY = iam-roles-describe-command
CAPABILITY_1_A2_LOGICAL_FILENAME = not_recorded
CAPABILITY_1_QUALIFIED_MODULE_OR_COMPONENT = surface.iam.roles.describe
CAPABILITY_1_SDK_ROOT_RELATIVE_PATH = lib/surface/iam/roles/describe.py
CAPABILITY_1_A2_SHA256 = cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739
CAPABILITY_1_CURRENT_SHA256 = cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739
CAPABILITY_1_SHA256_MATCH = yes
CAPABILITY_1_PATH_TO_HASH_MAPPING_UNIQUE = yes

CAPABILITY_2_A2_LOGICAL_IDENTITY = iam-role-name-normalization
CAPABILITY_2_A2_LOGICAL_FILENAME = not_recorded
CAPABILITY_2_QUALIFIED_MODULE_OR_COMPONENT = googlecloudsdk.command_lib.iam.iam_util
CAPABILITY_2_SDK_ROOT_RELATIVE_PATH = lib/googlecloudsdk/command_lib/iam/iam_util.py
CAPABILITY_2_A2_SHA256 = eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c
CAPABILITY_2_CURRENT_SHA256 = eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c
CAPABILITY_2_SHA256_MATCH = yes
CAPABILITY_2_PATH_TO_HASH_MAPPING_UNIQUE = yes

CAPABILITY_3_A2_LOGICAL_IDENTITY = iam-role-argument-contract
CAPABILITY_3_A2_LOGICAL_FILENAME = not_recorded
CAPABILITY_3_QUALIFIED_MODULE_OR_COMPONENT = googlecloudsdk.command_lib.iam.flags
CAPABILITY_3_SDK_ROOT_RELATIVE_PATH = lib/googlecloudsdk/command_lib/iam/flags.py
CAPABILITY_3_A2_SHA256 = 49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2
CAPABILITY_3_CURRENT_SHA256 = 49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2
CAPABILITY_3_SHA256_MATCH = yes
CAPABILITY_3_PATH_TO_HASH_MAPPING_UNIQUE = yes
```

The canonical source graph proves that `describe.py` imports the qualified
`googlecloudsdk.command_lib.iam.flags` and `iam_util` modules. Within the SDK root
there are many basename duplicates (`describe.py`: 578, `flags.py`: 273), but the
qualified module paths above each resolve to one contained file. The selection is not
based on first result, shortest path, alphabetic order, or hash alone.

```text
ALL_A2_EXTERNAL_CAPABILITY_HASHES_MATCH = yes
ALL_EXTERNAL_CAPABILITY_PATHS_PROVEN = yes
PATH_CONTAINMENT = PASS
WINDOWS_PATH_NORMALIZATION_CONTRACT = absolute root identity is lowercased with / separators and no trailing separator; relative paths use / and reject traversal
PERSISTED_USER_HOME_PATH = no
FULL_SDK_HASH = not_performed
```

No selected launcher or source file was a reparse point. Every selected path remained
inside the resolved SDK root.

## Path-bound lock manifest

```text
M3_PATH_BOUND_EXTERNAL_CAPABILITY_LOCKS = [
  { logicalIdentity = iam-roles-describe-command, qualifiedModuleOrComponent = surface.iam.roles.describe, sdkRootRelativePath = lib/surface/iam/roles/describe.py, sha256 = cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739 },
  { logicalIdentity = iam-role-name-normalization, qualifiedModuleOrComponent = googlecloudsdk.command_lib.iam.iam_util, sdkRootRelativePath = lib/googlecloudsdk/command_lib/iam/iam_util.py, sha256 = eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c },
  { logicalIdentity = iam-role-argument-contract, qualifiedModuleOrComponent = googlecloudsdk.command_lib.iam.flags, sdkRootRelativePath = lib/googlecloudsdk/command_lib/iam/flags.py, sha256 = 49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2 }
]
M3_PATH_BOUND_EXTERNAL_CAPABILITY_LOCK_COUNT = 3
M3_PATH_BOUND_EXTERNAL_CAPABILITY_MANIFEST_SHA256 = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
```

The manifest hash uses canonical compact JSON with sorted capability entries and covers
the SDK root fingerprint, launcher relative identity, qualified components, relative
paths, logical identities, and file hashes. It contains no timestamp or user path.

## Synthetic local validation

```text
E1_FOCUSED_LOCAL_TEST_COUNT = 12
E1_FOCUSED_LOCAL_TEST_RESULT = PASS
```

Covered unique/ambiguous launcher selection, root resolution, relative path
normalization, duplicate same-name and same-hash candidates, wrong module/hash,
second SDK root, containment, Windows case/separator normalization, and path-bound
manifest comparison. Duplicate filenames and duplicate hashes never select a file
without qualified runtime path proof.

## Approval state and safety

```text
PRODUCTION_RUNTIME_CODE_CHANGED = no
E1_LOCAL_HELPER_CREATED = no
E1_LOCAL_HELPER_FUTURE_RUNTIME_DEPENDENCY = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
```

```text
REAL_GCLOUD_EXECUTIONS = 0
GCLOUD_NETWORK_CALLS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

M3Y remains aborted and was not retried. The next stage is E2 path-bound external
capability final relock plus a new M3 live mutation approval gate.
