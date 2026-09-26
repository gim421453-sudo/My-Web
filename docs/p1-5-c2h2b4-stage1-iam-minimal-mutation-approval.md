# P1.5-C2H2B4 Stage-1 IAM Minimal Mutation Approval

## 1. Scope and baseline

This is a design, command-preflight, and approval package only. It authorizes
no IAM mutation, Firestore access, token generation, impersonation execution,
deployment, runtime/client change, staging, commit, or push.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 140
STAGING = 0

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
PROJECT_WIDE_FIREBASE_ADMIN_TOKEN_CREATOR_EXPECTED = absent
FIREBASE_ADMIN_TO_AUDIT_SA_TRANSITIVE_PATH_EXPECTED = closed
```

## 2. Exact caller resolution

The prior document deliberately stored the active user in masked form. This
package resolved the existing local gcloud auth store in memory, found exactly
one active user, and matched its existing SHA-256/12 fingerprint. The email is
not persisted in this repository or this document.

```text
STAGE1_CALLER_PRINCIPAL = user:<resolved locally; not persisted>
STAGE1_CALLER_PRINCIPAL_FINGERPRINT = sha256/12:5e6692dda08c
CALLER_RESOLUTION_STATUS = RESOLVED
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_TYPE = user
LOCAL_AUTH_FINGERPRINT_MATCH = yes
LOCAL_AUTH_READS = 1
LIVE_IAM_READS = 0
```

Future execution must repeat the local one-active-user and fingerprint checks
immediately before any mutation, then create `CallerMember` as
`user:$ActiveCaller` in memory. A count other than one or a fingerprint mismatch
is `CALLER_UNRESOLVED` or `CALLER_MISMATCH` and aborts before mutation. It must
not guess, construct, or persist the email.

## 3. Minimal custom data role

```text
PROPOSED_CUSTOM_ROLE_ID = mywebStage1CollectionIdReader
PROPOSED_CUSTOM_ROLE_NAME = projects/my-management-app-8a933/roles/mywebStage1CollectionIdReader
PROPOSED_CUSTOM_ROLE_TITLE = MY WEB Stage-1 Collection ID Reader
PROPOSED_CUSTOM_ROLE_STAGE = GA
PROPOSED_CUSTOM_ROLE_INCLUDED_PERMISSIONS = [datastore.entities.list]
CUSTOM_ROLE_CONTRACT_STATUS = VERIFIED
```

Existing Stage-1 contract evidence establishes that
`datastore.entities.list` is the required ListCollectionIds permission and is
supported in a project custom role. Installed gcloud help confirms the project,
permissions, and stage flags for custom-role creation and the member/role flags
for both binding commands. No live role lookup or creation occurred here.

The custom role contains no `datastore.entities.get`, create, update, delete,
wildcard, Firebase, resource-manager, or administrative permission.

Future collision policy:

- Role absent: create exactly this definition.
- Role present with exactly the ID, title, description, stage, and one
  permission above: `ALREADY_PRESENT_COMPATIBLE`, do not update it.
- Any difference: `STATE_DRIFT_ROLE_COLLISION`, abort without overwrite.

## 4. Intended mutation set

```text
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
CUSTOM_ROLE_BINDING_TARGET = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
DATA_ROLE_BINDING_SCOPE = PROJECT
CALLER_IMPERSONATION_ROLE = roles/iam.serviceAccountTokenCreator
CALLER_IMPERSONATION_TARGET = exact audit SA resource
CALLER_IMPERSONATION_SCOPE = SERVICE_ACCOUNT_RESOURCE
MAX_NORMAL_IAM_MUTATIONS = 3
```

The maximum future normal set is:

| ID | Change | Exact scope | Normal classification |
| --- | --- | --- | --- |
| A | Create `mywebStage1CollectionIdReader` | project custom role | `NEWLY_REQUIRED` or `ALREADY_PRESENT_COMPATIBLE` |
| B | Bind the custom role to the exact audit SA | project | `NEWLY_REQUIRED` or `ALREADY_PRESENT` |
| C | Bind the exact resolved caller to Token Creator | exact audit-SA resource only | `NEWLY_REQUIRED` or `ALREADY_PRESENT` |

The data role is project-scoped because IAM cannot express per-workspace
Firestore containment at this level. The later Stage-1 helper must hard-guard
the separately approved one workspace parent; this IAM design must not claim
workspace isolation on its own.

No caller project-level Token Creator binding, Firebase Admin SDK binding,
alternate principal, group, domain principal, `allUsers`, or
`allAuthenticatedUsers` is allowed.

## 5. Prepared future commands

Every command in this section is `NOT_EXECUTED`. They are valid only after a
separate explicit B5 approval and its live pre-state gates.

```powershell
# NOT_EXECUTED: common fail-closed local caller gate
$Project = 'my-management-app-8a933'
$ProjectNumber = '607154464656'
$AuditEmail = 'myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com'
$AuditMember = "serviceAccount:$AuditEmail"
$RoleId = 'mywebStage1CollectionIdReader'
$RoleName = "projects/$Project/roles/$RoleId"
$ExpectedCallerFingerprint = '5e6692dda08c'

