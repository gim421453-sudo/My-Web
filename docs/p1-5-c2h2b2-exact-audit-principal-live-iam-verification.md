# P1.5-C2H2B2 Exact Audit Principal and Live IAM Verification

## 1. Scope and execution result

The user explicitly approved one-time Google Cloud IAM read-only verification
for project `my-management-app-8a933` and project number `607154464656`.
This run used an already-installed Google Cloud SDK and an existing active user
session. It did not change the active account, authenticate, impersonate a
service account, generate a token, access Firestore, or mutate cloud state.

```text
LIVE_IAM_VERIFICATION_EXECUTED = yes
GCLOUD_VERSION = 580.0.0
ACTIVE_CALLER = privacy-minimized existing user principal (g***@gmail.com)
```

## 2. Git baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_RESULT_DOCUMENT = 127
STAGING = 0
INITIAL_GIT_DIFF_CHECK = pass; pre-existing CRLF warnings only
```

## 3. Project identity

One `gcloud projects describe` metadata read returned the exact expected
project ID and number. The response contained no parent resource.

```text
PROJECT_ID_VERIFIED = yes
PROJECT_NUMBER_VERIFIED = yes
LIVE_PROJECT_ID = my-management-app-8a933
LIVE_PROJECT_NUMBER = 607154464656
PROJECT_PARENT_TYPE = none
PROJECT_PARENT_ID = none
PARENT_IAM_READS = 0
PARENT_IAM_INHERITANCE_STATUS = NOT_APPLICABLE_NO_PARENT
```

## 4. Exact audit principal

The project-scoped service-account list returned one exact candidate match.
No service-account key API was called.

```text
AUDIT_SERVICE_ACCOUNT_MATCH_COUNT = 1
AUDIT_SERVICE_ACCOUNT_EMAIL = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
AUDIT_SERVICE_ACCOUNT_UNIQUE_ID = 116649729398333350253
AUDIT_SERVICE_ACCOUNT_DISPLAY_NAME = myweb-authority-audit-reader
AUDIT_SERVICE_ACCOUNT_DISABLED = false
AUDIT_PRINCIPAL_RESULT = EXACT_ENABLED_MATCH
```

## 5. Project IAM evidence

Google Cloud project `getIamPolicy` necessarily returns the complete project
allow policy to the client before output filtering. This was the implementation
detail anticipated and approved by B2. The raw response remained in memory and
was neither printed nor persisted. Only bindings relevant to the exact audit
member and project-level Token Creator role were extracted.

The exact audit service account has no directly bound project role:

```text
PROJECT_IAM_POLICY_RAW_RESPONSE_SCOPE = FULL_POLICY_REQUIRED_BY_API
AUDIT_SERVICE_ACCOUNT_PROJECT_ROLES = []
PROJECT_DATA_ROLES = []
DATASTORE_VIEWER_BOUND_AT_PROJECT = no
DATASTORE_ENTITIES_LIST_PROJECT_ROLE_EVIDENCE = NOT_DIRECTLY_BOUND
UNEXPECTED_PROJECT_WRITE_CAPABLE_ROLE_COUNT = 0
UNEXPECTED_PROJECT_WRITE_CAPABLE_ROLES = []
CUSTOM_PROJECT_ROLE_COUNT = 0
CUSTOM_PROJECT_ROLE_RESULTS = []
```

Because the project has no reported parent and no direct role grants the audit
principal `datastore.entities.list`, the required Stage-1 data permission is
not evidenced. B2 did not attempt a permission test or Firestore call.

## 6. Exact service-account IAM policy

The exact service-account resource policy was read twice. The first read
filtered Token Creator evidence in memory; a second minimal classification read
was needed because the first diagnostic incorrectly counted an absent bindings
property as one PowerShell array element. The second response was `[null]`
after flattening, confirming that the resource policy contains no binding.

```text
SERVICE_ACCOUNT_POLICY_VERSION = 1
SERVICE_ACCOUNT_RESOURCE_TOKEN_CREATOR_BINDINGS = []
SERVICE_ACCOUNT_RESOURCE_IMPERSONATING_PRINCIPALS = []
DIRECT_IMPERSONATION_BINDING_COUNT = 0
```

No alternate direct role containing `iam.serviceAccounts.getAccessToken` was
present on the exact resource.

## 7. Project-level Token Creator evidence

The same single project IAM policy read found one project-level Token Creator
binding. Its member is a Firebase Admin SDK service account in the approved
project, not the active human caller and not the audit service account:

```text
PROJECT_LEVEL_TOKEN_CREATOR_BINDINGS = [
  roles/iam.serviceAccountTokenCreator -> serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
]
IMPERSONATION_RESOURCE_SCOPE = PROJECT_SCOPED
ACTIVE_CALLER_DIRECT_IMPERSONATION_MATCH = no
EXACT_IMPERSONATING_PRINCIPAL = firebase-adminsdk-fbsvc service account (project-scoped binding)
```

Project scope grants the listed principal Token Creator capability over service
accounts in the project, including the audit account. B2 did not resolve any
indirect ability of the active caller to act as that Firebase service account.
The broad scope requires policy review; it was not exercised or changed.

## 8. IAM decision

The approved-scope evidence establishes the principal identity but does not
establish a usable, narrowly impersonable Stage-1 reader:

1. `roles/datastore.viewer` is not directly bound to the audit service account;
2. no other direct project role supplies `datastore.entities.list`;
3. the active caller has no direct Token Creator binding on the audit resource
   or at project scope;
4. an unrelated Firebase Admin SDK service account has project-scoped Token
   Creator, which needs separate scope review;
5. no parent IAM inheritance remains because project metadata reported no
   parent.

```text
STAGE1_IAM_TECHNICAL_STATUS = BLOCKED_DATA_READ_AND_DIRECT_CALLER_IMPERSONATION_MISSING
IAM_TECHNICAL_RESULT = NEEDS_NARROW_FIX_AND_PROJECT_TOKEN_CREATOR_SCOPE_REVIEW
APPROVED_WORKSPACE_ID = NOT_APPROVED
STAGE1_USER_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

