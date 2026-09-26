# P1.5-C2H2E3D-W1C-M3L3-B1 G4R3R2 Live-Budget / Graph Reconciliation

## Result

The stopped M3L3 session correctly detected a live-approval budget violation, but the old G4R3R2 composite is not underbudget. Its literal `futureLiveBudget.projectIamReadsMax` is `2`, exactly matching the current graph's worst reachable project IAM policy read count. The defective value `0` came from the stopped M3L3 live approval, not from G4R3R2.

Stage B is not entered because the superseding-relock barrier is not satisfied. G4R3R2 remains the current final M3 execution composite. A future live approval must bind `projectIamReadsMax=2` and may authorize only `OP_D_PRE` and `OP_D_POST` for that bucket.

## Authority Verification

```text
M3L3_STOP_EVIDENCE_MATCH = yes
M3L3_STOP_RESULT_MATCH = yes
M3L3_STOP_VERDICT = P1_5_C2H2E3D_W1C_M3L3_LIVE_BUDGET_VIOLATION
G4R3R2_OLD_COMPOSITE_MATCH = yes
G4R3R2_RESULT_MATCH = yes
G4R3R1_ATTESTATION_MATCH = yes
G4R3H_R2_ATTESTATION_MATCH = yes
GRAPH_IDENTITY_MATCH = yes
GRAPH_NODES = 9
GRAPH_EXECUTION_EDGES = 8
GRAPH_PREDECESSOR_METADATA_EDGES = 7
SOURCE_AND_SDK_LOCKS_MATCH = yes
```

## Node Classification

| Node | Location | Type | Resource scope | Condition | Max | Retry | Budget bucket |
|---|---|---|---|---|---:|---:|---|
| `ROLE_STAGE1` | remote | read | project custom-role metadata | session entry | 1 | 0 | prestate |
| `ROLE_CANONICAL` | remote | read | project custom-role metadata | Stage-1 role exact | 1 | 0 | prestate |
| `OP_A` | local | read | local gcloud auth state | canonical role exact | 1 | 0 | identity discovery |
| `OP_B` | remote | read | exact writer-SA metadata | exact identity context | 1 | 0 | prestate |
| `OP_C_PRE` | remote | read | exact writer-SA IAM policy | writer-SA enabled | 1 | 0 | prestate |
| `OP_D_PRE` | remote | read | exact project IAM policy | `OP_C_PRE=M3_ABSENT` | 1 | 0 | prestate + project IAM |
| `OP_E` | remote | mutation | exact writer-SA IAM binding | fresh safe baseline, M3/M4 absent | 1 | 0 | mutation |
| `OP_C_POST` | remote | read | exact writer-SA IAM policy | mutation confirmed success | 1 | 0 | poststate |
| `OP_D_POST` | remote | read | exact project IAM policy | `OP_C_POST=PRESENT_EXACT` | 1 | 0 | poststate + project IAM |

The project IAM classification comes from the current command surface `surface.projects.get_iam_policy` and the `projects get-iam-policy <EXACT_PROJECT>` argument template. Service-account policy reads remain separate and are not inferred as project IAM reads.

## Project IAM Derivation

```text
OP_D_PRE_REMOTE = yes
OP_D_PRE_RESOURCE = project IAM
OP_D_PRE_READ_COUNT_MAX = 1
OP_D_PRE_RETRY = 0

OP_D_POST_REMOTE = yes
OP_D_POST_RESOURCE = project IAM
OP_D_POST_READ_COUNT_MAX = 1
OP_D_POST_RETRY = 0
OP_D_POST_CONDITION = OP_E_CONFIRMED_SUCCESS_AND_OP_C_POST_PRESENT_EXACT

PROJECT_IAM_READS_MAX_PRESTATE_PRESENT_BRANCH = 0
PROJECT_IAM_READS_MAX_MUTATION_INDETERMINATE_BRANCH = 1
PROJECT_IAM_READS_MAX_MUTATION_SUCCESS_BRANCH = 2
GRAPH_REQUIRED_PROJECT_IAM_READS_MAX = 2
G4R3R2_PROJECT_IAM_READS_MAX = 2
BUDGET_CONTRACT_RELATION = MATCH
```