$ActiveAccounts = @(gcloud auth list --filter='status:ACTIVE' --format='value(account)')
if ($ActiveAccounts.Count -ne 1) { throw 'CALLER_UNRESOLVED' }
$ActiveCaller = $ActiveAccounts[0].Trim().ToLowerInvariant()
$CallerHash = [System.Security.Cryptography.SHA256]::Create()
try {
  $CallerBytes = $CallerHash.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($ActiveCaller))
} finally {
  $CallerHash.Dispose()
}
$CallerFingerprint = (-join ($CallerBytes | ForEach-Object { $_.ToString('x2') })).Substring(0, 12)
if ($CallerFingerprint -ne $ExpectedCallerFingerprint) { throw 'CALLER_MISMATCH' }
$CallerMember = "user:$ActiveCaller"
```

```powershell
# NOT_EXECUTED: mutation A, only if the exact role is authoritatively absent
gcloud iam roles create $RoleId `
  --project=$Project `
  --title='MY WEB Stage-1 Collection ID Reader' `
  --description='Stage-1 ListCollectionIds only; no document read or write' `
  --permissions='datastore.entities.list' `
  --stage='GA'

# NOT_EXECUTED: mutation B, only if the exact binding is absent
gcloud projects add-iam-policy-binding $Project `
  --member=$AuditMember `
  --role=$RoleName `
  --condition=None

# NOT_EXECUTED: mutation C, only if the exact resource binding is absent
gcloud iam service-accounts add-iam-policy-binding $AuditEmail `
  --project=$Project `
  --member=$CallerMember `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None
```

## 6. Required future pre-state and execution order

Before B5 executes anything, it must read only the minimum state needed to
verify: exact project ID/number; enabled audit SA; custom-role collision state;
audit-SA project roles; exact audit-SA resource policy; verified caller; and
continued absence of the Firebase Admin SDK project-wide Token Creator binding.
It must abort on project/caller/audit-SA mismatch, disabled audit SA, binding
conditions, unexpected audit-SA roles, collision, unrelated-principal impact,
or reappearance of the old broad Firebase Admin binding.

Safe order:

1. Complete all pre-state gates.
2. Create or validate role A.
3. Verify role A contains exactly the approved one permission.
4. Add or verify binding B.
5. Add or verify resource binding C.
6. Verify all three intended results and the old broad path remains absent.
7. Stop.

This order verifies the data-role contract before creating an impersonation
path. It leaves rollback cleanly reversible in the opposite direction and does
not exercise that path with a token or Firestore call.

## 7. Partial failure and rollback design

Only changes classified `NEWLY_REQUIRED` or `NEWLY_ADDED` by that future
execution are eligible for rollback. Pre-existing compatible roles or bindings
must never be removed.

