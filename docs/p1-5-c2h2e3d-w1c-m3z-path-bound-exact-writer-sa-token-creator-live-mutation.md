# P1.5-C2H2E3D-W1C-M3Z Path-Bound Exact Writer-SA Token Creator

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_EXTERNAL_MUTATION_CAPABILITY_UNBOUND_ABORT`

The new M3Z approval was reviewed, but execution stopped before every live
operation because the E2 path-bound evidence covers only the three custom-role
metadata module identities. It does not cover the distinct Cloud SDK command
surfaces required for caller discovery, service-account metadata and IAM policy
reads, project IAM policy reads, or the IAM mutation itself. M3Z expressly
forbids broadening the hash set during this run.

## Local gates

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
DIRTY_COUNT = 214

E2_VERDICT = P1_5_C2H2E3D_W1C_M3Y_E2_PATH_BOUND_FINAL_RELOCK_NEW_M3_APPROVAL_GATE_PASS
OLD_M3Y_APPROVAL_REUSED = no
E1_PATH_BOUND_MANIFEST_EXPECTED = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E1_PATH_BOUND_MANIFEST_RECOMPUTED = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
PATH_BOUND_EXTERNAL_MANIFEST_MATCH = yes
E2_FINAL_EXECUTION_MANIFEST_EXPECTED = 478231b5936913e049bc1be3e2a010cd1f181835040ab463c15b29ed98d3d64c
E2_FINAL_EXECUTION_MANIFEST_RECOMPUTED = 478231b5936913e049bc1be3e2a010cd1f181835040ab463c15b29ed98d3d64c
FINAL_EXECUTION_MANIFEST_MATCH = yes
GCLOUD_LAUNCHER_SELECTION = UNIQUE
GCLOUD_LAUNCHER_RELATIVE_IDENTITY = bin/gcloud.cmd
CANONICAL_SDK_ROOT_FINGERPRINT_MATCH = yes
CLOUD_SDK_VERSION = 580.0.0
PATH_BOUND_CAPABILITY_COUNT = 3
ALL_PATH_BOUND_MODULE_IDENTITIES_MATCH = yes
ALL_PATH_BOUND_RELATIVE_PATHS_MATCH = yes
ALL_PATH_BOUND_FILE_HASHES_MATCH = yes
PATH_CONTAINMENT = PASS
```

The local launcher, SDK version metadata, and the three locked module hashes
matched the E1/E2 records. No gcloud executable was run while validating these
local gates.

## External operation coverage

| Planned operation | Transport | E2 coverage | Result |
|---|---|---|---|
| Stage-1 role metadata read | gcloud | E2 path-bound role-read surface | covered |
| Canonical role metadata read | gcloud | E2 path-bound role-read surface | covered |
| Active caller discovery | gcloud | no locked capability | **unbound** |
| Writer SA metadata read | gcloud | no locked capability | **unbound** |
| Writer-SA IAM policy precheck | gcloud | no locked capability | **unbound** |
| Project IAM policy precheck | gcloud | no locked capability | **unbound** |
| Exact writer-SA IAM mutation | gcloud | no locked capability | **unbound** |
| Writer-SA IAM postcheck | gcloud | no locked capability | **unbound** |
| Project IAM policy postcheck | gcloud | no locked capability | **unbound** |

```text
ALL_LIVE_OPERATION_EXTERNAL_CAPABILITIES_COVERED = no
M3_MUTATION_EXTERNAL_CAPABILITY_COVERAGE = UNBOUND
ACTIVE_CALLER_EXTERNAL_CAPABILITY_COVERAGE = UNBOUND
WRITER_IAM_POLICY_EXTERNAL_CAPABILITY_COVERAGE = UNBOUND
PROJECT_IAM_POLICY_EXTERNAL_CAPABILITY_COVERAGE = UNBOUND
PRE_MUTATION_FINAL_GATE = FAIL
```

The two fresh role reads were therefore not started. The unbound-capability
gate is evaluated before any live call, so no partial live sequence exists.

## Counters and safety result

```text
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATION_ATTEMPT_COUNT = 0
IAM_MUTATION_RETRY_COUNT = 0
M4_ATTEMPTS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
CANONICAL_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
AUTOMATIC_IAM_ROLLBACK = no
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
```

No caller principal, token, authorization header, credential JSON, private key,
full IAM policy, or raw production response was persisted. Existing unrelated
dirty and untracked files were preserved. No staging, commit, push, deploy,
Rules, Indexes, or Firebase data changes were performed.

## Required next action

`P1.5-C2H2E3D-W1C-M3Z-E3` should add and independently lock the exact external
capability records for the missing command surfaces. It must not be performed by
reusing this run or by silently changing the E2 manifest. After that, a fresh
M3Z approval is required; the exact mutation remains closed until all coverage
and bounded prechecks pass.