`OP_D_PRE` is not reached when `OP_C_PRE` already reports the target member present. An indeterminate mutation stops before poststate, leaving only `OP_D_PRE`. Confirmed mutation success reaches both project-policy nodes, producing the bounded worst-case maximum of two.

## Full Budget Cross-Check

| Budget | Graph required max | G4R3R2 bound max | Result |
|---|---:|---:|---|
| `localIdentityDiscoveryMax` | 1 | 1 | MATCH |
| `remoteIamPrestateReadsMax` | 5 | 5 | MATCH |
| `iamMutationAttemptsMax` | 1 | 1 | MATCH |
| `remoteIamPoststateReadsMax` | 2 | 2 | MATCH |
| `projectIamReadsMax` | 2 | 2 | MATCH |
| `retriesMax` | 0 | 0 | MATCH |
| `cloudLoggingReadsMax` | 0 | 0 | MATCH |
| `testIamPermissionsMax` | 0 | 0 | MATCH |
| `accessTokenCallsMax` | 0 | 0 | MATCH |
| `firestoreCallsMax` | 0 | 0 | MATCH |
| `m4MutationsMax` | 0 | 0 | MATCH |
| `serviceAccountKeyOperationsMax` | 0 | 0, from forbidden reachability | MATCH |

The five prestate reads are `ROLE_STAGE1`, `ROLE_CANONICAL`, `OP_B`, `OP_C_PRE`, and `OP_D_PRE`. The two poststate reads are `OP_C_POST` and `OP_D_POST`. No spare diagnostic allowance is present.

## Verifier Finding

`G4R3R2_BUDGET_VERIFIER_GAP = NO_GRAPH_BUDGET_CROSS_CHECK`

The generation-1 verifier validates the expected graph identity and hard-codes each expected budget value independently. It does not derive budget buckets from graph nodes. This is a design gap, but it did not create a current value mismatch because the literal project IAM budget is already `2`.

```text
G4R3R2_RUNTIME_DEFECT = no
G4R3R2_GRAPH_DEFECT = no
G4R3R2_COMPOSITE_BUDGET_CONTRACT_DEFECT = no
STOPPED_M3L3_LIVE_APPROVAL_BUDGET_DEFECT = yes
CORRECTED_PROJECT_IAM_READS_MAX = 2
CORRECTION_TARGET = FUTURE_LIVE_APPROVAL_ONLY
SUPERSEDING_COMPOSITE_REQUIRED = no
```

## Approval And Stage Barrier

```text
OLD_M3L3_APPROVAL_CONSUMED = no
OLD_M3L3_APPROVAL_REUSABLE = no
OLD_M3L3_APPROVAL_REASON = SUPERSEDED_BY_BUDGET_AUTHORITY_CORRECTION_REQUIRED
G4R3R2_R2_EXECUTED = no
CURRENT_FINAL_M3_EXECUTION_COMPOSITE = G4R3R2
M3L3_APPROVAL_ELIGIBLE = yes
M3L3_LIVE_APPROVAL = NOT_GRANTED
CURRENT_M3_EFFECTIVE_STATE = ABSENT_PROVEN
```

## Safety

All analysis and evidence generation were local. No gcloud process, production access, IAM read or mutation, Firestore call, token generation, Cloud Logging read, service-account key operation, staging, commit, push, or deployment occurred. No raw identity, IAM member, policy, process output, credential, token, local path, or timestamp is persisted.

## Verdict

`P1_5_C2H2E3D_W1C_M3L3_B1_GRAPH_BUDGET_ALREADY_MATCHES_LIVE_GATE_ERROR`