| State | Safe status | Exact rollback | Must not be removed |
| --- | --- | --- | --- |
| A fails | stop; no added state | none | any pre-existing role/binding |
| A succeeds, B fails | partial | remove newly created A after confirming no binding uses it | compatible pre-existing A |
| A+B succeed, C fails | partial | remove newly added B, then newly created A | pre-existing A/B |
| A+B+C succeed, post-verify fails | unexpected | remove newly added C, then B, then A only when the failure requires restoration and each removal is verified | all pre-existing state and old Firebase Admin removal state |

Rollback commands, also `NOT_EXECUTED`, run in reverse order:

```powershell
# rollback C
gcloud iam service-accounts remove-iam-policy-binding $AuditEmail `
  --project=$Project `
  --member=$CallerMember `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None

# rollback B
gcloud projects remove-iam-policy-binding $Project `
  --member=$AuditMember `
  --role=$RoleName `
  --condition=None

# rollback A, only after bindings are absent and role was created by B5
gcloud iam roles delete $RoleId --project=$Project
```

No automatic token test, Firestore test, or broader fallback role is allowed.

## 8. Expected post-IAM state

```text
FIREBASE_ADMIN_PROJECT_TOKEN_CREATOR_EXPECTED = absent
FIREBASE_ADMIN_TO_AUDIT_SA_TRANSITIVE_PATH_EXPECTED = closed
AUDIT_SA_DATA_PERMISSIONS_EXPECTED = datastore.entities.list only through proposed custom role
AUDIT_SA_DATASTORE_ENTITIES_GET_EXPECTED = absent
AUDIT_SA_DATASTORE_CREATE_UPDATE_DELETE_EXPECTED = absent
CALLER_PROJECT_TOKEN_CREATOR_EXPECTED = absent
CALLER_EXACT_AUDIT_SA_TOKEN_CREATOR_EXPECTED = present
AUDIT_SA_OTHER_UNEXPECTED_PROJECT_ROLES_EXPECTED = 0
STAGE1_EXECUTION_AUTHORIZED = no
STAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
```

## 9. Approval checklist and request

- [ ] Create exact Stage-1 custom role
- [ ] Bind exact custom role to the exact audit SA
- [ ] Grant exact resolved caller Token Creator on the exact audit-SA resource
- [ ] Perform minimal post-change IAM verification
- [ ] Permit only reverse-order rollback of newly applied B4 changes on partial failure
- [ ] Run Stage-1 ListCollectionIds (separate and not part of B4/B5)

Prepared user-facing request:

> 프로젝트 `my-management-app-8a933`에서 최대 3건의 최소 IAM 변경을 승인해 주세요.
> `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`
> audit SA에 `datastore.entities.list`만 포함한 project custom role
> `mywebStage1CollectionIdReader`를 생성하거나 호환 상태를 검증하고, 그 role을
> audit SA에만 project 범위로 연결합니다. 이어 기존 local gcloud auth store에서
> fingerprint `sha256/12:5e6692dda08c`로 확인되는 정확한 단일 caller에게만,
> audit SA resource 범위의 `roles/iam.serviceAccountTokenCreator`를 부여합니다.
> pre/post IAM 검증과 이번 실행에서 새로 추가한 항목만의 역순 rollback을 포함합니다.
> Firestore, ListCollectionIds, token 생성, signing, impersonation 실행, API 변경,
> 배포는 승인하지 않습니다.

Creation of this document grants none of these checkboxes.

## 10. Current approval and safety status

```text
CUSTOM_ROLE_CREATION_APPROVAL = NOT_GRANTED
AUDIT_DATA_ROLE_BINDING_APPROVAL = NOT_GRANTED
AUDIT_CALLER_TOKEN_CREATOR_APPROVAL = NOT_GRANTED
B4_ROLLBACK_APPROVAL = NOT_GRANTED
STAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no

IAM_MUTATIONS = 0
API_MUTATIONS = 0
LIVE_IAM_READS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKEN_GENERATION = 0
IMPERSONATION_EXECUTION = 0
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

`P1_5_C2H2B4_STAGE1_IAM_MINIMAL_MUTATION_APPROVAL_GATE_PASS`

