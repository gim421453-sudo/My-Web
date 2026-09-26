# P1.5-C2H2B3 Stage-1 IAM Remediation Approval Design

## 1. Scope and baseline

This package is design, policy, and command preflight only. It performs no IAM
or API mutation, Firestore access, token generation, impersonation, staging,
commit, push, or deployment.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 128
STAGING = 0
INITIAL_GIT_DIFF_CHECK = pass; pre-existing CRLF warnings only

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
PROJECT_PARENT = none
APPROVED_WORKSPACE_ID = NOT_APPROVED
STAGE1_EXECUTION_AUTHORIZED = no
```

The B2 live IAM evidence is the only cloud-state input. C2H2B3 makes no
additional live IAM read.

## 2. Exact active caller

The already-installed `gcloud` local auth state contains exactly one active
account. No authentication or account switch occurred.

```text
ACTIVE_CALLER_PRINCIPAL = user:g***@gmail.com
ACTIVE_CALLER_PRINCIPAL_FINGERPRINT = sha256/12:5e6692dda08c
ACTIVE_CALLER_ACCOUNT_TYPE = user
ACTIVE_CALLER_COUNT = 1
CALLER_STATUS = RESOLVED_FROM_LOCAL_AUTH_STATE
```

The unmasked value remains only in the local gcloud auth store. A future
executor must derive it from that store, verify the fingerprint before any
mutation, and use the exact resulting `user:` member. It must not guess or
construct the email.

No public, domain-wide, group, or project-wide caller member is proposed.

## 3. Stage-1 data-role options

| Option | Permission surface | Benefits | Costs and risks | Decision |
| --- | --- | --- | --- | --- |
| `PREDEFINED_DATASTORE_VIEWER` | `roles/datastore.viewer`, including entity list, entity get, and additional read permissions | Google-managed and operationally familiar | can read documents and is broader than one ListCollectionIds request | not preferred |
| `CUSTOM_DATASTORE_ENTITIES_LIST_ONLY` | exactly `datastore.entities.list` | narrowest proven Stage-1 capability; no entity get or mutation permission | custom-role lifecycle and later Stage-2 expansion require separate governance | recommended |

The supplied authoritative contract confirms that `datastore.entities.list` is
supported in custom roles and is the permission required by ListCollectionIds.
No additional permission is added.

```text
DATA_ACCESS_OPTION = CUSTOM_DATASTORE_ENTITIES_LIST_ONLY
DATA_ACCESS_OPTION_RECOMMENDED = CUSTOM_DATASTORE_ENTITIES_LIST_ONLY
PROPOSED_DATA_CUSTOM_ROLE_ID = mywebStage1CollectionIdReader (candidate; namespace must be checked before approval/execution)
PROPOSED_DATA_CUSTOM_ROLE_TITLE = MY WEB Stage-1 Collection ID Reader
PROPOSED_DATA_CUSTOM_ROLE_PERMISSIONS = [datastore.entities.list]
DATA_ROLE_BINDING_SCOPE = PROJECT
```

Project scope is the lowest scope validated by the current IAM contract and
command surface. No workspace document/subcollection is an IAM policy resource,
so IAM cannot enforce the one-workspace boundary. The later Stage-1 helper must
hard-code and validate the one explicitly approved workspace parent.

Security properties of the proposed role:

```text
AUDIT_SA_WRITE_PERMISSIONS = 0
AUDIT_SA_DOCUMENT_GET_PERMISSION = 0
AUDIT_SA_LIST_COLLECTION_IDS_PERMISSION = yes
datastore.entities.create = absent
datastore.entities.update = absent
datastore.entities.delete = absent
wildcard_permissions = absent
firebase_permissions = absent
owner_editor_admin_permissions = absent
```

## 4. Data-role target

The future project binding is limited to:

```text
principal = serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
role = projects/my-management-app-8a933/roles/mywebStage1CollectionIdReader
scope = project my-management-app-8a933
```

The role ID remains a collision-checked candidate until a future mutation
preflight. If it already exists with any different permission, title, stage, or
purpose, the executor must abort rather than update or reuse it silently.

No Datastore User/Owner, Firebase Admin, Editor, Owner, or writer role is part
of this design.

## 5. Caller impersonation options

| Option | Capability | Security | Operations | Decision |
| --- | --- | --- | --- | --- |
| `STANDARD_RESOURCE_SCOPED_TOKEN_CREATOR` | predefined Token Creator, including access-token and signing capabilities | broader verbs, but constrained to one low-privilege audit SA | standard gcloud/Google Auth compatibility and simpler rollback | recommended |
| `CUSTOM_GET_ACCESS_TOKEN_ONLY` | only `iam.serviceAccounts.getAccessToken` | narrower verb set | custom lifecycle and tool compatibility must be maintained and validated | viable alternative, not selected |

The predefined role exposes signing operations in addition to token creation.
This is accepted in the proposed design only because it would be granted to one
exact human caller on one exact low-privilege audit service-account resource,
never on the project.

```text
IMPERSONATION_OPTIONS = [
  STANDARD_RESOURCE_SCOPED_TOKEN_CREATOR,
  CUSTOM_GET_ACCESS_TOKEN_ONLY
]
IMPERSONATION_OPTION_RECOMMENDED = STANDARD_RESOURCE_SCOPED_TOKEN_CREATOR
CALLER_PROJECT_WIDE_TOKEN_CREATOR = no
CALLER_EXACT_AUDIT_SA_IMPERSONATION = designed but not granted
```

## 6. Existing Firebase Admin SDK Token Creator binding

B2 found this pre-existing project-level binding:

```text
EXISTING_PROJECT_TOKEN_CREATOR_PRINCIPAL = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
EXISTING_PROJECT_TOKEN_CREATOR_SCOPE = PROJECT
```

Local runtime and test code uses Firebase Admin Auth for token verification and
account lifecycle calls such as user update, refresh-token revocation, and user
deletion. Repository-wide code search found no `createCustomToken`, `signBlob`,
`signJwt`, direct service-account signing, or Firebase Admin SDK impersonation
path. The authority audit tool uses `google-auth-library` impersonation but
targets the audit SA from a caller credential; it does not establish a
dependency on the Firebase Admin SDK service account.

This is not proof that the project-level binding is unused by managed Firebase
infrastructure or out-of-repository operations.

```text
FIREBASE_ADMIN_TOKEN_CREATOR_DEPENDENCY = NO_LOCAL_EVIDENCE
EXISTING_BROAD_BINDING_DISPOSITION = KEEP_PENDING_DEPENDENCY_REVIEW
EXISTING_BROAD_BINDING_STAGE1_STATUS = STAGE1_BLOCKER_UNTIL_REVIEWED
EXISTING_FIREBASE_BROAD_BINDING = unchanged pending explicit disposition
```

Granting the audit SA a new data permission would make that permission
transitively usable by this already project-scoped impersonator. Even if that
principal may already possess broader operational access, C2H2B3 does not infer
that the extra impersonation path is acceptable. It must not be removed,
narrowed, or modified in the same mutation sequence.

## 7. Future mutation preflight

All commands in sections 7-10 are **NOT_EXECUTED**. The installed gcloud 580.0.0
local help confirms the shown command groups and flags. Before any future
mutation, establish these local variables and fail closed:

```powershell
# NOT_EXECUTED
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
$Hasher = [System.Security.Cryptography.SHA256]::Create()
try {
  $Bytes = $Hasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($ActiveCaller))
} finally {
  $Hasher.Dispose()
}
$CallerFingerprint = (-join ($Bytes | ForEach-Object { $_.ToString('x2') })).Substring(0, 12)
if ($CallerFingerprint -ne $ExpectedCallerFingerprint) { throw 'CALLER_MISMATCH' }
$CallerMember = "user:$ActiveCaller"
```

Then perform read-only preflight checks:

1. reverify project ID and number;
2. reverify the exact audit SA exists and is enabled;
3. inspect the candidate role namespace;
4. inspect current audit-SA project bindings;
5. inspect current exact service-account IAM policy;
6. stop if the existing broad Firebase binding review is not separately
   resolved;
7. classify each intended operation as `ALREADY_PRESENT`, `NEWLY_REQUIRED`, or
   `CONFLICT`.

A failed role describe is not automatically `NOT_FOUND`; distinguish an
authoritative not-found result from permission, network, or project errors.

## 8. Proposed mutation A: create custom data role

Execute only when the candidate role is authoritatively absent and creation has
separate approval:

```powershell
# NOT_EXECUTED
gcloud iam roles create $RoleId `
  --project=$Project `
  --title='MY WEB Stage-1 Collection ID Reader' `
  --description='Stage-1 ListCollectionIds only; no document read or write' `
  --permissions='datastore.entities.list' `
  --stage='GA'
```

