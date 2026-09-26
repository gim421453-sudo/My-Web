# P1.5-C2H2E3D-W1C-M3Z-E3 Missing Live Command Capability Reconciliation

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_E3_RUNTIME_COMMAND_GRAPH_INCOMPLETE`

This local-only forensic pass did not find an implemented M3Z live runner that
constructs the five approved IAM operations. The repository contains the
general Windows process adapter and older audit/token-read callers, but no
current M3 runtime caller whose argv and Cloud SDK command surfaces can be
traced for OP-A through OP-E. Because E3 forbids inventing command forms or
hashing a guessed module, no new external capability was accepted.

## Baseline and prior locks

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
OLD_M3Z_APPROVAL_STATUS = ABORTED
OLD_M3Z_APPROVAL_REUSED = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED

E1_MANIFEST = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E2_MANIFEST = 478231b5936913e049bc1be3e2a010cd1f181835040ab463c15b29ed98d3d64c
GCLOUD_LAUNCHER_SELECTION = UNIQUE
GCLOUD_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
CANONICAL_SDK_ROOT_FINGERPRINT_MATCH = yes
CLOUD_SDK_VERSION = 580.0.0
EXISTING_E1_PATH_BOUND_CAPABILITIES_MATCH = yes
E1_MANIFEST_MODIFIED = no
FULL_SDK_HASH = not_performed
```

The existing three E1 path-bound records remain unchanged. Local inspection
also confirmed the locked launcher identity, SDK version, and the three exact
E1 file hashes. No gcloud executable was invoked.

## Repository runtime trace

| Operation | Required evidence | Repository result | Capability result |
|---|---|---|---|
| OP-A active caller discovery | current M3 caller and exact argv | no current M3 caller found | unresolved |
| OP-B writer SA metadata read | current M3 caller and exact argv | no current M3 caller found | unresolved |
| OP-C writer-SA IAM policy read | current M3 caller and exact argv | no current M3 caller found | unresolved |
| OP-D project IAM policy read | current M3 caller and exact argv | no current M3 caller found | unresolved |
| OP-E writer-SA IAM mutation | current M3 caller, policy preservation, exact argv | no current M3 caller found | unresolved |

The only relevant repository process surface found is the generic Windows
process adapter used by older audit tooling. Its presence does not prove the
M3Z command graph, IAM policy semantics, or mutation concurrency behavior.
Historical approval documents are evidence of intended commands, not an
implemented runtime caller, and were not used to manufacture capability locks.

```text
OP_A_COMMAND_ARGV_TEMPLATE = UNRESOLVED
OP_B_COMMAND_ARGV_TEMPLATE = UNRESOLVED
OP_C_COMMAND_ARGV_TEMPLATE = UNRESOLVED
OP_D_COMMAND_ARGV_TEMPLATE = UNRESOLVED
OP_E_COMMAND_ARGV_TEMPLATE = UNRESOLVED

OP_A_GCLOUD_SURFACE = UNRESOLVED
OP_B_GCLOUD_SURFACE = UNRESOLVED
OP_C_GCLOUD_SURFACE = UNRESOLVED
OP_D_GCLOUD_SURFACE = UNRESOLVED
OP_E_GCLOUD_SURFACE = UNRESOLVED

ACTIVE_CALLER_SELECTION_EXTERNAL_CAPABILITY_PROVEN = no
WRITER_SA_METADATA_EXTERNAL_CAPABILITY_PROVEN = no
WRITER_SA_IAM_READ_EXTERNAL_CAPABILITY_PROVEN = no
PROJECT_IAM_READ_EXTERNAL_CAPABILITY_PROVEN = no
M3_MUTATION_EXTERNAL_CAPABILITY_PROVEN = no
IAM_CONCURRENCY_EXTERNAL_CAPABILITY_PATH_BOUND = no
M4_EXTERNAL_COMMAND_PATH_REACHABLE = no
```

`M4_EXTERNAL_COMMAND_PATH_REACHABLE = no` means no reachable M4 path was found
in the inspected current M3 graph; it does not grant M4 approval.

## Capability inventory

```text
NEW_EXTERNAL_CAPABILITY_LOCK_COUNT = 0
NEW_EXTERNAL_CAPABILITY_LOCKS = []
LIVE_OPERATION_CAPABILITY_MATRIX = UNRESOLVED_FOR_ALL_OP_A_TO_OP_E
UNBOUND_LIVE_OPERATION_COUNT = 5
ALL_M3_LIVE_EXTERNAL_CAPABILITIES_PATH_BOUND_OR_PROVEN = no
PATH_CONTAINMENT = NOT_APPLICABLE
M3_E3_SUPPLEMENTAL_EXTERNAL_CAPABILITY_MANIFEST_SHA256 = NOT_COMPUTED
```

No new hash is accepted without runtime path proof. No full SDK hash was
computed. Existing E1 records were not modified or merged into a new manifest.

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
ACCESS_TOKENS_GENERATED = 0
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
PRODUCTION_RUNTIME_CODE_CHANGED = 0
E3_LOCAL_HELPER_FUTURE_RUNTIME_DEPENDENCY = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

No caller principal, token, authorization value, credential JSON, private key,
full IAM policy, or production response was persisted. Unrelated working-tree
changes were preserved.

## Next action

Implement or identify the separately approved local M3 command-graph artifact
before attempting another E3. That artifact must expose only redacted argv
templates and exact qualified SDK identities for OP-A through OP-E, including
the policy-preservation/concurrency path. Then rerun E3 locally and proceed to
E4 only if every operation is path-bound or proven repository-only.
