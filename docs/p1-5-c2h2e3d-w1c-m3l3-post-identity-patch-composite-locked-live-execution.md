# P1.5-C2H2E3D-W1C-M3L3 Post-Identity-Patch Composite-Locked Live Execution

## Result

The live execution stopped before OP-A. The locked G4R3R2 graph requires two project IAM reads: `OP_D_PRE` and `OP_D_POST`, each with `maxCalls=1`. The M3L3 approval sets `projectIamReadsMax=0`. Running the graph would exceed the approval, while skipping either node would violate the locked graph. The fail-closed decision is therefore `ABORT_BEFORE_OP_A`.

No local identity discovery, remote IAM read, IAM mutation, poststate read, token operation, Firestore call, or deployment was performed. The approval consumption point was not reached. This task is closed without automatic reuse or retry; a new corrected approval must reconcile the project IAM read budget with the locked graph.

## Locked Inputs

```text
G4R3R2_COMPOSITE_EXPECTED = 1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195
G4R3R2_COMPOSITE_RECOMPUTED = 1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195
G4R3R2_COMPOSITE_MATCH = yes
G4R3R2_RESULT_EXPECTED = f0421acdaf1f9649b7314613a381c8c82072f84d70365c2e8c51b66876d16ac7
G4R3R2_RESULT_MATCH = yes
G4R3H_R2_ATTESTATION_MATCH = yes
G4R3R1_ATTESTATION_MATCH = yes
ALL_REPOSITORY_LOCKS_MATCH = yes
ALL_SDK_LOCKS_MATCH = yes
EXTERNAL_CAPABILITY_UNBOUND = 0
SDK_VERSION = 580.0.0
SDK_PATH_CONTAINMENT = PASS
CURRENT_GRAPH_NODES = 9
CURRENT_GRAPH_EXECUTION_EDGES = 8
CURRENT_GRAPH_PREDECESSOR_METADATA_EDGES = 7
CURRENT_GRAPH_IDENTITY = db970e486979b1a82b4245141236d534e2b754bd345c2dc0c913e02232d5a424
CURRENT_GRAPH_IDENTITY_MATCH = yes
```

## Budget Gate

```text
LOCKED_COMPOSITE_PROJECT_IAM_READS_MAX = 2
APPROVED_PROJECT_IAM_READS_MAX = 0
REQUIRED_PROJECT_IAM_READ_NODES = OP_D_PRE, OP_D_POST
BUDGET_COMPATIBLE = no
GATE_DECISION = ABORT_BEFORE_OP_A
```

## Verification

```text
ZERO_GCLOUD_SAFE_AUTHORITY_TEST_RESULT = PASS (28/28 files)
GCLOUD_VERSION_HELP_TEST_STATUS = NOT_RUN_BY_ZERO_GCLOUD_POLICY
M3L3_EVIDENCE_VERIFIER = PASS
NPM_TEST = PASS
TYPECHECK = PASS
BUILD = PASS (sandbox spawn EPERM; identical external local rerun passed)
LINT = NOT_AVAILABLE (package.json has no lint script)
GIT_DIFF_CHECK = PASS_WITH_PREEXISTING_CRLF_WARNINGS_ONLY
```

## Required Execution Report

```text
OP_A_EXECUTIONS = 0
IDENTITY_CONTEXT_ESTABLISHED = no
RAW_IDENTITY_PERSISTED = no
LIVE_APPROVAL_CONSUMED = no
LIVE_APPROVAL_CONSUMPTION = NOT_REACHED
PRESTATE_READS_USED = 0
PRESTATE_RESULT = NOT_EXECUTED
MUTATION_ATTEMPTS_USED = 0
MUTATION_OUTCOME = NOT_ATTEMPTED
MUTATION_RETRIES_USED = 0
MUTATION_ROLLBACKS_USED = 0
SECOND_MUTATION_ATTEMPTED = no
POSTSTATE_REQUIRED = yes
POSTSTATE_READS_USED = 0
POSTSTATE_RESULT = NOT_EXECUTED
CURRENT_M3_FINAL_STATE = ABSENT_PROVEN_FRESH_PRESTATE_NOT_EXECUTED
M3L3_APPROVAL_STATUS = NOT_REACHED
M4_APPROVAL = NOT_GRANTED
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
CLOUD_LOGGING_READS = 0
PROJECT_IAM_READS = 0
PROJECT_IAM_MUTATIONS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
SERVICE_ACCOUNT_KEY_OPERATIONS = 0
DEPLOYMENTS = 0
M3_M3L3_POST_IDENTITY_PATCH_LIVE_EXECUTION_EVIDENCE_SHA256 = adb7b77820533417390661e87d9a69ceec055f7da703bf04a5175fed8cc79ce4
SECOND_M3L3_EVIDENCE_SHA256 = adb7b77820533417390661e87d9a69ceec055f7da703bf04a5175fed8cc79ce4
M3L3_LIVE_EVIDENCE_REPRODUCIBLE = yes
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The result-document byte hash is intentionally not self-embedded. It is computed only after this document is final.

## Privacy And Side Effects

The canonical evidence contains no raw principal, IAM member, account argument, config-root path, policy, process output, token, credential, UID, email, timestamp, or local absolute path. All production and mutation counters are zero.

## Next Gate

`RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L3-CORRECTED-PROJECT-IAM-READ-BUDGET-NEW-APPROVAL-GATE`

A future gate must either approve the two locked project IAM reads or create and attest a new composite whose graph does not require them. The current approval must not be retried automatically.

## Final Verdict

`P1_5_C2H2E3D_W1C_M3L3_LIVE_BUDGET_VIOLATION`