If an exact role already exists with exactly the approved definition, classify
`ALREADY_PRESENT` and do not create or update it. Any difference is `CONFLICT`.

## 9. Proposed mutation B: bind data role to audit SA

Execute only if the exact binding is absent and separately approved:

```powershell
# NOT_EXECUTED
gcloud projects add-iam-policy-binding $Project `
  --member=$AuditMember `
  --role=$RoleName `
  --condition=None
```

No other member or role may be altered. Existing exact binding means
`ALREADY_PRESENT`, not another append.

## 10. Proposed mutation C: bind caller on exact audit SA

Execute only if the exact resource binding is absent and separately approved:

```powershell
# NOT_EXECUTED
gcloud iam service-accounts add-iam-policy-binding $AuditEmail `
  --project=$Project `
  --member=$CallerMember `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None
```

This must not be replaced with a project IAM binding. Existing Firebase Admin
SDK project-level Token Creator is not modified by this command set.

## 11. Post-mutation IAM verification plan

IAM mutation verification remains separate from token and Firestore execution.
After any approved mutation, use read-only IAM calls to prove:

1. the custom role contains exactly `datastore.entities.list`;
2. the audit SA has exactly the approved custom data role and no unexpected
   direct project role;
3. the role has no entity get/create/update/delete, wildcard, Firebase, or
   administrative permission;
