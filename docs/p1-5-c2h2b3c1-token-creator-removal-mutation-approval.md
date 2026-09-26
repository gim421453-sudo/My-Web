# P1.5-C2H2B3C1 Token Creator Removal Mutation Approval

## 1. Scope and baseline

This is a design, command-preflight, and approval package only. It neither
reads nor changes production IAM and does not authorize execution.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 138
STAGING = 0

PREVIOUS_VERDICT = P1_5_C2H2B3C0_REMOVAL_POLICY_DECISION_PASS
REMOVAL_WITHOUT_REPLACEMENT_STATUS = READY_FOR_APPROVAL
RESOURCE_SCOPED_REPLACEMENT_STATUS = NOT_REQUIRED_BY_CURRENT_EVIDENCE
```

## 2. Exact mutation contract

```text
MUTATION_COUNT = 1
MUTATION_TYPE = REMOVE_PROJECT_IAM_BINDING_MEMBER
TARGET_PROJECT = my-management-app-8a933
TARGET_PROJECT_NUMBER = 607154464656
TARGET_PRINCIPAL = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
TARGET_MEMBER = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
TARGET_ROLE = roles/iam.serviceAccountTokenCreator
TARGET_SCOPE = PROJECT
TARGET_CONDITION = none
PLANNED_IAM_MUTATION_COUNT = 1
MAX_IAM_MUTATIONS = 1
REPLACEMENT_BINDING_PLANNED = no
```

The future primary mutation may remove only this exact member from this exact
role and project. It must use no wildcard, display-name match, fuzzy principal
match, or similarly named service account. Other members of the same role must
remain. If this is the sole member, normal empty-binding cleanup is acceptable
because it changes no unrelated member or policy meaning.

No resource-scoped replacement is prepared. New dependency evidence before
execution invalidates this gate and requires policy review.

## 3. Pre-mutation read and drift gate

A separately approved executor must perform one minimal before-state IAM read
immediately before mutation and retain only:

```text
project
observedAt
bindingPresentBefore
role
exact member identity or approved fingerprint
condition presence
```

It must verify the project ID and project number, then confirm that the exact
member remains directly and unconditionally bound to the exact role.

```text
PRE_MUTATION_STATE_RECHECK = required
STATE_DRIFT_POLICY = ABORT
```

- Binding already absent: classify `ALREADY_ABSENT`, perform no mutation, and
  stop after read-only verification.
- Exact member/role/project changed: classify `STATE_DRIFT_DETECTED` and stop.
- Any condition appears: classify
  `CONDITIONAL_BINDING_REQUIRES_NARROW_FIX` and stop.
- Do not infer that unrelated IAM state is unchanged from the targeted match.

The prior evidence found zero conditional bindings for this principal. That is
carried forward only as preflight evidence; the execution-time read remains
mandatory.

## 4. Prepared removal command

The future Windows command is:

```powershell
# NOT_EXECUTED - requires explicit user approval in a later execution package
$ProjectId = 'my-management-app-8a933'
$Member = 'serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com'
$Role = 'roles/iam.serviceAccountTokenCreator'

gcloud.cmd projects remove-iam-policy-binding $ProjectId `
  --member=$Member `
  --role=$Role `
  --condition=None `
  --quiet
```

```text
REMOVAL_COMMAND_STATUS = NOT_EXECUTED
```

The targeted binding command is preferred to manually editing and setting a
whole IAM policy. It is expected to preserve unrelated bindings and carry the
policy concurrency metadata used by the CLI's get-modify-set operation.
Execution must still abort on observed pre-state drift and verify the result,
because the separate pre-read and mutation are not one atomic comparison with
the approved historical state.

## 5. Post-mutation IAM verification

Immediately after a future successful mutation, a minimal read-only IAM check
must establish:

1. the exact member is absent from the exact project-level Token Creator role;
2. the pre-existing `roles/firebase.sdkAdminServiceAgent` and
   `roles/firebaseauth.admin` bindings for the principal remain, unless the
   before-state recheck already documented a difference;
3. no replacement or new role was added by this package;
4. audit-SA project roles and Token Creator bindings remain unchanged;
5. audit-SA `datastore.entities.list` remains ungranted;
6. no Firestore call, token generation, signing, or impersonation occurs.

```text
POST_MUTATION_IAM_VERIFICATION = required
```

Do not persist the complete IAM policy. Store only the approved before/after
facts and safe counts.

## 6. Regression and rollback policy

A credible regression requires both an applied removal and one of these:

- an existing production auth/admin workflow begins failing;
- an existing documented operation reports a Token Creator or remote-signing
  permission error; or
- post-mutation IAM verification finds an unexpected state/security problem
  for which exact restoration is the safe response.

Do not provoke a regression with synthetic `GenerateAccessToken`,
`GenerateIdToken`, `SignBlob`, `SignJwt`, or impersonation calls. Do not roll
back speculatively.

The exact rollback state is known:

```text
EXACT_ROLLBACK_BINDING_KNOWN = yes
ROLLBACK_PROJECT = my-management-app-8a933
ROLLBACK_MEMBER = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
ROLLBACK_ROLE = roles/iam.serviceAccountTokenCreator
ROLLBACK_SCOPE = PROJECT
ROLLBACK_CONDITION = none
```

Prepared rollback command:

```powershell
# ROLLBACK_NOT_EXECUTED - only for an approved, verified recovery trigger
$ProjectId = 'my-management-app-8a933'
$Member = 'serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com'
$Role = 'roles/iam.serviceAccountTokenCreator'