No IAM fix is authorized or performed here.

## 9. Exact call accounting

```text
PROJECT_METADATA_READ_CALLS = 1
SERVICE_ACCOUNT_LIST_READ_CALLS = 1
PROJECT_IAM_POLICY_READ_CALLS = 1
SERVICE_ACCOUNT_IAM_POLICY_READ_CALLS = 2
PROJECT_CUSTOM_ROLE_READ_CALLS = 0
PARENT_IAM_READ_CALLS = 0

FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_GENERATE_ACCESS_TOKEN_CALLS = 0
IMPERSONATION_EXECUTIONS = 0
EXPLICIT_ACCESS_TOKEN_COMMANDS = 0
```

The service-account policy's second read stayed on the same exact approved
resource and was counted rather than hidden. No automatic retries occurred.

## 10. Mutation and sensitive-output review

Commands executed by this package were limited to local Git/tool discovery,
local `gcloud --version`, local `gcloud auth list`, and these live read verbs:

```text
gcloud projects describe
gcloud iam service-accounts list
gcloud projects get-iam-policy
gcloud iam service-accounts get-iam-policy
```

No command used an impersonation flag, access-token operation, key operation,
policy setter, binding mutation, resource mutation, service enablement,
Firebase command, or Firestore endpoint. No raw unrelated project IAM policy,
credential, token, private key, or service-account key JSON was persisted.

```text
PRODUCTION_FIREBASE_ACCESS = IAM_ONLY
PRODUCTION_FIRESTORE_ACCESS = 0
PRODUCTION_FIRESTORE_READS = 0
PRODUCTION_FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
SERVICE_ACCOUNT_GENERATE_ACCESS_TOKEN_CALLS = 0
IMPERSONATION_EXECUTIONS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
SERVICE_ACCOUNT_MUTATIONS = 0
ROLE_MUTATIONS = 0
KEY_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
DEPLOY = 0
STAGING = 0
COMMIT = 0
PUSH = 0
```

## 11. Verdict and next action

**`P1_5_C2H2B2_NEEDS_NARROW_FIX`**

The exact audit principal is resolved and enabled, but Stage 1 remains blocked
because its required data-read role and the active caller's direct,
service-account-scoped impersonation permission are absent. The existing
project-scoped Firebase Admin SDK Token Creator binding also requires policy
review.

Do not execute ListCollectionIds or select a workspace. A future package must
separately design and seek approval for the minimum IAM changes, including the
exact audit account's read role, an exact authorized caller with resource-scoped
Token Creator, and review of the existing project-level Token Creator binding.