4. the exact service-account resource policy contains the approved caller's
   resource-scoped Token Creator binding;
5. no project-wide Token Creator binding was added for the caller;
6. existing Firebase Admin SDK binding remains unchanged;
7. each mutation is recorded as `ALREADY_PRESENT` or `NEWLY_ADDED`.

Do not generate an access token or call Firestore during verification.

## 12. Rollback commands and ordering

Rollback only mutations recorded as `NEWLY_ADDED`, in reverse order. Preserve
all pre-existing bindings.

```powershell
# NOT_EXECUTED - rollback C
gcloud iam service-accounts remove-iam-policy-binding $AuditEmail `
  --project=$Project `
  --member=$CallerMember `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None

# NOT_EXECUTED - rollback B
gcloud projects remove-iam-policy-binding $Project `
  --member=$AuditMember `
  --role=$RoleName `
  --condition=None

# NOT_EXECUTED - rollback A, only after no remaining role use is verified
gcloud iam roles delete $RoleId --project=$Project
```

The future executor must retain privacy-safe evidence of before state, mutation
classification, after state, rollback eligibility, and rollback verification.
It must never touch the existing Firebase Admin SDK project binding.

## 13. Mutation approval request draft

The following is prepared but **not approved**:

> Approve a future, separately controlled IAM change for project
> `my-management-app-8a933` consisting of at most three operations: create the
> project custom role `mywebStage1CollectionIdReader` with only
> `datastore.entities.list` if it does not already exist; grant that role only
> to the exact audit service account; and grant the locally verified caller
> `user:g***@gmail.com` (`sha256/12:5e6692dda08c`) standard Token Creator only
> on the exact audit service-account resource. Perform IAM read-only
> verification afterward and retain exact rollback commands. Do not alter the
> existing Firebase Admin SDK project-level Token Creator binding. This does
> not approve token generation, impersonation execution, Firestore access,
> ListCollectionIds, deployment, or data writes.

