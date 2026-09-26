# P1.5-C2H2B3A2 Firebase Admin Project-Role Live Verification

## 1. Scope and baseline

This report records the explicitly approved Stage A minimum live verification.
It used the previously working Google Cloud CLI without installing tooling,
changing account state, creating credentials, or impersonating a principal.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_RESULT_DOCUMENT = 131
STAGING = 0

EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
```

Only one project metadata read and one project IAM policy read were performed.
The IAM API returned the complete allow policy as required by its contract, but
the response remained in process memory. Only bindings containing the exact
service-account member were extracted; unrelated members and raw policy data
were neither printed nor persisted.

## 2. Project identity result

```text
PROJECT_ID_VERIFIED = yes
PROJECT_NUMBER_VERIFIED = yes
PROJECT_METADATA_READ_CALLS = 1
```

The identity gate passed before the IAM policy request was made.

## 3. Exact direct project roles

The single current project-policy response contained three unconditional direct
bindings for the exact principal:

```text
FIREBASE_ADMIN_SA_PROJECT_ROLES = [
  roles/firebase.sdkAdminServiceAgent,
  roles/firebaseauth.admin,
  roles/iam.serviceAccountTokenCreator
]
EXACT_BINDING_COUNT = 3
CONDITIONAL_BINDING_COUNT = 0
PROJECT_CUSTOM_ROLE_COUNT = 0
ORG_CUSTOM_ROLE_OUTSIDE_APPROVAL = no
```

| Role | Classification | Datastore entity read/write relevance |
| --- | --- | --- |
| `roles/firebase.sdkAdminServiceAgent` | `SERVICE_SPECIFIC` | its predefined contract does not include `datastore.entities.list`, `get`, `create`, `update`, or `delete` |
| `roles/firebaseauth.admin` | `SERVICE_SPECIFIC` | Firebase Authentication administration; its predefined contract does not include the five Datastore entity permissions above |
| `roles/iam.serviceAccountTokenCreator` | `TOKEN_OR_IMPERSONATION` | permits service-account token/signing operations; it does not itself grant Datastore entity access |

The permission classification uses the established predefined-role contracts,
not additional live role-definition calls. Relevant authoritative references
are the Google Cloud predefined-role catalogs for
[Firebase](https://cloud.google.com/iam/docs/roles-permissions/firebase),
[Firebase Authentication](https://cloud.google.com/iam/docs/roles-permissions/firebaseauth),
and [service-account authentication roles](https://cloud.google.com/iam/docs/service-account-permissions).

No role was classified from its name alone: the relevant included-permission
contracts were checked for the exact Datastore entity permissions. No project
custom role was encountered, so conditional custom-role live reads remained
zero.

## 4. B2 state cross-check

The current policy still directly binds the project-scoped Token Creator role
found in B2.

```text
PROJECT_TOKEN_CREATOR_BOUND = yes
IAM_STATE_CHANGED_SINCE_B2 = no
```

This result means only that the specific B2 binding remains present. It does not
claim that every unrelated project IAM binding is unchanged.

## 5. Direct data capability

The direct roles establish:

```text
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_ENTITIES_LIST = no
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_ENTITIES_GET = no
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_WRITE = no
FIREBASE_ADMIN_SA_HAS_BROAD_PROJECT_ADMIN = no
```

`roles/firebaseauth.admin` is broad within Firebase Authentication, but it is
not a broad project administrator role such as `roles/owner`, `roles/editor`, or
`roles/firebase.admin`, and it supplies no Firestore/Datastore entity authority.

This classification is limited to current **direct project-level bindings** in
the approved Stage A scope. No organization policy, group membership, workload
identity, Cloud Audit Logs, or service-account resource policy was inspected.

## 6. Transitive capability decision

The current and proposed path is:

```text
Firebase Admin SDK SA
  -> current project-level roles/iam.serviceAccountTokenCreator
  -> future audit SA impersonation path
  -> proposed future datastore.entities.list
  -> ListCollectionIds/data-list capability
```

No impersonation was executed, and the audit SA does not currently have the
proposed data role. The decision evaluates the security effect if that future
role were granted.

The approved evidence satisfies the `YES` rule:

1. the Firebase Admin SDK SA has no direct `datastore.entities.list` or broader
   Firestore/Datastore data authority in its current project roles;
2. its project-level Token Creator binding remains present; and
3. the proposed audit-SA role would add `datastore.entities.list`.

```text
TRANSITIVE_AUDIT_SA_PATH = PRESENT
WOULD_AUDIT_SA_DATA_ROLE_CREATE_NEW_EFFECTIVE_DATA_CAPABILITY_FOR_EXISTING_FIREBASE_ADMIN_SA = YES
STAGE_A_SECURITY_RESULT = NEW_TRANSITIVE_DATA_CAPABILITY_CONFIRMED
```

Recent usage is irrelevant to the existence of this newly reachable capability.
Stage B logs and Stage C workload metadata are therefore not required for this
Stage-1 decision.

## 7. Existing binding disposition

```text
PROJECT_WIDE_TOKEN_CREATOR_SECURITY_DEBT = PRESENT
EXISTING_BROAD_BINDING_DISPOSITION = BLOCK_STAGE1_PENDING_NARROWING
STAGE_B_REQUIRED_AFTER_STAGE_A = no
STAGE_C_REQUIRED_AFTER_STAGE_A = no
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

No binding should be removed or modified under this package. The next package,
if approved separately, should be design-only narrowing and risk-policy work.

## 8. Live-call accounting

```text
PROJECT_METADATA_READ_CALLS = 1
PROJECT_IAM_POLICY_READ_CALLS = 1
PROJECT_CUSTOM_ROLE_READ_CALLS = 0

CLOUD_AUDIT_LOG_READS = 0
WORKLOAD_METADATA_READS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
SERVICE_ACCOUNT_KEY_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
```

## 9. Safety and repository accounting

```text
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No token, private key, raw service-account key, raw IAM policy, or unrelated IAM
member is stored in this report.

## 10. Verdict

**`P1_5_C2H2B3A2_NEW_TRANSITIVE_CAPABILITY_CONFIRMED`**

Stage A resolved the central question. Do not request Stage B or C merely for
completeness. Stage-1 IAM mutation remains blocked pending a separately approved
project-wide Token Creator narrowing and security-policy design package.