gcloud.cmd projects add-iam-policy-binding $ProjectId `
  --member=$Member `
  --role=$Role `
  --condition=None `
  --quiet
```

```text
ROLLBACK_POLICY = PREAUTHORIZE_EXACT_RESTORE_WITHIN_CONTROLLED_RECOVERY_WINDOW
ROLLBACK_EXACT_RESTORE_APPROVAL = PREPARED_FOR_USER_APPROVAL
MAX_PRIMARY_IAM_MUTATIONS = 1
MAX_CONDITIONAL_RECOVERY_IAM_MUTATIONS = 1
ROLLBACK_COMMAND_STATUS = ROLLBACK_NOT_EXECUTED
```

The recommendation is to let the user's future explicit approval cover only
this exact restore when the primary mutation was applied and a documented,
immediate credible regression occurs in the same controlled execution/recovery
window. It must not add Owner, Editor, Firebase Admin, Datastore User,
Datastore Owner, another member, or another condition. Outside that bounded
condition, rollback requires a new approval.

## 7. Future execution order

1. Verify the exact project ID and number.
2. Read and minimize the exact current binding state.
3. Compare it with this approved contract.
4. Abort on absence, condition, or material drift.
5. Remove the exact member from the exact role once.
6. Read the resulting exact binding state.
7. Verify expected unrelated roles and audit-SA state are preserved.
8. Record minimized results and stop.

The executor must not continue into audit-SA custom roles, data permissions,
caller bindings, ListCollectionIds, Firestore, token generation, deployment, or
another Stage-1 operation.

## 8. Approval checklist

- [x] Project ID and project number reviewed
- [x] Exact target principal reviewed
- [x] Exact role and project scope reviewed
- [x] Existing binding evidence reviewed
- [x] Completed 30-day zero-event evidence reviewed
- [x] Managed-Firebase residual risk documented as low
- [x] External-workflow residual risk documented as low
- [x] No replacement binding planned
- [x] One primary mutation only
- [x] State-drift abort policy prepared
- [x] Post-removal IAM verification prepared
- [x] Exact rollback binding reviewed
- [x] Bounded rollback policy prepared
- [x] Firestore remains unauthorized
- [ ] Explicit removal and bounded exact-rollback approval granted

## 9. Exact user approval request

> 프로젝트 `my-management-app-8a933`에서
> `firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com`
> 서비스 계정에 프로젝트 범위로 부여된
> `roles/iam.serviceAccountTokenCreator` binding의 정확한 멤버 1건만
> 제거하는 것을 승인해 주세요. 실행 직전 동일 binding의 현재 상태를
> 읽기 전용으로 재확인하고, 이미 없거나 상태가 달라졌거나 조건부이면
> 변경 없이 중단합니다. 제거 후에는 해당 binding의 부재와 기존 관련
> role 및 audit SA 상태 보존만 읽기 전용으로 확인합니다. Firestore 접근,
> audit SA 권한 변경, token 생성, signing, impersonation 또는 배포는 포함하지
> 않습니다. 제거 직후 같은 통제된 복구 구간에서 제거로 인한 신뢰할 수
> 있는 장애가 확인된 경우에만, 방금 제거한 동일한 project/member/role의
> 무조건부 binding을 정확히 복원하는 rollback도 함께 승인해 주세요.

This text is a request only. Approval has not been granted by creation of this
document.

## 10. Current approval and safety state

```text
TOKEN_CREATOR_REMOVAL_APPROVAL = NOT_GRANTED
ROLLBACK_EXACT_RESTORE_APPROVAL = PREPARED_FOR_USER_APPROVAL
AUDIT_DATA_ROLE_APPROVAL = NOT_GRANTED
AUDIT_CALLER_IMPERSONATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no

LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKEN_GENERATION = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTION = 0
IMPERSONATION_EXECUTIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## 11. Verdict

`P1_5_C2H2B3C1_TOKEN_CREATOR_REMOVAL_APPROVAL_GATE_PASS`