This request must not be presented for approval until the existing broad
Firebase Admin SDK Token Creator binding receives the separate dependency and
scope review described below.

## 14. Approval checklist

- [ ] Create Stage-1 custom data role
- [ ] Grant Stage-1 data role to audit SA
- [ ] Grant exact caller impersonation role on exact audit SA
- [ ] Perform post-change IAM read-only verification

Separate security decision:

- [ ] Modify existing Firebase Admin SDK project-wide Token Creator

All boxes remain unchecked. Modification of the existing binding is outside the
proposed three-operation sequence.

## 15. Final decision matrix

```text
DATA_ACCESS_OPTION = CUSTOM_DATASTORE_ENTITIES_LIST_ONLY
DATA_ACCESS_OPTION_RECOMMENDED = CUSTOM_DATASTORE_ENTITIES_LIST_ONLY
PROPOSED_DATA_CUSTOM_ROLE_PERMISSIONS = [datastore.entities.list]
DATA_ROLE_BINDING_SCOPE = PROJECT

ACTIVE_CALLER_PRINCIPAL = user:g***@gmail.com (sha256/12:5e6692dda08c)
IMPERSONATION_OPTIONS = [STANDARD_RESOURCE_SCOPED_TOKEN_CREATOR, CUSTOM_GET_ACCESS_TOKEN_ONLY]
IMPERSONATION_OPTION_RECOMMENDED = STANDARD_RESOURCE_SCOPED_TOKEN_CREATOR

EXISTING_PROJECT_TOKEN_CREATOR_PRINCIPAL = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
EXISTING_PROJECT_TOKEN_CREATOR_SCOPE = PROJECT
FIREBASE_ADMIN_TOKEN_CREATOR_DEPENDENCY = NO_LOCAL_EVIDENCE
EXISTING_BROAD_BINDING_DISPOSITION = KEEP_PENDING_DEPENDENCY_REVIEW
EXISTING_BROAD_BINDING_STAGE1_STATUS = STAGE1_BLOCKER_UNTIL_REVIEWED

IAM_MUTATION_APPROVAL = NOT_GRANTED
CUSTOM_ROLE_CREATION_APPROVAL = NOT_GRANTED
AUDIT_DATA_ROLE_BINDING_APPROVAL = NOT_GRANTED
CALLER_IMPERSONATION_BINDING_APPROVAL = NOT_GRANTED
EXISTING_FIREBASE_BINDING_CHANGE_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

## 16. Safety accounting

```text
LIVE_IAM_READS = 0 additional calls
IAM_MUTATIONS = 0
API_MUTATIONS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
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

Local-only actions were `gcloud auth list`, installed gcloud help inspection,
repository searches, Git checks, and this document update.

## 17. Verdict and next package

**`P1_5_C2H2B3_NEEDS_POLICY_REVIEW`**

The minimum three-operation IAM design is technically defined and reversible,
but it is not yet suitable for a mutation approval gate. The pre-existing
project-wide Firebase Admin SDK Token Creator binding can transitively use any
new audit-SA data permission, and no local dependency evidence justifies or
disproves that broad scope.

Recommended next package only:

**P1.5-C2H2B3A - Firebase Admin SDK Token-Creator Dependency / Narrowing Review**

It must remain read/design only, determine platform and application dependency
without changing the binding, and decide whether the binding is accepted,
narrowed in a separate future approval, or remains a Stage-1 blocker. Do not
advance to C2H2B4 or execute any prepared mutation before that decision.
