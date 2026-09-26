# P1.5-C2H2B5 Stage-1 IAM Minimal Controlled Mutation

## 1. Scope and baseline

This package applied only the three explicitly approved Stage-1 IAM mutations.
It did not access Firestore, execute ListCollectionIds, generate a token,
execute impersonation, sign, change an API, deploy, modify code, or stage Git
changes.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 141
STAGING = 0

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
CUSTOM_ROLE_ID = mywebStage1CollectionIdReader
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

## 2. Caller and before-state gates

The existing local gcloud auth store had one active user. Its value was used
only in memory and matched the pre-approved fingerprint; the raw email is not
stored in this document.

```text
ACTIVE_USER_COUNT = 1
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
CALLER_FINGERPRINT_MATCH = yes

PROJECT_ID_VERIFIED = yes
PROJECT_NUMBER_VERIFIED = yes
AUDIT_SA_EXISTS_ENABLED = yes

CUSTOM_ROLE_STATE_BEFORE = ABSENT
DATA_ROLE_BINDING_BEFORE = ABSENT
CALLER_AUDIT_SA_TOKEN_CREATOR_BEFORE = ABSENT
CALLER_PROJECT_TOKEN_CREATOR_BEFORE = absent
FIREBASE_ADMIN_PROJECT_TOKEN_CREATOR_BEFORE = absent

CUSTOM_ROLE_PROVENANCE = TO_BE_CREATED
DATA_BINDING_PROVENANCE = TO_BE_CREATED
CALLER_BINDING_PROVENANCE = TO_BE_CREATED
STATE_DRIFT_DETECTED = no
```

The exact custom-role pre-read returned authoritative absence. The audit SA had
no unexpected project role, its resource policy had no unrelated binding, the
caller had no project-level Token Creator grant, and the old Firebase Admin SDK
project-level Token Creator binding remained absent.

## 3. Normal mutations

```text
MUTATION_A_ATTEMPTS = 1
MUTATION_A_RESULT = CREATED
MUTATION_A_STARTED_AT = 2026-08-22T12:46:02.8317159Z
MUTATION_A_COMPLETED_AT = 2026-08-22T12:46:05.3078287Z

MUTATION_B_ATTEMPTS = 1
MUTATION_B_RESULT = APPLIED
MUTATION_B_STARTED_AT = 2026-08-22T12:46:31.2827904Z
MUTATION_B_COMPLETED_AT = 2026-08-22T12:46:33.4217936Z

MUTATION_C_ATTEMPTS = 1
MUTATION_C_RESULT = APPLIED
MUTATION_C_STARTED_AT = 2026-08-22T12:47:17.7922083Z
MUTATION_C_COMPLETED_AT = 2026-08-22T12:47:21.6483528Z

NORMAL_IAM_MUTATIONS_APPLIED = 3
```

A created only the exact project custom role. B bound that role only to the
exact audit SA at project scope. C bound only the fingerprint-verified caller
to Token Creator on the exact audit-SA service-account resource. No
project-wide caller Token Creator binding was added and the old Firebase Admin
SDK binding was not recreated.

## 4. Contract and post-state verification

The post-A custom-role read confirmed the fixed contract:

```text
CUSTOM_ROLE_EXISTS = yes
CUSTOM_ROLE_INCLUDED_PERMISSIONS_AFTER = [datastore.entities.list]
CUSTOM_ROLE_EXTRA_PERMISSION_COUNT = 0
CUSTOM_ROLE_STAGE = GA
CUSTOM_ROLE_DELETED = false
```

The post-B and post-C IAM reads confirmed:

```text
AUDIT_SA_CUSTOM_ROLE_BOUND_AFTER = yes
AUDIT_SA_CUSTOM_ROLE_CONDITIONAL = no
CALLER_AUDIT_SA_TOKEN_CREATOR_AFTER = present
CALLER_AUDIT_SA_TOKEN_CREATOR_CONDITIONAL = no
CALLER_PROJECT_TOKEN_CREATOR_AFTER = absent
FIREBASE_ADMIN_PROJECT_TOKEN_CREATOR_AFTER = absent

AUDIT_SA_UNEXPECTED_PROJECT_ROLE_DELTA_COUNT = 0
AUDIT_SA_RESOURCE_POLICY_UNEXPECTED_DELTA_COUNT = 0
FIREBASE_ADMIN_TO_AUDIT_SA_TRANSITIVE_PATH = closed
```

The first resource-policy comparison treated the expected target-only binding
as a non-empty policy delta. A second read normalized by removing only the
approved exact caller from the exact unconditional Token Creator binding before
comparison. The remaining resource-policy set was empty before and after:

```text
NORMALIZED_RESOURCE_POLICY_UNRELATED_BINDING_COUNT = 0
NORMALIZED_RESOURCE_POLICY_FINGERPRINT = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
NORMALIZED_POSTSTATE_RESULT = PASS
```

No additional mutation was issued while resolving that comparison.

## 5. Rollback

```text
ROLLBACK_TRIGGERED = no
ROLLBACK_IAM_MUTATIONS = 0
ROLLBACK_C_ATTEMPTS = 0
ROLLBACK_B_ATTEMPTS = 0
ROLLBACK_A_ATTEMPTS = 0
ROLLBACK_C_RESULT = NOT_REQUIRED
ROLLBACK_B_RESULT = NOT_REQUIRED
ROLLBACK_A_RESULT = NOT_REQUIRED
FINAL_B5_IAM_STATE = EXPECTED
```

All three resulting changes were newly created by B5 and would have been
eligible for reverse-order rollback only if a later B5 step failed or
verification found an unexpected security state. Neither occurred.

## 6. Safety accounting

```text
PROJECT_METADATA_READS = 1
AUDIT_SA_METADATA_READS = 1
PROJECT_IAM_POLICY_READS = 3
CUSTOM_ROLE_READS = 2
AUDIT_SA_RESOURCE_IAM_READS = 3

NORMAL_IAM_MUTATIONS = 3
ROLLBACK_IAM_MUTATIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
SIGN_BLOB_CALLS = 0
SIGN_JWT_CALLS = 0
SERVICE_ACCOUNT_KEY_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No raw caller email, access/refresh token, private key, JSON credential, JWT,
signature, raw IAM policy, or unrelated-principal dump is stored.

## 7. Stage-1 boundary

The IAM path is now present, but no Stage-1 Firestore operation is authorized.

```text
STAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

The next package is
`P1.5-C2H2C STAGE-1 SINGLE-RUN PRODUCTION PATH-RESOLUTION APPROVAL GATE`.
It must present the three previously known workspace candidates, require the
user to select exactly one, and prepare one bounded ListCollectionIds call. It
must not execute that call without a new explicit approval.

## 8. Verdict

`P1_5_C2H2B5_STAGE1_IAM_MINIMAL_CONTROLLED_MUTATION_PASS`

