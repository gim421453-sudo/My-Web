# P1.5-C2H2E3D-W1C-M3Y-E2 Path-Bound External Capability Final Relock

## Verdict

`P1_5_C2H2E3D_W1C_M3Y_E2_PATH_BOUND_FINAL_RELOCK_NEW_M3_APPROVAL_GATE_PASS`

E2 performed local-only integrity verification and approval preparation. No gcloud
executable, network, IAM, token, impersonation, or Firestore operation was performed.

## Prior evidence

```text
E1_VERDICT = P1_5_C2H2E3D_W1C_M3Y_E1_CANONICAL_SDK_PATH_HASH_RECONCILIATION_PASS
E1_PATH_BOUND_MANIFEST_EXPECTED = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E1_PATH_BOUND_MANIFEST_RECOMPUTED = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E1_PATH_BOUND_MANIFEST_MATCH = yes
```

The recomputation used the exact E1 canonical payload and excluded transient hash
verification fields. A first local attempt included such a temporary field and was
discarded; no persisted evidence or external state was changed.

## Launcher and SDK relock

```text
GCLOUD_LAUNCHER_SELECTION = UNIQUE
GCLOUD_LAUNCHER_RESOLUTION_COUNT = 1
GCLOUD_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
GCLOUD_LAUNCHER_RELATIVE_IDENTITY_MATCH = yes
CANONICAL_SDK_ROOT_FINGERPRINT_MATCH = yes
CLOUD_SDK_VERSION = 580.0.0
SDK_VERSION_METADATA_SHA256_MATCH = yes
```

The future adapter's local resolution order remains `GCLOUD_PATH`, `where.exe`, then
the LOCALAPPDATA SDK fallback. Current environment inspection found only the fallback
candidate. The selected root is proven by launcher, `VERSION`, and
`lib/googlecloudsdk` sentinels. No absolute user-home path is persisted.

## Path-bound capability relock

```text
E1_PATH_BOUND_CAPABILITY_COUNT = 3
ALL_PATH_BOUND_RELATIVE_PATHS_MATCH = yes
ALL_PATH_BOUND_MODULE_IDENTITIES_MATCH = yes
ALL_PATH_BOUND_FILE_HASHES_MATCH = yes
PATH_CONTAINMENT = PASS
```

The three locked records remain:

```text
surface.iam.roles.describe
  lib/surface/iam/roles/describe.py
  cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739

googlecloudsdk.command_lib.iam.iam_util
  lib/googlecloudsdk/command_lib/iam/iam_util.py
  eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c

googlecloudsdk.command_lib.iam.flags
  lib/googlecloudsdk/command_lib/iam/flags.py
  49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2
```

Duplicate basenames do not change the result because the qualified module identities
map to one exact SDK-relative path under the locked root. Full SDK hashing was not
performed.

## Runtime and test lock status

```text
ALL_A2_M3_RUNTIME_LOCKS_MATCH = yes
ALL_A2_M3_TEST_LOCKS_MATCH = yes
PRODUCTION_RUNTIME_CODE_CHANGED = 0
TEST_ONLY_HELPER_RUNTIME_DEPENDENCY = no
E1_LOCAL_HELPER_FUTURE_RUNTIME_DEPENDENCY = no
```

A2 contained empty runtime and test lock sets; no production runtime files were added
or changed in E1/E2. The future M3 graph remains an approval-controlled local adapter,
exact role reader, bounded IAM precheck, additive writer-SA policy mutation, postcheck,
and privacy-safe result serializer. Test helpers are not runtime dependencies.

## Final execution-integrity manifest

The deterministic manifest binds the project identity, writer resource, M3 role,
caller fingerprint, empty A2 runtime/test lock sets, SDK root/version/launcher,
three path-bound capabilities, E1 manifest hash, exact role-read contract, and future
budgets. It contains no raw caller or absolute path.

```text
M3_FINAL_EXECUTION_INTEGRITY_MANIFEST_SHA256 = 478231b5936913e049bc1be3e2a010cd1f181835040ab463c15b29ed98d3d64c
```

## New M3Z contract, not granted

```text
FUTURE_M3_FRESH_AUDIT_ROLE_METADATA_READS_REQUIRED = yes
FUTURE_M3_AUDIT_ROLE_METADATA_READ_MAX = 2
EXPECTED_ACTIVE_CALLER_COUNT = 1
EXPECTED_ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
M3_RESOURCE_SCOPE = exact-writer-service-account
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
M4_MUTATION_MAX = 0
WRITER_SA_IAM_CONCURRENCY_GUARD = PASS
UNRELATED_WRITER_SA_BINDINGS_PRESERVED = yes
ACCESS_TOKEN_MAX = 0
FIRESTORE_MAX = 0
```

The new stage name is `P1.5-C2H2E3D-W1C-M3Z`. It may authorize only one exact
writer-SA `roles/iam.serviceAccountTokenCreator` binding after fresh bounded checks.
M4, project-wide Token Creator, custom-role changes, audit-SA changes, Firebase Admin
changes, token generation, Firestore, Class writes, and manifest persistence remain
excluded.

```text
OLD_M3Y_APPROVAL_REUSED = no
NEW_M3Z_LIVE_MUTATION_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_P1.5-C2H2E3D-W1C-M3Z_LIVE_MUTATION_APPROVAL
```

## Focused local validation

```text
E2_FOCUSED_TEST_COUNT = 17
E2_FOCUSED_TEST_RESULT = PASS
```

The matrix covered runtime/root/launcher/version drift, path and hash mismatch,
wrong-role and full-resource input rejection, permission drift, M3/M4/project-token
gates, audit regression, concurrency conflict, ambiguous mutation, retry zero, and
successful M3 with M4 absent.

## Safety accounting

```text
REAL_GCLOUD_EXECUTIONS = 0
GCLOUD_NETWORK_CALLS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
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

No raw caller principal, credential, token, private key, full IAM policy, or unnecessary
user-specific absolute path is stored in this document.
